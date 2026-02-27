const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
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

// Create uploads directory
const fs = require('fs');
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    ['categories', 'products', 'learns', 'others'].forEach(subDir => {
        const dirPath = path.join(uploadDir, subDir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    });
    console.log('📁 Upload directories created');
}

// Connect to MongoDB
connectDB();

// CORS configuration - allow any origin and support credentials
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Handle preflight requests
app.options('*', cors({
    origin: true,
    credentials: true
}));

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

// Serve static files (disable cache to avoid stale images after updates)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    etag: false,
    lastModified: false,
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
    }
}));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
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
            users: '/api/users'
        }
    });
});

// Health check route - FIXED to be at root level
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
    
    🔗 Health Check: http://localhost:${PORT}/health
    🔐 Login Endpoint: http://localhost:${PORT}/api/auth/login
    `);
});
