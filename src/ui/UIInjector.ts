import { withRetry } from '../utils/retry';

export type ToggleCallback = (enabled: boolean) => void;
export type CountProvider = () => number;

export class UIInjector {
  private toggleButtonId = 'sponsorskip-toggle-button';
  private badgeId = 'sponsorskip-badge-counter';
  private enabled = true;
  private containerEl?: HTMLElement;
  private mo?: MutationObserver;

  constructor(
    private onToggle: ToggleCallback,
    private getCount: CountProvider
  ) {}

  /** Public entry-point: call once from content script */
  public async init() {
    this.injectStyles();
    await this.injectUI();
    this.watchRouteChanges();
  }

  /** Try multiple selectors until we find the controls container */
  private async findControlsContainer(): Promise<HTMLElement> {
    const selectors = [
      '.ytp-left-controls',
      '.ytp-right-controls',
      '#movie_player .ytp-left-controls',
    ];

    for (const sel of selectors) {
      try {
        const el = await withRetry<HTMLElement>(
          async () => {
            const candidate = document.querySelector<HTMLElement>(sel);
            if (!candidate) throw new Error(`No element for ${sel}`);
            return Promise.resolve(candidate);
          },
          5,
          300
        );
        return el;
      } catch {
        // continue to next selector
      }
    }

    throw new Error('Failed to locate YouTube controls container');
  }

  /** Remove old UI nodes if present */
  private cleanup() {
    // Remove any existing elements, even if multiple exist
    document
      .querySelectorAll(`#${this.toggleButtonId}, #${this.badgeId}`)
      .forEach((el) => el.remove());

    // Also cleanup by class name to catch any orphaned elements
    document
      .querySelectorAll('.sponsorskip-toggle-button, .sponsorskip-badge-counter')
      .forEach((el) => el.remove());
  }

  /** Create the toggle button */
  private createToggle(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = this.toggleButtonId;
    btn.className = 'sponsorskip-toggle-button';
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('aria-label', 'Disable SponsorSkip');

    // Insert your SVG icon
    btn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path fill="currentColor" d="M10 8l6 4-6 4V8z"/>
    </svg>
  `;

    const toggleState = () => {
      this.enabled = !this.enabled;
      btn.setAttribute('aria-pressed', String(this.enabled));
      btn.setAttribute('aria-label', this.enabled ? 'Disable SponsorSkip' : 'Enable SponsorSkip');
      btn.style.opacity = this.enabled ? '1' : '0.4';
      this.onToggle(this.enabled);
    };

    // Mouse click
    btn.addEventListener('click', toggleState);

    // Keyboard support (Enter / Space)
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleState();
      }
    });

    return btn;
  }

  /** Create the badge counter */
  private createBadge(): HTMLSpanElement {
    const span = document.createElement('span');
    span.id = this.badgeId;
    span.textContent = String(this.getCount());
    span.style.background = 'red';
    span.style.color = 'white';
    span.style.padding = '2px 6px';
    span.style.borderRadius = '12px';
    span.style.fontSize = '12px';
    span.style.marginLeft = '4px';
    return span;
  }

  /** Insert toggle + badge into the container */
  private async injectUI() {
    try {
      // First, clean up any existing elements
      this.cleanup();

      // Find the container for our controls
      this.containerEl = await this.findControlsContainer();

      // Double-check that elements don't exist (race condition protection)
      if (document.getElementById(this.toggleButtonId) || document.getElementById(this.badgeId)) {
        console.log('[UIInjector] Elements already exist, skipping injection');
        return;
      }

      // Create and inject our elements
      const toggle = this.createToggle();
      const badge = this.createBadge();

      this.containerEl.appendChild(toggle);
      this.containerEl.appendChild(badge);

      console.log('[UIInjector] Successfully injected UI elements');
    } catch (err) {
      console.error('[UIInjector] Injection failed:', err);
      throw err; // Propagate error for proper handling
    }
  }

  /** Update the badge text when segments change */
  public updateBadge() {
    const badge = document.getElementById(this.badgeId);
    if (badge) {
      const newCount = String(this.getCount());
      if (badge.textContent !== newCount) {
        badge.textContent = newCount;
        badge.classList.add('updated');
        setTimeout(() => badge.classList.remove('updated'), 200);
      }
    }
  }

  /** Re-inject on SPA navigations (URL or main DOM changes) */
  private watchRouteChanges() {
    let lastUrl = location.href;
    let injectionInProgress = false;

    const injectIfNeeded = async () => {
      // Prevent multiple simultaneous injections
      if (injectionInProgress) return;

      try {
        injectionInProgress = true;

        // Check if we already have our elements in place
        const hasExistingElements =
          document.getElementById(this.toggleButtonId) && document.getElementById(this.badgeId);

        // Only inject if elements are missing
        if (!hasExistingElements) {
          await this.injectUI();
        }
      } catch (err) {
        console.error('[UIInjector] Injection failed:', err);
      } finally {
        injectionInProgress = false;
      }
    };

    try {
      // 1) Listen for YouTube's SPA navigation events
      window.addEventListener('yt-navigate-finish', injectIfNeeded);

      // 2) Watch for URL changes through mutations (backup method)
      this.mo = new MutationObserver(() => {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          injectIfNeeded();
        }
      });

      this.mo.observe(document.body, {
        childList: true,
        subtree: true,
      });
    } catch (err) {
      console.error('[UIInjector] Failed to setup route watching:', err);
    }
  }

  /** Clean up observers (if needed) */
  public destroy() {
    this.mo?.disconnect();
    this.cleanup();
  }

  // src/ui/UIInjector.ts
  private injectStyles() {
    const css = `
    /* SponsorSkip Toggle Button */
    .sponsorskip-toggle-button {
      background: transparent;
      border: none;
      color: #fff;
      cursor: pointer;
      opacity: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s ease, transform 0.1s ease;
    }
    .sponsorskip-toggle-button[aria-pressed="false"] {
      opacity: 0.4;
    }
    .sponsorskip-toggle-button:hover {
      opacity: 0.8;
    }
    .sponsorskip-toggle-button:active {
      transform: scale(0.92);
    }

    /* SponsorSkip Badge Counter */
    .sponsorskip-badge-counter {
      display: inline-block;
      background: var(--yt-spec-brand-red);
      color: #fff;
      font-size: 12px;
      font-weight: 500;
      line-height: 1;
      padding: 2px 6px;
      border-radius: 12px;
      margin-left: 4px;
      user-select: none;
      transition: transform 0.2s ease;
    }
    .sponsorskip-badge-counter.updated {
      animation: scale-up 0.2s ease;
    }
    @keyframes scale-up {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.3); }
      100% { transform: scale(1); }
    }
  `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }
}
