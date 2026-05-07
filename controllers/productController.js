const Product = require('../models/Product');
const Category = require('../models/Category');
const path = require('path');
const fs = require('fs').promises;
const { getUploadsBaseUrl } = require('../utils/baseUrl');

// Helper function
const sanitizeParam = (param) => {
    if (param === undefined || param === null || param === '') {
        return null;
    }
    if (typeof param === 'string') {
        return param.trim() || null;
    }
    return param;
};

// Helper function to delete image
const deleteImage = async (filename) => {
    if (!filename) return false;
    try {
        const imagePath = path.join(__dirname, '..', 'uploads', 'products', filename);
        await fs.access(imagePath);
        await fs.unlink(imagePath);
        return true;
    } catch (err) {
        console.log('Image not found or already deleted:', filename);
        return false;
    }
};

// CREATE Product
exports.createProduct = async (req, res) => {
    try {
        const {
            api_product_name,
            category_id,
            cas_no,
            product_details,
            therapeutic_class,
            grades,
            status = 'active',
            meta_title,
            meta_description,
            meta_keywords,
            form,
            iupac_name,
            country_of_origin,
            purity,
            packing,
            hsn_code
        } = req.body;

        // Validation
        if (!api_product_name || api_product_name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Product name is required'
            });
        }

        if (!category_id) {
            return res.status(400).json({
                success: false,
                message: 'Category is required'
            });
        }

        // Validate category
        const category = await Category.findById(category_id);
        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID'
            });
        }

        // Handle image
        const image = req.file ? req.file.filename : null;

        // Create product
        const product = new Product({
            api_product_name: api_product_name.trim(),
            category_id,
            cas_no: sanitizeParam(cas_no),
            image,
            product_details: sanitizeParam(product_details),
            therapeutic_class: sanitizeParam(therapeutic_class),
            grades: sanitizeParam(grades),
            status,
            meta_title: sanitizeParam(meta_title),
            meta_description: sanitizeParam(meta_description),
            meta_keywords: sanitizeParam(meta_keywords),
            form: sanitizeParam(form),
            iupac_name: sanitizeParam(iupac_name),
            country_of_origin: sanitizeParam(country_of_origin),
            purity: sanitizeParam(purity),
            packing: sanitizeParam(packing),
            hsn_code: sanitizeParam(hsn_code)
        });

        await product.save();

        // Prepare response
        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const productData = product.toJSON();
        productData.image_url = product.image ? `${uploadsBaseUrl}/products/${product.image}` : null;

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: productData
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create product',
            error: error.message
        });
    }
};

// GET All Products
exports.getAllProducts = async (req, res) => {
    try {
        const { status, category, page = 1, limit } = req.query;
        const limitStr = limit === undefined ? 'all' : String(limit).trim().toLowerCase();
        const noPagination = limitStr === 'all' || parseInt(limitStr, 10) === 0;
        const limitNum = noPagination ? 0 : parseInt(limitStr, 10) || 20;

        // Build query
        const query = {};
        if (status && ['active', 'deactive'].includes(status)) {
            query.status = status;
        }
        if (category) {
            query.category_id = category;
        }

        // Pagination
        const skip = (parseInt(page, 10) - 1) * (limitNum || 0);

        const [products, total] = await Promise.all([
            (() => {
                const q = Product.find(query)
                    .populate('category_id', 'category_name')
                    .sort({ created_at: -1 });
                if (!noPagination) {
                    q.skip(skip).limit(limitNum);
                }
                return q;
            })(),
            Product.countDocuments(query)
        ]);

        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const productsWithUrl = products.map(product => {
            const productObj = product.toJSON();
            productObj.image_url = product.image ? `${uploadsBaseUrl}/products/${product.image}` : null;
            productObj.category_name = product.category_id?.category_name || null;
            delete productObj.category_id;
            return productObj;
        });

        const itemsPerPage = noPagination ? total : limitNum;
        const totalPages = noPagination ? 1 : Math.ceil(total / limitNum);

        res.json({
            success: true,
            data: productsWithUrl,
            pagination: {
                currentPage: noPagination ? 1 : parseInt(page, 10),
                totalPages,
                totalItems: total,
                itemsPerPage
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error.message
        });
    }
};

// GET Product by ID
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid product ID format'
            });
        }
        
        const product = await Product.findById(id).populate('category_id', 'category_name');
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const productObj = product.toJSON();
        productObj.image_url = product.image ? `${uploadsBaseUrl}/products/${product.image}` : null;
        productObj.category_name = product.category_id?.category_name || null;
        delete productObj.category_id;

        res.json({
            success: true,
            data: productObj
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product',
            error: error.message
        });
    }
};

// UPDATE Product
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Validate ID
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid product ID format'
            });
        }

        // Find product
        const product = await Product.findById(id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Validate category if provided
        if (updates.category_id) {
            const category = await Category.findById(updates.category_id);
            if (!category) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid category ID'
                });
            }
        }

        // Handle image update
        if (req.file) {
            // Delete old image if exists
            if (product.image) {
                await deleteImage(product.image);
            }
            product.image = req.file.filename;
        }

        // Update fields
        const updatableFields = [
            'api_product_name', 'category_id', 'cas_no', 'product_details',
            'therapeutic_class', 'grades', 'status', 'meta_title',
            'meta_description', 'meta_keywords', 'form', 'iupac_name',
            'country_of_origin', 'purity', 'packing', 'hsn_code'
        ];

        updatableFields.forEach(field => {
            if (updates[field] !== undefined) {
                if (typeof updates[field] === 'string') {
                    product[field] = updates[field].trim() || null;
                } else {
                    product[field] = updates[field];
                }
            }
        });

        await product.save();

        // Get updated product with populated data
        const updatedProduct = await Product.findById(id).populate('category_id', 'category_name');
        
        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const productData = updatedProduct.toJSON();
        productData.image_url = updatedProduct.image ? `${uploadsBaseUrl}/products/${updatedProduct.image}` : null;
        productData.category_name = updatedProduct.category_id?.category_name || null;
        delete productData.category_id;

        res.json({
            success: true,
            message: 'Product updated successfully',
            data: productData
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product',
            error: error.message
        });
    }
};

// DELETE Product
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid product ID format'
            });
        }

        // Find product
        const product = await Product.findById(id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Delete product image
        if (product.image) {
            await deleteImage(product.image);
        }

        // Delete product
        await Product.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Product deleted successfully',
            deletedId: id
        });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete product',
            error: error.message
        });
    }
};

// GET Products by Category
exports.getProductsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { status = 'active' } = req.query;

        // Validate category
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        const query = { category_id: categoryId };
        if (status) {
            query.status = status;
        }

        const products = await Product.find(query)
            .populate('category_id', 'category_name')
            .sort({ api_product_name: 1 });

        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const productsWithUrl = products.map(product => {
            const productObj = product.toJSON();
            productObj.image_url = product.image ? `${uploadsBaseUrl}/products/${product.image}` : null;
            productObj.category_name = product.category_id?.category_name || null;
            delete productObj.category_id;
            return productObj;
        });

        res.json({
            success: true,
            data: productsWithUrl,
            count: products.length
        });
    } catch (error) {
        console.error('Get products by category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error.message
        });
    }
};

// GET Active Products
exports.getActiveProducts = async (req, res) => {
    try {
        const products = await Product.find({ status: 'active' })
            .populate('category_id', 'category_name')
            .sort({ api_product_name: 1 });

        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const productsWithUrl = products.map(product => {
            const productObj = product.toJSON();
            productObj.image_url = product.image ? `${uploadsBaseUrl}/products/${product.image}` : null;
            productObj.category_name = product.category_id?.category_name || null;
            delete productObj.category_id;
            return productObj;
        });

        res.json({
            success: true,
            data: productsWithUrl,
            count: products.length
        });
    } catch (error) {
        console.error('Get active products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error.message
        });
    }
};

// SEARCH Products
exports.searchProducts = async (req, res) => {
    try {
        const {
            keyword,
            category_id,
            country_of_origin,
            purity,
            page = 1,
            limit = 20
        } = req.query;

        const query = { status: 'active' };

        if (keyword) {
            query.$text = { $search: keyword };
        }

        if (category_id) {
            query.category_id = category_id;
        }

        if (country_of_origin) {
            query.country_of_origin = { $regex: country_of_origin, $options: 'i' };
        }

        if (purity) {
            query.purity = { $regex: purity, $options: 'i' };
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [products, total] = await Promise.all([
            Product.find(query)
                .populate('category_id', 'category_name')
                .sort({ api_product_name: 1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Product.countDocuments(query)
        ]);

        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const productsWithUrl = products.map(product => {
            const productObj = product.toJSON();
            productObj.image_url = product.image ? `${uploadsBaseUrl}/products/${product.image}` : null;
            productObj.category_name = product.category_id?.category_name || null;
            delete productObj.category_id;
            return productObj;
        });

        res.json({
            success: true,
            data: productsWithUrl,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Search products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search products',
            error: error.message
        });
    }
};

// GET Countries of Origin
exports.getCountriesOfOrigin = async (req, res) => {
    try {
        const countries = await Product.distinct('country_of_origin', {
            country_of_origin: { $ne: null, $ne: '' },
            status: 'active'
        });
        
        res.json({
            success: true,
            data: countries.sort()
        });
    } catch (error) {
        console.error('Get countries error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch countries',
            error: error.message
        });
    }
};

// GET Purity Values
exports.getPurityValues = async (req, res) => {
    try {
        const purities = await Product.distinct('purity', {
            purity: { $ne: null, $ne: '' },
            status: 'active'
        });
        
        res.json({
            success: true,
            data: purities.sort()
        });
    } catch (error) {
        console.error('Get purity values error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch purity values',
            error: error.message
        });
    }
};

// BULK DELETE Products
exports.bulkDeleteProducts = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of product IDs to delete'
            });
        }

        // Get products to delete their images
        const products = await Product.find({ _id: { $in: ids } });
        
        // Delete images
        for (const product of products) {
            if (product.image) {
                await deleteImage(product.image);
            }
        }

        // Delete products
        const result = await Product.deleteMany({ _id: { $in: ids } });

        res.json({
            success: true,
            message: `${result.deletedCount} products deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Bulk delete products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete products',
            error: error.message
        });
    }
};
