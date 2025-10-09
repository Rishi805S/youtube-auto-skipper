import { NotificationService } from '../../src/services/NotificationService';

describe('NotificationService', () => {
  it('should show skip toast and update stats', () => {
    const service = new NotificationService();
    service.showSkipToast('sponsor', 10);
    const stats = service.getStats();
    expect(stats.totalSkips).toBe(1);
    expect(stats.timeSaved).toBe(10);
  });

  it('should show countdown', () => {
    const service = new NotificationService();
    expect(() => service.showCountdown('sponsor', 3)).not.toThrow();
  });
});
