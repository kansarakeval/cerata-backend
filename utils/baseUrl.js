const DEFAULT_LOCAL_URL = 'http://localhost:3000';

function normalizeUrl(url) {
    return url ? String(url).trim().replace(/\/+$/, '') : null;
}

function getBaseUrl(req) {
    const envUrl = normalizeUrl(process.env.BASE_URL);
    if (envUrl) {
        return envUrl;
    }

    // Check for x-forwarded headers (when behind a proxy like Nginx)
    const hostHeader = req.get('x-forwarded-host') || req.get('host');
    if (hostHeader) {
        const protocolHeader = req.get('x-forwarded-proto');
        const protocol = protocolHeader ? protocolHeader.split(',')[0].trim() : req.protocol;
        return `${protocol}://${hostHeader}`;
    }

    return DEFAULT_LOCAL_URL;
}

function getUploadsBaseUrl(req) {
    const baseUrl = getBaseUrl(req);
    // Use /uploads path (not /api/uploads) for consistency
    return `${baseUrl}/uploads`;
}

// Helper function to get absolute file path
function getUploadsPath(subfolder = '') {
    const path = require('path');
    const uploadsRoot = path.join(__dirname, '..', 'uploads');
    return subfolder ? path.join(uploadsRoot, subfolder) : uploadsRoot;
}

module.exports = {
    getBaseUrl,
    getUploadsBaseUrl,
    getUploadsPath
};