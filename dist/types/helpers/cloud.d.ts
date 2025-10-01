export declare const UploadToCloud: (file: Express.Multer.File, res?: Response, retries?: number) => Promise<{
    secure_url: string;
    public_id: string;
    resource_type: "raw" | "auto" | "image" | "video";
    format: string;
    bytes: number;
    original_filename: string;
    upload_timestamp: string;
    width: number;
    height: number;
    version: number;
    created_at: string;
}>;
export declare const DeleteFromCloud: (publicId: string, resourceType?: "image" | "video" | "raw", retries?: number) => Promise<any>;
export declare const GetCloudinaryFileInfo: (publicId: string, resourceType?: "image" | "video" | "raw", retries?: number) => Promise<any>;
export declare const validateFileForUpload: (file: Express.Multer.File) => {
    isValid: boolean;
    error?: string;
};
export declare const UploadMultipleToCloud: (files: Express.Multer.File[]) => Promise<any[]>;
