const db = require("../db");
const { parseId, fail } = require("../utils/validate");

const LIST_SQL = "SELECT id, name FROM categories ORDER BY id DESC";

function getCategories(req, res) {
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
}

// Body sudah divalidasi Zod oleh middleware validate().
// req.body: { name }
function createCategory(req, res) {
    const name = req.body.name;

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
}

// Body sudah divalidasi Zod oleh middleware validate().
function updateCategory(req, res) {
    const id = parseId(req.params.id);
    if (!id) {
        return fail(res, 400, "Id kategori tidak valid");
    }

    const name = req.body.name;

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
}

function deleteCategory(req, res) {
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
}

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
};
