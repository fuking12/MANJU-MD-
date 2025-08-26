const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "fb",
    alias: ["fbdl", "facebook"],
    react: "📹",
    desc: "Download Facebook video",
    category: "download",
    use: ".fb <Facebook URL>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q || !q.startsWith("https://")) return await reply("❌ Please provide a valid Facebook URL!");

        const apiUrl = `https://api.princetechn.com/api/download/facebook?apikey=prince&url=${encodeURIComponent(q)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (!data.success || data.status !== 200) return await reply("❌ Failed to fetch video details!");

        const { title, duration, thumbnail, hd_video, sd_video } = data.result;

        let info = `📹 *𝙵𝙰𝙲𝙴𝙱𝙾𝙾𝙺 𝚅𝙸𝙳𝙴𝙾 𝙳𝙾𝚆𝙽𝙻𝙾𝙰𝙳𝙴𝚁* 📹\n\n` +
            `🎥 *Title:* ${title || "No title available"}\n` +
            `⏳ *Duration:* ${duration || "Unknown"}\n` +
            `🖇 *Url:* ${q}\n\n` +
            `🔽 *Reply with your choice:*\n` +
            `1.1 *HD Video* 🎥\n` +
            `1.2 *SD Video* 📼\n\n` +
            `${config.FOOTER || "*© ᴘᴏᴡᴇᴀʀᴅ ʙʏ ᴍᴀɴᴊᴜ-ᴍᴅ*"}`;

        const sentMsg = await conn.sendMessage(from, { image: { url: thumbnail }, caption: info }, { quoted: mek });
        const messageID = sentMsg.key.id;
        await conn.sendMessage(from, { react: { text: '📼', key: sentMsg.key } });

        // Listen for user reply only once
        conn.ev.on('messages.upsert', async (messageUpdate) => {
            try {
                const mekInfo = messageUpdate?.messages[0];
                if (!mekInfo?.message) return;

                const messageType = mekInfo?.message?.conversation || mekInfo?.message?.extendedTextMessage?.text;
                const isReplyToSentMsg = mekInfo?.message?.extendedTextMessage?.contextInfo?.stanzaId === messageID;

                if (!isReplyToSentMsg) return;

                let userReply = messageType.trim();
                let msg;
                let type;

                if (userReply === "1.1") {
                    msg = await conn.sendMessage(from, { text: "⏳ Processing HD Video..." }, { quoted: mek });
                    if (!hd_video) return await reply("❌ HD video link not found!");
                    type = { video: { url: hd_video }, mimetype: "video/mp4", caption: `*${title}* - HD Video\n*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*` };
                    
                } else if (userReply === "1.2") {
                    msg = await conn.sendMessage(from, { text: "⏳ Processing SD Video..." }, { quoted: mek });
                    if (!sd_video) return await reply("❌ SD video link not found!");
                    type = { video: { url: sd_video }, mimetype: "video/mp4", caption: `*${title}* - SD Video\n*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*` };
                    
                } else {
                    return await reply("❌ Invalid choice! Reply with 1.1 or 1.2.");
                }

                await conn.sendMessage(from, type, { quoted: mek });
                await conn.sendMessage(from, { text: '✅ Video Upload Successful ✅', edit: msg.key });

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
