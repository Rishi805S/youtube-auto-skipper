import { CONFIG } from '../config/constants';

export class NotificationManager {
  static show(message: string) {
    // Create simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = CONFIG.STYLES.TOAST;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, CONFIG.TIMEOUTS.TOAST_DURATION);
  }
}
