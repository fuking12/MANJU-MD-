const config = require('../config');
const { cmd } = require('../command');
const fetch = require('node-fetch');

cmd({
    pattern: "lankadeepa",
    alias: ["lankadeepanews", "ldnews"],
    react: "📰",
    desc: "Fetch the latest Lankadeepa news article and display in a formatted card",
    category: "search",
    use: ".lankadeepa",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        // Log for debugging
        console.log('[LANKADEEPA INPUT]:', { query: q || 'Latest Lankadeepa News' });

        // Fetch news using Saviya Kolla API
        const apiUrl = `https://saviya-kolla-api.koyeb.app/news/lankadeepa`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Lankadeepa News API failed with status ${response.status}`);
        const data = await response.json();

        // Log API response
        console.log('[LANKADEEPA API RESPONSE]:', data);

        if (!data?.status || !data?.result) {
            return await reply("❌ No news articles found!");
        }

        const news = data.result;

        // Construct formatted card
        const card = `
╭「 *LANKADEEPA NEWS* 」╮
│
│ 📰 *Title*: ${news.title || "Unknown"}
│ 📅 *Date*: ${news.date || "N/A"}
│ 📝 *Description*: ${news.desc || "No description available"}
│ 🔗 *Source*: ${news.url || "N/A"}
│
╰────────────────╯
*© ᴘᴏᴡᴇᴀʀᴅ ʙʏ ᴍᴀɴᴊᴜ-ᴍᴅ*
`;

        // Send image with card
        await conn.sendMessage(
            from,
            {
                image: { url: news.image || "https://i.imgur.com/404.png" },
                caption: card
            },
            { quoted: mek }
        );

        // Add reaction
        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (error) {
        console.error('[LANKADEEPA COMMAND ERROR]:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply(`❌ Error: ${error.message}`);
    }
});
