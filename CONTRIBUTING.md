# Contributing to YouTube Auto Skipper

Thank you for your interest in contributing! This guide will help you get started.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How to Contribute](#how-to-contribute)
3. [Development Setup](#development-setup)
4. [Code Style & Standards](#code-style--standards)
5. [Pull Request Process](#pull-request-process)
6. [Testing Requirements](#testing-requirements)
7. [Documentation Requirements](#documentation-requirements)
8. [Commit Message Guidelines](#commit-message-guidelines)
9. [Issue Guidelines](#issue-guidelines)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in all interactions.

### Expected Behavior

- ✅ Be respectful and inclusive
- ✅ Give and accept constructive feedback gracefully
- ✅ Focus on what is best for the community
- ✅ Show empathy towards other community members

### Unacceptable Behavior

- ❌ Harassment, trolling, or discriminatory language
- ❌ Personal attacks or insults
- ❌ Publishing others' private information
- ❌ Any conduct that could be considered inappropriate in a professional setting

### Enforcement

Violations may result in temporary or permanent bans from the project. Report violations to [maintainer email].

---

## How to Contribute

### Types of Contributions

#### 1. **Bug Reports**
Found a bug? Help us fix it!
- Check [existing issues](https://github.com/yourusername/youtube-auto-skipper/issues) first
- Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md)
- Include reproduction steps and logs

#### 2. **Feature Requests**
Have an idea? We'd love to hear it!
- Check [existing feature requests](https://github.com/yourusername/youtube-auto-skipper/issues?q=is%3Aissue+label%3Aenhancement)
- Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md)
- Explain the use case and benefits

#### 3. **Code Contributions**
Ready to write code? Great!
- Fix bugs from the issue tracker
- Implement approved feature requests
- Improve test coverage
- Optimize performance
- Refactor for better maintainability

#### 4. **Documentation**
Help others understand the project!
- Fix typos or clarify existing docs
- Add code examples
- Create tutorials or guides
- Improve API documentation

#### 5. **Testing**
Help ensure quality!
- Write unit tests for untested code
- Add E2E test scenarios
- Perform manual testing and report results
- Test on different browsers/OS

---

## Development Setup

### Quick Start

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/youtube-auto-skipper.git
cd youtube-auto-skipper

# 3. Add upstream remote
git remote add upstream https://github.com/yourusername/youtube-auto-skipper.git

# 4. Install dependencies
npm install

# 5. Create a feature branch
git checkout -b feature/my-new-feature

# 6. Start development
npm run watch
```

### Development Workflow

```bash
# Keep your fork synced
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch from main
git checkout -b feature/my-feature

# Make changes, then test
npm run lint
npm test
npm run build

# Commit and push
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature

# Create Pull Request on GitHub
```

See [GETTING_STARTED.md](./GETTING_STARTED.md) for detailed setup instructions.

---

## Code Style & Standards

### TypeScript Style

#### 1. **Use TypeScript Strict Mode**
```typescript
// ✅ Good: Explicit types
function getSegments(videoId: string): Promise<Segment[]> {
  return fetchSegments(videoId);
}

// ❌ Bad: Implicit any
function getSegments(videoId) {
  return fetchSegments(videoId);
}
```

#### 2. **Prefer Interfaces Over Types for Objects**
```typescript
// ✅ Good: Use interface for objects
interface Segment {
  start: number;
  end: number;
  category?: string;
}

// ⚠️ OK: Use type for unions/intersections
type Action = 'skip' | 'mute' | 'ignore';
```

#### 3. **Use Async/Await Over Promises**
```typescript
// ✅ Good
async function loadSegments(videoId: string): Promise<Segment[]> {
  try {
    const segments = await fetchSponsorBlockSegments(videoId);
    return segments;
  } catch (error) {
    console.error('Failed to load segments:', error);
    return [];
  }
}

// ❌ Bad
function loadSegments(videoId: string): Promise<Segment[]> {
  return fetchSponsorBlockSegments(videoId)
    .then(segments => segments)
    .catch(error => {
      console.error('Failed to load segments:', error);
      return [];
    });
}
```

#### 4. **Early Returns for Guard Clauses**
```typescript
// ✅ Good
function checkForSkip(video: HTMLVideoElement) {
  if (!state.isEnabled) return;
  if (!currentSegments.length) return;
  if (!video) return;
  
  // Main logic here
}

// ❌ Bad
function checkForSkip(video: HTMLVideoElement) {
  if (state.isEnabled && currentSegments.length && video) {
    // Deeply nested logic
  }
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Variables** | camelCase | `currentSegments` |
| **Constants** | UPPER_SNAKE_CASE | `AD_CHECK_INTERVAL` |
| **Functions** | camelCase | `getSegmentsByPriority` |
| **Classes** | PascalCase | `NotificationManager` |
| **Interfaces** | PascalCase | `SkipperState` |
| **Type Aliases** | PascalCase | `StateUpdater` |
| **Files** | camelCase | `tieredFetcher.ts` |
| **Test Files** | camelCase.test | `tieredFetcher.test.ts` |

### Code Organization

```typescript
// File structure:
// 1. Imports (grouped: external, then internal)
import { test, expect } from '@playwright/test'; // External
import { Segment } from '../types/types';         // Internal

// 2. Type definitions
interface LocalState {
  isEnabled: boolean;
}

// 3. Constants
const DEFAULT_TIMEOUT = 3000;

// 4. Main logic
export class MyClass {
  // ...
}

// 5. Helper functions (not exported)
function helperFunction() {
  // ...
}
```

### ESLint Configuration

The project uses ESLint to enforce code style. Run:
```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

**Key Rules:**
- No unused variables (`@typescript-eslint/no-unused-vars`)
- No explicit `any` types (`@typescript-eslint/no-explicit-any`)
- Consistent semicolons (`semi`)
- Single quotes for strings (`quotes`)
- No trailing whitespace (`no-trailing-spaces`)

### Prettier Configuration

Code formatting is handled by Prettier:
```bash
npm run format         # Format all files
npm run format-check   # Check formatting
```

**Settings (`.prettierrc`):**
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

---

## Pull Request Process

### Before Submitting

**Pre-submission Checklist:**
```bash
# 1. Ensure code compiles
npm run build:ts

# 2. Run linter
npm run lint

# 3. Run tests
npm test

# 4. Check formatting
npm run format-check

# 5. Build extension
npm run build

# 6. Manually test in browser
# Load dist/ folder in Chrome and verify changes work
```

### PR Title Format

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short summary>
  │       │             │
  │       │             └─> Summary in present tense (no period at end)
  │       │
  │       └─> Optional: api, engine, ui, features, tests, docs
  │
  └─> feat, fix, docs, style, refactor, test, chore
```

**Examples:**
```
feat(engine): add tier 4 detection using AI
fix(adSkipper): handle new YouTube ad selectors
docs(api): add examples to tieredFetcher docs
test(engine): increase coverage for normalizeSegments
refactor(ui): simplify NotificationManager
chore(deps): update Playwright to v1.40
```

### PR Description Template

```markdown
## Description
[Describe what this PR does]

## Motivation
[Why is this change needed?]

## Changes
- [List key changes]
- [Be specific]

## Testing
- [ ] Added unit tests
- [ ] Added E2E tests
- [ ] Manually tested in Chrome
- [ ] Tested on multiple videos

## Screenshots (if UI changes)
[Add before/after screenshots]

## Related Issues
Closes #123
Related to #456

## Checklist
- [ ] Code compiles without errors
- [ ] All tests pass
- [ ] Linter passes
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (if applicable)
```

### Review Process

1. **Automated Checks:** CI runs tests, linting, type checking
2. **Code Review:** Maintainers review code quality and design
3. **Testing:** Changes tested manually on multiple scenarios
4. **Approval:** At least one maintainer approval required
5. **Merge:** Squash and merge to main branch

**Review Criteria:**
- ✅ Code follows style guidelines
- ✅ Tests cover new/changed functionality
- ✅ Documentation updated
- ✅ No breaking changes (or properly documented)
- ✅ Performance impact considered
- ✅ Security implications reviewed

### Addressing Review Feedback

```bash
# Make requested changes
# Stage and commit
git add .
git commit -m "fix: address review feedback"

# Push to same branch
git push origin feature/my-feature

# PR automatically updates
```

---

## Testing Requirements

### Unit Tests

**Required for:**
- New functions/methods
- Bug fixes
- Logic changes

**Example:**
```typescript
// src/utils/newHelper.ts
export function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

// tests/unit/newHelper.test.ts
import { parseTimestamp } from '../../src/utils/newHelper';

describe('parseTimestamp', () => {
  it('parses MM:SS format', () => {
    expect(parseTimestamp('1:30')).toBe(90);
  });

  it('parses HH:MM:SS format', () => {
    expect(parseTimestamp('1:23:45')).toBe(5025);
  });

  it('returns 0 for invalid format', () => {
    expect(parseTimestamp('invalid')).toBe(0);
  });
});
```

### E2E Tests

**Required for:**
- New user-facing features
- Critical flows (skip, ad skip, settings)

**When to add:**
- New detection tier
- New keyboard shortcut
- New UI component
- Changes to core skip logic

### Test Coverage

**Minimum Coverage:** 80% for new code

**Check coverage:**
```bash
npm test -- --coverage
```

**Coverage by module:**
- Engine: 90%+ required (critical path)
- Features: 85%+ required
- UI: 75%+ acceptable
- Utils: 80%+ required

---

## Documentation Requirements

### Code Comments

**When to comment:**
```typescript
// ✅ Good: Complex algorithm explanation
/**
 * Normalizes segments by sorting, merging overlaps, and adding padding.
 * 
 * Algorithm:
 * 1. Add padding to each segment
 * 2. Sort by start time
 * 3. Merge segments where next.start <= current.end
 * 
 * @param segments - Raw segments from any source
 * @param padding - Seconds to add before/after each segment
 * @returns Deduplicated and merged segments
 */
export function normalizeSegments(segments: Segment[], padding = 0): Segment[] {
  // Implementation...
}

// ✅ Good: Non-obvious code
// YouTube's SPA navigation requires MutationObserver to detect video changes
const observer = new MutationObserver(() => {
  checkForVideoChange();
});

// ❌ Bad: Obvious code
// Increment counter
counter++;

// ❌ Bad: Commented-out code (use git history instead)
// const oldMethod = () => { ... };
```

### API Documentation

**Update when:**
- Adding new public functions
- Changing function signatures
- Modifying return types

**Files to update:**
- `API_REFERENCE.md` - Function signatures and examples
- `MODULES.md` - Module architecture and flow
- JSDoc comments in source code

### README Updates

**Update when:**
- Adding new features
- Changing keyboard shortcuts
- Modifying installation steps
- Changing dependencies

---

## Commit Message Guidelines

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat:** New feature
- **fix:** Bug fix
- **docs:** Documentation only
- **style:** Code style (formatting, semicolons, etc.)
- **refactor:** Code change that neither fixes a bug nor adds a feature
- **perf:** Performance improvement
- **test:** Adding or updating tests
- **chore:** Maintenance (deps, build config, etc.)

### Scope (Optional)

- `engine` - Detection engine
- `api` - API clients
- `pipeline` - Data fetching strategies
- `features` - Ad skipper, input handler
- `services` - Injection, notifications
- `ui` - Visual components
- `utils` - Utilities
- `config` - Configuration
- `tests` - Test files
- `docs` - Documentation

### Examples

```
feat(engine): add caching layer for SponsorBlock API

Implement in-memory cache with 5-minute TTL to reduce API calls
for frequently replayed videos.

Closes #42
```

```
fix(adSkipper): handle new YouTube ad button selector

YouTube changed ad button class from .ytp-skip-ad-button to
.ytp-ad-skip-button-modern. Added both selectors to config.

Fixes #87
```

```
docs(api): add examples to SponsorBlockClient

Added code examples for error handling and retry logic.
```

```
test(engine): increase normalizeSegments coverage to 95%

Added tests for edge cases:
- Empty input
- Single segment
- All segments overlap
```

---

## Issue Guidelines

### Bug Reports

**Use template:** `.github/ISSUE_TEMPLATE/bug_report.md`

**Required information:**
- Clear title: "Ad skipping doesn't work on video X"
- Steps to reproduce (numbered list)
- Expected vs actual behavior
- Environment (Chrome version, OS, extension version)
- Console logs (from DevTools)
- Video URL (if applicable)

**Example:**
```markdown
## Bug Description
Extension doesn't skip sponsor segments on video dQw4w9WgXcQ

## Steps to Reproduce
1. Load extension in Chrome 120.0
2. Navigate to https://www.youtube.com/watch?v=dQw4w9WgXcQ
3. Play video
4. Segment at 1:30 is not skipped

## Expected Behavior
Should skip from 1:30 to 2:00

## Actual Behavior
Video continues playing through segment

## Environment
- Chrome Version: 120.0.6099.109
- Extension Version: 1.0.0
- OS: macOS 14.1

## Console Logs
```
[SponsorSkip] Segments loaded: []
```

## Additional Context
Video has SponsorBlock data confirmed on sponsor.ajay.app
```

### Feature Requests

**Use template:** `.github/ISSUE_TEMPLATE/feature_request.md`

**Required information:**
- Clear description of feature
- Use case / problem it solves
- Proposed solution (optional)
- Alternatives considered (optional)

**Example:**
```markdown
## Feature Description
Add whitelist feature to never skip segments on specific channels

## Problem / Use Case
Some channels have high-quality sponsor integrations that I want to watch.
Currently, must disable entire extension.

## Proposed Solution
- Add "Whitelist Channel" button in popup
- Store channel IDs in chrome.storage
- Skip segment detection for whitelisted channels

## Alternatives
- Pause extension manually (current workaround, inconvenient)
- Use "Watch" mode (still shows notifications)

## Additional Context
Similar feature exists in SponsorBlock browser extension
```

---

## First-Time Contributors

### Good First Issues

Look for issues labeled `good first issue`:
- Documentation improvements
- Adding test cases
- Fixing typos
- Simple bug fixes
- Adding code comments

### Getting Help

**Stuck?** Ask for help!
- Comment on the issue
- Ask in [GitHub Discussions](https://github.com/yourusername/youtube-auto-skipper/discussions)
- Tag maintainers for guidance

**Resources:**
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Setup guide
- [CODE_MASTERY.md](./CODE_MASTERY.md) - Architecture overview
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Debug guide

---

## Recognition

Contributors will be:
- Listed in `CONTRIBUTORS.md`
- Mentioned in release notes
- Credited in commit history

**Top contributors may be invited to:**
- Become project maintainers
- Review pull requests
- Shape project direction

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

## Questions?

- **General Questions:** [GitHub Discussions](https://github.com/yourusername/youtube-auto-skipper/discussions)
- **Bug Reports:** [GitHub Issues](https://github.com/yourusername/youtube-auto-skipper/issues)
- **Security Issues:** Email [security@example.com]

---

**Thank you for contributing to YouTube Auto Skipper! 🎉**

**Last Updated:** 2024
**Version:** 1.0.0
