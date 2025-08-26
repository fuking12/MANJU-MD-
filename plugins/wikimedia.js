const config = require('../config');
const { cmd } = require('../command');
const fetch = require('node-fetch');

cmd({
    pattern: "wikimedia",
    alias: ["wikiimage", "wikipedia"],
    react: "📸",
    desc: "Search Wikimedia for images and display the first result in a formatted card",
    category: "search",
    use: ".wikimedia <search query>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a search query (e.g., .wikimedia Elon Musk)!");

        // Log input for debugging
        console.log('[WIKIMEDIA INPUT]:', { query: q });

        // Fetch search results using PrinceTech Wikimedia API
        const searchUrl = `https://api.princetechn.com/api/search/wikimedia?apikey=prince&title=${encodeURIComponent(q)}`;
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) throw new Error(`Wikimedia API failed with status ${searchResponse.status}`);
        const searchData = await searchResponse.json();

        // Log search response
        console.log('[WIKIMEDIA SEARCH RESPONSE]:', searchData);

        if (!searchData?.success || !searchData?.results?.length) {
            return await reply("❌ No images found for your query!");
        }

        // Get the first result
        const firstResult = searchData.results[0];

        // Construct formatted card
        const card = `
╭「 *WIKIMEDIA SEARCH* 」╮
│
│ 📸 *Title*: ${firstResult.title || "Unknown"}
│ 🔗 *Source*: ${firstResult.source || "N/A"}
│
╰────────────────╯
${config.FOOTER || "*© ᴘᴏᴡᴇᴀʀᴅ ʙʏ ᴍᴀɴᴊᴜ-ᴍᴅ*"}
`;

        // Send image with card
        await conn.sendMessage(
            from,
            {
                image: { url: firstResult.image || "https://i.imgur.com/404.png" },
                caption: card
            },
            { quoted: mek }
        );

        // Add reaction
        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (error) {
        console.error('[WIKIMEDIA COMMAND ERROR]:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply(`❌ Error: ${error.message}`);
    }
});
