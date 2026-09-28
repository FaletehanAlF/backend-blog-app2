const fs = require("fs");

// Hapus file upload jika validasi gagal agar tidak ada file yatim.
// Penting untuk route multipart/form-data (posts).
function discardUpload(file) {
    if (!file) {
        return;
    }
    fs.unlink(file.path, (err) => {
        if (err && err.code !== "ENOENT") {
            console.warn("Gagal menghapus file upload:", err.message);
        }
    });
}

// Middleware generik untuk validasi Zod.
// Pemakaian di route: router.post("/", uploadSingle, validate(schema), controller)
function validate(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body || {});

        if (!result.success) {
            discardUpload(req.file);
            const firstIssue = result.error && result.error.issues ? result.error.issues[0] : null;
            const message = firstIssue && firstIssue.message ? firstIssue.message : "Data tidak valid";
            return res.status(400).json({
                success: false,
                message
            });
        }

        // Pakai data hasil parse (sudah dinormalisasi + coerce tipe).
        req.body = result.data;
        next();
    };
}

module.exports = validate;
