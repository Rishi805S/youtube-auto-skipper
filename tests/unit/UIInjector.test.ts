import { UIInjector } from '../../src/ui/UIInjector';

describe('UIInjector', () => {
  it('should create badge and inject styles', () => {
    const injector = new UIInjector(
      jest.fn(),
      jest.fn(() => 0)
    );
    const badge = injector['createBadge']();
    expect(badge).toBeInstanceOf(HTMLElement);
    expect(badge.style.display).toBe('none');
    expect(() => injector['injectStyles']()).not.toThrow();
  });
});
