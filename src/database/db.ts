import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
dotenv.config();

// Make `timestamp without time zone` columns (the default for TypeORM
// @CreateDateColumn / @UpdateDateColumn) parse as UTC instead of in the
// Node process's local timezone. Without this, when the Node server runs
// in a non-UTC tz (e.g. Africa/Kigali, UTC+2), JS Date instances coming out
// of pg are shifted by the server offset — chat messages and other
// timestamps then display as N hours in the past on the client.
// 1114 = OID for `timestamp without time zone`.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pgTypes = require('pg').types;
pgTypes.setTypeParser(1114, (str: string | null) =>
  str ? new Date(str.endsWith('Z') ? str : str + 'Z') : null
);

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