const fs = require('fs').promises;
const path = require('path');

class FileUtils {
    constructor() {
        this.baseUploadDir = path.join(__dirname, '..', 'uploads');
    }

    async deleteFile(filename, subfolder = '') {
        if (!filename) return false;
        
        try {
            const filePath = path.join(this.baseUploadDir, subfolder, filename);
            await fs.access(filePath);
            await fs.unlink(filePath);
            console.log(`File deleted: ${filePath}`);
            return true;
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.log('File not found:', filename);
                return false;
            }
            throw err;
        }
    }

    async deleteProductImage(filename) {
        return this.deleteFile(filename, 'products');
    }

    async deleteCategoryImage(filename) {
        return this.deleteFile(filename, 'categories');
    }

    async deleteLearnImage(filename) {
        return this.deleteFile(filename, 'learns');
    }

    async getFileSize(filename, subfolder = '') {
        try {
            const filePath = path.join(this.baseUploadDir, subfolder, filename);
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch (err) {
            console.log('Error getting file size:', err);
            return null;
        }
    }

    async fileExists(filename, subfolder = '') {
        try {
            const filePath = path.join(this.baseUploadDir, subfolder, filename);
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async moveFile(oldPath, newPath) {
        try {
            await fs.rename(oldPath, newPath);
            return true;
        } catch (err) {
            console.log('Error moving file:', err);
            return false;
        }
    }
}

module.exports = new FileUtils();