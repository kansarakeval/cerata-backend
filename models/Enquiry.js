const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    company_name: {
        type: String,
        trim: true
    },
    phone_number: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    details: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['new', 'read', 'replied'],
        default: 'new'
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: false // No updated_at for enquiries
    }
});

module.exports = mongoose.model('Enquiry', enquirySchema);