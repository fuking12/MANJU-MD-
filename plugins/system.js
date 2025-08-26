const config = require('../config')
const { cmd, commands } = require('../command')
const os = require("os")
const { runtime } = require('../lib/functions')

cmd({
    pattern: "system",
    alias: ["status", "botinfo"],
    desc: "Displays bot uptime, RAM usage, platform, and system information with an image",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        // Gather system information
        const uptime = runtime(process.uptime());
        const usedMemory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalMemory = (os.totalmem() / 1024 / 1024).toFixed(2);
        const platform = os.platform();
        const hostname = os.hostname();
        const cpu = os.cpus()[0].model || "Unknown CPU";
        const botVersion = config.VERSION || "1.0.0"; // Assuming VERSION is defined in config

        // Formatted status message with emojis and structure
        let status = `
╭「 *SYSTEM STATUS* 」╮
│
│ ⏰ *Uptime*: ${uptime}
│ 💾 *RAM Usage*: ${usedMemory} MB / ${totalMemory} MB
│ ⚙️ *Platform*: ${platform.charAt(0).toUpperCase() + platform.slice(1)}
│ 🖥️ *Hostname*: ${hostname}
│ 🧠 *CPU*: ${cpu}
│ 🤖 *Bot Version*: ${botVersion}
│ 👑 *Owner*: Keshara Liyanaarachchi
│
╰────────────────╯
`;

        // Send the message with the image
        await conn.sendMessage(from, {
            image: { url: 'https://ik.imagekit.io/6ilngyaqa/1752148389745-1000386145_W78uElpLF2.jpg' },
            caption: status
        }, { quoted: mek });

    } catch (e) {
        // Improved error handling
        console.error("[SYSTEM COMMAND ERROR]:", e);
        await conn.sendMessage(from, {
            text: `⚠️ *Error*: An issue occurred while fetching system status.\n*Details*: ${e.message}`
        }, { quoted: mek });
    }
});
