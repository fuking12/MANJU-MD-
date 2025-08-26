const config = require('../config');
const { cmd } = require('../command');
const fetch = require('node-fetch');

cmd({
    pattern: "img",
    alias: ["image", "googleimage"],
    react: "🖼️",
    desc: "Search Google Images and send the first 5 results as images",
    category: "search",
    use: ".img <search query>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a search query (e.g., .img Cute Cat)!");

        // Log input for debugging
        console.log('[IMAGE INPUT]:', { query: q });

        // Fetch search results using PrinceTech Google Image API
        const searchUrl = `https://api.princetechn.com/api/search/googleimage?apikey=prince&query=${encodeURIComponent(q)}`;
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) throw new Error(`Google Image API failed with status ${searchResponse.status}`);
        const searchData = await searchResponse.json();

        // Log search response
        console.log('[IMAGE SEARCH RESPONSE]:', searchData);

        if (!searchData?.success || !searchData?.results?.length) {
            return await reply("❌ No images found for your query!");
        }

        // Get the first 5 results (or fewer if less than 5 are available)
        const images = searchData.results.slice(0, 5);

        // Send processing message
        const processingMsg = await conn.sendMessage(
            from,
            { text: "⏳ Fetching and sending images..." },
            { quoted: mek }
        );

        // Send each image as a separate message
        for (let i = 0; i < images.length; i++) {
            const imageUrl = images[i];
            try {
                await conn.sendMessage(
                    from,
                    {
                        image: { url: imageUrl || "https://i.imgur.com/404.png" },
                        caption: "*© ᴘᴏᴡᴇᴀʀᴅ ʙʏ ᴍᴀɴᴊᴜ-ᴍᴅ*"
                    },
                    { quoted: mek }
                );
            } catch (imageError) {
                console.error(`[IMAGE SEND ERROR for ${imageUrl}]:`, imageError);
                await conn.sendMessage(
                    from,
                    { text: `⚠️ Failed to send image ${i + 1}: ${imageError.message}` },
                    { quoted: mek }
                );
            }
        }

        // Update processing message
        await conn.sendMessage(
            from,
            { text: `✅ Successfully sent ${images.length} images to ${from}!` },
            { edit: processingMsg.key }
        );

        // Add reaction
        await conn.sendMessage(from, { react: { text: '✅', key: processingMsg.key } });

    } catch (error) {
        console.error('[IMAGE COMMAND ERROR]:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply(`❌ Error: ${error.message}`);
    }
});
