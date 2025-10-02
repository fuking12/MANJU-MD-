const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "cricket",
    alias: ["cric", "matches"],
    react: "🏏",
    desc: "Get current live cricket matches from CricAPI",
    category: "info",
    use: ".cricket",
    filename: __filename
}, async (conn, m, mek, { from, reply }) => {
    try {
        const apiUrl = `https://api.cricapi.com/v1/currentMatches?apikey=f68d1cb5-a9c9-47c5-8fcd-fbfe52bace78`;
        const response = await axios.get(apiUrl, {
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!response.data.data || response.data.data.length === 0) {
            return await reply("❌ No current cricket matches found!");
        }

        let matchesInfo = `🏏 *Current Live Cricket Matches* 🏏\n\n`;
        response.data.data.forEach((match, index) => {
            matchesInfo += `${index + 1}. *${match.name}*\n` +
                          `   📊 *Type:* ${match.matchType?.toUpperCase() || 'Unknown'}\n` +
                          `   📈 *Status:* ${match.status || 'Ongoing'}\n` +
                          `   ⚡ *Match ID:* ${match.id}\n\n`;
        });

        matchesInfo += `*•ᴠɪsᴘᴇʀ-ᴍᴅ•*`;

        await conn.sendMessage(from, { text: matchesInfo }, { quoted: mek });

    } catch (error) {
        console.error('CricAPI Error:', error);
        await reply(`❌ Error fetching cricket matches: ${error.message || "Unknown error!"}`);
    }
});
