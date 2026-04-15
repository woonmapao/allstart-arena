// db/db.ts
import mysql from 'mysql2/promise';



const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  ssl: {
    rejectUnauthorized: true,
  }
});

export default pool;
