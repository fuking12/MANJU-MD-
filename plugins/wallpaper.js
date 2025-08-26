const config = require('../config');
const { cmd } = require('../command');
const fetch = require('node-fetch');

cmd({
    pattern: "wallpaper",
    alias: ["wp", "wallpapers"],
    react: "🖼️",
    desc: "Search wallpapers and send the first 5 results as images",
    category: "search",
    use: ".wallpaper <search query>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a search query (e.g., .wallpaper Spider man)!");

        // Log input for debugging
        console.log('[WALLPAPER INPUT]:', { query: q });

        // Fetch search results using PrinceTech Wallpaper API
        const searchUrl = `https://api.princetechn.com/api/search/wallpaper?apikey=prince&query=${encodeURIComponent(q)}`;
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) throw new Error(`Wallpaper API failed with status ${searchResponse.status}`);
        const searchData = await searchResponse.json();

        // Log search response
        console.log('[WALLPAPER SEARCH RESPONSE]:', searchData);

        if (!searchData?.success || !searchData?.results?.length) {
            return await reply("❌ No wallpapers found for your query!");
        }

        // Get the first 5 results (or fewer if less than 5 are available)
        const results = searchData.results.slice(0, 5);

        // Collect image URLs from the first 5 results (use the first image in each result's image array, typically _w635.webp)
        const imageUrls = results.map(result => result.image[0]).filter(url => url); // Use the first image (highest quality)

        // Send processing message
        const processingMsg = await conn.sendMessage(
            from,
            { text: "⏳ Fetching and sending wallpapers..." },
            { quoted: mek }
        );

        // Send each image as a separate message
        for (let i = 0; i < imageUrls.length; i++) {
            const imageUrl = imageUrls[i];
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
                console.error(`[WALLPAPER SEND ERROR for ${imageUrl}]:`, imageError);
                await conn.sendMessage(
                    from,
                    { text: `⚠️ Failed to send wallpaper ${i + 1}: ${imageError.message}` },
                    { quoted: mek }
                );
            }
        }

        // Update processing message
        await conn.sendMessage(
            from,
            { text: `✅ Successfully sent ${imageUrls.length} wallpapers to ${from}!` },
            { edit: processingMsg.key }
        );

        // Add reaction
        await conn.sendMessage(from, { react: { text: '✅', key: processingMsg.key } });

    } catch (error) {
        console.error('[WALLPAPER COMMAND ERROR]:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply(`❌ Error: ${error.message}`);
    }
});
