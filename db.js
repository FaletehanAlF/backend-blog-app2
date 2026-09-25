const mysql = require("mysql2");

const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "narata_blog_2",
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE) || 10,
    queueLimit: 0,
    charset: "utf8mb4",
    dateStrings: true
});

let ready = false;

db.query("SELECT 1", (err) => {
    if (err) {
        console.error("Koneksi database gagal:", err.message);
        return;
    }

    ready = true;
    console.log("Database berhasil terhubung!");
});

function isReady() {
    return ready;
}

module.exports = db;
module.exports.isReady = isReady;
