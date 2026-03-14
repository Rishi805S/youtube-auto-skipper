interface PopupState {
  enabled: boolean;
  sponsorAction: 'skip' | 'mute' | 'ignore';
  skipAds: boolean;
}

interface PopupStats {
  totalSkips: number;
  timeSaved: number;
}

class PopupController {
  private state: PopupState = {
    enabled: true,
    sponsorAction: 'skip',
    skipAds: true,
  };

  private stats: PopupStats = {
    totalSkips: 0,
    timeSaved: 0,
  };

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
      await chrome.storage.sync.set({
        enabled: this.state.enabled,
        sponsorAction: this.state.sponsorAction,
        skipAds: this.state.skipAds,
      });
      await this.notifyContentScript();
    } catch (error) {
      console.error('[Popup] Failed to save state:', error);
    }
  }

  private async loadState(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(['enabled', 'sponsorAction', 'skipAds']);
      if (
        result.enabled !== undefined ||
        result.sponsorAction !== undefined ||
        result.skipAds !== undefined
      ) {
        this.state = {
          ...this.state,
          enabled: result.enabled ?? this.state.enabled,
          sponsorAction: result.sponsorAction ?? this.state.sponsorAction,
          skipAds: result.skipAds ?? this.state.skipAds,
        };
      } else {
        await this.saveAndNotifyState();
      }

      const statsResult = await chrome.storage.local.get(['sponsorSkipStats']);
      if (statsResult.sponsorSkipStats) {
        this.stats = { ...this.stats, ...statsResult.sponsorSkipStats };
      }

      await this.notifyContentScript();
    } catch (error) {
      console.error('[Popup] Failed to load state:', error);
    }
  }

  private async notifyContentScript(): Promise<void> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id && tab.url?.includes('youtube.com/watch')) {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_UPDATED',
          settings: this.state,
        });
      }
    } catch (error) {
      console.error('[Popup] Failed to notify content script:', error);
    }
  }

  private setupEventListeners(): void {
    const masterToggle = document.getElementById('masterToggle') as HTMLInputElement | null;
    masterToggle?.addEventListener('change', (e) => {
      this.state.enabled = (e.target as HTMLInputElement).checked;
      this.updateStatusIndicator();
      void this.saveAndNotifyState();
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const actionBtn = target.closest('.action-btn') as HTMLElement | null;
      if (!actionBtn) return;

      const action = actionBtn.dataset.action as PopupState['sponsorAction'] | undefined;
      if (!action) return;

      this.state.sponsorAction = action;
      this.updateSponsorButtons();
      void this.saveAndNotifyState();
    });
  }

  private updateUI(): void {
    const masterToggle = document.getElementById('masterToggle') as HTMLInputElement | null;
    if (masterToggle) masterToggle.checked = this.state.enabled;

    this.updateSponsorButtons();
    this.updateStats();
    this.updateStatusIndicator();
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
    const statusDot = document.querySelector('.status-dot') as HTMLElement | null;

    if (!statusText || !statusDot) return;

    if (this.state.enabled) {
      statusText.textContent = 'Active';
      statusDot.classList.add('active');
    } else {
      statusText.textContent = 'Disabled';
      statusDot.classList.remove('active');
    }
  }

  private updateStats(): void {
    const totalSkipsEl = document.getElementById('totalSkips');
    const timeSavedEl = document.getElementById('timeSaved');

    if (totalSkipsEl) totalSkipsEl.textContent = this.stats.totalSkips.toString();

    if (timeSavedEl) {
      const minutes = Math.floor(this.stats.timeSaved / 60);
      timeSavedEl.textContent = minutes > 0 ? `${minutes}m` : '0m';
    }
  }

  private startStatsUpdater(): void {
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
      // Ignore tabs without a content script.
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
