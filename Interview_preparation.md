# Interview Preparation — YouTube Auto Skipper (SponsorSkip)

Purpose: a single concise resource to prepare for interviews about this project. Includes three short speeches (1m, 3m, 5m), project‑specific Q&A, general project Q&A, and a summary of issues/challenges with how you resolved them.

---

## Quick Speeches

### 1‑Minute Pitch

"YouTube Auto Skipper (SponsorSkip) is a Chrome extension that automatically detects and skips sponsored segments and ads in YouTube videos. It uses a three‑tiered detection pipeline — description chapter scraping, SponsorBlock API, and transcript heuristics — to maximize coverage while keeping all processing client‑side to protect user privacy. The extension injects a lightweight UI with a toggle and progress‑bar markers, runs fast ad skipping via DOM observation, and supports skip/mute/notify actions configurable by the user. The goal is to save viewers time and improve the watching experience without server infrastructure."

# Interview Preparation — YouTube Auto Skipper (SponsorSkip)

Purpose: a single resource to prepare for interviews about this project. This file now includes expanded, ready‑to‑deliver 1/3/5 minute speeches (with suggested callouts and expected follow‑up answers) and full, example "expected answers" for common interview questions.

---

## Quick Speeches (expanded)

### 1‑Minute Pitch (spoken, ~60 seconds)

Speech:

"I built YouTube Auto Skipper, a lightweight Chrome extension that detects and skips sponsored segments and ads in YouTube videos. It uses a three‑tier approach — chapters from the description, the SponsorBlock community API, and transcript heuristics — to find segments quickly and reliably while keeping all transcript parsing client‑side for privacy. The extension shows markers on the progress bar, can skip or mute detected segments, and uses fast DOM observation for minimal latency. It’s designed to be privacy‑preserving, modular, and simple to maintain."

Key callouts to hit (30s):

- Problem: interruptions and inconsistent creator labeling.
- Approach: three tiers — fast chapters, community data, heuristic fallback.
- Impact: saves viewer time, privacy by default, low maintenance.

Expected interviewer follow‑ups and sample answers:

- Q: "How do you detect segments so quickly?" — Expected answer: "Chapters in the description are parsed first because they are instantaneous; SponsorBlock is checked next; transcripts are parsed as a last resort. This ordering reduces latency while maximizing coverage."
- Q: "Any privacy concerns?" — Expected answer: "Transcript parsing runs entirely client‑side; only SponsorBlock queries go to an external public API and no PII is sent."

### 3‑Minute Overview (spoken, ~3 minutes)

Speech (structured):

1. Problem (20s): "Sponsored segments and mid‑roll ads disrupt the viewer experience and creators mark them inconsistently, which makes automated skipping hard."

2. Solution & Architecture (90s): "I created a three‑tier detection pipeline. First the extension scrapes video description chapters for labeled timestamps — this is fastest and reliable when present. If chapters fail, it queries SponsorBlock (community labeled segments). Finally, it parses YouTube transcripts in‑page and runs heuristics (whole‑word regexes for sponsored phrases, segment merging) to suggest segments. The content script manages UI injection, the tiered fetcher orchestrates the sources, and a normalization step merges overlapping segments and clamps them to the video duration. For ads we use a MutationObserver plus requestAnimationFrame polling and simulated user events to click 'Skip Ad' as soon as it's available."

3. Outcomes & Nonfunctional Goals (30s): "The extension reacts quickly (sub‑100ms checks when possible), keeps processing local for privacy, has unit and E2E tests, and is built with TypeScript and Rollup for a small build artifact."

Expected interviewer follow‑ups and sample answers:

- Q: "Why transcripts as a fallback?" — Expected answer: "Transcripts are almost always available and provide detailed cue timing; while they are noisier, they are a reliable last fallback that improves coverage."
- Q: "How do you avoid false positives?" — Expected answer: "Moved from naive substring matches to whole‑word/phrase regexes, tuned merge windows, and validated against sample transcripts to reduce spurious matches."

### 5‑Minute Deep Dive (spoken, ~5 minutes)

Speech outline (talk for ~45–60s per section):

1. Architecture (60s): Describe `content/` scripts, `engine/tieredFetcher.ts`, `pipeline/` parsers, `ui/` visualizer, and background storage. Explain how the content script re‑initializes on SPA navigation and uses centralized selectors.

2. Detection Pipeline & Algorithms (60s): Explain chapter scraping parsing rules, SponsorBlock query & caching, and transcript parsing heuristics (cue grouping, whole‑word regexes, minimum segment length, merge thresholds). Show a normalized segment example.

3. Ad Handling & UX (60s): Describe the MutationObserver + `requestAnimationFrame` approach, simulated user input sequence (mouseover/mousedown/mouseup/click) to stay compatible with YouTube’s UI, and safety checks (only advance currentTime when `#movie_player` has `ad-showing`). Mention visual markers and user controls.

4. Testing, Performance, and Deployment (40s): Unit tests with Jest, Playwright E2E, `npm run build` with Rollup, and packaging for Chrome Web Store (manifest v3 considerations). Discuss test cases used to validate transcript heuristics and ad skipping.

5. Tradeoffs & Roadmap (40s): Client‑side privacy vs server ML, selector fragility vs robustness (centralized selectors and tests), and possible next steps (ML classifier, cross‑browser support, crowdsourced feedback channel).

Expected interviewer follow‑ups and sample answers:

- Q: "How do you measure accuracy for transcript detection?" — Expected answer: "Use a labeled test set with known sponsored timestamps, compute precision/recall, and iterate on regex patterns and merge thresholds until acceptable tradeoffs are reached."
- Q: "How do you maintain selector reliability?" — Expected answer: "Centralize selectors, provide fallbacks, and run deterministic Playwright checks to surface breakage quickly."

---

## Project‑Specific Interview Q&A (with expanded expected answers)

Below each question is a fleshed‑out expected answer you can memorize or adapt.

### Overview

- Q: What problem does the project solve?

### Architecture & Design

- Q: Why three tiers?

### Content Script & DOM

- Q: How do you avoid duplicate injection?

### Tiered Fetcher

- Q: How are conflicts resolved between sources?

### Transcript Heuristics

- Q: What heuristic did you implement and why the regex change?

### Ad Skipping

- Q: How do you ensure ad skipping doesn't affect the main video?

### Performance

- Q: How do you meet low latency requirements?

### Security & Privacy

- Q: Does the extension send transcripts or user data to servers?

### Testing & CI

- Q: How do you E2E test skipping?

### Deployment

- Q: How to prepare for Chrome Web Store?

### Failure Modes

- Q: What if SponsorBlock is down?

### Maintenance

- Q: How to cope with YouTube DOM changes?

---

## General Interview Questions (expanded expected answers)

Below are fuller expected answers for common non‑project‑specific interview questions.

### 1. Project Planning & Delivery

- Q: How did you estimate the timeline for this project?

### 2. Design & Tradeoffs

- Q: How do you choose between implementing a feature client‑side vs server‑side?

### 3. Code Quality & Testing

- Q: What testing strategy do you use?

### 4. Collaboration & Process

- Q: How do you onboard new contributors?

### 5. Problem Solving

- Q: Describe a hard bug you solved.

---

## Issues & Challenges Faced (summary + mitigation)

- YouTube SPA navigation: handled by MutationObserver + `yt-navigate-finish`, and reinitializing state on URL changes.
- Isolated worlds & CSP: used `chrome.scripting.executeScript` and kept injected code minimal; obey manifest v3 policies.
- Large repo artifacts slowing git: identified large `test-results` and `node_modules` files, added `.gitignore` entries and used BFG/git gc to clean history.
- Transcript false positives: replaced naive substring matching with whole‑word regex and removed too‑generic tokens.
- Selector fragility: centralized selectors, used multiple fallback selectors, and provided tests to detect breakage.

---

## Quick Study Tips

- Practice the 1/3/5 minute speeches aloud and time them. Keep answers structured: Problem → Approach → Tradeoffs → Impact.
- Prepare a short demo or a recording showing the extension detecting and skipping segments for an example video.
- Pick 2–3 technical stories (debugging, optimization, or a design tradeoff) and rehearse them with context, actions, and measurable outcomes.

---

If you want, I can:

- convert this into a printable one‑page cheat sheet,
- generate speaker notes (bullet prompts) per speech for faster memorization,
- or run a mock interview session (I ask questions and you answer; I give feedback).
