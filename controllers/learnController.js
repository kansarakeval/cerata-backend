const LearnCategory = require('../models/LearnCategory');
const Learn = require('../models/Learn');
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
const deleteImage = async (filename, folder = 'learns') => {
    if (!filename) return false;
    try {
        const imagePath = path.join(__dirname, '..', 'uploads', folder, filename);
        await fs.access(imagePath);
        await fs.unlink(imagePath);
        return true;
    } catch (err) {
        console.log('Image not found or already deleted:', filename);
        return false;
    }
};

// ==================== LEARN CATEGORIES ====================

// CREATE Learn Category
exports.createLearnCategory = async (req, res) => {
    try {
        const { category_name, meta_title, meta_description, meta_keywords, status } = req.body;

        if (!category_name || category_name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        const existingCategory = await LearnCategory.findOne({ 
            category_name: { $regex: new RegExp(`^${category_name.trim()}$`, 'i') }
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Category name already exists'
            });
        }

        const image = req.file ? req.file.filename : null;

        const category = new LearnCategory({
            category_name: category_name.trim(),
            image,
            meta_title: sanitizeParam(meta_title),
            meta_description: sanitizeParam(meta_description),
            meta_keywords: sanitizeParam(meta_keywords),
            status: status || 'active'
        });

        await category.save();

        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const categoryData = category.toJSON();
        categoryData.image_url = category.image ? `${uploadsBaseUrl}/learns/${category.image}` : null;

        res.status(201).json({
            success: true,
            message: 'Learn category created successfully',
            data: categoryData
        });
    } catch (error) {
        console.error('Create learn category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create learn category',
            error: error.message
        });
    }
};

// GET All Learn Categories
exports.getAllLearnCategories = async (req, res) => {
    try {
        const { status } = req.query;
        
        const query = {};
        if (status && ['active', 'deactive'].includes(status)) {
            query.status = status;
        }

        const categories = await LearnCategory.find(query).sort({ category_name: 1 });

        const uploadsBaseUrl = getUploadsBaseUrl(req);
        
        const categoriesWithDetails = await Promise.all(categories.map(async (category) => {
            const articleCount = await Learn.countDocuments({ 
                learn_category_id: category._id, 
                status: 'active' 
            });
            
            const categoryObj = category.toJSON();
            categoryObj.image_url = category.image ? `${uploadsBaseUrl}/learns/${category.image}` : null;
            categoryObj.article_count = articleCount;
            
            return categoryObj;
        }));

        res.json({
            success: true,
            data: categoriesWithDetails,
            count: categories.length
        });
    } catch (error) {
        console.error('Get learn categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch learn categories',
            error: error.message
        });
    }
};

// GET Learn Category by ID
exports.getLearnCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format'
            });
        }
        
        const category = await LearnCategory.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Learn category not found'
            });
        }

        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const articleCount = await Learn.countDocuments({ 
            learn_category_id: id, 
            status: 'active' 
        });

        const articles = await Learn.find({ 
            learn_category_id: id, 
            status: 'active' 
        })
        .sort({ date: -1 })
        .limit(10);

        const articlesWithUrl = articles.map(article => {
            const articleObj = article.toJSON();
            articleObj.image_url = article.image ? `${uploadsBaseUrl}/learns/${article.image}` : null;
            return articleObj;
        });

        const categoryObj = category.toJSON();
        categoryObj.image_url = category.image ? `${uploadsBaseUrl}/learns/${category.image}` : null;
        categoryObj.article_count = articleCount;

        res.json({
            success: true,
            data: {
                ...categoryObj,
                articles: articlesWithUrl
            }
        });
    } catch (error) {
        console.error('Get learn category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch learn category',
            error: error.message
        });
    }
};

// UPDATE Learn Category
exports.updateLearnCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { category_name, meta_title, meta_description, meta_keywords, status } = req.body;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format'
            });
        }

        const category = await LearnCategory.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Learn category not found'
            });
        }

        if (category_name && category_name.trim() !== category.category_name) {
            const existingCategory = await LearnCategory.findOne({ 
                category_name: { $regex: new RegExp(`^${category_name.trim()}$`, 'i') },
                _id: { $ne: id }
            });
            
            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Category name already exists'
                });
            }
            category.category_name = category_name.trim();
        }

        if (req.file) {
            if (category.image) {
                await deleteImage(category.image, 'learns');
            }
            category.image = req.file.filename;
        }

        if (meta_title !== undefined) category.meta_title = sanitizeParam(meta_title);
        if (meta_description !== undefined) category.meta_description = sanitizeParam(meta_description);
        if (meta_keywords !== undefined) category.meta_keywords = sanitizeParam(meta_keywords);
        if (status) category.status = status;

        await category.save();

        // Get updated category
        const updatedCategory = await LearnCategory.findById(id);
        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const categoryData = updatedCategory.toJSON();
        categoryData.image_url = updatedCategory.image ? `${uploadsBaseUrl}/learns/${updatedCategory.image}` : null;

        res.json({
            success: true,
            message: 'Learn category updated successfully',
            data: categoryData
        });
    } catch (error) {
        console.error('Update learn category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update learn category',
            error: error.message
        });
    }
};

// DELETE Learn Category
exports.deleteLearnCategory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format'
            });
        }

        const articles = await Learn.countDocuments({ learn_category_id: id });
        if (articles > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category. It contains articles. Please delete or reassign articles first.',
                articleCount: articles
            });
        }

        const category = await LearnCategory.findById(id);
        
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Delete category image
        if (category.image) {
            await deleteImage(category.image, 'learns');
        }

        await LearnCategory.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Learn category deleted successfully',
            deletedId: id
        });
    } catch (error) {
        console.error('Delete learn category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete learn category',
            error: error.message
        });
    }
};

// ==================== LEARN ARTICLES ====================

// CREATE Learn Article
exports.createLearnArticle = async (req, res) => {
    try {
        const {
            date,
            title,
            learn_category_id,
            details,
            status = 'active',
            meta_title,
            meta_description,
            meta_keywords
        } = req.body;

        if (!date || !title || !learn_category_id) {
            return res.status(400).json({
                success: false,
                message: 'Date, title, and category are required'
            });
        }

        const category = await LearnCategory.findById(learn_category_id);
        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID'
            });
        }

        const image = req.file ? req.file.filename : null;

        const article = new Learn({
            date: new Date(date),
            title: title.trim(),
            image,
            learn_category_id,
            details: sanitizeParam(details),
            status,
            meta_title: sanitizeParam(meta_title),
            meta_description: sanitizeParam(meta_description),
            meta_keywords: sanitizeParam(meta_keywords)
        });

        await article.save();

        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const articleData = article.toJSON();
        articleData.image_url = article.image ? `${uploadsBaseUrl}/learns/${article.image}` : null;

        res.status(201).json({
            success: true,
            message: 'Learn article created successfully',
            data: articleData
        });
    } catch (error) {
        console.error('Create learn article error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create learn article',
            error: error.message
        });
    }
};

// GET All Learn Articles
exports.getAllLearnArticles = async (req, res) => {
    try {
        const { category_id, status, search, page = 1, limit = 10 } = req.query;

        const query = {};

        if (category_id) {
            query.learn_category_id = category_id;
        }

        if (status && ['active', 'deactive'].includes(status)) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { details: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [articles, total] = await Promise.all([
            Learn.find(query)
                .populate('learn_category_id', 'category_name')
                .sort({ date: -1, created_at: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Learn.countDocuments(query)
        ]);

        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const articlesWithUrl = articles.map(article => {
            const articleObj = article.toJSON();
            articleObj.image_url = article.image ? `${uploadsBaseUrl}/learns/${article.image}` : null;
            articleObj.category_name = article.learn_category_id?.category_name || null;
            delete articleObj.learn_category_id;
            return articleObj;
        });

        res.json({
            success: true,
            data: articlesWithUrl,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get learn articles error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch learn articles',
            error: error.message
        });
    }
};

// GET All Learn Articles (No Pagination)
exports.getAllLearnArticlesNoPagination = async (req, res) => {
    try {
        const { category_id, status, search } = req.query;

        const query = {};

        if (category_id) {
            query.learn_category_id = category_id;
        }

        if (status && ['active', 'deactive'].includes(status)) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { details: { $regex: search, $options: 'i' } }
            ];
        }

        const articles = await Learn.find(query)
            .populate('learn_category_id', 'category_name')
            .sort({ date: -1, created_at: -1 });

        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const articlesWithUrl = articles.map(article => {
            const articleObj = article.toJSON();
            articleObj.image_url = article.image ? `${uploadsBaseUrl}/learns/${article.image}` : null;
            articleObj.category_name = article.learn_category_id?.category_name || null;
            delete articleObj.learn_category_id;
            return articleObj;
        });

        res.json({
            success: true,
            data: articlesWithUrl,
            count: articles.length
        });
    } catch (error) {
        console.error('Get all learn articles error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch learn articles',
            error: error.message
        });
    }
};

// GET Learn Article by ID
exports.getLearnArticleById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid article ID format'
            });
        }

        const article = await Learn.findById(id).populate('learn_category_id', 'category_name');

        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Learn article not found'
            });
        }

        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const articleObj = article.toJSON();
        articleObj.image_url = article.image ? `${uploadsBaseUrl}/learns/${article.image}` : null;
        articleObj.category_name = article.learn_category_id?.category_name || null;
        delete articleObj.learn_category_id;

        // Get prev and next articles
        const [prevArticle] = await Learn.find({ 
            date: { $lt: article.date },
            status: 'active'
        })
        .sort({ date: -1 })
        .limit(1)
        .select('id title');

        const [nextArticle] = await Learn.find({ 
            date: { $gt: article.date },
            status: 'active'
        })
        .sort({ date: 1 })
        .limit(1)
        .select('id title');

        res.json({
            success: true,
            data: articleObj,
            navigation: {
                previous: prevArticle || null,
                next: nextArticle || null
            }
        });
    } catch (error) {
        console.error('Get learn article error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch learn article',
            error: error.message
        });
    }
};

// UPDATE Learn Article
exports.updateLearnArticle = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid article ID format'
            });
        }

        const article = await Learn.findById(id);

        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Learn article not found'
            });
        }

        if (updates.learn_category_id) {
            const category = await LearnCategory.findById(updates.learn_category_id);
            if (!category) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid category ID'
                });
            }
            article.learn_category_id = updates.learn_category_id;
        }

        if (req.file) {
            if (article.image) {
                await deleteImage(article.image, 'learns');
            }
            article.image = req.file.filename;
        }

        if (updates.date) article.date = new Date(updates.date);
        if (updates.title) article.title = updates.title.trim();
        if (updates.details !== undefined) article.details = sanitizeParam(updates.details);
        if (updates.status) article.status = updates.status;
        if (updates.meta_title !== undefined) article.meta_title = sanitizeParam(updates.meta_title);
        if (updates.meta_description !== undefined) article.meta_description = sanitizeParam(updates.meta_description);
        if (updates.meta_keywords !== undefined) article.meta_keywords = sanitizeParam(updates.meta_keywords);

        await article.save();

        const updatedArticle = await Learn.findById(id).populate('learn_category_id', 'category_name');
        
        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const articleData = updatedArticle.toJSON();
        articleData.image_url = updatedArticle.image ? `${uploadsBaseUrl}/learns/${updatedArticle.image}` : null;
        articleData.category_name = updatedArticle.learn_category_id?.category_name || null;
        delete articleData.learn_category_id;

        res.json({
            success: true,
            message: 'Learn article updated successfully',
            data: articleData
        });
    } catch (error) {
        console.error('Update learn article error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update learn article',
            error: error.message
        });
    }
};

// DELETE Learn Article
exports.deleteLearnArticle = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid article ID format'
            });
        }

        const article = await Learn.findById(id);

        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Learn article not found'
            });
        }

        if (article.image) {
            await deleteImage(article.image, 'learns');
        }

        await Learn.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Learn article deleted successfully',
            deletedId: id
        });
    } catch (error) {
        console.error('Delete learn article error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete learn article',
            error: error.message
        });
    }
};

// GET Featured Articles
exports.getFeaturedArticles = async (req, res) => {
    try {
        const { limit = 5 } = req.query;

        const articles = await Learn.find({ status: 'active' })
            .populate('learn_category_id', 'category_name')
            .sort({ date: -1, created_at: -1 })
            .limit(parseInt(limit));

        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const articlesWithUrl = articles.map(article => {
            const articleObj = article.toJSON();
            articleObj.image_url = article.image ? `${uploadsBaseUrl}/learns/${article.image}` : null;
            articleObj.category_name = article.learn_category_id?.category_name || null;
            delete articleObj.learn_category_id;
            return articleObj;
        });

        res.json({
            success: true,
            data: articlesWithUrl
        });
    } catch (error) {
        console.error('Get featured articles error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch featured articles',
            error: error.message
        });
    }
};

// GET Articles by Category
exports.getArticlesByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const category = await LearnCategory.findOne({ 
            _id: categoryId, 
            status: 'active' 
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found or inactive'
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [articles, total] = await Promise.all([
            Learn.find({ 
                learn_category_id: categoryId, 
                status: 'active' 
            })
            .sort({ date: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
            Learn.countDocuments({ 
                learn_category_id: categoryId, 
                status: 'active' 
            })
        ]);

        const uploadsBaseUrl = getUploadsBaseUrl(req);
        const articlesWithUrl = articles.map(article => {
            const articleObj = article.toJSON();
            articleObj.image_url = article.image ? `${uploadsBaseUrl}/learns/${article.image}` : null;
            return articleObj;
        });

        res.json({
            success: true,
            data: {
                category: {
                    _id: category._id,
                    category_name: category.category_name,
                    image_url: category.image ? `${uploadsBaseUrl}/learns/${category.image}` : null
                },
                articles: articlesWithUrl
            },
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get articles by category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch articles',
            error: error.message
        });
    }
};
