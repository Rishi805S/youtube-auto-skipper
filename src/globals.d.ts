export {}; // This makes the file a module.

declare global {
  interface Window {
    ytcfg?: {
      data_: {
        INNERTUBE_API_KEY: string;
        INNERTUBE_CONTEXT: object; // More specific than 'any'
        [key: string]: unknown; // 'unknown' is safer than 'any'
      };
    };
  }
}
