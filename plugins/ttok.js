const config = require('../config');
const { cmd } = require('../command');
const DY_SCRAP = require('@dark-yasiya/scrap');
const dy_scrap = new DY_SCRAP();

cmd({
    pattern: "tiktok",
    alias: ["ttdl", "tt"],
    react: "🎥",
    desc: "Download TikTok video or audio",
    category: "download",
    use: ".tiktok <TikTok URL>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q || !q.startsWith("https://")) return await reply("❌ Please provide a valid TikTok URL!");

        // Fetch video details using dark-yasiya/scrap
        const result = await dy_scrap.tiktok(q);
        if (!result.status || !result.result) {
            return await reply("❌ Failed to fetch TikTok media details!");
        }

        const { title, cover: thumbnail, duration, play: sd_video, hd: hd_video, music: audio } = result.result;

        let info = `🎥 *𝚃𝙸𝙺𝚃𝙾𝙺 𝙳𝙾𝚆𝙽𝙻𝙾𝙰𝙳𝙴𝚁* 🎥\n\n` +
            `🎬 *Title:* ${title || "Unknown"}\n` +
            `🕒 *Duration:* ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}\n` +
            `🖇 *Url:* ${q}\n\n` +
            `🔽 *Reply with your choice:*\n` +
            `1.1 *Video (MP4)* 📹\n` +
            `1.2 *Audio (Voice Message)* 🎙️\n\n` +
            `${config.FOOTER || "*© ᴘᴏᴡᴇᴀʀᴅ ʙʏ ᴍᴀɴᴊᴜ-ᴍᴅ*"}`;

        const sentMsg = await conn.sendMessage(from, { image: { url: thumbnail }, caption: info }, { quoted: mek });
        const messageID = sentMsg.key.id;
        await conn.sendMessage(from, { react: { text: '🎶', key: sentMsg.key } });

        // Listen for user reply
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
                    msg = await conn.sendMessage(from, { text: `⏳ Downloading Video *${title || "TikTok Video"}*...` }, { quoted: mek });
                    if (!hd_video && !sd_video) return await reply("❌ Video link not found!");
                    type = {
                        video: { url: hd_video || sd_video },
                        mimetype: "video/mp4",
                        caption: `*${title || "TikTok Video"}* (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})\n*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*`
                    };
                    
                } else if (userReply === "1.2") {
                    msg = await conn.sendMessage(from, { text: `⏳ Processing Audio *${title || "TikTok Audio"}*...` }, { quoted: mek });
                    if (!audio) return await reply("❌ Audio link not found!");
                    await conn.sendPresenceUpdate('recording', from); // Show recording status
                    type = {
                        audio: { url: audio },
                        mimetype: "audio/mpeg",
                        ptt: true
                    };
                    
                } else {
                    return await reply("❌ Invalid choice! Reply with 1.1 or 1.2.");
                }

                await conn.sendMessage(from, type, { quoted: mek });
                await conn.sendMessage(from, { text: '✅ Media Upload Successful ✅', edit: msg.key });

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
