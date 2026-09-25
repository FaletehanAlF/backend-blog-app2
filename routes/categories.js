const express = require("express");
const router = express.Router();
const db = require("../db");
const { parseId, normalizeText, fail } = require("../utils/validate");

const MAX_NAME_LENGTH = 60;

const LIST_SQL = "SELECT id, name FROM categories ORDER BY id DESC";

function readName(req) {
    const name = normalizeText(req.body ? req.body.name : "");
    if (!name) {
        return { error: "Nama kategori wajib diisi" };
    }
    if (name.length > MAX_NAME_LENGTH) {
        return { error: `Nama kategori maksimal ${MAX_NAME_LENGTH} karakter` };
    }
    return { name };
}

router.get("/", (req, res) => {
    db.query(LIST_SQL, (err, results) => {
        if (err) {
            console.error("Gagal mengambil kategori:", err.message);
            return fail(res, 500, "Gagal mengambil data kategori");
        }

        res.json({
            success: true,
            data: results
        });
    });
});

router.post("/", (req, res) => {
    const { name, error } = readName(req);
    if (error) {
        return fail(res, 400, error);
    }

    const sql = "INSERT INTO categories (name) VALUES (?)";

    db.query(sql, [name], (err, result) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return fail(res, 409, `Kategori "${name}" sudah ada`);
            }
            console.error("Gagal menambahkan kategori:", err.message);
            return fail(res, 500, "Gagal menambahkan kategori");
        }

        res.status(201).json({
            success: true,
            message: "Kategori berhasil ditambahkan",
            data: {
                id: result.insertId,
                name
            }
        });
    });
});

router.put("/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) {
        return fail(res, 400, "Id kategori tidak valid");
    }

    const { name, error } = readName(req);
    if (error) {
        return fail(res, 400, error);
    }

    const sql = "UPDATE categories SET name = ? WHERE id = ?";

    db.query(sql, [name, id], (err, result) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return fail(res, 409, `Kategori "${name}" sudah ada`);
            }
            console.error("Gagal mengubah kategori:", err.message);
            return fail(res, 500, "Gagal mengubah kategori");
        }

        if (result.affectedRows === 0) {
            return fail(res, 404, "Kategori tidak ditemukan");
        }

        res.json({
            success: true,
            message: "Kategori berhasil diubah"
        });
    });
});

router.delete("/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) {
        return fail(res, 400, "Id kategori tidak valid");
    }

    db.query(
        "SELECT COUNT(*) AS total FROM posts WHERE category_id = ?",
        [id],
        (countErr, countRows) => {
            if (countErr) {
                console.error("Gagal memeriksa kategori:", countErr.message);
                return fail(res, 500, "Gagal menghapus kategori");
            }

            if (Number(countRows[0].total) > 0) {
                return fail(
                    res,
                    409,
                    "Kategori tidak dapat dihapus karena masih digunakan oleh artikel"
                );
            }

            db.query("DELETE FROM categories WHERE id = ?", [id], (err, result) => {
                if (err) {
                    console.error("Gagal menghapus kategori:", err.message);
                    return fail(res, 500, "Gagal menghapus kategori");
                }

                if (result.affectedRows === 0) {
                    return fail(res, 404, "Kategori tidak ditemukan");
                }

                res.json({
                    success: true,
                    message: "Kategori berhasil dihapus"
                });
            });
        }
    );
});

module.exports = router;
