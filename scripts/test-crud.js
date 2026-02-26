const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_BASE = 'http://localhost:3000/api';
let token = '';

async function login() {
    try {
        const response = await axios.post(`${API_BASE}/auth/login`, {
            email: 'admin@ceratapharma.com',
            password: 'admin123'
        });
        token = response.data.data.token;
        console.log('✅ Login successful\n');
        return token;
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

async function testCategoryCRUD() {
    console.log('📁 Testing Category CRUD Operations...');
    
    const headers = { Authorization: `Bearer ${token}` };
    let categoryId;

    try {
        // CREATE
        console.log('\n1. Creating category...');
        const createRes = await axios.post(`${API_BASE}/categories`, 
            { 
                category_name: 'Test Category ' + Date.now(),
                meta_title: 'Test Meta Title',
                status: 'active'
            },
            { headers }
        );
        console.log('   ✅ Category created:', createRes.data.data._id);
        categoryId = createRes.data.data._id;

        // READ
        console.log('\n2. Fetching category...');
        const getRes = await axios.get(`${API_BASE}/categories/${categoryId}`);
        console.log('   ✅ Category fetched:', getRes.data.data.category_name);

        // UPDATE
        console.log('\n3. Updating category...');
        const updateRes = await axios.put(`${API_BASE}/categories/${categoryId}`,
            { 
                category_name: 'Updated Category ' + Date.now(),
                meta_description: 'Updated description'
            },
            { headers }
        );
        console.log('   ✅ Category updated:', updateRes.data.message);

        // READ ALL
        console.log('\n4. Fetching all categories...');
        const getAllRes = await axios.get(`${API_BASE}/categories`);
        console.log('   ✅ Total categories:', getAllRes.data.count);

        // DELETE
        console.log('\n5. Deleting category...');
        const deleteRes = await axios.delete(`${API_BASE}/categories/${categoryId}`, { headers });
        console.log('   ✅ Category deleted:', deleteRes.data.message);

        console.log('\n✅ Category CRUD tests passed!\n');
    } catch (error) {
        console.error('❌ Category CRUD test failed:', error.response?.data || error.message);
        throw error;
    }
}

async function testProductCRUD() {
    console.log('📦 Testing Product CRUD Operations...');
    
    const headers = { Authorization: `Bearer ${token}` };
    let productId;
    let categoryId;

    try {
        // First create a category for the product
        console.log('\n1. Creating test category...');
        const catRes = await axios.post(`${API_BASE}/categories`, 
            { category_name: 'Test Cat ' + Date.now() },
            { headers }
        );
        categoryId = catRes.data.data._id;
        console.log('   ✅ Test category created:', categoryId);

        // CREATE
        console.log('\n2. Creating product...');
        const productData = {
            api_product_name: 'Test Product ' + Date.now(),
            category_id: categoryId,
            cas_no: '123-45-6',
            product_details: 'Test product details',
            therapeutic_class: 'Test Class',
            grades: 'Pharma Grade',
            status: 'active'
        };

        const createRes = await axios.post(`${API_BASE}/products`, productData, { headers });
        console.log('   ✅ Product created:', createRes.data.data._id);
        productId = createRes.data.data._id;

        // READ
        console.log('\n3. Fetching product...');
        const getRes = await axios.get(`${API_BASE}/products/${productId}`);
        console.log('   ✅ Product fetched:', getRes.data.data.api_product_name);

        // UPDATE
        console.log('\n4. Updating product...');
        const updateRes = await axios.put(`${API_BASE}/products/${productId}`,
            { 
                api_product_name: 'Updated Product ' + Date.now(),
                purity: '99.9%'
            },
            { headers }
        );
        console.log('   ✅ Product updated:', updateRes.data.message);

        // DELETE
        console.log('\n5. Deleting product...');
        const deleteRes = await axios.delete(`${API_BASE}/products/${productId}`, { headers });
        console.log('   ✅ Product deleted:', deleteRes.data.message);

        // Cleanup test category
        await axios.delete(`${API_BASE}/categories/${categoryId}`, { headers });

        console.log('\n✅ Product CRUD tests passed!\n');
    } catch (error) {
        console.error('❌ Product CRUD test failed:', error.response?.data || error.message);
        throw error;
    }
}

async function testUserCRUD() {
    console.log('👤 Testing User CRUD Operations...');
    
    const headers = { Authorization: `Bearer ${token}` };
    let userId;

    try {
        // CREATE
        console.log('\n1. Creating user...');
        const createRes = await axios.post(`${API_BASE}/users`, 
            { 
                username: 'testuser_' + Date.now(),
                full_name: 'Test User',
                email: `test${Date.now()}@example.com`,
                password: 'test123',
                status: 'active'
            },
            { headers }
        );
        console.log('   ✅ User created:', createRes.data.data._id);
        userId = createRes.data.data._id;

        // READ
        console.log('\n2. Fetching user...');
        const getRes = await axios.get(`${API_BASE}/users/${userId}`, { headers });
        console.log('   ✅ User fetched:', getRes.data.data.username);

        // UPDATE
        console.log('\n3. Updating user...');
        const updateRes = await axios.put(`${API_BASE}/users/${userId}`,
            { 
                full_name: 'Updated Test User',
                mobile: '1234567890'
            },
            { headers }
        );
        console.log('   ✅ User updated:', updateRes.data.message);

        // DELETE
        console.log('\n4. Deleting user...');
        const deleteRes = await axios.delete(`${API_BASE}/users/${userId}`, { headers });
        console.log('   ✅ User deleted:', deleteRes.data.message);

        console.log('\n✅ User CRUD tests passed!\n');
    } catch (error) {
        console.error('❌ User CRUD test failed:', error.response?.data || error.message);
        throw error;
    }
}

async function testEnquiryCRUD() {
    console.log('📧 Testing Enquiry CRUD Operations...');
    
    const headers = { Authorization: `Bearer ${token}` };
    let enquiryId;

    try {
        // CREATE (Public route - no auth needed)
        console.log('\n1. Creating enquiry...');
        const createRes = await axios.post(`${API_BASE}/enquiries`, 
            { 
                name: 'Test User',
                email: `test${Date.now()}@example.com`,
                phone_number: '9876543210',
                company_name: 'Test Company',
                details: 'This is a test enquiry'
            }
        );
        console.log('   ✅ Enquiry created:', createRes.data.data.id);
        enquiryId = createRes.data.data.id;

        // READ
        console.log('\n2. Fetching enquiry...');
        const getRes = await axios.get(`${API_BASE}/enquiries/${enquiryId}`, { headers });
        console.log('   ✅ Enquiry fetched:', getRes.data.data.name);

        // UPDATE STATUS
        console.log('\n3. Updating enquiry status...');
        const updateRes = await axios.put(`${API_BASE}/enquiries/${enquiryId}/status`,
            { status: 'replied' },
            { headers }
        );
        console.log('   ✅ Enquiry status updated:', updateRes.data.message);

        // DELETE
        console.log('\n4. Deleting enquiry...');
        const deleteRes = await axios.delete(`${API_BASE}/enquiries/${enquiryId}`, { headers });
        console.log('   ✅ Enquiry deleted:', deleteRes.data.message);

        console.log('\n✅ Enquiry CRUD tests passed!\n');
    } catch (error) {
        console.error('❌ Enquiry CRUD test failed:', error.response?.data || error.message);
        throw error;
    }
}

async function runAllTests() {
    console.log('🚀 Starting CRUD Tests...\n');
    console.log('='.repeat(50));

    try {
        await login();
        await testCategoryCRUD();
        await testProductCRUD();
        await testUserCRUD();
        await testEnquiryCRUD();
        
        console.log('='.repeat(50));
        console.log('🎉 All CRUD tests passed successfully!\n');
    } catch (error) {
        console.error('\n❌ Test suite failed:', error.message);
        process.exit(1);
    }
}

// Run tests
runAllTests();