const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directories
const createUploadDirs = () => {
    const dirs = ['uploads/categories', 'uploads/products', 'uploads/learns'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    });
};

createUploadDirs();

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = 'uploads/';

        // Route priority matters: learn category routes also include "/categories".
        if (req.originalUrl.includes('/learn')) {
            uploadPath += 'learns/';
        } else if (req.originalUrl.includes('/categories')) {
            uploadPath += 'categories/';
        } else if (req.originalUrl.includes('/products')) {
            uploadPath += 'products/';
        } else {
            uploadPath += 'others/';
        }
        
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueName + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

// Middleware wrapper
const uploadMiddleware = (uploadType) => {
    return (req, res, next) => {
        uploadType(req, res, (err) => {
            if (err) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: 'File too large. Maximum size is 5MB.'
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            next();
        });
    };
};

module.exports = {
    uploadCategory: uploadMiddleware(upload.single('image')),
    uploadProduct: uploadMiddleware(upload.single('image')),
    uploadLearn: uploadMiddleware(upload.single('image'))
};
