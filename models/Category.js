const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
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

// Virtual for product count
categorySchema.virtual('product_count', {
    ref: 'Product',
    localField: '_id',
    foreignField: 'category_id',
    count: true
});

// Ensure virtuals are included in JSON
categorySchema.set('toJSON', { virtuals: true });
categorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Category', categorySchema);