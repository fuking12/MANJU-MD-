const config = require('../config');
const { cmd, commands } = require('../command');
const { fetchJson } = require('../lib/functions');
const axios = require('axios');
const mimeTypes = require('mime-types');

const formatSize = (bytes) => {
    if (bytes === 0) return '0B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
};

cmd({
    pattern: "up",
    react: "📥",
    alias: ["dlurl"],
    desc: "Direct link uploader to specified JID, forces all files to upload as MP4 documents",
    category: "download",
    use: '.dl <link> [| <jid>]',
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, args, q, reply }) => {
    try {
        // Parse input
        const parts = q.split(/\s+\|\s+/);
        const url = parts[0] ? parts[0].trim() : '';
        const targetJid = parts[1] ? parts[1].trim() : from;

        if (!url) return reply('❗ Please provide a valid URL!');

        // URL validation
        const isValidUrl = (url) => {
            try {
                new URL(url);
                return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(url);
            } catch {
                return false;
            }
        };
        if (!isValidUrl(url)) return reply('❌ Invalid URL format!');

        // Fetch file data
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (res.status !== 200) return reply(`❌ Server error: ${res.status}`);

        // File size handling
        const maxSize = 2200 * 1024 * 1024; // 2GB limit for WhatsApp documents
        const fileSize = parseInt(res.headers['content-length']) || 0;
        if (fileSize > maxSize) return reply(`❗ File too large (${formatSize(fileSize)}). Max 2GB allowed for documents.`);

        // Extract metadata (for filename construction)
        const contentDisposition = res.headers['content-disposition'] || '';
        const urlParts = new URL(url);

        // Construct filename
        const baseName = contentDisposition.match(/filename="?([^"]+)"?/)?.[1] 
            || url.split('/').pop().split(/[#?]/)[0]
            || 'file';

        const cleanBase = baseName.replace(/\.[^/.]+$/, '');
        const sizeInfo = formatSize(fileSize);
        const domain = urlParts.hostname.replace('www.', '');
        const dateStamp = new Date().toISOString().split('T')[0];

        // Force MP4 extension and MIME type
        const detailedFileName = [
            cleanBase,
            sizeInfo,
            dateStamp,
            domain
        ].join('_') + `.mp4`; // Always use .mp4 extension

        const safeFileName = detailedFileName.replace(/[^a-z0-9_.-]/gi, '_');

        // Determine send options
        const sendOptions = targetJid === from ? { quoted: mek } : {};

        // Send as MP4 document (force MIME type to video/mp4)
        await conn.sendMessage(
            targetJid,
            {
                document: res.data,
                mimetype: 'video/mp4', // Force MIME type
                fileName: safeFileName
            },
            sendOptions
        );

    } catch (error) {
        console.error('Download Error:', error);
        const errorMsg = error.response ? `Server error: ${error.response.status}` 
            : error.code === 'ECONNABORTED' ? 'Timeout (15s)' 
            : error.message.includes('ENOTFOUND') ? 'Invalid host'
            : error.message.includes('invalid jid') ? 'Invalid JID format'
            : 'Upload failed';
        reply(`❌ Error: ${errorMsg}`);
    }
});
