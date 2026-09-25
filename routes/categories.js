const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
    const sql = "SELECT * FROM categories ORDER BY id DESC";

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Gagal mengambil data kategori"
            });
        }

        res.json({
            success: true,
            data: results
        });
    });
});

router.post("/", (req, res) => {
    const { name } = req.body;

    if (!name || name.trim() === "") {
        return res.status(400).json({
            success: false,
            message: "Nama kategori wajib diisi"
        });
    }

    const sql = "INSERT INTO categories (name) VALUES (?)";

    db.query(sql, [name.trim()], (err, result) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Gagal menambahkan kategori"
            });
        }

        res.status(201).json({
            success: true,
            message: "Kategori berhasil ditambahkan",
            data: {
                id: result.insertId,
                name: name.trim()
            }
        });
    });
});

router.put("/:id", (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === "") {
        return res.status(400).json({
            success: false,
            message: "Nama kategori wajib diisi"
        });
    }

    const sql = "UPDATE categories SET name = ? WHERE id = ?";

    db.query(sql, [name.trim(), id], (err, result) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Gagal mengubah kategori"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Kategori tidak ditemukan"
            });
        }

        res.json({
            success: true,
            message: "Kategori berhasil diubah"
        });
    });
});

router.delete("/:id", (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM categories WHERE id = ?";

    db.query(sql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Gagal menghapus kategori"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Kategori tidak ditemukan"
            });
        }

        res.json({
            success: true,
            message: "Kategori berhasil dihapus"
        });
    });
});

module.exports = router;