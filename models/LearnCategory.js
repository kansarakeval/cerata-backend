const mongoose = require('mongoose');

const learnCategorySchema = new mongoose.Schema({
    category_name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    image: {
        type: String
    },
    meta_title: {
        type: String
    },
    meta_description: {
        type: String
    },
    meta_keywords: {
        type: String
    },
    status: {
        type: String,
        enum: ['active', 'deactive'],
        default: 'active'
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

// Virtual for article count
learnCategorySchema.virtual('article_count', {
    ref: 'Learn',
    localField: '_id',
    foreignField: 'learn_category_id',
    count: true
});

learnCategorySchema.set('toJSON', { virtuals: true });
learnCategorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('LearnCategory', learnCategorySchema);