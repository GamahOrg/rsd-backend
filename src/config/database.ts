import { DataSource } from "typeorm";
import { config as dotenvConfig } from "dotenv";
import { join } from "path";
import { BetterAuthUser } from "../lib/BetterAuthUser.entity";

// Load environment variables
dotenvConfig({ path: ".env" });

// Users database (better-auth)
export const UsersDataSource = new DataSource({
  name: "users_data",
  type: "mssql",
  host: process.env.USERS_DB_HOST || "localhost",
  port: parseInt(process.env.USERS_DB_PORT || "1433"),
  username: process.env.USERS_DB_USERNAME || "sa",
  password: process.env.USERS_DB_PASSWORD || "",
  database: process.env.USERS_DB_NAME || "users",
  synchronize: false,
  logging: false,
  entities: [BetterAuthUser],
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
});

export const AppDataSource = new DataSource({
  name: "default",
  type: "mssql",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "1433"),
  username: process.env.DB_USERNAME || "sa",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "testdb",
  synchronize: false,
  logging: false,
  entities: [join(__dirname, "..", "database/entity", "*.{ts,js}")],
  migrations: [join(__dirname, "..", "database/migration", "*.{ts,js}")],
  options: {
    encrypt: true,
    trustServerCertificate: true, // <— allow self-signed certs
  },
  extra: {
    requestTimeout: 60000, // 60 seconds
  },
});

export const MapDataSource = new DataSource({
  name: "map_data",
  type: "postgres",
  host: process.env.MAP_DB_HOST || "localhost",
  port: parseInt(process.env.MAP_DB_PORT || "1433"),
  username: process.env.MAP_DB_USERNAME || "sa",
  password: process.env.MAP_DB_PASSWORD || "",
  database: process.env.MAP_DB_NAME || "testdb",
  synchronize: false,
  logging: false,
});

export const InquiryDataSource = new DataSource({
  name: "shared_config",
  type: "mssql",
  host: process.env.INQUIRY_DB_HOST || "localhost",
  port: parseInt(process.env.INQUIRY_DB_PORT || "1433"),
  username: process.env.INQUIRY_DB_USERNAME || "sa",
  password: process.env.INQUIRY_DB_PASSWORD || "",
  database: process.env.INQUIRY_DB_NAME || "testdb",
  synchronize: false,
  logging: false,
  options: {
    encrypt: true,
    trustServerCertificate: true, // <— allow self-signed certs
  },
});

// export const RERDataSource = new DataSource({
//   name: "rer_data",
//   type: "mssql",
//   host: process.env.RER_DB_HOST || "localhost",
//   port: parseInt(process.env.RER_DB_PORT || "1433"),
//   username: process.env.RER_DB_USERNAME || "sa",
//   password: process.env.RER_DB_PASSWORD || "",
//   database: process.env.RER_DB_NAME || "testdb",
//   synchronize: false,
//   logging: false,
//   options: {
//     encrypt: true,
//     trustServerCertificate: true, // <— allow self-signed certs
//   },
//   extra: {
//     requestTimeout: 60000, // 60 seconds timeout
//   },
// });
export const XDataSource = new DataSource({
  name: "x_data",
  type: "mssql",
  host: process.env.X_DB_HOST || "localhost",
  port: parseInt(process.env.X_DB_PORT || "1433"),
  username: process.env.X_DB_USERNAME || "sa",
  password: process.env.X_DB_PASSWORD || "",
  database: process.env.X_DB_NAME || "testdb",
  synchronize: false,
  logging: false,
  entities: [join(__dirname, "..", "database/entity", "*.{ts,js}")],
  // migrations: [join(__dirname, "..", "database/migration", "*.{ts,js}")],
  options: {
    encrypt: true,
    trustServerCertificate: true, // <— allow self-signed certs
  },
  extra: {
    requestTimeout: 60000, // 60 seconds
  },
});

// Initialize the database connection
export const initializeAppDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log("Database connection has been initialized successfully.");
  } catch (error) {
    console.error("Error during Data Source initialization:", error);
    throw error;
  }
};

export const initializeXDatabase = async (): Promise<void> => {
  try {
    await XDataSource.initialize();
    console.log("X Database connection has been initialized successfully.");
  } catch (error) {
    console.error("Error during X Data Source initialization:", error);
    throw error;
  }
};

// export const initializeRERDatabase = async (): Promise<void> => {
//   try {
//     await RERDataSource.initialize();
//     console.log("RER Database connection has been initialized successfully.");
//   } catch (error) {
//     console.error("Error during RER Data Source initialization:", error);
//     throw error;
//   }
// };

export const initializeMapDatabase = async (): Promise<void> => {
  try {
    await MapDataSource.initialize();
    console.log("Map Database connection has been initialized successfully.");
  } catch (error) {
    console.error("Error during Map Data Source initialization:", error);
    throw error;
  }
};

export const initializeUsersDatabase = async (): Promise<void> => {
  try {
    await UsersDataSource.initialize();
    console.log("Users Database connection has been initialized successfully.");
  } catch (error) {
    console.error("Error during Users Data Source initialization:", error);
    throw error;
  }
};

export const initializeInquiryDatabase = async (): Promise<void> => {
  try {
    await InquiryDataSource.initialize();
    console.log("Inquiry Database connection has been initialized successfully.");
  } catch (error) {
    console.error("Error during Inquiry Data Source initialization:", error);
    throw error;
  }
};
