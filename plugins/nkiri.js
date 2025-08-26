const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Create axios instance with SSL verification disabled (temporary for testing)
const instance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false // SSL verification bypass
    }),
    timeout: 60000 // Increase timeout to 60 seconds
});

// Function to download and convert image to base64 for thumbnail
async function getThumbnailBase64(imageUrl) {
    try {
        console.log(`Downloading thumbnail from: ${imageUrl}`);
        const response = await instance({
            url: imageUrl,
            method: 'GET',
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        return Buffer.from(response.data).toString('base64');
    } catch (error) {
        console.error(`Thumbnail Download Error: ${error.message}`);
        return null; // Return null if thumbnail download fails
    }
}

// Function to search Nkiri for movies
async function searchNkiri(query) {
    try {
        const searchUrl = `https://sadas-niki-search.vercel.app/api/search?q=${encodeURIComponent(query)}`;
        console.log(`Calling Search API: ${searchUrl}`);
        const response = await instance.get(searchUrl);
        return response.data;
    } catch (error) {
        console.error(`Search API Error: ${error.message}`);
        throw error;
    }
}

// Function to get download link from Nkiri
async function getDownloadLink(url) {
    try {
        const downloadUrl = `https://sadas-niki-info.vercel.app/api/download-link?url=${encodeURIComponent(url)}`;
        console.log(`Calling Download API: ${downloadUrl}`);
        const response = await instance.get(downloadUrl);
        return response.data.downloadLink;
    } catch (error) {
        console.error(`Download API Error: ${error.message}`);
        throw error;
    }
}

// Function to get direct download link
async function getDirectLink(downloadLink) {
    try {
        const directLinkUrl = `https://sadas-niki-dl.vercel.app/get-direct-link?url=${encodeURIComponent(downloadLink)}`;
        console.log(`Calling Direct Link API: ${directLinkUrl}`);
        const response = await instance.get(directLinkUrl);
        return response.data.directLink;
    } catch (error) {
        console.error(`Direct Link API Error: ${error.message}`);
        throw error;
    }
}

// Function to download file from direct link
async function downloadFile(url, filePath) {
    try {
        console.log(`Downloading file from: ${url}`);
        const response = await instance({
            url,
            method: 'GET',
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`File Download Error: ${error.message}`);
        throw error;
    }
}

cmd({
    pattern: "nkiri",
    alias: ["movie", "nkiridl"],
    react: "🎬",
    desc: "Download movies from Nkiri",
    category: "download",
    use: ".nkiri <Movie name>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a movie name!");

        // Step 1: Search for movies and display list
        const searchResults = await searchNkiri(q);
        if (!searchResults?.results?.length) return await reply("❌ No results found!");

        let movieList = `🎬 *𝙼𝙾𝚅𝙸𝙴 𝚂𝙴𝙰𝚁𝙲𝙷 𝚁𝙴𝚂𝚄𝙻𝚃𝚂* 🎬\n\n`;
        searchResults.results.forEach((movie, index) => {
            movieList += `${index + 1}. *${movie.title || "Unknown"}*\n` +
                         `   🖇 *URL:* ${movie.link || "Unknown"}\n\n`;
        });
        movieList += `🔽 *Reply with the number of the movie you want to select (e.g., 1, 2, ...)*\n\n` +
                     `${config.FOOTER || "*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*"}`;

        const sentMsg = await conn.sendMessage(from, { text: movieList }, { quoted: mek });
        const messageID = sentMsg.key.id;
        await conn.sendMessage(from, { react: { text: '🎥', key: sentMsg.key } });

        // Step 2: Listen for movie selection
        conn.ev.on('messages.upsert', async (messageUpdate) => {
            try {
                const mekInfo = messageUpdate?.messages[0];
                if (!mekInfo?.message) return;

                const messageType = mekInfo?.message?.conversation || mekInfo?.message?.extendedTextMessage?.text;
                const isReplyToSentMsg = mekInfo?.message?.extendedTextMessage?.contextInfo?.stanzaId === messageID;

                if (!isReplyToSentMsg) return;

                const userReply = messageType.trim();
                const selectedIndex = parseInt(userReply) - 1;

                if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= searchResults.results.length) {
                    return await reply("❌ Invalid selection! Please reply with a valid number.");
                }

                const selectedMovie = searchResults.results[selectedIndex];
                const { title, link, image, summary } = selectedMovie;

                // Step 3: Show movie details and download options
                let info = `🎬 *𝙼𝙾𝚅𝙸𝙴 𝙳𝙴𝚃𝙰𝙸𝙻𝚂* 🎬\n\n` +
                           `🎥 *Title:* ${title || "Unknown"}\n` +
                           `📜 *Summary:* ${summary !== "🙂" ? summary : "No summary available"}\n` +
                           `🖇 *URL:* ${link || "Unknown"}\n\n` +
                           `🔽 *Reply with your choice:*\n` +
                           `1.1 *Direct Download Link* 🔗\n` +
                           `1.2 *Document Type* 📁\n\n` +
                           `${config.FOOTER || "*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*"}`;

                const detailsMsg = await conn.sendMessage(from, { image: { url: image }, caption: info }, { quoted: mek });
                const detailsMsgID = detailsMsg.key.id;
                await conn.sendMessage(from, { react: { text: '🎬', key: detailsMsg.key } });

                // Step 4: Listen for download option selection
                conn.ev.on('messages.upsert', async (downloadUpdate) => {
                    try {
                        const downloadMek = downloadUpdate?.messages[0];
                        if (!downloadMek?.message) return;

                        const downloadMessageType = downloadMek?.message?.conversation || downloadMek?.message?.extendedTextMessage?.text;
                        const isReplyToDetailsMsg = downloadMek?.message?.extendedTextMessage?.contextInfo?.stanzaId === detailsMsgID;

                        if (!isReplyToDetailsMsg) return;

                        const downloadChoice = downloadMessageType.trim();
                        let msg;
                        let type;

                        // Get download and direct links
                        const downloadLink = await getDownloadLink(link);
                        const directLink = await getDirectLink(downloadLink);

                        if (downloadChoice === "1.1") {
                            msg = await conn.sendMessage(from, { text: "⏳ Processing Direct Link..." }, { quoted: mek });
                            if (!directLink) return await reply("❌ Direct download link not found!");
                            type = { text: `🔗 *Direct Download Link:* ${directLink}\n\n*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*` };

                        } else if (downloadChoice === "1.2") {
                            msg = await conn.sendMessage(from, { text: "⏳ Downloading and Sending Document..." }, { quoted: mek });

                            if (!directLink) return await reply("❌ Direct download link not found!");

                            // Download the file
                            const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
                            const filePath = path.join(__dirname, fileName);
                            await downloadFile(directLink, filePath);

                            // Check if file exists
                            if (!fs.existsSync(filePath)) {
                                await conn.sendMessage(from, { text: "❌ Failed to download the file!", edit: msg.key });
                                return;
                            }

                            // Check file size (WhatsApp limit ~100MB)
                            const fileSize = fs.statSync(filePath).size / (1024 * 1024); // Size in MB
                            if (fileSize > 2100) {
                                fs.unlinkSync(filePath); // Clean up
                                await conn.sendMessage(from, {
                                    text: `❌ ${title} is too large to send via WhatsApp (>100MB). Use this direct link:\n🔗 ${directLink}\n\n*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*`,
                                    edit: msg.key
                                });
                                return;
                            }

                            // Get thumbnail as base64
                            const thumbnailBase64 = await getThumbnailBase64(image);

                            // Send as document with thumbnail
                            type = {
                                document: { url: filePath },
                                fileName: `${title}.mp4`,
                                mimetype: "video/mp4",
                                caption: `*${title}*\n\n*𝙲𝙸𝙽𝙴𝚅𝙸𝙱𝙴𝚂 𝙻𝙺 𝙾𝙵𝙵𝙸𝙲𝙸𝙰𝙻*`,
                                jpegThumbnail: thumbnailBase64 ? Buffer.from(thumbnailBase64, 'base64') : undefined
                            };

                            // Clean up downloaded file after sending
                            setTimeout(() => {
                                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                            }, 60000); // Delete after 1 minute

                        } else {
                            return await reply("❌ Invalid choice! Reply with 1.1 or 1.2.");
                        }

                        await conn.sendMessage(from, type, { quoted: mek });
                        await conn.sendMessage(from, { text: '✅ Media Upload Successful ✅', edit: msg.key });

                    } catch (error) {
                        console.error(`Download Error: ${error.message}`);
                        await reply(`❌ *An error occurred while processing:* ${error.message || "Error!"}`);
                    }
                });

            } catch (error) {
                console.error(`Selection Error: ${error.message}`);
                await reply(`❌ *An error occurred while selecting movie:* ${error.message || "Error!"}`);
            }
        });

    } catch (error) {
        console.error(`Main Error: ${error.message}`);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        await reply(`❌ *An error occurred:* ${error.message || "Error!"}`);
    }
});
