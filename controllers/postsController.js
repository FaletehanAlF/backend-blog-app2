const fs = require("fs");
const path = require("path");
const db = require("../db");
const { parseId, normalizeText, fail } = require("../utils/validate");

const uploadsDir = path.join(__dirname, "../uploads");

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

function getPosts(req, res) {
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
}

function getPostById(req, res) {
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
}

// Body sudah divalidasi Zod oleh middleware validate().
// req.body: { title, content, category_id, image? }
function createPost(req, res) {
    const title = req.body.title;
    const content = req.body.content;
    const categoryId = req.body.category_id;

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
}

// Body sudah divalidasi Zod oleh middleware validate().
function updatePost(req, res) {
    const id = parseId(req.params.id);
    if (!id) {
        discardUpload(req.file);
        return fail(res, 400, "Id artikel tidak valid");
    }

    const title = req.body.title;
    const content = req.body.content;
    const categoryId = req.body.category_id;

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
}

function deletePost(req, res) {
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
}

module.exports = {
    getPosts,
    getPostById,
    createPost,
    updatePost,
    deletePost
};
