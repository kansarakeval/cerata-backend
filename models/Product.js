const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    api_product_name: {
        type: String,
        required: true,
        trim: true
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    cas_no: {
        type: String,
        trim: true
    },
    image: {
        type: String
    },
    product_details: {
        type: String
    },
    therapeutic_class: {
        type: String,
        trim: true
    },
    grades: {
        type: String,
        trim: true
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
    },
    form: {
        type: String
    },
    iupac_name: {
        type: String,
        trim: true
    },
    country_of_origin: {
        type: String,
        trim: true
    },
    purity: {
        type: String,
        trim: true
    },
    packing: {
        type: String
    },
    hsn_code: {
        type: String,
        trim: true
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

// Index for search functionality
productSchema.index({ 
    api_product_name: 'text', 
    product_details: 'text',
    iupac_name: 'text',
    cas_no: 'text' 
});

module.exports = mongoose.model('Product', productSchema);