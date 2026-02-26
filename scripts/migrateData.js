// scripts/migrateData.js
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import MongoDB models
const AdminUser = require('../../models/AdminUser');
const Category = require('../../models/Category');
const Product = require('../../models/Product');
const LearnCategory = require('../../models/LearnCategory');
const Learn = require('../../models/Learn');
const Enquiry = require('../../models/Enquiry');

async function migrateData() {
    try {
        // Connect to MySQL
        const mysqlConn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'cerata_pharma'
        });

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing data
        await Promise.all([
            AdminUser.deleteMany({}),
            Category.deleteMany({}),
            Product.deleteMany({}),
            LearnCategory.deleteMany({}),
            Learn.deleteMany({}),
            Enquiry.deleteMany({})
        ]);
        console.log('Cleared existing MongoDB data');

        // Migrate admin_users
        const [adminUsers] = await mysqlConn.execute('SELECT * FROM admin_users');
        for (const user of adminUsers) {
            await AdminUser.create({
                _id: user.id,
                username: user.username,
                full_name: user.full_name,
                mobile: user.mobile,
                email: user.email,
                password: user.password,
                status: user.status,
                created_at: user.created_at,
                updated_at: user.updated_at
            });
        }
        console.log(`Migrated ${adminUsers.length} admin users`);

        // Migrate categories
        const [categories] = await mysqlConn.execute('SELECT * FROM categories');
        for (const cat of categories) {
            await Category.create({
                _id: cat.id,
                category_name: cat.category_name,
                image: cat.image,
                meta_title: cat.meta_title,
                meta_description: cat.meta_description,
                meta_keywords: cat.meta_keywords,
                status: cat.status,
                created_at: cat.created_at,
                updated_at: cat.updated_at
            });
        }
        console.log(`Migrated ${categories.length} categories`);

        // Migrate products
        const [products] = await mysqlConn.execute('SELECT * FROM api_products');
        for (const prod of products) {
            await Product.create({
                _id: prod.id,
                api_product_name: prod.api_product_name,
                category_id: prod.category_id,
                cas_no: prod.cas_no,
                image: prod.image,
                product_details: prod.product_details,
                therapeutic_class: prod.therapeutic_class,
                grades: prod.grades,
                status: prod.status,
                meta_title: prod.meta_title,
                meta_description: prod.meta_description,
                meta_keywords: prod.meta_keywords,
                form: prod.form,
                iupac_name: prod.iupac_name,
                country_of_origin: prod.country_of_origin,
                purity: prod.purity,
                packing: prod.packing,
                hsn_code: prod.hsn_code,
                created_at: prod.created_at,
                updated_at: prod.updated_at
            });
        }
        console.log(`Migrated ${products.length} products`);

        // Migrate learn categories
        const [learnCategories] = await mysqlConn.execute('SELECT * FROM learn_categories');
        for (const lc of learnCategories) {
            await LearnCategory.create({
                _id: lc.id,
                category_name: lc.category_name,
                image: lc.image,
                meta_title: lc.meta_title,
                meta_description: lc.meta_description,
                meta_keywords: lc.meta_keywords,
                status: lc.status,
                created_at: lc.created_at,
                updated_at: lc.updated_at
            });
        }
        console.log(`Migrated ${learnCategories.length} learn categories`);

        // Migrate learns
        const [learns] = await mysqlConn.execute('SELECT * FROM learns');
        for (const learn of learns) {
            await Learn.create({
                _id: learn.id,
                date: learn.date,
                title: learn.title,
                image: learn.image,
                learn_category_id: learn.learn_category_id,
                details: learn.details,
                status: learn.status,
                meta_title: learn.meta_title,
                meta_description: learn.meta_description,
                meta_keywords: learn.meta_keywords,
                created_at: learn.created_at,
                updated_at: learn.updated_at
            });
        }
        console.log(`Migrated ${learns.length} learn articles`);

        // Migrate enquiries
        const [enquiries] = await mysqlConn.execute('SELECT * FROM enquiries');
        for (const enq of enquiries) {
            await Enquiry.create({
                _id: enq.id,
                name: enq.name,
                company_name: enq.company_name,
                phone_number: enq.phone_number,
                email: enq.email,
                details: enq.details,
                status: enq.status,
                created_at: enq.created_at
            });
        }
        console.log(`Migrated ${enquiries.length} enquiries`);

        console.log('✅ Migration completed successfully!');
        
        await mysqlConn.end();
        await mongoose.disconnect();
        
    } catch (error) {
        console.error('Migration error:', error);
    }
}

migrateData();