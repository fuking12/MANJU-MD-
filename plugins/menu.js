const { readEnv } = require('../lib/database');
const { cmd, commands } = require('../command');
const menuSessions = new Map();

// Track bot start time
const startTime = Date.now();

// Cleanup expired sessions
setInterval(() => {
    for (const [key, session] of menuSessions) {
        if (Date.now() - session.timestamp > 300000) { // 5 minutes
            menuSessions.delete(key);
        }
    }
}, 60000); // Run every minute

// Format RAM usage
function formatRAMUsage() {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    const total = process.memoryUsage().rss / 1024 / 1024;
    return `${used.toFixed(2)}MB / ${total.toFixed(0)}MB`;
}

// Format runtime
function formatRuntime() {
    const ms = Date.now() - startTime;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor(ms / 1000) % 60;
    return `${minutes}m ${seconds}s`;
}

// Global message handler for category selection
const handleMessage = async (conn, msg, sender, from, reply) => {
    if (!msg.message?.extendedTextMessage?.text) return;
    const selected = parseInt(msg.message.extendedTextMessage.text);
    const session = menuSessions.get(sender);

    if (!session || msg.key.remoteJid !== from) return;
    if (Date.now() - session.timestamp > 300000) {
        menuSessions.delete(sender);
        return; // Timeout message removed
    }

    if (msg.message.extendedTextMessage.contextInfo?.stanzaId === session.messageId) {
        if (isNaN(selected) || selected < 1 || selected > session.categories.length) {
            return reply(`❌ Please select between 1-${session.categories.length}`);
        }

        const config = await readEnv();
        const selectedCategory = session.categories[selected - 1];

        const categoryCommands = commands.filter(cmd => 
            cmd.category === selectedCategory.name && !cmd.dontAddCommandList
        );

        const categoryMenu = `
━━━━━━━━━━━━━━━━━━
*╭─「 ${selectedCategory.title} 」*
*│📚 Commands:* ${categoryCommands.length}
*╰──────────●●►*
${categoryCommands.map(cmd => `➤ *${config.PREFIX}${cmd.pattern}*`).join('\n')}
━━━━━━━━━━━━━━━━━━
*© ᴘᴏᴡᴇᴀʀᴅ ʙʏ ᴍᴀɴᴊᴜ-ᴍᴅ*
`;

        await conn.sendMessage(from, {
            image: { url: config.MENU_IMAGE_URL || 'https://ik.imagekit.io/6ilngyaqa/1752148389745-1000386145_W78uElpLF2.jpg' },
            caption: categoryMenu,
            contextInfo: {
                mentionedJid: [sender]
            }
        }, { quoted: msg });
    }
};

cmd({
    pattern: "menu",
    desc: "Show interactive command list",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, pushname = 'User', reply, sender }) => {
    try {
        const config = await readEnv();
        if (!commands || !config) throw new Error("Missing dependencies");

        const categories = [
            { title: "Main", name: "main", emoji: "🏆" },
            { title: "Owner", name: "owner", emoji: "👑" },
            { title: "Group", name: "group", emoji: "👥" },
            { title: "Download", name: "download", emoji: "⬇️" },
            { title: "Search", name: "search", emoji: "🔎" },
            { title: "Convert", name: "convert", emoji: "🔄" },
            { title: "Movie", name: "movie", emoji: "🎥" }
        ];

        const menuText = `
🌟 Hello, *${pushname}*!  
━━━━━━━━━━━━━━━━━━  
*╭─「 Commands Panel 」*  
*│🧬 RAM Usage:* ${formatRAMUsage()}  
*│🪼 Runtime:* ${formatRuntime()}  
*╰──────────●●►*  
━━━━━━━━━━━━━━━━━━  
🔰 MAIN MENU 🔰  
┏━━━━━━━━━━━━━┓  
${categories.map((cat, index) => `┃ ${index + 1} ${cat.emoji} ${cat.title}`).join('\n')}  
┗━━━━━━━━━━━━━┛  

💬 Reply with a number to choose an option!  

*© ᴘᴏᴡᴇᴀʀᴅ ʙʏ ᴍᴀɴᴊᴜ-ᴍᴅ*
`;

        const sentMsg = await conn.sendMessage(from, { 
            image: { url: config.MENU_IMAGE_URL || 'https://i.ibb.co/wZSVF4zQ/9397.jpg' },
            caption: menuText,
            contextInfo: {
                mentionedJid: [sender]
            }
        }, { quoted: mek });

        // Store session data
        menuSessions.set(sender, {
            timestamp: Date.now(),
            categories,
            messageId: sentMsg.key.id,
            lastUsed: Date.now()
        });

        // Register message handler if not already done
        if (!conn.menuHandlerRegistered) {
            conn.ev.on('messages.upsert', (msgUpdate) => handleMessage(conn, msgUpdate.messages[0], sender, from, reply));
            conn.menuHandlerRegistered = true;
        }

    } catch (e) {
        console.error("Menu Error:", e);
        reply("❌ Failed to load menu. Please try again later.");
    }
});
