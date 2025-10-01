declare class Logger {
    private logDir;
    constructor();
    private ensureLogDirectory;
    private formatMessage;
    private writeToFile;
    info(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
}
export declare const logger: Logger;
export {};
