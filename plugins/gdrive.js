const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "gdrive",
    alias: ["googledrive", "gddl"],
    react: "📂",
    desc: "Download Google Drive file",
    category: "download",
    use: ".gdrive <Google Drive URL>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q || !q.startsWith("https://")) return await reply("❌ Please provide a valid Google Drive URL!");

        const apiUrl = `https://api.princetechn.com/api/download/gdrivedl?apikey=prince&url=${encodeURIComponent(q)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (!data.success || data.status !== 200) return await reply("❌ Failed to fetch file details!");

        const { name, download_url } = data.result;

        let info = `📂 *𝙶𝙾𝙾𝙶𝙻𝙴 𝙳𝚁𝙸𝚅𝙴 𝙳𝙾𝚆𝙽𝙻𝙾𝙰𝙳𝙴𝚁* 📂\n\n` +
            `📄 *File Name:* ${name || "Unknown"}\n` +
            `🖇 *Url:* ${q}\n\n` +
            `🔽 *Reply with your choice:*\n` +
            `1.1 *Document* 📁\n\n` +
            `${config.FOOTER || "*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*"}`;

        const sentMsg = await conn.sendMessage(from, { text: info }, { quoted: mek });
        const messageID = sentMsg.key.id;
        await conn.sendMessage(from, { react: { text: '📄', key: sentMsg.key } });

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
                    msg = await conn.sendMessage(from, { text: "⏳ Processing Document..." }, { quoted: mek });
                    if (!download_url) return await reply("❌ File link not found!");
                    type = { document: { url: download_url }, fileName: name || "downloaded_file", mimetype: "application/octet-stream", caption: `*${name || "Google Drive File"}*\n*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*` };
                    
                } else {
                    return await reply("❌ Invalid choice! Reply with 1.1.");
                }

                await conn.sendMessage(from, type, { quoted: mek });
                await conn.sendMessage(from, { text: '✅ File Upload Successful ✅', edit: msg.key });

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
