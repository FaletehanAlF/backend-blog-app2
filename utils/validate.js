function parseId(value) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        return null;
    }
    return id;
}

function normalizeText(value) {
    if (typeof value !== "string") {
        return "";
    }
    return value.replace(/\s+/g, " ").trim();
}

function fail(res, status, message) {
    return res.status(status).json({
        success: false,
        message
    });
}

module.exports = {
    parseId,
    normalizeText,
    fail
};
