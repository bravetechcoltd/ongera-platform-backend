import { DataSource } from 'typeorm';
export declare class DbConnection {
    private static _instance;
    private static dbConnection;
    private constructor();
    static get instance(): DbConnection;
    static get connection(): DataSource;
    initializeDb: () => Promise<void>;
    disconnectDb: () => Promise<void>;
}
declare const dbConnection: DataSource;
export default dbConnection;
