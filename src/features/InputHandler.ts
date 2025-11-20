import { Logger } from '../utils/Logger';
import { NotificationManager } from '../ui/NotificationManager';

export interface SkipperState {
  isEnabled: boolean;
  sponsorAction: 'skip' | 'mute' | 'ignore';
  skipAds: boolean;
}

export type StateUpdater = (newState: Partial<SkipperState>) => void;
export type StatsProvider = () => void;
export type InfoProvider = () => void;
export type PopupOpener = () => void;

export class InputHandler {
  constructor(
    private getState: () => SkipperState,
    private updateState: StateUpdater,
    private showStats: StatsProvider,
    private showInfo: InfoProvider,
    private showPerf: InfoProvider,
    private openPopup: PopupOpener
  ) {}

  init() {
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  private handleKeydown(e: KeyboardEvent) {
    // Ignore inputs
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (!e.altKey) return;

    const key = e.key.toLowerCase();
    const state = this.getState();

    switch (key) {
      case 's':
        this.updateState({ isEnabled: !state.isEnabled });
        NotificationManager.show(`🎛️ SponsorSkip ${!state.isEnabled ? 'Enabled' : 'Disabled'}`);
        break;
      case '1':
        this.updateState({ sponsorAction: 'skip' });
        NotificationManager.show('⏭️ Action: SKIP segments');
        break;
      case '2':
        this.updateState({ sponsorAction: 'mute' });
        NotificationManager.show('🔇 Action: MUTE segments');
        break;
      case '3':
        this.updateState({ sponsorAction: 'ignore' });
        NotificationManager.show('👁️ Action: WATCH segments');
        break;
      case 'a':
        this.updateState({ skipAds: !state.skipAds });
        NotificationManager.show(`📺 Ad skipping ${!state.skipAds ? 'enabled' : 'disabled'}`);
        break;
      case 'd':
        this.showStats();
        break;
      case 'm':
        this.showInfo();
        break;
      case 'p':
        this.showPerf();
        break;
      case 'o':
        this.openPopup();
        break;
      case 'h':
        NotificationManager.show(
          '⌨️ Alt+S:Toggle | Alt+1/2/3:Skip/Mute/Watch | Alt+A:Ads | Alt+O:Popup | Alt+H:Help'
        );
        break;
    }
  }
}
