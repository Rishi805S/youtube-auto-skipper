export {};

interface YouTubeCaptionTrack {
  baseUrl: string;
  kind?: string;
  languageCode: string;
}

interface YouTubePlayerResponse {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: YouTubeCaptionTrack[];
    };
  };
}

declare global {
  interface Window {
    ytInitialPlayerResponse?: YouTubePlayerResponse;
  }
}
