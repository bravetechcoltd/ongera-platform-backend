import nodemailer from 'nodemailer';
interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}
export declare const generateRandomString: (length?: number) => string;
export declare const transporter: nodemailer.Transporter<import("nodemailer/lib/smtp-transport").SentMessageInfo, import("nodemailer/lib/smtp-transport").Options>;
export declare const generateOTP: (length?: number) => string;
export declare const sendEmail: (options: EmailOptions) => Promise<any>;
export declare const isValidEmail: (email: string) => boolean;
export declare const formatDate: (date: Date) => string;
export declare const sanitizeString: (str: string) => string;
export declare const delay: (ms: number) => Promise<void>;
export declare const safeJSONParse: (json: string) => any;
export {};
