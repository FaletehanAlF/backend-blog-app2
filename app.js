const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const db = require("./db");
const categoriesRouter = require("./routes/categories");
const postsRouter = require("./routes/posts");

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

// Satu-satunya folder file gambar. __dirname membuat path absolut terhadap
// lokasi app.js sehingga tidak bergantung pada current working directory.
// Folder dibuat otomatis bila belum ada agar hasil upload Multer selalu
// bisa dilayani via GET /uploads/<filename>.
const uploadsDir = path.join(__dirname, "uploads");
try {
    fs.mkdirSync(uploadsDir, { recursive: true });
} catch (err) {
    console.warn("Tidak dapat menyiapkan folder uploads:", err.message);
}

app.use(
  "/uploads",
  express.static(uploadsDir)
);

app.use("/categories", categoriesRouter);
app.use("/posts", postsRouter);

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "NARATA Backend berjalan!"
    });
});

const server = app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log(`Folder uploads dilayani dari: ${uploadsDir}`);
});

// Jika port sudah dipakai server lama, proses baru gagal bind dan server
// lama (yang mungkin belum punya static /uploads) yang terus menjawab.
// Pesan ini membuat kondisi tersebut langsung terlihat.
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