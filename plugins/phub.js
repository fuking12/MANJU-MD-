const config = require('../config');
const { cmd } = require('../command');
const { PornHub } = require('pornhub.js');
const axios = require('axios');
const fs = require('fs').promises;
const fsStream = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const mimeTypes = require('mime-types');

const pornhub = new PornHub();

// Helper function to format file size
const formatSize = (bytes) => {
    if (bytes === 0) return '0B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
};

cmd({
    pattern: "phub",
    alias: ["pornhub", "ph"],
    react: "🔞",
    desc: "Search and download PornHub videos as MP4 document with warning, thumbnail, and title-only filename",
    category: "download",
    use: ".phub <search query>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a search query!");

        // Search for videos using pornhub.js
        const searchResults = await pornhub.searchVideo(q);
        if (!searchResults.data || searchResults.data.length === 0) {
            return await reply("❌ No videos found for your query!");
        }

        // Show all search results
        let info = `🔞 *𝙿𝙾𝚁𝙽𝙷𝚄𝙱 𝚅𝙸𝙳𝙴𝙾 𝙳𝙾𝚆𝙽𝙻𝙾𝙰𝙳𝙴𝚁* 🔞\n\n` +
            `🔍 *Search Query:* ${q}\n\n` +
            `🔽 *Reply with a number to select a video:*\n`;

        searchResults.data.forEach((video, index) => {
            info += `${index + 1}. *${video.title}* (${video.duration})\n` +
                    `   🔗 ${video.url}\n`;
        });

        info += `\n${config.FOOTER || "*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*"}`;

        // Send search results with thumbnail
        let sentMsg;
        try {
            sentMsg = await conn.sendMessage(from, { 
                image: { url: searchResults.data[0].preview || 'https://placehold.co/200x300' }, 
                caption: info 
            }, { quoted: mek });
        } catch (imageError) {
            console.error(`Failed to load search thumbnail: ${imageError.message}`);
            sentMsg = await conn.sendMessage(from, { text: info }, { quoted: mek });
        }

        const messageID = sentMsg.key.id;
        await conn.sendMessage(from, { react: { text: '🎥', key: sentMsg.key } });

        // Listen for video selection reply
        conn.ev.on('messages.upsert', async (messageUpdate) => {
            try {
                const mekInfo = messageUpdate?.messages[0];
                if (!mekInfo?.message) return;

                const messageType = mekInfo?.message?.conversation || mekInfo?.message?.extendedTextMessage?.text;
                const isReplyToSentMsg = mekInfo?.message?.extendedTextMessage?.contextInfo?.stanzaId === messageID;

                if (!isReplyToSentMsg) return;

                let selectedIndex = parseInt(messageType) - 1;
                if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= searchResults.data.length) {
                    return await reply("❌ Invalid choice! Reply with a number between 1 and " + searchResults.data.length + ".");
                }

                const selectedVideo = searchResults.data[selectedIndex];
                let videoDetails;
                try {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay to avoid rate limiting
                    videoDetails = await pornhub.video(selectedVideo.url);
                    console.log('Video Details:', videoDetails); // Log response for debugging
                    if (!videoDetails || !videoDetails.mediaDefinitions) {
                        throw new Error('Invalid video details response');
                    }
                } catch (videoError) {
                    console.error(`Failed to fetch video details: ${videoError.message}`);
                    return await reply(`❌ Failed to fetch video details for *${selectedVideo.title}*!\nTry this link manually: ${selectedVideo.url}`);
                }

                const { title, durationFormatted, provider, mediaDefinitions, thumb } = videoDetails;
                const qualityOptions = mediaDefinitions.filter(md => md.format === 'hls' && md.quality !== 'auto').map(md => ({
                    quality: Array.isArray(md.quality) ? md.quality[0] : md.quality,
                    videoUrl: md.videoUrl
                }));
                if (qualityOptions.length === 0) {
                    return await reply("❌ No download links available for this video!");
                }

                let qualityMenu = `🔞 *Selected Video:* ${title}\n` +
                    `⏱ *Duration:* ${durationFormatted}\n` +
                    `👤 *Uploader:* ${provider.username}\n\n` +
                    `🔽 *Reply with a number to select quality (downloads as MP4 document):*\n`;

                const qualityMap = {};
                qualityOptions.forEach((opt, index) => {
                    qualityMenu += `${index + 1}. *${opt.quality}p*\n`;
                    qualityMap[`${index + 1}`] = { quality: opt.quality, videoUrl: opt.videoUrl };
                });

                qualityMenu += `\n${config.FOOTER || "*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*"}`;

                // Send quality menu with thumbnail
                let qualityMsg;
                try {
                    qualityMsg = await conn.sendMessage(from, { 
                        image: { url: thumb }, 
                        caption: qualityMenu 
                    }, { quoted: mek });
                } catch (imageError) {
                    console.error(`Failed to load quality menu thumbnail: ${imageError.message}`);
                    qualityMsg = await conn.sendMessage(from, { text: qualityMenu }, { quoted: mek });
                }

                const qualityMessageID = qualityMsg.key.id;

                // Listen for quality selection reply
                conn.ev.on('messages.upsert', async (subMessageUpdate) => {
                    try {
                        const subMekInfo = subMessageUpdate?.messages[0];
                        if (!subMekInfo?.message) return;

                        const subMessageType = subMekInfo?.message?.conversation || subMekInfo?.message?.extendedTextMessage?.text;
                        const isReplyToQualityMsg = subMekInfo?.message?.extendedTextMessage?.contextInfo?.stanzaId === qualityMessageID;

                        if (!isReplyToQualityMsg) return;

                        let userReply = subMessageType.trim();
                        if (!qualityMap[userReply]) {
                            return await reply("❌ Invalid choice! Reply with a number (e.g., 1, 2, 3).");
                        }

                        const { quality, videoUrl } = qualityMap[userReply];

                        // Fetch file metadata
                        const res = await axios.head(videoUrl, {
                            timeout: 15000,
                            headers: { 'User-Agent': 'Mozilla/5.0' }
                        });

                        if (res.status !== 200) {
                            return await reply(`❌ Server error: ${res.status}`);
                        }

                        // File size handling
                        const maxSize = 2200 * 1024 * 1024; // 2200MB
                        const fileSize = parseInt(res.headers['content-length']) || 0;
                        if (fileSize > maxSize) {
                            return await reply(`❗ File too large (${formatSize(fileSize)}). Max 2200MB allowed.`);
                        }

                        // Create temporary directory
                        const tempDir = path.join(__dirname, 'temp_downloads');
                        await fs.mkdir(tempDir, { recursive: true });

                        // Sanitize filename (title only)
                        const cleanBase = title.replace(/[^a-z0-9_.-]/gi, '_').substring(0, 50);
                        const safeFileName = `${cleanBase}.mp4`;
                        const tempVideoPath = path.join(tempDir, safeFileName);
                        const tempThumbnailPath = path.join(tempDir, `${cleanBase}_thumb.jpg`);

                        // Convert HLS to MP4 using ffmpeg
                        const msg = await conn.sendMessage(from, { text: `⏳ Downloading *${title}* (${quality}p)...` }, { quoted: mek });
                        try {
                            await new Promise((resolve, reject) => {
                                ffmpeg(videoUrl)
                                    .outputOptions('-c:v copy')
                                    .outputOptions('-c:a copy')
                                    .output(tempVideoPath)
                                    .on('end', () => {
                                        console.log(`FFmpeg: Successfully converted ${tempVideoPath}`);
                                        resolve();
                                    })
                                    .on('error', (err) => {
                                        console.error(`FFmpeg Error: ${err.message}`);
                                        reject(err);
                                    })
                                    .run();
                            });
                        } catch (ffmpegError) {
                            console.error(`Failed to convert video: ${ffmpegError.message}`);
                            return await reply(`❌ Failed to download video! Try this link manually: ${selectedVideo.url}`);
                        }

                        // Check if file exists
                        if (!fsStream.existsSync(tempVideoPath)) {
                            return await reply(`❌ Failed to create video file! Try this link manually: ${selectedVideo.url}`);
                        }

                        // Download thumbnail and convert to Base64
                        let thumbnailBase64;
                        try {
                            const thumbnailResponse = await axios({
                                url: thumb,
                                method: 'GET',
                                responseType: 'stream'
                            });
                            const thumbnailWriter = fsStream.createWriteStream(tempThumbnailPath);
                            thumbnailResponse.data.pipe(thumbnailWriter);
                            await new Promise((resolve, reject) => {
                                thumbnailWriter.on('finish', resolve);
                                thumbnailWriter.on('error', reject);
                            });

                            // Convert thumbnail to Base64
                            thumbnailBase64 = (await fs.readFile(tempThumbnailPath)).toString('base64');
                        } catch (error) {
                            console.error(`Failed to download or process thumbnail: ${error.message}`);
                            thumbnailBase64 = undefined;
                        }

                        // Send as document with warning message and thumbnail
                        const warningMessage = `⚠️ *Warning*: This content is explicit and intended for adults only (18+). Viewer discretion is advised.\n\n`;
                        await conn.sendMessage(from, {
                            document: { url: tempVideoPath },
                            fileName: safeFileName,
                            mimetype: 'video/mp4',
                            caption: `${warningMessage}*${title}* (${quality}p, ${durationFormatted})\n*Uploader:* ${provider.username}\n*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*`,
                            jpegThumbnail: thumbnailBase64 ? Buffer.from(thumbnailBase64, 'base64') : undefined
                        }, { quoted: mek });

                        await conn.sendMessage(from, { text: '✅ Media Upload Successful ✅', edit: msg.key });

                        // Clean up temporary files
                        [tempVideoPath, tempThumbnailPath].forEach(file => {
                            fs.unlink(file).catch((err) => console.error(`Failed to delete temp file ${file}: ${err}`));
                        });

                    } catch (error) {
                        console.error('Download Error:', error);
                        const errorMsg = error.response ? `Server error: ${error.response.status}` 
                            : error.code === 'ECONNABORTED' ? 'Timeout (15s)' 
                            : error.code === 'ENOTFOUND' ? 'Invalid host'
                            : 'Download failed';
                        await reply(`❌ Error: ${errorMsg}`);

                        // Cleanup in case of error
                        const tempDir = path.join(__dirname, 'temp_downloads');
                        if (safeFileName) {
                            await fs.unlink(path.join(tempDir, safeFileName)).catch(() => {});
                        }
                    }
                });

            } catch (error) {
                console.error(error);
                await reply(`❌ *An error occurred while processing:* ${error.message || "Error!"}`);
            }
        });

    } catch (error) {
        console.error(error);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        await reply(`❌ *An error occurred:* ${error.message || "Error!"}`);
    }
});
