const Category = require('../models/Category');
const Product = require('../models/Product');
const path = require('path');
const fs = require('fs').promises;
const { getUploadsBaseUrl } = require('../utils/baseUrl');

exports.createCategory = async (req, res) => {
    try {
        const { category_name, meta_title, meta_description, meta_keywords, status } = req.body;

        if (!category_name || category_name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        const existingCategory = await Category.findOne({ 
            category_name: { $regex: new RegExp(`^${category_name.trim()}$`, 'i') }
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Category name already exists'
            });
        }

        const image = req.file ? req.file.filename : null;

        const category = new Category({
            category_name: category_name.trim(),
            image,
            meta_title: meta_title || '',
            meta_description: meta_description || '',
            meta_keywords: meta_keywords || '',
            status: status || 'active'
        });

        await category.save();

        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const categoryData = category.toJSON();
        categoryData.image_url = category.image ? `${uploadsBaseUrl}/categories/${category.image}` : null;

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: categoryData
        });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create category'
        });
    }
};

exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ created_at: -1 });
        
        const uploadsBaseUrl = getUploadsBaseUrl(req);
        
        const categoriesWithDetails = await Promise.all(categories.map(async (category) => {
            const productCount = await Product.countDocuments({ category_id: category._id });
            
            const categoryObj = category.toJSON();
            categoryObj.image_url = category.image ? `${uploadsBaseUrl}/categories/${category.image}` : null;
            categoryObj.product_count = productCount;
            
            return categoryObj;
        }));

        res.json({
            success: true,
            data: categoriesWithDetails,
            count: categories.length
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
};

exports.getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const category = await Category.findById(id);
        
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const productCount = await Product.countDocuments({ category_id: category._id });
        
        const categoryObj = category.toJSON();
        categoryObj.image_url = category.image ? `${uploadsBaseUrl}/categories/${category.image}` : null;
        categoryObj.product_count = productCount;

        res.json({
            success: true,
            data: categoryObj
        });
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category'
        });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { category_name, meta_title, meta_description, meta_keywords, status } = req.body;

        const category = await Category.findById(id);
        
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        if (category_name && category_name.trim() !== category.category_name) {
            const existingCategory = await Category.findOne({ 
                category_name: { $regex: new RegExp(`^${category_name.trim()}$`, 'i') },
                _id: { $ne: id }
            });
            
            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Category name already exists'
                });
            }
        }

        if (req.file) {
            if (category.image) {
                try {
                    const oldImagePath = path.join(__dirname, '..', 'uploads', 'categories', category.image);
                    await fs.unlink(oldImagePath);
                } catch (err) {
                    console.log('Old image not found:', category.image);
                }
            }
            category.image = req.file.filename;
        }

        category.category_name = category_name ? category_name.trim() : category.category_name;
        category.meta_title = meta_title !== undefined ? meta_title : category.meta_title;
        category.meta_description = meta_description !== undefined ? meta_description : category.meta_description;
        category.meta_keywords = meta_keywords !== undefined ? meta_keywords : category.meta_keywords;
        category.status = status || category.status;

        await category.save();

        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const productCount = await Product.countDocuments({ category_id: category._id });
        const categoryObj = category.toJSON();
        categoryObj.image_url = category.image ? `${uploadsBaseUrl}/categories/${category.image}` : null;
        categoryObj.product_count = productCount;

        res.json({
            success: true,
            message: 'Category updated successfully',
            data: categoryObj
        });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update category'
        });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);
        
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        const productCount = await Product.countDocuments({ category_id: id });
        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category. It is associated with products.'
            });
        }

        if (category.image) {
            try {
                const imagePath = path.join(__dirname, '..', 'uploads', 'categories', category.image);
                await fs.unlink(imagePath);
            } catch (err) {
                console.log('Image not found:', category.image);
            }
        }

        await Category.deleteOne({ _id: id });

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category'
        });
    }
};

exports.getActiveCategories = async (req, res) => {
    try {
        const categories = await Category.find({ status: 'active' }).sort({ category_name: 1 });
        
        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const categoriesWithUrl = categories.map(category => {
            const catObj = category.toJSON();
            catObj.image_url = category.image ? `${uploadsBaseUrl}/categories/${category.image}` : null;
            return catObj;
        });

        res.json({
            success: true,
            data: categoriesWithUrl
        });
    } catch (error) {
        console.error('Get active categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
};
