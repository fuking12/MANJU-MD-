const config = require('../config')
const { cmd, commands } = require('../command')

cmd({
    pattern: "ping",
    desc: "Check bot's response time by editing the initial message to show only the ping in ms.",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        const startTime = Date.now();
        // Send initial "Pinging..." message
        const message = await conn.sendMessage(from, { text: '⏳ Pinging...' }, { quoted: mek });
        const endTime = Date.now();
        const ping = endTime - startTime;

        // Edit the initial message to show only the ping time
        await conn.sendMessage(from, {
            text: `${ping} ms`,
            edit: message.key // Edit the original "Pinging..." message
        });

    } catch (e) {
        console.error("[PING COMMAND ERROR]:", e);
        await conn.sendMessage(from, { text: `⚠️ Error: ${e.message}` }, { quoted: mek });
    }
});
