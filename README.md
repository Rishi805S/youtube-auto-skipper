# YouTube Auto Skipper (SponsorSkip)

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

A powerful, privacy-focused Chrome extension that automatically detects and skips sponsored segments, intros, outros, and ads in YouTube videos. Built with TypeScript and Manifest V3.

## 🚀 Key Features

- **Smart Detection:** Uses a three-tiered approach (Chapters -> SponsorBlock API -> Transcript Analysis) for maximum accuracy.
- **Ad Auto-Skip:** Instantly clicks "Skip Ad" buttons and fast-forwards unskippable ads.
- **Customizable Actions:** Choose to **Skip**, **Mute**, or **Notify** for detected segments.
- **Privacy First:** All processing happens locally or via anonymous API calls. No personal data is collected.
- **Performance:** Lightweight and optimized for low latency (<100ms reaction time).

## 🛠️ Tech Stack

- **Core:** TypeScript, HTML5, CSS3
- **Platform:** Chrome Extensions API (Manifest V3)
- **Build Tool:** Rollup
- **Testing:** Jest (Unit), Playwright (E2E)
- **Linting:** ESLint, Prettier

## 📦 Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/youtube-auto-skipper.git
    cd youtube-auto-skipper
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Build the extension:**
    ```bash
    npm run build
    ```
    This will generate a `dist/` folder.

4.  **Load into Chrome:**
    - Open `chrome://extensions/`
    - Enable **Developer mode** (top right).
    - Click **Load unpacked**.
    - Select the `dist/` folder.

## 🎮 Usage

- **Toggle Extension:** Click the extension icon or use `Alt+S`.
- **Change Action:**
    - `Alt+1`: Skip segments (Default)
    - `Alt+2`: Mute segments
    - `Alt+3`: Watch (Notify only)
- **Toggle Ad Skipping:** `Alt+A`
- **View Stats:** `Alt+D`

## 🧪 Development

- **Watch Mode:** `npm run watch` (Rebuilds on file change)
- **Run Unit Tests:** `npm test`
- **Run E2E Tests:** `npm run test:e2e`

## 📄 License

This project is licensed under the MIT License.
