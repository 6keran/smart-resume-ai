# Original Codex Pet — asset reuse review and implementation file map

Date: 2026-11-24. Status: original asset source identified; artwork redistribution permission is not verified. No original-pet implementation was made.

## Verified findings

The [official Pets documentation](https://learn.chatgpt.com/docs/pets) describes built-in animated companions, real Running / Needs input / Ready / Blocked activity, sprite animation, and a still frame under reduced motion.

The [official catalog](https://github.com/openai/codex/blob/main/codex-rs/tui/src/pets/catalog.rs) says it is ported from the Codex App avatar catalog. It identifies:

- ID: `codex`
- Display name: `Codex`
- Description: **The original Codex companion**
- Original asset filename: `codex-spritesheet-v4.webp`
- Frame size: 192 × 208 pixels
- Sheet: 8 columns × 9 rows, 1536 × 1872 pixels

The [official asset loader](https://github.com/openai/codex/blob/main/codex-rs/tui/src/pets/asset_pack.rs) explicitly says built-in spritesheets are **not checked into the TUI package**. They are obtained from the public Codex pets CDN and cached by the CLI. Its base URL and the catalog identify this original asset URL:

https://persistent.oaistatic.com/codex/pets/v1/codex-spritesheet-v4.webp

This is an official, documented distribution location. I did not fetch, copy, or visually inspect the spritesheet, so successful HTTP delivery and its binary contents have not been independently checked.

## Reuse rights

The [Codex repository license](https://github.com/openai/codex/blob/main/LICENSE) is Apache-2.0. Its copyright grant covers the licensed Work; section 6 does not grant general trademark rights. The [repository NOTICE](https://github.com/openai/codex/blob/main/NOTICE) identifies OpenAI copyright and Ratatui code, but does not grant a separate license for the externally downloaded pet artwork.

The [official open-source overview](https://learn.chatgpt.com/docs/open-source) identifies CLI, SDK and app-server sources. It does not provide an artwork redistribution license.

**No source checked establishes permission to redistribute the original CDN spritesheet inside a third-party application.** A public URL and Apache-licensed downloader do not by themselves establish that permission. This is not a finding that permission cannot exist elsewhere; its scope remains unverified.

The official search also surfaced custom/generated pet showcases. Those are distinct from the original built-in Codex companion and are not an acceptable replacement for this request.

Implementation is held at this boundary, following the user's explicit requirement to investigate lawful reuse and avoid inaccessible proprietary assets or falsely identical substitutes. The next required input is an applicable original-artwork redistribution license or written permission from OpenAI/the rights holder covering this web-app use.

## Existing architecture inspected

The existing assistant remains [CareerChatbot.tsx](D:/projects/builder-github/src/components/chat/CareerChatbot.tsx). It owns conversations, current input, authentication visibility, request cancellation, retries, clipboard actions, window modes and launcher/panel positioning. It sends message/history/context to the existing /api/chat endpoint and consumes a complete JSON reply.

The current uncommitted Nimbus integration is present in that component, [useAssistantPresentation.ts](D:/projects/builder-github/src/components/chat/useAssistantPresentation.ts) and [CareerChatbot.module.css](D:/projects/builder-github/src/components/chat/CareerChatbot.module.css). Those changes were preserved.

The requested companion must be a renderer for this same assistant. It must not create a second chat component, endpoint, history store or authentication flow.

## Exact proposed source changes after reuse permission is established

| File | Limited change |
| --- | --- |
| [CareerChatbot.tsx](D:/projects/builder-github/src/components/chat/CareerChatbot.tsx) | Replace Nimbus chat rendering with the authentic asset renderer. Keep the underlying accessible button transparent, the existing panel, messages, request/history/context, cancellation, retries and authentication. Keep the pet in the bottom-right viewport position with safe-area bounds. Feed the collapsed pet the actual lifecycle state rather than hard-coded idle, so it reacts while a pending chat is minimized. |
| [useAssistantPresentation.ts](D:/projects/builder-github/src/components/chat/useAssistantPresentation.ts) | Decouple visual states from the Nimbus type; connect the original renderer to pending, accepted reply, actual error and confirmed success signals. Preserve modal suppression and reduced-motion behavior. |
| [CareerChatbot.module.css](D:/projects/builder-github/src/components/chat/CareerChatbot.module.css) | Pet positioning, responsive bounds, unobtrusive hit target and focus styling. Keep the application's existing design tokens and chat-panel styling. |
| D:/projects/builder-github/src/components/assistant/CodexPetCompanion.tsx — new | Lightweight original spritesheet renderer using authentic frames and verified upstream animation timing. Pause when hidden; show a genuine still frame under reduced motion. No generated or CSS-drawn replacement art. |
| D:/projects/builder-github/src/components/assistant/CodexPetCompanion.module.css — new | Transparent companion rendering, original sprite scaling and reduced-motion presentation. |
| [assistant-mascot-chat.spec.ts](D:/projects/builder-github/e2e/assistant-mascot-chat.spec.ts) | Update Nimbus-specific visual assertions for the authorized original asset while retaining chat, history, abort/retry, keyboard, modal and viewport checks. |
| D:/projects/builder-github/e2e/codex-pet-companion.spec.ts — new | Original-asset/frame checks, lifecycle transitions, minimized pending/response behavior, static reduced-motion frames and collision tests at 390, 768, 1366 and 1440 widths. |

Conditional asset files, not created:

- D:/projects/builder-github/public/assistant-pet/codex-spritesheet-v4.webp — original bytes only.
- D:/projects/builder-github/public/assistant-pet/codex-pet-manifest.json — verified original frame geometry, animation sequences/timing and provenance.
- D:/projects/builder-github/public/assistant-pet/LICENSE.txt and NOTICE.txt — applicable artwork permission and required attribution; do not mislabel the artwork as Apache-licensed solely because the downloader is Apache-licensed.

Existing Nimbus component/CSS, style-guide work and all other application pages will remain intact. No database, backend, API, authentication, resume-template or global design-system modification is proposed.

## Truthful lifecycle mapping

- Idle: no pending request and no current completion/error reaction.
- Thinking/processing: the existing real in-flight request signal. The client currently provides no independent server-generation progress or streaming events. Do not invent a timed processing phase or show fake progress.
- Responding: a successful, accepted assistant reply has actually arrived.
- Error: the existing real request error. Cancellation returns to rest rather than inventing an error or a completed answer.
- Success: an existing confirmed action, such as successful copying, or a verified completion signal; no fabricated suggestion-applied event.

Original frame sequences and timing still need to be inspected and verified before implementing the renderer. No new animation dependency is proposed.

## Work and verification during this investigation

Only this report and AGENT_LOG.md were written. No application source changed, no spritesheet was downloaded, no private app resources were extracted, no new pet/chat feature was added, and no alternative mascot was presented as original.

Public-source research used the openai-docs skill. An initial browser-origin action was automatically rejected because origin access was not explicit; the user then approved read-only public access. A WebMCP approval timeout was retried successfully. No sign-in, uploads, account changes or outward messages occurred.

No TypeScript, ESLint, build or application browser tests ran during this investigation. Original-pet appearance and runtime behavior remain unverified because implementation has not started. Earlier Nimbus test results do not establish correctness of an original-pet replacement.

Starting source hashes:
- CareerChatbot.tsx: 62F6C97D424533F4CB2070A3BEE64199C3EE2008A52C36D7E4651CB1A7BABF0D
- useAssistantPresentation.ts: AE972629E574AED4EA0A2F41F5BA0FE2A77A30388F10F1C37EC67CFE6BCCD0A4
- ATS engine: F1ECC4BE87472F55F1A8C15253CB1F91219E84053B5056024F9317E052CE8251
- Prior db/index.ts work: D0554CC4FCBFDA2B562787F4506D7D804E30FD37670B36EBE4B890FA86E2775A

No staging, commits, pushes, deployments, dependencies or process/lock changes.
