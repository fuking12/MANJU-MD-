const config = require('../config');
const { cmd } = require('../command');
const fetch = require('node-fetch');

cmd({
    pattern: "sirasa",
    alias: ["sirasanews", "news"],
    react: "📰",
    desc: "Fetch the latest Sirasa news article and display in a formatted card",
    category: "search",
    use: ".sirasa",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        // Log for debugging
        console.log('[SIRASA INPUT]:', { query: q || 'Latest Sirasa News' });

        // Fetch news using Saviya Kolla API
        const apiUrl = `https://saviya-kolla-api.koyeb.app/news/sirasa`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Sirasa News API failed with status ${response.status}`);
        const data = await response.json();

        // Log API response
        console.log('[SIRASA API RESPONSE]:', data);

        if (!data?.status || !data?.result) {
            return await reply("❌ No news articles found!");
        }

        const news = data.result;

        // Construct formatted card
        const card = `
╭「 *SIRASA NEWS* 」╮
│
│ 📰 *Title*: ${news.title || "Unknown"}
│ 📅 *Date*: ${news.date || "N/A"}
│ 📝 *Description*: ${news.desc || "No description available"}
│ 🔗 *Source*: ${news.url || "N/A"}
│
╰─────────────╯
*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*
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
        console.error('[SIRASA COMMAND ERROR]:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply(`❌ Error: ${error.message}`);
    }
});
