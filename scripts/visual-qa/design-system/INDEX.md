# Design System Visual QA Index

Screenshots are local QA artifacts and are not intended for commit.

| Phase | Route | Before 1366x768 | After 1366x768 | Before 390x844 | After 390x844 | Status |
|---|---|---|---|---|---|---|
| Landing Batch 3 / Step 3b | `/` | `../landing/batch-2/1366x768/full-page.png` | `../landing/batch-3/1366x768/full-page.png` | `../landing/batch-2/390x844/full-page.png` | `../landing/batch-3/390x844/full-page.png` | Complete for approved Batch 3: public 52/52; unit 31/31; visual 5 applicable passes, 3 viewport skips. Hero/Section 02 and 375/390/768 drawer motion evidence under `../landing/batch-3/`. Sections 04–09/CTA/footer await later approval. |
| Phase 1 | `/` | `phase1/before/landing-1366x768.png` | `phase1/after/landing-1366x768.png` | `phase1/before/landing-390x844.png` | `phase1/after/landing-390x844.png` | Complete |
| Antideploy Phase 1 | `/` | `phase1/after/landing-1366x768.png` | `antideploy-phase1/after/landing-1366x768.png` | `phase1/after/landing-390x844.png` | `antideploy-phase1/after/landing-390x844.png` | Visual QA complete; phase gate stopped when public E2E hit a Turbopack ENOSPC cache-write failure |
| Phase 1 | `/dev/style-guide` | Not applicable (new internal route) | `phase1/after/style-guide-1366x768.png` | Not applicable (new internal route) | `phase1/after/style-guide-390x844.png` | Complete; development-only route |
| Phase 2 / Career Copilot | `/dashboard` | `career-copilot/before/career-copilot-1366x768.png` | `career-copilot/after/career-copilot-docked-1366x768.png`; `career-copilot/after/career-copilot-expanded-1366x768.png`; `career-copilot/after/career-copilot-collapsed-1366x768.png` | `career-copilot/before/career-copilot-390x844.png` | `career-copilot/after/career-copilot-docked-390x844.png`; `career-copilot/after/career-copilot-expanded-390x844.png`; `career-copilot/after/career-copilot-collapsed-390x844.png` | UI and focused QA complete; phase gate stopped because `test:templates` could not execute without the missing local `tsx` runner |
