import { DataSource } from "typeorm";
import { config as dotenvConfig } from "dotenv";
import { join } from "path";

// Load environment variables
dotenvConfig({ path: ".env" });

export const AppDataSource = new DataSource({
  name: "default",
  type: "mssql",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "1433"),
  username: process.env.DB_USERNAME || "sa",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "testdb",
  synchronize: false,
  logging: true,
  entities: [join(__dirname, "..", "database/entity", "*.{ts,js}")],
  migrations: [join(__dirname, "..", "database/migration", "*.{ts,js}")],
  options: {
    encrypt: true,
    trustServerCertificate: true, // <— allow self-signed certs
  },
});

// Initialize the database connection
export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log("Database connection has been initialized successfully.");
  } catch (error) {
    console.error("Error during Data Source initialization:", error);
    throw error;
  }
};
