const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const db = require("./db");
const categoriesRouter = require("./routes/categories");
const postsRouter = require("./routes/posts");

const app = express();
const PORT = Number(process.env.PORT) || 8000;

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(__dirname, "uploads");
try {
    fs.mkdirSync(uploadsDir, { recursive: true });
} catch (err) {
    console.warn("Tidak dapat menyiapkan folder uploads:", err.message);
}

app.use("/uploads", express.static(uploadsDir));

app.use("/categories", categoriesRouter);
app.use("/posts", postsRouter);

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "NARATA Backend berjalan!"
    });
});

app.get("/health", (req, res) => {
    db.query("SELECT 1", (err) => {
        if (err) {
            return res.status(503).json({
                success: false,
                message: "Database tidak dapat dijangkau"
            });
        }

        res.json({
            success: true,
            message: "NARATA Backend siap"
        });
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`
    });
});

app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    console.error("Unhandled error:", err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.expose ? err.message : "Terjadi kesalahan pada server"
    });
});

const server = app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log(`Folder uploads dilayani dari: ${uploadsDir}`);
});

server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(
            `Port ${PORT} sudah dipakai proses lain. ` +
            `Hentikan server lama lalu jalankan ulang backend ini.`
        );
    } else {
        console.error("Server error:", err.message);
    }
    process.exit(1);
});

function shutdown(signal) {
    console.log(`Menerima ${signal}, menutup server...`);
    server.close(() => {
        db.end(() => process.exit(0));
        setTimeout(() => process.exit(0), 5000).unref();
    });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
});

module.exports = app;
