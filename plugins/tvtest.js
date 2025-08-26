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

// Function to search Nkiri for TV series
async function searchNkiriTv(query) {
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

// Function to get episode list from Nkiri
async function getEpisodeList(url) {
    try {
        const episodeUrl = `https://sadas-niki-ep-info.vercel.app/?q=${encodeURIComponent(url)}`;
        console.log(`Calling Episode API: ${episodeUrl}`);
        const response = await instance.get(episodeUrl);
        return response.data.episodes;
    } catch (error) {
        console.error(`Episode API Error: ${error.message}`);
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
    pattern: "nkiritv",
    alias: ["tvseries"],
    react: "📺",
    desc: "Download TV series episodes from Nkiri",
    category: "download",
    use: ".nkiritv <Series name>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a TV series name!");

        // Step 1: Search for TV series and display list
        const searchResults = await searchNkiriTv(q);
        if (!searchResults?.results?.length) return await reply("❌ No results found!");

        let seriesList = `📺 *𝚃𝚅 𝚂𝙴𝚁𝙸𝙴𝚂 𝚂𝙴𝙰𝚁𝙲𝙷 𝚁𝙴𝚂𝚄𝙻𝚃𝚂* 📺\n\n`;
        const filteredResults = searchResults.results.filter(result => result.title.includes("TV Series"));
        if (!filteredResults.length) return await reply("❌ No TV series found!");

        filteredResults.forEach((series, index) => {
            seriesList += `${index + 1}. *${series.title || "Unknown"}*\n` +
                          `   🖇 *URL:* ${series.link || "Unknown"}\n\n`;
        });
        seriesList += `🔽 *Reply with the number of the series you want to select (e.g., 1, 2, ...)*\n\n` +
                      `${config.FOOTER || "*© ᴘᴏᴡᴇᴀʀᴅ ʙʏ ᴍᴀɴᴊᴜ-ᴍᴅ*"}`;

        const sentMsg = await conn.sendMessage(from, { text: seriesList }, { quoted: mek });
        const messageID = sentMsg.key.id;
        await conn.sendMessage(from, { react: { text: '📺', key: sentMsg.key } });

        // Step 2: Listen for series selection
        conn.ev.on('messages.upsert', async (messageUpdate) => {
            try {
                const mekInfo = messageUpdate?.messages[0];
                if (!mekInfo?.message) return;

                const messageType = mekInfo?.message?.conversation || mekInfo?.message?.extendedTextMessage?.text;
                const isReplyToSentMsg = mekInfo?.message?.extendedTextMessage?.contextInfo?.stanzaId === messageID;

                if (!isReplyToSentMsg) return;

                const userReply = messageType.trim();
                const selectedIndex = parseInt(userReply) - 1;

                if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= filteredResults.length) {
                    return await reply("❌ Invalid selection! Please reply with a valid number.");
                }

                const selectedSeries = filteredResults[selectedIndex];
                const { title, image } = selectedSeries;

                // Step 3: Fetch and display episode list
                const episodes = await getEpisodeList(selectedSeries.link);
                if (!episodes?.length) return await reply("❌ No episodes found!");

                let episodeList = `📺 *𝙴𝙿𝙸𝚂𝙾𝙳𝙴𝚂 𝙵𝙾𝚁 ${title || "Unknown"}* 📺\n\n`;
                episodes.forEach((episode, index) => {
                    episodeList += `${index + 1}. *${episode.title || "Unknown"}*\n` +
                                   `   🖇 *URL:* ${episode.link || "Unknown"}\n\n`;
                });
                episodeList += `🔽 *Reply with the number of the episode you want to download or "all" for all episodes*\n\n` +
                               `${config.FOOTER || "*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*"}`;

                const episodeMsg = await conn.sendMessage(from, { image: { url: image }, caption: episodeList }, { quoted: mek });
                const episodeMsgID = episodeMsg.key.id;
                await conn.sendMessage(from, { react: { text: '🎬', key: episodeMsg.key } });

                // Step 4: Listen for episode selection or "all"
                conn.ev.on('messages.upsert', async (episodeUpdate) => {
                    try {
                        const episodeMek = episodeUpdate?.messages[0];
                        if (!episodeMek?.message) return;

                        const episodeMessageType = episodeMek?.message?.conversation || episodeMek?.message?.extendedTextMessage?.text;
                        const isReplyToEpisodeMsg = episodeMek?.message?.extendedTextMessage?.contextInfo?.stanzaId === episodeMsgID;

                        if (!isReplyToEpisodeMsg) return;

                        const episodeChoice = episodeMessageType.trim().toLowerCase();

                        if (episodeChoice === "all") {
                            // Process all episodes
                            await processAllEpisodes(conn, from, mek, selectedSeries, episodes);
                        } else {
                            const selectedIndex = parseInt(episodeChoice) - 1;
                            if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= episodes.length) {
                                return await reply("❌ Invalid episode selection! Please reply with a valid number or 'all'.");
                            }
                            const selectedEpisode = episodes[selectedIndex];
                            await processEpisode(conn, from, mek, selectedSeries, selectedEpisode);
                        }
                    } catch (error) {
                        console.error(`Episode Selection Error: ${error.message}`);
                        await reply(`❌ *An error occurred while selecting episode:* ${error.message || "Error!"}`);
                    }
                });
            } catch (error) {
                console.error(`Series Selection Error: ${error.message}`);
                await reply(`❌ *An error occurred while selecting series:* ${error.message || "Error!"}`);
            }
        });
    } catch (error) {
        console.error(`Main Error: ${error.message}`);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        await reply(`❌ *An error occurred:* ${error.message || "Error!"}`);
    }
});

// Function to process a single episode
async function processEpisode(conn, from, mek, series, episode) {
    try {
        const { title: seriesTitle, image } = series;
        const { title: episodeTitle, link } = episode;

        const msg = await conn.sendMessage(from, { text: `⏳ Downloading ${episodeTitle}...` }, { quoted: mek });

        // Get direct link
        const directLink = await getDirectLink(link);
        if (!directLink) {
            await conn.sendMessage(from, { text: '❌ Direct download link not found!', edit: msg.key });
            return;
        }

        // Download the file
        const fileName = `${seriesTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${episodeTitle.replace(/[^a-zA-Z0-9]/g, '_')}.mkv`;
        const filePath = path.join(__dirname, fileName);
        await downloadFile(directLink, filePath);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            await conn.sendMessage(from, { text: '❌ Failed to download the file!', edit: msg.key });
            return;
        }

        // Check file size (WhatsApp limit ~100MB)
        const fileSize = fs.statSync(filePath).size / (1024 * 1024); // Size in MB
        if (fileSize > 2100) {
            fs.unlinkSync(filePath); // Clean up
            await conn.sendMessage(from, {
                text: `❌ ${episodeTitle} is too large to send via WhatsApp (>100MB). Use this direct link:\n🔗 ${directLink}\n\n*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*`,
                edit: msg.key
            });
            return;
        }

        // Get thumbnail as base64
        const thumbnailBase64 = await getThumbnailBase64(image);

        // Send as document with thumbnail
        await conn.sendMessage(from, {
            document: { url: filePath },
            fileName: `${seriesTitle}_${episodeTitle}.mkv`,
            mimetype: 'video/mp4',
            caption: `*${episodeTitle}\n\n*𝙲𝙸𝙽𝙴𝚅𝙸𝙱𝙴𝚂 𝙻𝙺 𝙾𝙵𝙵𝙸𝙲𝙸𝙰𝙻*`,
            jpegThumbnail: thumbnailBase64 ? Buffer.from(thumbnailBase64, 'base64') : undefined
        }, { quoted: mek });

        await conn.sendMessage(from, { text: '✅ Media Upload Successful ✅', edit: msg.key });

        // Clean up downloaded file
        setTimeout(() => {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }, 60000); // Delete after 1 minute
    } catch (error) {
        console.error(`Episode Processing Error: ${error.message}`);
        await conn.sendMessage(from, { text: `❌ *Error processing episode:* ${error.message || "Error!"}`, edit: msg.key });
    }
}

// Function to process all episodes
async function processAllEpisodes(conn, from, mek, series, episodes) {
    try {
        const { title: seriesTitle, image } = series;
        const msg = await conn.sendMessage(from, { text: `⏳ Processing all episodes of ${seriesTitle}...` }, { quoted: mek });

        for (const episode of episodes) {
            const { title: episodeTitle, link } = episode;

            await conn.sendMessage(from, { text: `⏳ Downloading ${episodeTitle}...` }, { quoted: mek });

            // Get direct link
            const directLink = await getDirectLink(link);
            if (!directLink) {
                await conn.sendMessage(from, { text: `❌ Direct download link not found for ${episodeTitle}!` }, { quoted: mek });
                continue;
            }

            // Download the file
            const fileName = `${seriesTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${episodeTitle.replace(/[^a-zA-Z0-9]/g, '_')}.mkv`;
            const filePath = path.join(__dirname, fileName);
            await downloadFile(directLink, filePath);

            // Check if file exists
            if (!fs.existsSync(filePath)) {
                await conn.sendMessage(from, { text: `❌ Failed to download ${episodeTitle}!` }, { quoted: mek });
                continue;
            }

            // Check file size (WhatsApp limit ~100MB)
            const fileSize = fs.statSync(filePath).size / (1024 * 1024); // Size in MB
            if (fileSize > 2100) {
                fs.unlinkSync(filePath); // Clean up
                await conn.sendMessage(from, {
                    text: `❌ ${episodeTitle} is too large to send (>100MB). Use this direct link:\n🔗 ${directLink}\n\n*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*`
                }, { quoted: mek });
                continue;
            }

            // Get thumbnail as base64
            const thumbnailBase64 = await getThumbnailBase64(image);

            // Send as document with thumbnail
            await conn.sendMessage(from, {
                document: { url: filePath },
                fileName: `${seriesTitle}_${episodeTitle}.mkv`,
                mimetype: 'video/mp4',
                caption: `*${episodeTitle}\n\n*𝙲𝙸𝙽𝙴𝚅𝙸𝙱𝙴𝚂 𝙻𝙺 𝙾𝙵𝙵𝙸𝙲𝙸𝙰𝙻*`,
                jpegThumbnail: thumbnailBase64 ? Buffer.from(thumbnailBase64, 'base64') : undefined
            }, { quoted: mek });

            // Clean up downloaded file
            setTimeout(() => {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }, 60000); // Delete after 1 minute
        }

        await conn.sendMessage(from, { text: '✅ All episodes processed! ✅', edit: msg.key });
    } catch (error) {
        console.error(`All Episodes Processing Error: ${error.message}`);
        await conn.sendMessage(from, { text: `❌ *Error processing episodes:* ${error.message || "Error!"}`, edit: msg.key });
    }
}
