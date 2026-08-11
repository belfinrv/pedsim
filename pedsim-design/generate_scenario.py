#!/usr/bin/env python3
"""
generate_scenario.py — Turn an educator's config into a complete exam scenario.

Pipeline:
  config.json
    -> run Synthea (age range, sex, location, domain-targeted modules)
    -> scan generated bundles for a patient matching the content domain
    -> extract chart.json (for the Epic-style viewer)
    -> derive the answer key from the bundle (facts a good history should surface)
    -> build persona config (temperament, parent, rapport rules)
    -> select avatar descriptor (age/sex/ethnicity-matched)
    -> write everything to scenarios/<scenario_id>/

Usage:
  python3 generate_scenario.py scenario_config.json
"""

import json
import random
import shutil
import subprocess
import sys
import uuid
from pathlib import Path

from extract_chart import index_resources, extract_patient, load_bundle  # reuse

# ── Content domain registry ──────────────────────────────────────────────
# Maps ABP-style content domains to Synthea modules and the condition
# keywords that confirm a generated patient actually fits the domain.
DOMAINS = {
    "respiratory": {
        "modules": ["asthma", "bronchitis"],
        "match_keywords": ["asthma", "bronchitis", "wheez", "respiratory"],
        "abp_epa": "EPA 2: Manage common acute and chronic conditions",
    },
    "ent": {
        "modules": ["ear_infections", "sinusitis"],
        "match_keywords": ["otitis", "sinusitis", "ear"],
        "abp_epa": "EPA 2: Manage common acute and chronic conditions",
    },
    "behavioral_mental_health": {
        "modules": ["attention_deficit_disorder"],
        "match_keywords": ["attention", "adhd", "anxiety", "depress"],
        "abp_epa": "EPA 3: Address behavioral and mental health concerns",
    },
    "allergy": {
        "modules": ["allergies", "food_allergies"],
        "match_keywords": ["allerg"],
        "abp_epa": "EPA 2: Manage common acute and chronic conditions",
    },
}

TEMPERAMENTS = {
    "shy": {
        "style": "Gives short, quiet answers. Warms up only after rapport is built. "
                 "Looks to parent when unsure.",
        "initial_rapport": 20,
        "rapport_rules": [
            "+15 when doctor introduces themselves warmly and at eye level",
            "+10 when doctor uses the child's name or asks about interests",
            "+10 when doctor acknowledges feelings ('that sounds scary')",
            "-15 when doctor uses medical jargon without explaining",
            "-20 when doctor talks only to the parent for 3+ turns",
            "-10 when doctor rushes or interrupts",
        ],
        "disclosure_threshold": 55,
    },
    "chatty": {
        "style": "Talkative and tangential. Volunteers irrelevant stories. "
                 "Needs gentle redirection without being shut down.",
        "initial_rapport": 60,
        "rapport_rules": [
            "+10 when doctor listens to a tangent briefly before redirecting kindly",
            "-15 when doctor cuts the child off abruptly",
            "-10 when doctor shows visible impatience",
        ],
        "disclosure_threshold": 50,
    },
    "defiant": {
        "style": "Arms crossed, monosyllabic, mildly sarcastic. Tests whether the "
                 "doctor treats them with respect before cooperating.",
        "initial_rapport": 10,
        "rapport_rules": [
            "+15 when doctor treats the child as capable and asks permission",
            "+10 when doctor is honest about what will happen",
            "-20 when doctor is condescending or threatens ('or else')",
            "-15 when doctor sides with the parent against the child",
        ],
        "disclosure_threshold": 60,
    },
}

PARENT_STYLES = {
    "anxious": "Interrupts with worried questions, catastrophizes mild findings, "
               "needs calm reassurance without dismissal.",
    "dismissive": "Minimizes the child's symptoms ('kids exaggerate'), pushes to "
                  "leave quickly. Doctor must validate the child without "
                  "alienating the parent.",
    "pushy": "Demands a specific treatment (e.g. antibiotics) regardless of "
             "indication. Tests counseling under pressure.",
    "supportive": "Calm, cooperative, lets the child speak.",
    "absent": None,
}


def run_synthea(cfg, workdir: Path, seed: int) -> Path:
    """Run Synthea with domain-targeted flags; return the FHIR output dir."""
    domain = DOMAINS[cfg["content_domain"]]
    out = workdir / "synthea_out"
    if out.exists():
        shutil.rmtree(out)
    cmd = [
        "java", "-jar", str(workdir / "synthea-with-dependencies.jar"),
        "-p", str(cfg.get("batch_size", 20)),
        "-a", f'{cfg["age_range"][0]}-{cfg["age_range"][1]}',
        "-s", str(seed),
        "--exporter.fhir.export", "true",
        "--exporter.years_of_history", "10",
        "--exporter.baseDirectory", str(out),
    ]
    if cfg.get("sex") in ("M", "F"):
        cmd += ["-g", cfg["sex"]]
    for m in domain["modules"]:
        cmd += ["-m", m]
    loc = cfg.get("location", {})
    if loc.get("state"):
        cmd.append(loc["state"])
        if loc.get("city"):
            cmd.append(loc["city"])
    print("Running Synthea:", " ".join(cmd[2:]))
    subprocess.run(cmd, check=True, capture_output=True, cwd=workdir)
    return out / "fhir"


def condition_texts(idx) -> list:
    return [c.get("code", {}).get("text", "").lower()
            for c in idx["by_type"].get("Condition", [])]


def find_matching_patient(fhir_dir: Path, cfg) -> tuple:
    """Rank all generated patients by domain fit; return the best.
    Scoring: active domain condition = 10, resolved = 3, domain med = 5.
    Prefers a child with ongoing asthma over one with old bronchitis."""
    keywords = DOMAINS[cfg["content_domain"]]["match_keywords"]
    is_domain = lambda t: any(kw in t.lower() for kw in keywords)
    best, best_score = None, 0
    candidates = sorted(p for p in fhir_dir.glob("*.json")
                        if not p.name.startswith(("hospital", "practitioner")))
    for path in candidates:
        bundle = load_bundle(str(path))
        idx = index_resources(bundle)
        score = 0
        for c in idx["by_type"].get("Condition", []):
            if is_domain(c.get("code", {}).get("text", "")):
                status = (c.get("clinicalStatus", {}).get("coding", [{}])[0]
                           .get("code", ""))
                score += 10 if status == "active" else 3
        for m in idx["by_type"].get("MedicationRequest", []):
            if is_domain(m.get("medicationCodeableConcept", {}).get("text", "")):
                score += 5
        if score > best_score:
            best, best_score = (bundle, idx, path), score
    if best:
        print(f"Best domain match score: {best_score} ({best[2].name})")
        return best
    return None, None, None


def get_ethnicity(idx) -> dict:
    """Read US Core race/ethnicity extensions from the Patient resource."""
    p = idx["by_type"]["Patient"][0]
    out = {"race": "unknown", "ethnicity": "unknown"}
    for ext in p.get("extension", []):
        url = ext.get("url", "")
        key = ("race" if url.endswith("us-core-race")
               else "ethnicity" if url.endswith("us-core-ethnicity") else None)
        if key:
            for sub in ext.get("extension", []):
                if sub.get("url") == "text":
                    out[key] = sub.get("valueString", "unknown")
    return out


def build_answer_key(idx, cfg) -> dict:
    """Derive scoreable facts from the bundle. A competent, well-conducted
    history should surface these; the scorer checks the transcript against
    them. Facts are grouped by which learning objective they serve."""
    keywords = DOMAINS[cfg["content_domain"]]["match_keywords"]
    is_domain = lambda t: any(kw in t.lower() for kw in keywords)
    facts = []

    for c in idx["by_type"].get("Condition", []):
        name = c.get("code", {}).get("text", "")
        status = (c.get("clinicalStatus", {}).get("coding", [{}])[0]
                   .get("code", ""))
        if status == "active" or is_domain(name):
            facts.append({
                "id": f"fact-{len(facts)+1:03d}",
                "category": "condition",
                "fact": f"{name} ({status})",
                "domain_relevant": is_domain(name),
                "elicit_via": "symptom history questions",
            })

    for m in idx["by_type"].get("MedicationRequest", []):
        med = m.get("medicationCodeableConcept", {}).get("text", "")
        if m.get("status") == "active" or is_domain(med):
            facts.append({
                "id": f"fact-{len(facts)+1:03d}",
                "category": "medication",
                "fact": f"Takes/took: {med}",
                "domain_relevant": is_domain(med),
                "elicit_via": "medication history questions",
            })

    for a in idx["by_type"].get("AllergyIntolerance", []):
        facts.append({
            "id": f"fact-{len(facts)+1:03d}",
            "category": "allergy",
            "fact": f"Allergy: {a.get('code', {}).get('text', '')}",
            "domain_relevant": True,
            "elicit_via": "allergy history questions",
        })

    return {
        "learning_objectives": cfg["learning_objectives"],
        "key_facts": facts,
        "scoring_note": "History completeness = domain-relevant facts surfaced "
                        "in transcript / total domain-relevant facts.",
    }


def build_persona(patient, cfg) -> dict:
    t = TEMPERAMENTS[cfg.get("temperament", "shy")]
    parent_cfg = cfg.get("parent", {"present": True, "style": "supportive"})
    return {
        "child": {
            "name": patient["name"].split()[0],
            "age": _age(patient["birthDate"]),
            "temperament": cfg.get("temperament", "shy"),
            "speaking_style": t["style"],
            "language_level": "Match vocabulary to age. Never use words a child "
                              "this age would not know.",
        },
        "rapport": {
            "initial": t["initial_rapport"],
            "rules": t["rapport_rules"],
            "disclosure_threshold": t["disclosure_threshold"],
            "mechanic": "Below threshold: child gives minimal answers and "
                        "withholds sensitive/detailed facts. Above: child "
                        "volunteers detail and answers openly.",
        },
        "parent": {
            "present": parent_cfg.get("present", True),
            "style": parent_cfg.get("style", "supportive"),
            "behavior": PARENT_STYLES.get(parent_cfg.get("style", "supportive")),
        },
        "hard_rules": [
            "Never volunteer key facts unprompted; they must be elicited.",
            "Never break character or acknowledge being a simulation.",
            "Medical details must come only from the chart; invent nothing clinical.",
        ],
    }


def select_avatar(patient, ethnicity) -> dict:
    """Descriptor used to pick the closest Ready Player Me model from the
    avatar library. Face/name/context vary with demographics; behavior NEVER
    does (behavior comes only from the persona file)."""
    return {
        "age_bracket": ("young_child" if _age(patient["birthDate"]) <= 8
                        else "older_child" if _age(patient["birthDate"]) <= 12
                        else "adolescent"),
        "sex": patient["gender"],
        "race": ethnicity["race"],
        "ethnicity": ethnicity["ethnicity"],
        "model_url": "TODO: match against RPM avatar library",
        "voice": "en-US-AnaNeural",
    }


def _age(dob: str) -> int:
    from datetime import date
    b = date.fromisoformat(dob)
    today = date.today()
    return today.year - b.year - ((today.month, today.day) < (b.month, b.day))


def main():
    cfg = json.load(open(sys.argv[1]))
    workdir = Path(".").resolve()
    seed = cfg.get("seed") or random.randint(1, 10**6)

    fhir_dir = run_synthea(cfg, workdir, seed)
    bundle, idx, src = find_matching_patient(fhir_dir, cfg)
    if bundle is None:
        sys.exit(f"No patient matched domain '{cfg['content_domain']}' in this "
                 f"batch. Re-run (new random seed) or raise batch_size.")

    patient = extract_patient(idx)
    ethnicity = get_ethnicity(idx)

    scen_id = f"{cfg['content_domain']}-{uuid.uuid4().hex[:8]}"
    out = workdir / "scenarios" / scen_id
    out.mkdir(parents=True)

    shutil.copy(src, out / "bundle.fhir.json")
    subprocess.run(
        [sys.executable, "extract_chart.py", str(src)],
        stdout=open(out / "chart.json", "w"), check=True)

    (out / "answer_key.json").write_text(
        json.dumps(build_answer_key(idx, cfg), indent=2))
    (out / "persona.json").write_text(
        json.dumps(build_persona(patient, cfg), indent=2))
    (out / "avatar.json").write_text(
        json.dumps(select_avatar(patient, ethnicity), indent=2))
    (out / "manifest.json").write_text(json.dumps({
        "scenario_id": scen_id,
        "seed": seed,          # re-run with this seed => identical patient
        "config": cfg,
        "abp_epa": DOMAINS[cfg["content_domain"]]["abp_epa"],
        "patient": {**patient, **ethnicity},
    }, indent=2))

    print(f"\nScenario package: scenarios/{scen_id}/")
    print(f"  Patient: {patient['name']}, {_age(patient['birthDate'])} y/o "
          f"{patient['gender']}, {ethnicity['race']} / {ethnicity['ethnicity']}")
    print(f"  Seed: {seed} (reuse to regenerate this exact patient)")


if __name__ == "__main__":
    main()
