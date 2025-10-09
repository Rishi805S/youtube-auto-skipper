import { jest } from '@jest/globals';
// Mock DOM and video element for ad skipping logic

describe('Ad skipping logic', () => {
  let video: HTMLVideoElement;
  let player: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    video = document.createElement('video');
    Object.defineProperty(video, 'duration', { value: 30, writable: false });
    video.currentTime = 0;
    document.body.appendChild(video);
    player = document.createElement('div');
    player.id = 'movie_player';
    document.body.appendChild(player);
  });

  it('should skip to last 5 seconds of ad', () => {
    player.classList.add('ad-showing');
    video.currentTime = 0;
    // Simulate checkForSkip logic
    if (player.classList.contains('ad-showing')) {
      if (video.duration > 7 && video.currentTime < video.duration - 5) {
        video.currentTime = video.duration - 5;
      }
    }
    expect(video.currentTime).toBe(25);
  });

  it('should click skip button if present', () => {
    player.classList.add('ad-showing');
    video.currentTime = 25;
    const skipBtn = document.createElement('button');
    skipBtn.className = 'ytp-skip-ad-button ytp-ad-component--clickable';
    document.body.appendChild(skipBtn);
    skipBtn.onclick = jest.fn();
    // Simulate skip button click logic
    if (player.classList.contains('ad-showing')) {
      const btn = document.querySelector(
        '.ytp-skip-ad-button.ytp-ad-component--clickable'
      ) as HTMLButtonElement | null;
      if (btn) btn.click();
    }
    expect(skipBtn.onclick).toHaveBeenCalled();
  });
});
