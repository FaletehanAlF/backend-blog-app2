const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const router = express.Router();
const db = require("../db");
const { parseId, normalizeText, fail } = require("../utils/validate");

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 20000;
const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

const uploadsDir = path.join(__dirname, "../uploads");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ALLOWED_EXT.includes(ext) && ALLOWED_MIME.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Format file tidak valid. Hanya jpg, jpeg, png, webp yang diizinkan"));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: MAX_FILE_SIZE }
});

function discardUpload(file) {
    if (!file) return;
    fs.unlink(file.path, (err) => {
        if (err && err.code !== "ENOENT") {
            console.warn("Gagal menghapus file upload:", err.message);
        }
    });
}

function discardStoredImage(imagePath) {
    if (typeof imagePath !== "string" || !imagePath.startsWith("/uploads/")) {
        return;
    }

    const target = path.join(uploadsDir, path.basename(imagePath));
    fs.unlink(target, (err) => {
        if (err && err.code !== "ENOENT") {
            console.warn("Gagal menghapus gambar artikel:", err.message);
        }
    });
}

function uploadSingle(req, res, next) {
    upload.single("image")(req, res, (err) => {
        if (!err) {
            return next();
        }

        discardUpload(req.file);

        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
            return fail(res, 400, "Ukuran file maksimal 2 MB");
        }

        return fail(res, 400, err.message);
    });
}

const POST_COLUMNS = `
    posts.id,
    posts.title,
    posts.content,
    posts.image,
    posts.category_id,
    categories.name AS category_name,
    posts.created_at
`;

const POST_JOIN = `
    FROM posts
    LEFT JOIN categories
        ON posts.category_id = categories.id
`;

function readPayload(req) {
    const body = req.body || {};
    const title = normalizeText(body.title);
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const categoryId = parseId(body.category_id);

    if (!title) {
        return { error: "Judul artikel wajib diisi" };
    }
    if (title.length > MAX_TITLE_LENGTH) {
        return { error: `Judul artikel maksimal ${MAX_TITLE_LENGTH} karakter` };
    }
    if (!content) {
        return { error: "Isi artikel wajib diisi" };
    }
    if (content.length > MAX_CONTENT_LENGTH) {
        return { error: `Isi artikel maksimal ${MAX_CONTENT_LENGTH} karakter` };
    }
    if (!categoryId) {
        return { error: "category_id wajib diisi dan berupa angka" };
    }

    return { title, content, categoryId };
}

function categoryExists(categoryId, res, callback) {
    db.query(
        "SELECT id FROM categories WHERE id = ?",
        [categoryId],
        (err, rows) => {
            if (err) {
                console.error("Gagal memeriksa kategori:", err.message);
                fail(res, 500, "Gagal memproses artikel");
                return;
            }
            if (rows.length === 0) {
                fail(res, 400, "Kategori tidak ditemukan");
                return;
            }
            callback();
        }
    );
}

router.get("/", (req, res) => {
    const conditions = [];
    const params = [];

    const categoryId = parseId(req.query.category_id);
    if (req.query.category_id !== undefined) {
        if (!categoryId) {
            return fail(res, 400, "category_id tidak valid");
        }
        conditions.push("posts.category_id = ?");
        params.push(categoryId);
    }

    const search = normalizeText(req.query.search);
    if (search) {
        conditions.push("(posts.title LIKE ? OR posts.content LIKE ?)");
        params.push(`%${search}%`, `%${search}%`);
    }

    let sql = `
        SELECT ${POST_COLUMNS}
        ${POST_JOIN}
    `;
    if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    sql += " ORDER BY posts.id DESC";

    if (req.query.limit !== undefined || req.query.offset !== undefined) {
        const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
        const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);

        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
            return fail(res, 400, "limit harus berupa angka antara 1 sampai 100");
        }
        if (!Number.isInteger(offset) || offset < 0) {
            return fail(res, 400, "offset harus berupa angka nol atau lebih");
        }

        sql += " LIMIT ? OFFSET ?";
        params.push(limit, offset);
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Gagal mengambil artikel:", err.message);
            return fail(res, 500, "Gagal mengambil data artikel");
        }

        res.json({
            success: true,
            data: results
        });
    });
});

router.get("/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) {
        return fail(res, 400, "Id artikel tidak valid");
    }

    const sql = `
        SELECT ${POST_COLUMNS}
        ${POST_JOIN}
        WHERE posts.id = ?
    `;

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error("Gagal mengambil artikel:", err.message);
            return fail(res, 500, "Gagal mengambil artikel");
        }

        if (results.length === 0) {
            return fail(res, 404, "Artikel tidak ditemukan");
        }

        res.json({
            success: true,
            data: results[0]
        });
    });
});

router.post("/", uploadSingle, (req, res) => {
    const { title, content, categoryId, error } = readPayload(req);
    if (error) {
        discardUpload(req.file);
        return fail(res, 400, error);
    }

    categoryExists(categoryId, res, () => {
        const image = req.file ? `/uploads/${req.file.filename}` : null;

        const sql = `
            INSERT INTO posts
            (title, content, image, category_id)
            VALUES (?, ?, ?, ?)
        `;

        db.query(sql, [title, content, image, categoryId], (err, result) => {
            if (err) {
                discardUpload(req.file);
                console.error("Gagal menambahkan artikel:", err.message);
                return fail(res, 500, "Gagal menambahkan artikel");
            }

            res.status(201).json({
                success: true,
                message: "Artikel berhasil ditambahkan",
                data: {
                    id: result.insertId,
                    title,
                    content,
                    image,
                    category_id: categoryId
                }
            });
        });
    });
});

router.put("/:id", uploadSingle, (req, res) => {
    const id = parseId(req.params.id);
    if (!id) {
        discardUpload(req.file);
        return fail(res, 400, "Id artikel tidak valid");
    }

    const { title, content, categoryId, error } = readPayload(req);
    if (error) {
        discardUpload(req.file);
        return fail(res, 400, error);
    }

    categoryExists(categoryId, res, () => {
        db.query("SELECT image FROM posts WHERE id = ?", [id], (findErr, rows) => {
            if (findErr) {
                discardUpload(req.file);
                console.error("Gagal mencari artikel:", findErr.message);
                return fail(res, 500, "Gagal mengubah artikel");
            }

            if (rows.length === 0) {
                discardUpload(req.file);
                return fail(res, 404, "Artikel tidak ditemukan");
            }

            const previousImage = rows[0].image;

            let image;
            if (req.file) {
                image = `/uploads/${req.file.filename}`;
            } else if (Object.prototype.hasOwnProperty.call(req.body, "image")) {
                const raw = req.body.image;
                image = typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
            } else {
                image = previousImage;
            }

            const sql = `
                UPDATE posts
                SET title = ?, content = ?, image = ?, category_id = ?
                WHERE id = ?
            `;

            db.query(sql, [title, content, image, categoryId, id], (err, result) => {
                if (err) {
                    discardUpload(req.file);
                    console.error("Gagal mengubah artikel:", err.message);
                    return fail(res, 500, "Gagal mengubah artikel");
                }

                if (result.affectedRows === 0) {
                    discardUpload(req.file);
                    return fail(res, 404, "Artikel tidak ditemukan");
                }

                if (previousImage && previousImage !== image) {
                    discardStoredImage(previousImage);
                }

                res.json({
                    success: true,
                    message: "Artikel berhasil diubah"
                });
            });
        });
    });
});

router.delete("/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) {
        return fail(res, 400, "Id artikel tidak valid");
    }

    db.query("SELECT image FROM posts WHERE id = ?", [id], (findErr, rows) => {
        if (findErr) {
            console.error("Gagal mencari artikel:", findErr.message);
            return fail(res, 500, "Gagal menghapus artikel");
        }

        if (rows.length === 0) {
            return fail(res, 404, "Artikel tidak ditemukan");
        }

        db.query("DELETE FROM posts WHERE id = ?", [id], (err, result) => {
            if (err) {
                console.error("Gagal menghapus artikel:", err.message);
                return fail(res, 500, "Gagal menghapus artikel");
            }

            if (result.affectedRows === 0) {
                return fail(res, 404, "Artikel tidak ditemukan");
            }

            discardStoredImage(rows[0].image);

            res.json({
                success: true,
                message: "Artikel berhasil dihapus"
            });
        });
    });
});

module.exports = router;
