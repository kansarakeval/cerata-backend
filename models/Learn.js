const mongoose = require('mongoose');

const learnSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        type: String
    },
    learn_category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LearnCategory'
    },
    details: {
        type: String
    },
    status: {
        type: String,
        enum: ['active', 'deactive'],
        default: 'active'
    },
    meta_title: {
        type: String
    },
    meta_description: {
        type: String
    },
    meta_keywords: {
        type: String
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

// Index for search
learnSchema.index({ title: 'text', details: 'text' });

module.exports = mongoose.model('Learn', learnSchema);