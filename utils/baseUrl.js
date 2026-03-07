const DEFAULT_LOCAL_URL = 'http://localhost:3000';

function normalizeUrl(url) {
    return url ? String(url).trim().replace(/\/+$/, '') : null;
}

function getBaseUrl(req) {
    const envUrl = normalizeUrl(process.env.BASE_URL);
    if (envUrl) {
        return envUrl;
    }

    const hostHeader = req.get('x-forwarded-host') || req.get('host');
    if (hostHeader) {
        const protocolHeader = req.get('x-forwarded-proto');
        const protocol = protocolHeader ? protocolHeader.split(',')[0].trim() : req.protocol;
        return `${protocol}://${hostHeader}`;
    }

    return DEFAULT_LOCAL_URL;
}

module.exports = {
    getBaseUrl
};
