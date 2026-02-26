const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);

        // Create default admin user if not exists
        await createDefaultAdmin();

    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

const createDefaultAdmin = async () => {
    try {
        // Fix the path - remove the duplicate 'cerata-pharma-backend' part
        const AdminUser = require('../models/AdminUser');
        const bcrypt = require('bcryptjs');

        const adminExists = await AdminUser.findOne({ email: 'admin@ceratapharma.com' });
        
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            await AdminUser.create({
                username: 'admin',
                full_name: 'Administrator',
                email: 'admin@ceratapharma.com',
                password: hashedPassword,
                status: 'active'
            });

            console.log('\n✅ Default admin user created');
            console.log('📋 Login Credentials:');
            console.log('   📧 Email: admin@ceratapharma.com');
            console.log('   🔑 Password: admin123');
            console.log('\n⚠️  IMPORTANT: Change the password after first login!');
        }
    } catch (error) {
        console.error('Error creating admin user:', error.message);
    }
};

module.exports = connectDB;