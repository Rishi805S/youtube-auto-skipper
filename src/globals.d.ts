// This file tells TypeScript about custom global variables

// This is necessary to make this file a module and not a script.
export {};

declare global {
  // This extends the global Window interface
  interface Window {
    ytcfg?: {
      data_: {
        INNERTUBE_API_KEY: string;
        INNERTUBE_CONTEXT: any;
        [key: string]: any; // Allow other properties
      };
      get: (key: string) => any;
    };
  }
}