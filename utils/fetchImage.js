const crypto = require("crypto");
const dns = require("dns").promises;
const fs = require("fs");
const path = require("path");

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15000;

const ALLOWED_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
};

function isPrivateIp(ip) {
    if (!ip || typeof ip !== "string") {
        return true;
    }
    const low = ip.toLowerCase();
    if (low.includes(":")) {
        return (
            low === "::1" ||
            low.startsWith("fe80") ||
            low.startsWith("fc") ||
            low.startsWith("fd")
        );
    }
    const parts = low.split(".").map(Number);
    if (
        parts.length !== 4 ||
        parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
    ) {
        return true;
    }
    const [a, b] = parts;
    return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 169 && b === 254)
    );
}

function isIpLiteral(host) {
    return /^[\d.]+$/.test(host) || host.includes(":");
}

function isBlockedHost(hostname) {
    const host = hostname.toLowerCase().replace(/\.$/, "");
    if (host === "localhost" || host === "ip6-localhost") {
        return true;
    }
    // Cek IP privat hanya untuk IP literal; hostname dicek via DNS di bawah.
    if (isIpLiteral(host) && isPrivateIp(host)) {
        return true;
    }
    return false;
}

// Pengaman sederhana anti-SSRF: hanya host publik yang boleh diakses.
async function assertPublicUrl(urlString) {
    let url;
    try {
        url = new URL(urlString);
    } catch (_) {
        throw new Error("Link gambar tidak valid");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Link gambar harus memakai http atau https");
    }
    if (isBlockedHost(url.hostname)) {
        throw new Error("Link gambar tidak diizinkan");
    }
    let records;
    try {
        records = await dns.lookup(url.hostname, { all: true });
    } catch (_) {
        throw new Error("Link gambar tidak dapat dijangkau");
    }
    if (!records.length || records.some((r) => isPrivateIp(r.address))) {
        throw new Error("Link gambar tidak diizinkan");
    }
    return url;
}

// Mengunduh gambar dari URL lalu menyimpannya ke folder uploads.
// Mengembalikan path publik (contoh: /uploads/xxx.jpg).
// Melempar Error berbahasa Indonesia bila link tidak memenuhi aturan.
async function downloadImageToUploads(urlString, uploadsDir) {
    const url = await assertPublicUrl(urlString);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response;
    try {
        response = await fetch(url.toString(), {
            signal: controller.signal,
            redirect: "follow"
        });
    } catch (err) {
        if (err && err.name === "AbortError") {
            throw new Error("Mengunduh gambar terlalu lama");
        }
        throw new Error("Link gambar tidak dapat dijangkau");
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        throw new Error("Link gambar tidak dapat dijangkau");
    }

    const contentType = (response.headers.get("content-type") || "")
        .split(";")[0]
        .trim()
        .toLowerCase();
    const ext = ALLOWED_MIME[contentType];
    if (!ext) {
        throw new Error("Link tersebut bukan gambar JPG, PNG, atau WebP");
    }

    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_FILE_SIZE) {
        throw new Error("Ukuran gambar dari link melebihi 2 MB");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
        throw new Error("Link gambar tidak dapat dijangkau");
    }
    if (buffer.length > MAX_FILE_SIZE) {
        throw new Error("Ukuran gambar dari link melebihi 2 MB");
    }

    const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    await fs.promises.writeFile(path.join(uploadsDir, filename), buffer);
    return `/uploads/${filename}`;
}

module.exports = {
    downloadImageToUploads,
    MAX_FILE_SIZE
};
