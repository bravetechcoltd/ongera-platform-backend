"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class Logger {
    constructor() {
        this.logDir = path_1.default.join(process.cwd(), 'logs');
        this.ensureLogDirectory();
    }
    ensureLogDirectory() {
        if (!fs_1.default.existsSync(this.logDir)) {
            fs_1.default.mkdirSync(this.logDir, { recursive: true });
        }
    }
    formatMessage(level, message, meta) {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` | Meta: ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`;
    }
    writeToFile(filename, content) {
        const filePath = path_1.default.join(this.logDir, filename);
        fs_1.default.appendFileSync(filePath, content);
    }
    info(message, meta) {
        const logMessage = this.formatMessage('info', message, meta);
        console.log(logMessage.trim());
        this.writeToFile('app.log', logMessage);
    }
    error(message, meta) {
        const logMessage = this.formatMessage('error', message, meta);
        console.error(logMessage.trim());
        this.writeToFile('error.log', logMessage);
    }
    warn(message, meta) {
        const logMessage = this.formatMessage('warn', message, meta);
        console.warn(logMessage.trim());
        this.writeToFile('app.log', logMessage);
    }
    debug(message, meta) {
        if (process.env.NODE_ENV === 'development') {
            const logMessage = this.formatMessage('debug', message, meta);
            console.debug(logMessage.trim());
            this.writeToFile('debug.log', logMessage);
        }
    }
}
exports.logger = new Logger();
