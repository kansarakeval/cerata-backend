const AdminUser = require('../models/AdminUser');
const bcrypt = require('bcryptjs');

// GET All Users
exports.getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const query = {};
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { full_name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const [users, total] = await Promise.all([
            AdminUser.find(query)
                .select('-password')
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            AdminUser.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: users,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
};

// GET User by ID
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }
        
        const user = await AdminUser.findById(id).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user',
            error: error.message
        });
    }
};

// CREATE User
exports.createUser = async (req, res) => {
    try {
        const { username, full_name, email, mobile, password, status = 'active' } = req.body;

        // Validation
        if (!username || !full_name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, full name, email and password are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Check for existing user
        const existingUser = await AdminUser.findOne({ 
            $or: [
                { username },
                { email }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new AdminUser({
            username,
            full_name,
            email,
            mobile: mobile || null,
            password: hashedPassword,
            status
        });

        await user.save();

        // Return user without password
        const userData = user.toJSON();
        delete userData.password;

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: userData
        });
    } catch (error) {
        console.error('Create user error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Username or email already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to create user',
            error: error.message
        });
    }
};

// UPDATE User
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        const user = await AdminUser.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check for duplicate username/email
        if (updates.username || updates.email) {
            const duplicateQuery = {
                _id: { $ne: id },
                $or: []
            };
            
            if (updates.username) {
                duplicateQuery.$or.push({ username: updates.username });
            }
            if (updates.email) {
                duplicateQuery.$or.push({ email: updates.email });
            }
            
            if (duplicateQuery.$or.length > 0) {
                const existingUser = await AdminUser.findOne(duplicateQuery);
                if (existingUser) {
                    return res.status(400).json({
                        success: false,
                        message: 'Username or email already exists'
                    });
                }
            }
        }

        // Update fields
        const updatableFields = ['username', 'full_name', 'email', 'mobile', 'status'];
        updatableFields.forEach(field => {
            if (updates[field] !== undefined) {
                user[field] = updates[field];
            }
        });

        // Handle password update
        if (updates.password) {
            if (updates.password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters long'
                });
            }
            user.password = await bcrypt.hash(updates.password, 10);
        }

        await user.save();

        // Get updated user without password
        const updatedUser = await AdminUser.findById(id).select('-password');

        res.json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user',
            error: error.message
        });
    }
};

// DELETE User
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        // Prevent self-deletion
        if (id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        const user = await AdminUser.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await AdminUser.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'User deleted successfully',
            deletedId: id
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user',
            error: error.message
        });
    }
};

// UPDATE User Status (Bulk)
exports.bulkUpdateStatus = async (req, res) => {
    try {
        const { ids, status } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of user IDs'
            });
        }

        if (!['active', 'deactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be active or deactive'
            });
        }

        // Prevent self-status change
        if (ids.includes(req.user.id)) {
            return res.status(400).json({
                success: false,
                message: 'You cannot change your own status'
            });
        }

        const result = await AdminUser.updateMany(
            { _id: { $in: ids } },
            { $set: { status } }
        );

        res.json({
            success: true,
            message: `${result.modifiedCount} users updated successfully`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Bulk update status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update users',
            error: error.message
        });
    }
};