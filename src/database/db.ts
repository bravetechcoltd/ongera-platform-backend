import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
dotenv.config();

const requiresSSL = (): boolean => {
  const url = process.env.DATABASE_URL || '';
  return url.includes('sslmode=require') || url.includes('neon.tech');
};

const isProduction = process.env.NODE_ENV === 'production';


const sslConfig = isProduction ? false : requiresSSL()
  ? { require: true, rejectUnauthorized: false }
  : false;


const entityPath = isProduction
  ? __dirname + '/models/*.js'       
  : __dirname + '/models/*{.js,.ts}'; 

const migrationPath = isProduction
  ? __dirname + '/migrations/*.js'
  : __dirname + '/migrations/*{.js,.ts}';

export class DbConnection {
  private static _instance: DbConnection;
  private static dbConnection = new DataSource({
    type: 'postgres',
    logging: false,
    ssl: sslConfig,
    synchronize: true,
    url: process.env.DATABASE_URL,
    migrations: [migrationPath],
    entities: [entityPath],
  });

  private constructor() {}

  public static get instance(): DbConnection {
    if (!this._instance) this._instance = new DbConnection();
    return this._instance;
  }

  public static get connection(): DataSource {
    return this.dbConnection;
  }

  initializeDb = async () => {
    try {
      await DbConnection.dbConnection.initialize();
      console.log('✅ Database connected successfully');
      console.log(`📁 Entity path: ${entityPath}`);
      console.log(`🔒 SSL enabled: ${!!sslConfig}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    } catch (error: any) {
      console.error('❌ Database initialization error:', error?.message || error);
      throw error;
    }
  };

  disconnectDb = async () => {
    try {
      await DbConnection.dbConnection.destroy();
      console.log('✅ Database connection closed');
    } catch (error: any) {
      console.error('❌ Database disconnect error:', error?.message || error);
    }
  };
}

const dbConnection = DbConnection.connection;
export default dbConnection;