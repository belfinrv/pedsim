import { defineCloudflareConfig } from "@opennextjs/cloudflare"

// PedSim runs the full Next.js app (SSR pages + dynamic /api routes) on
// Cloudflare Workers via the OpenNext adapter. No incremental cache is needed
// for the prototype — every page is static or server-rendered per request.
export default defineCloudflareConfig()
