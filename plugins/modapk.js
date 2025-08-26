const config = require('../config');
const { cmd } = require('../command');
const fetch = require('node-fetch');

cmd({
    pattern: "modapk",
    alias: ["modapkdl", "apkmod"],
    react: "📱",
    desc: "Download modded APK using Nekorinn API",
    category: "download",
    use: ".modapk <app name>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide an app name to search for!");

        // Log input for debugging
        console.log('[MODAPK INPUT]:', { query: q });

        // Fetch search results using Nekorinn search API
        const searchUrl = `https://api.nekorinn.my.id/search/android1?q=${encodeURIComponent(q)}`;
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) throw new Error(`Search API failed with status ${searchResponse.status}`);
        const searchData = await searchResponse.json();

        // Log search response
        console.log('[MODAPK SEARCH RESPONSE]:', searchData);

        if (!searchData?.status || !searchData?.result?.length) {
            return await reply("❌ No modded APKs found for your query!");
        }

        // Select the first result
        const selectedApp = searchData.result[0];

        // Fetch download info using Nekorinn downloader API
        const downloadUrl = `https://api.nekorinn.my.id/downloader/android1?url=${encodeURIComponent(selectedApp.url)}`;
        const downloadResponse = await fetch(downloadUrl);
        if (!downloadResponse.ok) throw new Error(`Downloader API failed with status ${downloadResponse.status}`);
        const downloadData = await downloadResponse.json();

        // Log download response
        console.log('[MODAPK DOWNLOAD RESPONSE]:', downloadData);

        if (!downloadData?.status || !downloadData?.result) {
            return await reply("❌ Failed to fetch download information!");
        }
        const appInfo = downloadData.result;

        // Construct info message
        let info = `
╭「 *MODAPK DOWNLOADER* 」╮
│
│ 📱 *App Name*: ${appInfo.title || selectedApp.name || "Unknown"}
│ 👤 *Developer*: ${selectedApp.developer || "Unknown"}
│ ⭐ *Rating*: ${selectedApp.rating || "N/A"}
│ 🗓️ *Version*: ${appInfo.version || "Unknown"}
│ 🔗 *URL*: ${selectedApp.url}
│
│ ⬇️ *Download Option*:
│ 1.1 Download APK
│
╰───────────────╯
${config.FOOTER || "*© ᴘᴏᴡᴇᴀʀᴅ ʙʏ ᴍᴀɴᴊᴜ-ᴍᴅ*"}
`;

        // Send thumbnail with info
        const sentMsg = await conn.sendMessage(
            from,
            {
                image: { url: appInfo.icon || selectedApp.icon || "https://i.imgur.com/404.png" },
                caption: info
            },
            { quoted: mek }
        );

        // Add reaction
        await conn.sendMessage(from, { react: { text: '📥', key: sentMsg.key } });

        // Handle user response
        const handleReply = async (messageUpdate) => {
            try {
                const msg = messageUpdate.messages[0];
                if (!msg?.message || !msg?.message?.extendedTextMessage) return;

                const responseText = msg.message.extendedTextMessage.text;
                const isReply = msg.message.extendedTextMessage.contextInfo.stanzaId === sentMsg.key.id;

                if (!isReply) return;

                // Remove listener after response
                conn.ev.off('messages.upsert', handleReply);

                const processingMsg = await conn.sendMessage(from, { text: "⏳ Processing your request..." }, { quoted: mek });

                // Fetch download URL again to ensure freshness
                const dlResponse = await fetch(downloadUrl);
                if (!dlResponse.ok) throw new Error(`Downloader API failed with status ${dlResponse.status}`);
                const dlData = await dlResponse.json();

                // Log download response
                console.log('[MODAPK FINAL DOWNLOAD RESPONSE]:', dlData);

                if (!dlData?.status || !dlData?.result?.downloadUrl) {
                    return await conn.sendMessage(from, {
                        text: "❌ Failed to get download URL!",
                        edit: processingMsg.key
                    });
                }

                // Handle response
                if (responseText === "1.1") {
                    await conn.sendMessage(from, {
                        document: { url: dlData.result.downloadUrl },
                        mimetype: 'application/vnd.android.package-archive',
                        fileName: `${appInfo.title || "app"}.apk`.replace(/[^a-z0-9_.-]/gi, '_'),
                        caption: config.FOOTER || "*© ᴘᴏᴡᴇᴀʀᴅ ʙʏ ᴍᴀɴᴊᴜ-ᴍᴅ*"
                    }, { quoted: mek });
                } else {
                    return await conn.sendMessage(from, {
                        text: "❌ Invalid option selected! Please choose 1.1",
                        edit: processingMsg.key
                    });
                }

                // Update processing message
                await conn.sendMessage(from, {
                    text: "✅ Download completed successfully!",
                    edit: processingMsg.key
                });

            } catch (error) {
                console.error('[MODAPK REPLY ERROR]:', error);
                await conn.sendMessage(from, {
                    text: `❌ Error: ${error.message}`,
                    edit: processingMsg.key
                });
            }
        };

        // Set up listener with 60-second timeout
        conn.ev.on('messages.upsert', handleReply);
        setTimeout(() => conn.ev.off('messages.upsert', handleReply), 60000);

    } catch (error) {
        console.error('[MODAPK COMMAND ERROR]:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply(`❌ Error: ${error.message}`);
    }
});
