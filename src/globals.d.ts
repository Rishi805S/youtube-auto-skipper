export {};

declare global {
  interface Window {
    ytcfg?: {
      data_: {
        INNERTUBE_API_KEY: string;
        INNERTUBE_CONTEXT: object;
        [key: string]: unknown;
      };
    };
  }
}
