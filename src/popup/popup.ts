// src/popup/popup.ts

interface PopupState {
  enabled: boolean;
  syncEnabled: boolean;
  sponsorAction: 'skip' | 'mute' | 'ignore';
  skipAds: boolean;
  theme: 'dark' | 'light';
}

interface PopupStats {
  totalSkips: number;
  timeSaved: number;
}

class PopupController {
  private state: PopupState = {
    enabled: true,
    syncEnabled: true,
    sponsorAction: 'skip',
    skipAds: true,
    theme: 'dark',
  };

  private stats: PopupStats = {
    totalSkips: 0,
    timeSaved: 0,
  };

  private isDebugMode = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadState();
    this.setupEventListeners();
    this.updateUI();
    this.startStatsUpdater();
  }

  private async saveAndNotifyState(): Promise<void> {
    try {
      await chrome.storage.sync.set({ sponsorSkipSettings: this.state });
      console.log('[Popup] State saved:', this.state);
      if (this.state.syncEnabled) {
        this.notifyContentScript();
      }
    } catch (error) {
      console.error('[Popup] Failed to save state:', error);
    }
  }

  private async loadState(): Promise<void> {
    try {
      // Load from Chrome storage
      const result = await chrome.storage.sync.get(['sponsorSkipSettings']);
      if (result.sponsorSkipSettings) {
        this.state = { ...this.state, ...result.sponsorSkipSettings };
        // Ensure skipAds has a default value if not present in old settings
        if (this.state.skipAds === undefined) {
          this.state.skipAds = true;
        }
      } else {
        // Set default state and save it
        console.log('[Popup] No saved settings found, using defaults');
        await this.saveAndNotifyState();
      }

      // Load stats from local storage
      const statsResult = await chrome.storage.local.get(['sponsorSkipStats']);
      if (statsResult.sponsorSkipStats) {
        this.stats = { ...this.stats, ...statsResult.sponsorSkipStats };
      }

      console.log('[Popup] State loaded:', this.state);

      // Send initial settings to content script
      await this.notifyContentScript();
    } catch (error) {
      console.error('[Popup] Failed to load state:', error);
    }
  }

  private async notifyContentScript(): Promise<void> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('[Popup] Current tab:', tab.url);
      if (tab.id && tab.url?.includes('youtube.com/watch')) {
        console.log('[Popup] Sending settings to content script:', this.state);
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_UPDATED',
          settings: this.state,
        });
        console.log('[Popup] Content script response:', response);
      } else {
        console.log('[Popup] Not on YouTube watch page, skipping message');
      }
    } catch (error) {
      console.error('[Popup] Failed to notify content script:', error);
    }
  }

  private setupEventListeners(): void {
    // Master toggle
    const masterToggle = document.getElementById('masterToggle') as HTMLInputElement;
    masterToggle?.addEventListener('change', (e) => {
      this.state.enabled = (e.target as HTMLInputElement).checked;
      console.log('[Popup] Master toggle changed:', this.state.enabled);
      this.updateStatusIndicator();
      this.saveAndNotifyState();
    });

    // Sync toggle
    const syncToggle = document.getElementById('syncToggle') as HTMLInputElement;
    syncToggle?.addEventListener('change', (e) => {
      this.state.syncEnabled = (e.target as HTMLInputElement).checked;
      this.saveAndNotifyState();
    });

    // Ad toggle
    const adToggle = document.getElementById('adToggle') as HTMLInputElement;
    adToggle?.addEventListener('change', (e) => {
      this.state.skipAds = (e.target as HTMLInputElement).checked;
      console.log('[Popup] Ad toggle changed:', this.state.skipAds);
      this.saveAndNotifyState();
    });

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;
    themeToggle?.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Sponsor action buttons
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const actionBtn = target.closest('.action-btn') as HTMLElement;

      if (actionBtn) {
        const action = actionBtn.dataset.action as 'skip' | 'mute' | 'ignore';

        console.log('[Popup] Action button clicked:', action);
        if (action) {
          this.state.sponsorAction = action;
          console.log('[Popup] State updated:', this.state);
          this.updateSponsorButtons();
          this.saveAndNotifyState();
        }
      }
    });

    // Reset stats button
    document.getElementById('resetStats')?.addEventListener('click', () => {
      this.resetStats();
    });
  }

  private updateUI(): void {
    // Update toggles
    (document.getElementById('masterToggle') as HTMLInputElement).checked = this.state.enabled;
    (document.getElementById('syncToggle') as HTMLInputElement).checked = this.state.syncEnabled;
    (document.getElementById('adToggle') as HTMLInputElement).checked = this.state.skipAds;

    // Update theme
    this.applyTheme();

    // Update sponsor buttons
    this.updateSponsorButtons();

    // Update stats
    this.updateStats();
    this.updateStatusIndicator();
  }

  private toggleTheme(): void {
    this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
    this.saveAndNotifyState();
  }

  private applyTheme(): void {
    document.body.setAttribute('data-theme', this.state.theme);
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
      themeIcon.textContent = this.state.theme === 'dark' ? '☀️' : '🌙';
    }
  }

  private updateSponsorButtons(): void {
    const buttons = document.querySelectorAll('.action-btn');
    buttons.forEach((button) => {
      const action = (button as HTMLElement).dataset.action;
      button.classList.toggle('active', action === this.state.sponsorAction);
    });
  }

  private updateStatusIndicator(): void {
    const statusText = document.getElementById('statusText');
    const statusDot = document.querySelector('.status-dot') as HTMLElement;

    if (statusText && statusDot) {
      if (this.state.enabled) {
        statusText.textContent = 'Active';
        statusDot.classList.add('active');
      } else {
        statusText.textContent = 'Disabled';
        statusDot.classList.remove('active');
      }
    }
  }

  private async updateStats(): Promise<void> {
    // Update displayed stats
    const totalSkipsEl = document.getElementById('totalSkips');
    const timeSavedEl = document.getElementById('timeSaved');

    if (totalSkipsEl) totalSkipsEl.textContent = this.stats.totalSkips.toString();

    if (timeSavedEl) {
      const minutes = Math.floor(this.stats.timeSaved / 60);
      if (minutes > 0) {
        timeSavedEl.textContent = `${minutes}m`;
      } else {
        timeSavedEl.textContent = '0m';
      }
    }
  }

  private startStatsUpdater(): void {
    // Update stats every 2 seconds
    setInterval(async () => {
      await this.fetchLatestStats();
      this.updateStats();
    }, 2000);
  }

  private async fetchLatestStats(): Promise<void> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id && tab.url?.includes('youtube.com/watch')) {
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: 'GET_STATS',
        });

        if (response) {
          this.stats = { ...this.stats, ...response };
        }
      }
    } catch {
      // Tab might not have content script, ignore
    }
  }

  private async resetStats(): Promise<void> {
    this.stats = {
      totalSkips: 0,
      timeSaved: 0,
    };

    await chrome.storage.local.set({ sponsorSkipStats: this.stats });
    this.updateStats();

    // Notify content script
    this.notifyContentScript();

    // Show confirmation
    this.showNotification('Stats reset successfully!', 'success');
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    const notification = document.createElement('div');
    notification.className = `popup-notification ${type}`;
    notification.textContent = message;

    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      ${type === 'success' ? 'background: #10b981; color: white;' : ''}
      ${type === 'error' ? 'background: #ef4444; color: white;' : ''}
      ${type === 'warning' ? 'background: #f59e0b; color: white;' : ''}
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

// Add slide animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);
