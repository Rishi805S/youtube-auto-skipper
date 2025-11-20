export class Logger {
  private static prefix = '[SponsorSkip]';
  private static isDebug = true; // Could be toggled via settings

  static log(message: string, ...args: any[]) {
    if (this.isDebug) {
      console.log(`${this.prefix} ${message}`, ...args);
    }
  }

  static warn(message: string, ...args: any[]) {
    console.warn(`${this.prefix} ${message}`, ...args);
  }

  static error(message: string, ...args: any[]) {
    console.error(`${this.prefix} ${message}`, ...args);
  }

  static info(message: string, ...args: any[]) {
    console.info(`${this.prefix} ${message}`, ...args);
  }
}
