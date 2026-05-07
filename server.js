const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Connect to MongoDB
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const enquiryRoutes = require('./routes/enquiries');
const learnRoutes = require('./routes/learn');
const userRoutes = require('./routes/users');

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = [
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'https://ceratapharma.com',
    'https://www.ceratapharma.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

// Updated CORS configuration for credentials
const corsOptions = {
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log(`CORS blocked for origin: ${origin}`);
            callback(null, false); // Don't block, just don't allow
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Authorization'],
    optionsSuccessStatus: 204
};

// Create uploads directory and subdirectories
const uploadDir = path.join(__dirname, 'uploads');
const subDirs = ['categories', 'products', 'learns', 'others'];

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 Main uploads directory created');
}

subDirs.forEach(subDir => {
    const dirPath = path.join(uploadDir, subDir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Created: ${dirPath}`);
    }
});

// Connect to MongoDB
connectDB();

// CORS configuration - MUST come before other middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// SEO REDIRECTS: Map old ranking URLs to new URLs
app.use((req, res, next) => {
    // Check if the request is for the old Testosterone Enanthate page
    if (req.url === '/product/testosterone-enanthate-api-84') {
        return res.redirect(301, 'https://www.ceratapharma.com/product%20details.html?id=699c24cc8b894deac979e2f1');
    }
    
    // You can add more old ranking pages here in the future
    /*
    if (req.url === '/old-page-link') {
        return res.redirect(301, 'https://www.ceratapharma.com/new-page-link');
    }
    */

    next();
});

// Debug middleware for static file requests
app.use('/uploads', (req, res, next) => {
    console.log(`📁 Static file request: ${req.url}`);
    next();
});

// Serve static files from uploads directory with proper path resolution
const uploadsAbsolutePath = path.resolve(__dirname, 'uploads');
console.log(`📂 Serving static files from: ${uploadsAbsolutePath}`);

// Check if uploads directory exists and is readable
try {
    fs.accessSync(uploadsAbsolutePath, fs.constants.R_OK);
    console.log('✅ Uploads directory is readable');
} catch (err) {
    console.error('❌ Uploads directory is not readable:', err.message);
}

const staticUploadsMiddleware = express.static(uploadsAbsolutePath, {
    etag: false,
    lastModified: false,
    setHeaders: (res, filePath) => {
        // Set proper content type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };
        
        if (contentTypes[ext]) {
            res.setHeader('Content-Type', contentTypes[ext]);
        }
        
        // Disable cache for development, enable short cache for production
        if (process.env.NODE_ENV === 'production') {
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
        } else {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        }
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
    }
});

// Mount static file serving at both /uploads and /api/uploads for compatibility
app.use('/uploads', staticUploadsMiddleware);
app.use('/api/uploads', staticUploadsMiddleware);

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Health check route - MUST be before API routes
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Cerata Pharma API',
        version: '1.0.0',
        database: 'MongoDB',
        uptime: process.uptime()
    });
});

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Cerata Pharma API - MongoDB Version',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            auth: '/api/auth',
            categories: '/api/categories',
            products: '/api/products',
            enquiries: '/api/enquiries',
            learn: '/api/learn',
            users: '/api/users',
            health: '/health'
        }
    });
});

// API health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Cerata Pharma API',
        version: '1.0.0',
        database: 'MongoDB',
        uptime: process.uptime()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/learn', learnRoutes);
app.use('/api/users', userRoutes);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    console.log(`404 Error: Route not found - ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        requestedUrl: req.originalUrl,
        method: req.method
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('🔥 Global error handler:', err);
    
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
    
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🚀 Cerata Pharma Backend - MongoDB Version
    📍 Port: ${PORT}
    🌐 Environment: ${process.env.NODE_ENV || 'development'}
    📁 Uploads path: ${uploadsAbsolutePath}
    
    🔗 Health Check: http://localhost:${PORT}/health
    🔐 Login Endpoint: http://localhost:${PORT}/api/auth/login
    📸 Static Files: http://localhost:${PORT}/uploads/
    `);
    
    // List existing files in uploads directory for debugging
    if (fs.existsSync(path.join(uploadsAbsolutePath, 'products'))) {
        const productFiles = fs.readdirSync(path.join(uploadsAbsolutePath, 'products'));
        console.log(`\n📸 Found ${productFiles.length} product images`);
        if (productFiles.length > 0) {
            console.log(`   Sample: ${productFiles[0]}`);
        }
    }
});