const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const db = require("../db");

// Konfigurasi multer untuk upload gambar artikel (tahap 1: hanya POST /posts)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../uploads/"));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedExt = [".jpg", ".jpeg", ".png", ".webp"];
    const allowedMime = ["image/jpeg", "image/png", "image/webp"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExt.includes(ext) && allowedMime.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Format file tidak valid. Hanya jpg, jpeg, png, webp yang diizinkan"));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
});

// Wrapper agar error multer (file tidak valid / melebihi ukuran)
// direspons sebagai JSON 400 yang jelas, hanya dipakai di POST /
function uploadSingle(req, res, next) {
    upload.single("image")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    success: false,
                    message: "Ukuran file maksimal 2 MB"
                });
            }
            return res.status(400).json({
                success: false,
                message: err.message
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        next();
    });
};

// Menampilkan semua artikel
router.get("/", (req, res) => {
    const sql = `
        SELECT
            posts.id,
            posts.title,
            posts.content,
            posts.image,
            posts.category_id,
            categories.name AS category_name,
            posts.created_at
        FROM posts
        JOIN categories
            ON posts.category_id = categories.id
        ORDER BY posts.id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Gagal mengambil data artikel"
            });
        }

        res.json({
            success: true,
            data: results
        });
    });
});

// Menampilkan detail artikel
router.get("/:id", (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT
            posts.id,
            posts.title,
            posts.content,
            posts.image,
            posts.category_id,
            categories.name AS category_name,
            posts.created_at
        FROM posts
        JOIN categories
            ON posts.category_id = categories.id
        WHERE posts.id = ?
    `;

    db.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Gagal mengambil artikel"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Artikel tidak ditemukan"
            });
        }

        res.json({
            success: true,
            data: results[0]
        });
    });
});

// Menambahkan artikel
router.post("/", uploadSingle, (req, res) => {
    const { title, content, category_id } = req.body || {};

    if (!title || !content || !category_id) {
        return res.status(400).json({
            success: false,
            message: "Title, content, dan category_id wajib diisi"
        });
    }

    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const sql = `
        INSERT INTO posts
        (title, content, image, category_id)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [title, content, image, category_id],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Gagal menambahkan artikel"
                });
            }

            res.status(201).json({
                success: true,
                message: "Artikel berhasil ditambahkan",
                data: {
                    id: result.insertId,
                    title,
                    content,
                    image,
                    category_id
                }
            });
        }
    );
});

// Mengubah artikel
router.put("/:id", (req, res) => {
    const { id } = req.params;
    const { title, content, image, category_id } = req.body;

    if (!title || !content || !category_id) {
        return res.status(400).json({
            success: false,
            message: "Title, content, dan category_id wajib diisi"
        });
    }

    const sql = `
        UPDATE posts
        SET title = ?, content = ?, image = ?, category_id = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [title, content, image || null, category_id, id],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Gagal mengubah artikel"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Artikel tidak ditemukan"
                });
            }

            res.json({
                success: true,
                message: "Artikel berhasil diubah"
            });
        }
    );
});

// Menghapus artikel
router.delete("/:id", (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM posts WHERE id = ?";

    db.query(sql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Gagal menghapus artikel"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Artikel tidak ditemukan"
            });
        }

        res.json({
            success: true,
            message: "Artikel berhasil dihapus"
        });
    });
});

module.exports = router;