export function getVideo(): HTMLVideoElement | null {
  return document.querySelector<HTMLVideoElement>('video');
}
