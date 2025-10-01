"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbConnection = void 0;
const typeorm_1 = require("typeorm");
const db_1 = __importDefault(require("../config/db"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class DbConnection {
    constructor() {
        this.initializeDb = async () => {
            try {
                const connection = await DbConnection.dbConnection.initialize();
                console.log('Database connection established successfully.');
            }
            catch (error) {
                console.error('Error initializing database connection:', error);
            }
        };
        this.disconnectDb = async () => {
            try {
                await DbConnection.dbConnection.destroy();
                console.log('Database connection closed.');
            }
            catch (error) {
                console.error('Error closing database connection:', error);
            }
        };
    }
    static get instance() {
        if (!this._instance)
            this._instance = new DbConnection();
        return this._instance;
    }
    static get connection() {
        return this.dbConnection;
    }
}
exports.DbConnection = DbConnection;
DbConnection.dbConnection = new typeorm_1.DataSource({
    type: 'postgres',
    logging: false,
    ssl: db_1.default.ssl,
    synchronize: true,
    url: process.env.DATABASE_URL,
    migrations: [__dirname + '/migrations/'],
    entities: [__dirname + '/models/*{.js,.ts}'],
});
const dbConnection = DbConnection.connection;
exports.default = dbConnection;
