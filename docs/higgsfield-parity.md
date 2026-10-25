# Higgsfield parity — what the live site has that Vireo does not

Source: REA observation of the public site `higgsfield.ai` on 2026-10-24
(`analyze_web_bundle` + `capture_web_screenshot` on the signed-out home, image
generator and pricing pages, plus the link graph of the home page).

**Coverage limit.** The signed-in studio (generator panel, library, Soul ID
training, Canvas, Supercomputer) sits behind Clerk sign-in. It was not
observed. Everything below comes from the public surface only; in-app behaviour
is inferred or unknown. Only functionality and layout are mirrored — brand,
copy and media stay ours (see `docs/decisions.md`).

## Observed stack of the real site

| Piece | Observation |
|---|---|
| Frontend | TanStack (Start/Router) build served from `assets.higgsfield.ai/tanstack/assets/*`, locale-prefixed routes (`/es/...`) |
| Auth | Clerk (`clerk-js@6.32.1`) proxied under `/_clerk` |
| Analytics / flags | PostHog proxied under `/api/i/`, GrowthBook SDK stream |
| Media | `static-public-media.higgsfield.ai`, `static.higgsfield.ai` (autoplay mp4 cards) |
| Edge | Cloudflare challenge platform |

Vireo deliberately differs (Next.js, Auth.js magic links, Stripe, R2); nothing
here needs to be copied.

## Route map of the live site (from the home page link graph)

| Live route | Surface | In Vireo? |
|---|---|---|
| `/` (Explorar) | Explore feed + promo cards | Yes (`/`) |
| `/ai/image?model=…` | Image generator | Yes (`/image`) |
| `/ai/video?model=…` | Video generator | Yes (`/video`) |
| `/audio` | Audio | Hidden until an audio model exists |
| `/pricing` | Plans (Starter / Plus / Ultra / Teams, monthly↔annual, 30 % promo banner) | Yes, amounts TBD |
| `/effects/use`, `/collection/effects` | Effects presets | Yes (`/effects`) |
| `/community`, `*-community` | Community feeds per model | **Yes** (`/community/[model]`, "Browse by model" on `/community`) |
| `/gallery/all`, `/profile`, `/@user/projects/<slug>` | Library, profile, public project pages | Library + `/projects/[id]`; **public profiles `/@handle` done** (no public project pages) |
| `/generate` (Cinema Studio) | Cinematic video workspace | **Yes** (`/cinema`, done 2026-10-24) |
| `/upscale` | Upscale tool | **Not in the public REST API** (checked 2026-10-24) |
| `/lipsync-studio` | Lip-sync tool | **Not in the public REST API** (checked 2026-10-24) |
| `/edit?model=…inpaint`, `/layers`, `/image-editing` | Inpaint / layer editing | **Not in the public REST API**; reference-image edit exists via Grok Image 2.0 and video edit via Kling O3 / Seedance Edit |
| `/character` (Soul ID) | Trained character | **No** |
| `/marketing-studio` | Marketing Studio | Models only |
| `/content-factory`, `/ai-influencer-studio`, `/fashion-factory`, `/photodump-studio`, `/storyboard-generator` (Popcorn) | Templated multi-step apps | **No** |
| `/canvas` | Node/canvas workflow | **No** |
| `/supercomputer` | Agent workspace | **No** (needs an LLM backend we don't have) |
| `/mcp`, `/higgsfield-api`, console | MCP/CLI + API docs | **No** |
| `/contests`, `/original-series`, `/academy`, `/blog`, `/creator-hub`, `/katana` | Editorial / community | **No** |
| `/enterprise`, `/team-plan`, `/about`, `/trust`, `/contact` | Marketing pages | `/enterprise` (honest contact page, no shared workspaces); legal pages |
| Per-model landing pages (`/seedance/2.5`, `/kling-3.0`, `/veo3.1`, `/wan-2.6`, `/soul-intro`, …) | SEO pages | **Yes** (`/models/[id]`, done 2026-10-24) |

## Gaps ranked by value / feasibility on the public REST API

1. **Per-model landing pages + deep links** (`/image?model=…` already exists;
   add `/models/[slug]` generated from the catalog). Pure frontend, no new API.
2. **Public profiles and project pages** (`/@user`, `/@user/projects/[slug]`).
   Needs only our own DB.
3. **Per-model community feeds** (`/community/[model]`). Our DB.
4. ~~**Cinema Studio workspace**~~ — done. Multi-shot sequencing is not
   attempted: the REST endpoint takes one prompt per scene.
5. ~~**Upscale / Lipsync / Inpaint tools**~~ — checked: `docs.higgsfield.ai`
   lists 41 model pages and none is an upscale, lip-sync, inpaint or face-swap
   tool, so there is nothing to wire. Not built; revisit if the docs add them.
6. **Teams plan, blog/academy** — shared workspaces and pooled credits are real
   product work (orgs, roles, billing) and an owner decision; `/enterprise`
   covers inquiries meanwhile. Blog/academy are content.
7. **Not feasible without more than the public API:** Soul ID training, Canvas,
   Supercomputer agent, Content Factory, AI Influencer. These are Higgsfield
   backend products; they would need their own models/pipelines.

## Open items that block a more complete REA pass

- A signed-in session on the user's own Higgsfield account would let REA
  observe the real generator panel, settings and library (passive capture only).
  Signing in is a manual step for the account owner.
