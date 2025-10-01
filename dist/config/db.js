"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const env = process.env.NODE_ENV || 'development';
const development = {
    username: process.env.DB_USER_DEV,
    password: process.env.DB_PASSWORD_DEV,
    host: process.env.DB_HOST_DEV,
    port: process.env.DB_PORT_DEV,
    name: process.env.DB_NAME_DEV,
    ssl: {
        require: true,
        rejectUnauthorized: false,
        ca: fs_1.default.readFileSync('src/config/ca.pem')
    }
};
const staging = {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME_DEV,
    ssl: {
        require: true,
        rejectUnauthorized: false,
        ca: fs_1.default.readFileSync('src/config/ca.pem')
    }
};
const production = {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME_DEV,
    ssl: {
        require: true,
        rejectUnauthorized: false,
        ca: fs_1.default.readFileSync('src/config/ca.pem')
    }
};
const config = {
    development,
    staging,
    production,
};
exports.default = config[env];
