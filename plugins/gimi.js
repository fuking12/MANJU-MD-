const config = require('../config');
const { cmd } = require('../command');
const fetch = require('node-fetch');

cmd({
    pattern: "gimi",
    desc: "Interact with QUEEN GIMI AI using the provided API",
    category: "ai",
    use: ".ai <your question or message>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a question or message for the AI!");

        // Encode the query and call the API
        const apiUrl = `http://aimanager.ceylonnet.com/webhook/91e37e54-6dc6-4eb7-86fb-7dde4167d9fb?message=${encodeURIComponent(q)}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        // Check if response is valid
        if (!data?.response) {
            return await reply("❌ Failed to get a response from the AI!");
        }

        // Send only the AI response as a message
        await conn.sendMessage(from, { text: data.response }, { quoted: mek });

        // Add reaction
        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (error) {
        console.error('[AI COMMAND ERROR]:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply(`❌ Error: ${error.message}`);
    }
});
