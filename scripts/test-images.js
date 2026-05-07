const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const BASE_URL = 'https://ceratapharma.com';

async function testImageUrl(imagePath) {
    return new Promise((resolve) => {
        const url = `${BASE_URL}${imagePath}`;
        console.log(`Testing: ${url}`);
        
        const protocol = url.startsWith('https') ? https : http;
        const request = protocol.get(url, (response) => {
            if (response.statusCode === 200) {
                console.log(`  ✅ OK (${response.statusCode}) - Content-Type: ${response.headers['content-type']}`);
                resolve(true);
            } else if (response.statusCode === 301 || response.statusCode === 302) {
                console.log(`  🔄 Redirect (${response.statusCode}) to: ${response.headers.location}`);
                resolve(false);
            } else {
                console.log(`  ❌ Failed (${response.statusCode})`);
                resolve(false);
            }
        });
        
        request.on('error', (err) => {
            console.log(`  ❌ Error: ${err.message}`);
            resolve(false);
        });
        
        request.setTimeout(5000, () => {
            request.destroy();
            console.log(`  ❌ Timeout`);
            resolve(false);
        });
    });
}

async function main() {
    console.log('🔍 Testing Image URLs\n');
    
    // Check if uploads directory exists on server
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    
    if (fs.existsSync(uploadsDir)) {
        console.log('📁 Local uploads directory found\n');
        
        // List products
        const productsDir = path.join(uploadsDir, 'products');
        if (fs.existsSync(productsDir)) {
            const files = fs.readdirSync(productsDir);
            console.log(`📸 Found ${files.length} product images locally`);
            if (files.length > 0) {
                console.log('Sample files:', files.slice(0, 5));
                console.log('\nTesting URLs for sample images...\n');
                
                for (const file of files.slice(0, 3)) {
                    await testImageUrl(`/uploads/products/${file}`);
                }
            }
        } else {
            console.log('❌ Products directory not found locally');
        }
    } else {
        console.log('❌ Local uploads directory not found');
        console.log(`   Expected at: ${uploadsDir}`);
    }
    
    console.log('\n📝 Next Steps:');
    console.log('1. Check if files exist on server: ls -la /path/to/app/uploads/products/');
    console.log('2. Check file permissions: chmod -R 755 uploads/');
    console.log('3. Check Nginx configuration for static file serving');
    console.log('4. Verify the Express static middleware is properly configured');
}

main();