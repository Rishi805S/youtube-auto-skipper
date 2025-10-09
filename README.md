# YouTube Auto Skipper

## Overview

YouTube Auto Skipper is a browser extension that automatically detects and skips sponsored segments and ads in YouTube videos. It uses a three-tiered detection system (description chapters, SponsorBlock API, transcript heuristics) to maximize accuracy and coverage. The extension provides a seamless viewing experience, real-time notifications, and user controls.

## Features

- Automatic sponsor and ad skipping
- Three-tiered segment detection
- Progress bar visualization of segments
- UI controls and notifications
- Statistics tracking (time saved, skips)
- Robust handling of YouTube SPA navigation
- Unit and E2E tested for reliability

## Installation

1. Clone or download this repository.
2. Run `npm install` to install dependencies.
3. Run `npm run build` to build the extension.
4. Load the `dist/` or `build/` directory as an unpacked extension in Chrome (chrome://extensions > Load unpacked).

## Usage

- The extension will automatically skip sponsor segments and ads on YouTube videos.
- Use the toggle button and UI controls injected into the YouTube player to enable/disable skipping and view stats.

## Configuration

- Settings can be adjusted via the popup or UI controls.
- Keyboard shortcuts are available for quick actions (see documentation).

## Testing

- Run `npm test` for unit tests (Jest).
- Run `npx playwright test` for E2E tests (Playwright).

## Tech Stack

- TypeScript, Chrome Extensions API, Jest, Playwright, Rollup, ESLint, Prettier

## Contributing

Pull requests and suggestions are welcome!

## License

MIT
