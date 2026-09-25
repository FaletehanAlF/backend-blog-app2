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