import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config(); 

export const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "CarRentalDB",
  multipleStatements: true
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log(`✅ Connected to MySQL database: ${process.env.DB_NAME}`);
  }
});
