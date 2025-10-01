import nodemailer from 'nodemailer';
export declare const transporter: nodemailer.Transporter<import("nodemailer/lib/smtp-transport").SentMessageInfo, import("nodemailer/lib/smtp-transport").Options>;
export declare const generateOTP: (length?: number) => string;
export declare const sendVerificationOTP: (email: string, firstName: string, lastName: string, otp: string) => Promise<boolean>;
export declare const sendPasswordChangeOTP: (email: string, firstName: string, lastName: string, otp: string) => Promise<boolean>;
export declare const sendEmailVerifiedNotification: (email: string, firstName: string, lastName: string) => Promise<boolean>;
export declare const sendInstructorCredentials: (email: string, firstName: string, lastName: string, password: string, institutionName: string) => Promise<boolean>;
export declare const sendStudentCredentials: (email: string, firstName: string, lastName: string, password: string, instructorName: string, institutionName: string) => Promise<boolean>;
