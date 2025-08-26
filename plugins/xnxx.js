const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "xnxx",
    alias: ["xnxxdl", "xvideo"],
    react: "📹",
    desc: "Search and download video (for testing purposes)",
    category: "download",
    use: ".xnxx <Search query>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a search query!");

        // Step 1: Search for videos
        const searchApiUrl = `https://api.princetechn.com/api/search/xnxxsearch?apikey=prince&query=${encodeURIComponent(q)}`;
        const searchResponse = await axios.get(searchApiUrl);
        const searchData = searchResponse.data;

        if (!searchData.success || searchData.status !== 200 || !searchData.results?.length) {
            return await reply("❌ No results found!");
        }

        // Prepare all search results
        const results = searchData.results;
        let info = `📹 *𝚅𝙸𝙳𝙴𝙾 𝚂𝙴𝙰𝚁𝙲𝙷 𝙳𝙾𝚆𝙽𝙻𝙾𝙰𝙳𝙴𝚁* 📹\n\n` +
            `🔍 *Search Query:* ${q}\n\n` +
            `🔽 *Select a video by replying with the number:*\n`;

        results.forEach((result, index) => {
            info += `${index + 1}. ${result.title}\n`;
        });

        info += `\n${config.FOOTER || "*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*"}`;

        const sentMsg = await conn.sendMessage(from, { text: info }, { quoted: mek });
        const messageID = sentMsg.key.id;
        await conn.sendMessage(from, { react: { text: '🔍', key: sentMsg.key } });

        // Step 2: Listen for video selection
        conn.ev.on('messages.upsert', async (messageUpdate) => {
            try {
                const mekInfo = messageUpdate?.messages[0];
                if (!mekInfo?.message) return;

                const messageType = mekInfo?.message?.conversation || mekInfo?.message?.extendedTextMessage?.text;
                const isReplyToSentMsg = mekInfo?.message?.extendedTextMessage?.contextInfo?.stanzaId === messageID;

                if (!isReplyToSentMsg) return;

                let userReply = messageType.trim();
                let selectedIndex = parseInt(userReply) - 1;

                if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= results.length) {
                    return await reply("❌ Invalid selection! Reply with a number between 1 and " + results.length + ".");
                }

                const selectedVideo = results[selectedIndex];
                const videoUrl = selectedVideo.link;

                // Step 3: Fetch video details
                const downloadApiUrl = `https://api.princetechn.com/api/download/xnxxdl?apikey=prince&url=${encodeURIComponent(videoUrl)}`;
                const downloadResponse = await axios.get(downloadApiUrl);
                const downloadData = downloadResponse.data;

                if (!downloadData.success || downloadData.status !== 200) {
                    return await reply("❌ Failed to fetch video details!");
                }

                const { title, duration, image, files } = downloadData.result;

                let downloadInfo = `⚠️ *18+ Content Warning*: This content is intended for adults only. Please ensure you are 18+ and comply with platform policies.\n\n` +
                    `📹 *𝚅𝙸𝙳𝙴𝙾 𝙳𝙾𝚆𝙽𝙻𝙾𝙰𝙳𝙴𝚁* 📹\n\n` +
                    `🎥 *Title:* ${title || "Unknown"}\n` +
                    `⏳ *Duration:* ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}\n` +
                    `🖇 *Url:* ${videoUrl}\n\n` +
                    `🔽 *Reply with your choice:*\n` +
                    `1.1 *High Quality* 🎥\n` +
                    `1.2 *Low Quality* 📼\n` +
                    `1.3 *HLS Quality* 📽️\n\n` +
                    `${config.FOOTER || "*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*"}`;

                const downloadMsg = await conn.sendMessage(from, { image: { url: image }, caption: downloadInfo }, { quoted: mek });
                const downloadMessageID = downloadMsg.key.id;
                await conn.sendMessage(from, { react: { text: '📼', key: downloadMsg.key } });

                // Step 4: Listen for quality selection
                conn.ev.on('messages.upsert', async (downloadMessageUpdate) => {
                    try {
                        const downloadMekInfo = downloadMessageUpdate?.messages[0];
                        if (!downloadMekInfo?.message) return;

                        const downloadMessageType = downloadMekInfo?.message?.conversation || downloadMekInfo?.message?.extendedTextMessage?.text;
                        const isReplyToDownloadMsg = downloadMekInfo?.message?.extendedTextMessage?.contextInfo?.stanzaId === downloadMessageID;

                        if (!isReplyToDownloadMsg) return;

                        let downloadReply = downloadMessageType.trim();
                        let msg;
                        let type;
                        let selectedUrl;

                        if (downloadReply === "1.1") {
                            selectedUrl = files?.high;
                            msg = await conn.sendMessage(from, { text: "⏳ Processing High Quality Document..." }, { quoted: mek });
                        } else if (downloadReply === "1.2") {
                            selectedUrl = files?.low;
                            msg = await conn.sendMessage(from, { text: "⏳ Processing Low Quality Document..." }, { quoted: mek });
                        } else if (downloadReply === "1.3") {
                            selectedUrl = files?.HLS;
                            msg = await conn.sendMessage(from, { text: "⏳ Processing HLS Quality Document..." }, { quoted: mek });
                        } else {
                            return await reply("❌ Invalid choice! Reply with 1.1, 1.2, or 1.3.");
                        }

                        if (!selectedUrl) return await reply("❌ Selected quality link not found!");

                        type = {
                            document: { url: selectedUrl },
                            fileName: `${title || "video"}.mp4`,
                            mimetype: "video/mp4",
                            caption: `⚠️ *18+ Content Warning*: This content is intended for adults only.\n\n*${title || "Video"}*\n*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*`
                        };

                        await conn.sendMessage(from, type, { quoted: mek });
                        await conn.sendMessage(from, { text: '✅ Document Upload Successful ✅', edit: msg.key });

                    } catch (error) {
                        console.error(error);
                        await reply(`❌ *An error occurred while processing:* ${error.message || "Error!"}`);
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
