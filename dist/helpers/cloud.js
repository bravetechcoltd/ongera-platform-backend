"use strict";
// @ts-nocheck
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadMultipleToCloud = exports.validateFileForUpload = exports.GetCloudinaryFileInfo = exports.DeleteFromCloud = exports.UploadToCloud = void 0;
const cloudinary_1 = require("cloudinary");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARYNAME,
    api_key: process.env.APIKEY,
    api_secret: process.env.APISECRET,
    timeout: 120000,
});
const UploadToCloud = async (file, res, retries = 3) => {
    console.log("☁️ === ENHANCED CLOUDINARY UPLOAD DEBUG START ===");
    console.log("📅 Upload started at:", new Date().toISOString());
    console.log("📁 File to upload:", {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        encoding: file.encoding,
        fieldname: file.fieldname
    });
    let lastError;
    // Pre-upload validation
    console.log("🔍 Pre-upload validation...");
    if (!fs_1.default.existsSync(file.path)) {
        console.error("❌ File does not exist at path:", file.path);
        throw new Error(`File not found at path: ${file.path}`);
    }
    console.log("✅ File exists on disk");
    const fileStats = fs_1.default.statSync(file.path);
    console.log("📊 File system stats:", {
        size: fileStats.size,
        isFile: fileStats.isFile(),
        created: fileStats.birthtime,
        modified: fileStats.mtime,
        mode: fileStats.mode.toString(8)
    });
    if (fileStats.size !== file.size) {
        console.warn("⚠️ File size mismatch:", {
            multerSize: file.size,
            actualSize: fileStats.size
        });
    }
    try {
        fs_1.default.accessSync(file.path, fs_1.default.constants.R_OK);
        console.log("✅ File is readable");
    }
    catch (error) {
        console.error("❌ File is not readable:", error.message);
        throw new Error(`File is not readable: ${error.message}`);
    }
    console.log("🔧 Validating Cloudinary configuration...");
    if (!process.env.CLOUDINARYNAME || !process.env.APIKEY || !process.env.APISECRET) {
        console.error("❌ Missing Cloudinary environment variables");
        throw new Error("Cloudinary configuration is incomplete");
    }
    console.log("✅ Cloudinary configuration is valid");
    console.log("🌐 Testing Cloudinary connection...");
    try {
        await cloudinary_1.v2.api.ping();
        console.log("✅ Cloudinary connection successful");
    }
    catch (connectionError) {
        console.error("❌ Cloudinary connection failed:", connectionError.message);
        console.log("📊 Connection error details:", connectionError);
    }
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`🔄 === UPLOAD ATTEMPT ${attempt}/${retries} ===`);
            console.log("🕐 Attempt started at:", new Date().toISOString());
            let uploadResponse;
            const baseUploadOptions = {
                use_filename: true,
                unique_filename: true,
                timeout: 120000,
                chunk_size: 6000000,
                overwrite: false,
                invalidate: true,
            };
            console.log("⚙️ Base upload options:", baseUploadOptions);
            if (file.mimetype.startsWith("image/")) {
                console.log("🖼️ Processing as IMAGE file");
                const imageOptions = {
                    ...baseUploadOptions,
                    folder: "task_images/",
                    transformation: [
                        { quality: "auto:good" },
                        { fetch_format: "auto" },
                    ],
                    allowed_formats: ["jpg", "png", "gif", "webp", "bmp", "tiff"]
                };
                console.log("🖼️ Image-specific options:", imageOptions);
                uploadResponse = await cloudinary_1.v2.uploader.upload(file.path, imageOptions);
            }
            else if (file.mimetype.startsWith("audio/")) {
                console.log("🎵 Processing as AUDIO file");
                const audioOptions = {
                    ...baseUploadOptions,
                    folder: "task_audio/",
                    resource_type: "video",
                };
                console.log("🎵 Audio-specific options:", audioOptions);
                uploadResponse = await cloudinary_1.v2.uploader.upload(file.path, audioOptions);
            }
            else if (file.mimetype.startsWith("video/")) {
                console.log("🎥 Processing as VIDEO file");
                const videoOptions = {
                    ...baseUploadOptions,
                    folder: "task_videos/",
                    resource_type: "video",
                    transformation: [
                        { quality: "auto:good" },
                    ],
                };
                console.log("🎥 Video-specific options:", videoOptions);
                uploadResponse = await cloudinary_1.v2.uploader.upload(file.path, videoOptions);
            }
            else {
                console.log("📄 Processing as DOCUMENT/RAW file");
                const documentOptions = {
                    ...baseUploadOptions,
                    folder: "task_documents/",
                    resource_type: "raw",
                };
                console.log("📄 Document-specific options:", documentOptions);
                uploadResponse = await cloudinary_1.v2.uploader.upload(file.path, documentOptions);
            }
            console.log(`✅ Upload successful on attempt ${attempt}!`);
            console.log("🕐 Upload completed at:", new Date().toISOString());
            console.log("📊 Cloudinary response summary:", {
                secure_url: uploadResponse.secure_url ? "✅ Present" : "❌ Missing",
                public_id: uploadResponse.public_id || "❌ Missing",
                resource_type: uploadResponse.resource_type || "❌ Missing",
                format: uploadResponse.format || "❌ Missing",
                bytes: uploadResponse.bytes || 0,
                width: uploadResponse.width || "N/A",
                height: uploadResponse.height || "N/A",
                version: uploadResponse.version || "N/A",
                created_at: uploadResponse.created_at || "❌ Missing"
            });
            console.log("📋 Full Cloudinary response:", {
                ...uploadResponse,
                signature: uploadResponse.signature ? "[HIDDEN]" : "❌ Missing"
            });
            if (!uploadResponse.secure_url) {
                console.error("❌ No secure_url in Cloudinary response");
                throw new Error("Cloudinary upload succeeded but no secure_url returned");
            }
            console.log("🔍 Testing uploaded file URL...");
            try {
                const https = require('https');
                const http = require('http');
                const urlModule = require('url');
                const parsedUrl = urlModule.parse(uploadResponse.secure_url);
                const client = parsedUrl.protocol === 'https:' ? https : http;
                const testPromise = new Promise((resolve, reject) => {
                    const req = client.request({
                        hostname: parsedUrl.hostname,
                        path: parsedUrl.path,
                        method: 'HEAD',
                        timeout: 10000
                    }, (res) => {
                        console.log("🌐 URL test response:", {
                            statusCode: res.statusCode,
                            contentType: res.headers['content-type'],
                            contentLength: res.headers['content-length']
                        });
                        if (res.statusCode === 200) {
                            resolve(true);
                        }
                        else {
                            reject(new Error(`URL test failed with status: ${res.statusCode}`));
                        }
                    });
                    req.on('error', reject);
                    req.on('timeout', () => {
                        req.destroy();
                        reject(new Error('URL test timeout'));
                    });
                    req.end();
                });
                await testPromise;
                console.log("✅ Uploaded file URL is accessible");
            }
            catch (urlTestError) {
                console.warn("⚠️ URL accessibility test failed:", urlTestError.message);
            }
            const result = {
                secure_url: uploadResponse.secure_url,
                public_id: uploadResponse.public_id,
                resource_type: uploadResponse.resource_type,
                format: uploadResponse.format,
                bytes: uploadResponse.bytes,
                original_filename: file.originalname,
                upload_timestamp: new Date().toISOString(),
                width: uploadResponse.width,
                height: uploadResponse.height,
                version: uploadResponse.version,
                created_at: uploadResponse.created_at
            };
            console.log("📦 Final result object:", result);
            console.log("✅ === ENHANCED CLOUDINARY UPLOAD DEBUG COMPLETE ===");
            return result;
        }
        catch (error) {
            lastError = error;
            console.error(`❌ === UPLOAD ATTEMPT ${attempt}/${retries} FAILED ===`);
            console.error("🕐 Failed at:", new Date().toISOString());
            console.error("📊 Error details:", {
                name: error.name || "Unknown",
                message: error.message || "No message",
                code: error.code || "No code",
                errno: error.errno || "No errno",
                syscall: error.syscall || "No syscall",
                hostname: error.hostname || "No hostname",
                http_code: error.http_code || "No HTTP code"
            });
            if (error.error) {
                console.error("☁️ Cloudinary API error:", {
                    message: error.error.message || "No message",
                    http_code: error.error.http_code || "No HTTP code",
                    api_error_code: error.error.code || "No API code"
                });
            }
            if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
                console.error("🌐 Network error detected:", {
                    code: error.code,
                    address: error.address,
                    port: error.port,
                    hostname: error.hostname
                });
            }
            console.error("📚 Full error stack:", error.stack);
            const retryableErrors = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'TimeoutError'];
            const isRetryable = retryableErrors.includes(error.name) ||
                retryableErrors.includes(error.code) ||
                error.http_code === 499 ||
                (error.message && error.message.includes('timeout'));
            if (attempt < retries && isRetryable) {
                const waitTime = Math.min(attempt * 2000, 10000);
                console.log(`⏳ Retryable error detected. Waiting ${waitTime}ms before retry...`);
                console.log("🔄 Will retry with exponential backoff");
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                continue;
            }
            if (attempt === retries) {
                console.error(`❌ All ${retries} upload attempts exhausted`);
                break;
            }
            else {
                console.error(`❌ Non-retryable error or retry limit not reached`);
                console.error(`🔍 Error analysis:`, {
                    isRetryable,
                    errorName: error.name,
                    errorCode: error.code,
                    httpCode: error.http_code,
                    remainingRetries: retries - attempt
                });
            }
        }
    }
    console.error("🚨 === ALL UPLOAD ATTEMPTS FAILED ===");
    console.error("📁 File:", file.originalname);
    console.error("❌ Final error:", (lastError === null || lastError === void 0 ? void 0 : lastError.message) || "Unknown error");
    console.error("📊 Final error details:", {
        name: lastError === null || lastError === void 0 ? void 0 : lastError.name,
        message: lastError === null || lastError === void 0 ? void 0 : lastError.message,
        code: lastError === null || lastError === void 0 ? void 0 : lastError.code,
        stack: lastError === null || lastError === void 0 ? void 0 : lastError.stack
    });
    console.error("🚨 === END UPLOAD FAILURE DEBUG ===");
    throw new Error(`Failed to upload ${file.originalname} after ${retries} attempts: ${(lastError === null || lastError === void 0 ? void 0 : lastError.message) || "Unknown error"}`);
};
exports.UploadToCloud = UploadToCloud;
// Function to delete files from Cloudinary with retry
const DeleteFromCloud = async (publicId, resourceType = "image", retries = 3) => {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const deleteResponse = await cloudinary_1.v2.uploader.destroy(publicId, {
                resource_type: resourceType,
                timeout: 60000, // 1 minute timeout for delete
            });
            return deleteResponse;
        }
        catch (error) {
            lastError = error;
            console.error(`Delete attempt ${attempt}/${retries} failed for ${publicId}:`, error.message);
            if (attempt < retries) {
                const waitTime = attempt * 1000; // 1s, 2s, 3s
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                continue;
            }
        }
    }
    throw new Error(`Failed to delete ${publicId} after ${retries} attempts: ${(lastError === null || lastError === void 0 ? void 0 : lastError.message) || "Unknown error"}`);
};
exports.DeleteFromCloud = DeleteFromCloud;
// Function to get file info from Cloudinary with retry
const GetCloudinaryFileInfo = async (publicId, resourceType = "image", retries = 3) => {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await cloudinary_1.v2.api.resource(publicId, {
                resource_type: resourceType,
                timeout: 30000, // 30 seconds timeout
            });
            return result;
        }
        catch (error) {
            lastError = error;
            console.error(`Get file info attempt ${attempt}/${retries} failed for ${publicId}:`, error.message);
            if (attempt < retries) {
                const waitTime = attempt * 1000;
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                continue;
            }
        }
    }
    throw new Error(`Failed to get file info for ${publicId} after ${retries} attempts: ${(lastError === null || lastError === void 0 ? void 0 : lastError.message) || "Unknown error"}`);
};
exports.GetCloudinaryFileInfo = GetCloudinaryFileInfo;
// Utility function to validate file before upload
const validateFileForUpload = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "video/mp4",
        "video/avi",
        "video/mov",
        "video/wmv",
        "audio/mp3",
        "audio/wav",
        "audio/ogg",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "application/zip",
        "application/x-rar-compressed",
    ];
    if (file.size > maxSize) {
        return { isValid: false, error: `File ${file.originalname} exceeds 10MB limit` };
    }
    if (!allowedTypes.includes(file.mimetype)) {
        return { isValid: false, error: `File type ${file.mimetype} is not allowed` };
    }
    return { isValid: true };
};
exports.validateFileForUpload = validateFileForUpload;
// Batch upload function for multiple files with sequential processing
const UploadMultipleToCloud = async (files) => {
    const results = [];
    const errors = [];
    // Process files sequentially to avoid overwhelming Cloudinary
    for (const file of files) {
        try {
            // Validate file before upload
            const validation = (0, exports.validateFileForUpload)(file);
            if (!validation.isValid) {
                errors.push({ file: file.originalname, error: validation.error });
                continue;
            }
            const result = await (0, exports.UploadToCloud)(file);
            results.push(result);
        }
        catch (error) {
            console.error(`Failed to upload ${file.originalname}:`, error.message);
            errors.push({ file: file.originalname, error: error.message });
        }
    }
    if (errors.length > 0) {
        console.warn("Some files failed to upload:", errors);
    }
    return results;
};
exports.UploadMultipleToCloud = UploadMultipleToCloud;
