const Enquiry = require('../models/Enquiry');

// CREATE Enquiry (Public)
exports.submitEnquiry = async (req, res) => {
    try {
        const { name, company_name, phone_number, email, details } = req.body;

        // Validation
        if (!name || !email || !details) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and details are required'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        // Phone validation (if provided)
        if (phone_number) {
            const phoneRegex = /^[+]?[0-9]{10,15}$/;
            if (!phoneRegex.test(phone_number.replace(/\D/g, ''))) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide a valid phone number'
                });
            }
        }

        const enquiry = new Enquiry({
            name: name.trim(),
            company_name: company_name ? company_name.trim() : null,
            phone_number: phone_number ? phone_number.trim() : null,
            email: email.trim().toLowerCase(),
            details: details.trim()
        });

        await enquiry.save();

        res.status(201).json({
            success: true,
            message: 'Enquiry submitted successfully',
            data: {
                id: enquiry._id,
                name: enquiry.name,
                email: enquiry.email,
                status: enquiry.status,
                created_at: enquiry.created_at
            }
        });
    } catch (error) {
        console.error('Enquiry submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.',
            error: error.message
        });
    }
};

// GET All Enquiries (Admin)
exports.getAllEnquiries = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        
        const query = {};

        if (status && ['new', 'read', 'replied'].includes(status)) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { company_name: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [enquiries, total] = await Promise.all([
            Enquiry.find(query)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Enquiry.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: enquiries,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get enquiries error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch enquiries',
            error: error.message
        });
    }
};

// GET Enquiry by ID (Admin)
exports.getEnquiryById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid enquiry ID format'
            });
        }

        const enquiry = await Enquiry.findById(id);

        if (!enquiry) {
            return res.status(404).json({
                success: false,
                message: 'Enquiry not found'
            });
        }

        // Auto-mark as read when viewed
        if (enquiry.status === 'new') {
            enquiry.status = 'read';
            await enquiry.save();
        }

        res.json({
            success: true,
            data: enquiry
        });
    } catch (error) {
        console.error('Get enquiry error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch enquiry',
            error: error.message
        });
    }
};

// UPDATE Enquiry Status (Admin)
exports.updateEnquiryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid enquiry ID format'
            });
        }

        if (!['new', 'read', 'replied'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be new, read, or replied'
            });
        }

        const enquiry = await Enquiry.findById(id);

        if (!enquiry) {
            return res.status(404).json({
                success: false,
                message: 'Enquiry not found'
            });
        }

        enquiry.status = status;
        await enquiry.save();

        res.json({
            success: true,
            message: 'Enquiry status updated successfully',
            data: {
                id: enquiry._id,
                status: enquiry.status
            }
        });
    } catch (error) {
        console.error('Update enquiry error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update enquiry',
            error: error.message
        });
    }
};

// DELETE Enquiry (Admin)
exports.deleteEnquiry = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid enquiry ID format'
            });
        }

        const enquiry = await Enquiry.findById(id);

        if (!enquiry) {
            return res.status(404).json({
                success: false,
                message: 'Enquiry not found'
            });
        }

        await Enquiry.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Enquiry deleted successfully',
            deletedId: id
        });
    } catch (error) {
        console.error('Delete enquiry error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete enquiry',
            error: error.message
        });
    }
};

// GET Enquiry Stats (Admin)
exports.getEnquiryStats = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get totals
        const totals = await Enquiry.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalsObj = {
            total: 0,
            new: 0,
            read: 0,
            replied: 0
        };

        totals.forEach(item => {
            totalsObj[item._id] = item.count;
            totalsObj.total += item.count;
        });

        // Get daily stats for last 30 days
        const dailyStats = await Enquiry.aggregate([
            {
                $match: {
                    created_at: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
                        status: "$status"
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id.date": -1 }
            }
        ]);

        // Format daily stats
        const formattedDailyStats = {};
        dailyStats.forEach(item => {
            if (!formattedDailyStats[item._id.date]) {
                formattedDailyStats[item._id.date] = {
                    new: 0,
                    read: 0,
                    replied: 0,
                    total: 0
                };
            }
            formattedDailyStats[item._id.date][item._id.status] = item.count;
            formattedDailyStats[item._id.date].total += item.count;
        });

        res.json({
            success: true,
            data: {
                totals: totalsObj,
                daily: formattedDailyStats
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
};

// BULK DELETE Enquiries (Admin)
exports.bulkDeleteEnquiries = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of enquiry IDs to delete'
            });
        }

        const result = await Enquiry.deleteMany({ _id: { $in: ids } });

        res.json({
            success: true,
            message: `${result.deletedCount} enquiries deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Bulk delete enquiries error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete enquiries',
            error: error.message
        });
    }
};