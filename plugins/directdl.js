const config = require('../config');
const { cmd, commands } = require('../command');
const { fetchJson } = require('../lib/functions');
const axios = require('axios');
const mimeTypes = require('mime-types');
const fs = require('fs').promises; // Use promises-based fs for async/await
const fsStream = require('fs'); // For streaming
const path = require('path');

// Helper function to format file size
const formatSize = (bytes) => {
    if (bytes === 0) return '0B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
};

cmd({
    pattern: "dl",
    react: "📥",
    alias: ["dlurl"],
    desc: "Direct link uploader with detailed filenames, using local storage",
    category: "download",
    use: '.dl <link>',
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, args, q, reply }) => {
    try {
        if (!q) return reply('❗ Please provide a valid URL!');

        // URL validation
        const isValidUrl = (url) => {
            try {
                new URL(url);
                return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(url);
            } catch {
                return false;
            }
        };
        if (!isValidUrl(q)) return reply('❌ Invalid URL format!');

        // Create a temporary directory for storing files
        const tempDir = path.join(__dirname, 'temp_downloads');
        await fs.mkdir(tempDir, { recursive: true });

        // Fetch file metadata
        const res = await axios.head(q, {
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (res.status !== 200) return reply(`❌ Server error: ${res.status}`);

        // File size handling
        const maxSize = 2200 * 1024 * 1024; // 2200MB
        const fileSize = parseInt(res.headers['content-length']) || 0;
        if (fileSize > maxSize) return reply(`❗ File too large (${formatSize(fileSize)}). Max 2200MB allowed.`);

        // Extract metadata
        const mime = res.headers['content-type'] || 'application/octet-stream';
        const extension = mimeTypes.extension(mime) || 'bin';
        const contentDisposition = res.headers['content-disposition'] || '';
        const urlParts = new URL(q);

        // Construct filename with details
        const baseName = contentDisposition.match(/filename="?([^"]+)"?/)?.[1] 
            || q.split('/').pop().split(/[#?]/)[0]
            || 'file';

        const cleanBase = baseName.replace(/\.[^/.]+$/, ''); // Remove existing extension
        const sizeInfo = formatSize(fileSize);
        const domain = urlParts.hostname.replace('www.', '');
        const dateStamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Format: OriginalName_2.5MB_2023-10-05_example.com.mp4
        const detailedFileName = [
            cleanBase,
            sizeInfo,
            dateStamp,
            domain
        ].join('_') + `.${extension}`;

        // Sanitize filename
        const safeFileName = detailedFileName.replace(/[^a-z0-9_.-]/gi, '_');
        const filePath = path.join(tempDir, safeFileName);

        // Stream file to disk
        const writer = fsStream.createWriteStream(filePath);
        const fileRes = await axios({
            method: 'get',
            url: q,
            responseType: 'stream',
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        // Pipe the response stream to the file
        fileRes.data.pipe(writer);

        // Wait for the stream to finish
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // Send file from disk with detailed name and CINEVIBES LK caption
        await conn.sendMessage(
            from,
            {
                document: { url: filePath },
                mimetype: mime,
                fileName: safeFileName,
            },
            { quoted: mek }
        );

        // Clean up: Delete the file from disk after sending
        await fs.unlink(filePath).catch((err) => console.error('Cleanup Error:', err));

    } catch (error) {
        console.error('Download Error:', error);
        const errorMsg = error.response ? `Server error: ${error.response.status}` 
            : error.code === 'ECONNABORTED' ? 'Timeout (15s)' 
            : error.code === 'ENOTFOUND' ? 'Invalid host'
            : 'Download failed';
        reply(`❌ Error: ${errorMsg}`);

        // Cleanup in case of error
        const tempDir = path.join(__dirname, 'temp_downloads');
        const safeFileName = detailedFileName?.replace(/[^a-z0-9_.-]/gi, '_');
        if (safeFileName) {
            await fs.unlink(path.join(tempDir, safeFileName)).catch(() => {});
        }
    }
});
