const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directories
const createUploadDirs = () => {
    const baseDir = path.join(__dirname, '..', 'uploads');
    const dirs = ['categories', 'products', 'learns', 'others'];
    
    // Create main uploads directory
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
        console.log(`Created directory: ${baseDir}`);
    }
    
    // Create subdirectories
    dirs.forEach(dir => {
        const dirPath = path.join(baseDir, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`Created directory: ${dirPath}`);
        }
    });
};

createUploadDirs();

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const baseDir = path.join(__dirname, '..', 'uploads');
        let uploadPath = baseDir;

        // Route priority matters: learn category routes also include "/categories".
        if (req.originalUrl.includes('/learn')) {
            uploadPath = path.join(baseDir, 'learns');
        } else if (req.originalUrl.includes('/categories')) {
            uploadPath = path.join(baseDir, 'categories');
        } else if (req.originalUrl.includes('/products')) {
            uploadPath = path.join(baseDir, 'products');
        } else {
            uploadPath = path.join(baseDir, 'others');
        }
        
        // Ensure directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
            console.log(`Created directory: ${uploadPath}`);
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp and random number
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const uniqueName = `${timestamp}-${random}${ext}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

// Middleware wrapper with better error handling
const uploadMiddleware = (uploadType, fieldName = 'image') => {
    return (req, res, next) => {
        uploadType(req, res, (err) => {
            if (err) {
                console.error('Upload error:', err);
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: 'File too large. Maximum size is 5MB.'
                    });
                }
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    return res.status(400).json({
                        success: false,
                        message: `Unexpected field. Expected "${fieldName}"`
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: err.message || 'File upload failed'
                });
            }
            next();
        });
    };
};

module.exports = {
    uploadCategory: uploadMiddleware(upload.single('image')),
    uploadProduct: uploadMiddleware(upload.single('image')),
    uploadLearn: uploadMiddleware(upload.single('image')),
    upload
};