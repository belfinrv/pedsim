#!/usr/bin/env python3
"""PedSim STT worker — transcribe an audio file with faster-whisper.

Usage:  python scripts/whisper_stt.py <audiofile>
Prints the transcript to stdout. Called by app/api/stt/route.ts.

Setup (once, in the environment you run the dev server from):
    pip install faster-whisper

The first run downloads the model (default "base.en", ~150 MB) and caches it.
Override the model with PEDSIM_WHISPER_MODEL (e.g. "small.en", "tiny.en").
faster-whisper decodes webm/ogg/wav itself (bundled PyAV) — no ffmpeg needed.
"""

import os
import sys


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: whisper_stt.py <audiofile>", file=sys.stderr)
        return 2

    audio = sys.argv[1]
    model_size = os.environ.get("PEDSIM_WHISPER_MODEL", "base.en")

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print(
            "faster-whisper not installed. Run: pip install faster-whisper",
            file=sys.stderr,
        )
        return 3

    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments, _info = model.transcribe(audio, language="en", vad_filter=True)
    text = " ".join(seg.text.strip() for seg in segments).strip()
    print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
