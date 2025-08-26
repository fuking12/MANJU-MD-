const config = require('../config');
const { cmd } = require('../command');
const fetch = require('node-fetch');

cmd({
    pattern: "gpt",
    alias: ["ai", "chatgpt"],
    desc: "Get AI response using PrinceTech GPT-4 API",
    category: "ai",
    use: ".gpt <your query>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a query to ask the AI!");

        // Log input for debugging
        console.log('[GPT INPUT]:', { query: q });

        // Fetch AI response using PrinceTech API
        const apiUrl = `https://api.princetechn.com/api/ai/gpt4?apikey=prince&q=${encodeURIComponent(q)}`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`API failed with status ${response.status}`);
        const data = await response.json();

        // Log API response
        console.log('[GPT API RESPONSE]:', data);

        if (!data?.success || !data?.result) {
            return await reply("❌ Failed to get AI response!");
        }
        const aiResponse = data.result;

        // Send only the AI response
        const sentMsg = await conn.sendMessage(
            from,
            { text: aiResponse },
            { quoted: mek }
        );

        // Add reaction
        await conn.sendMessage(from, { react: { text: '✅', key: sentMsg.key } });

    } catch (error) {
        console.error('[GPT COMMAND ERROR]:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply(`❌ Error: ${error.message}`);
    }
});
