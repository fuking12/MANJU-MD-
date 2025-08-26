const config = require('../config');
const { cmd } = require('../command');
const fetch = require('node-fetch');

cmd({
    pattern: "apk",
    alias: ["apkdl", "appdl"],
    react: "📱",
    desc: "Download APK file using Delirius API",
    category: "download",
    use: ".apk <app name>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide an app name to search for!");

        // Log input for debugging
        console.log('[APK INPUT]:', { query: q });

        // Fetch app info using Delirius API
        const apiUrl = `https://delirius-apiofc.vercel.app/download/apk?query=${encodeURIComponent(q)}`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`API failed with status ${response.status}`);
        const data = await response.json();

        // Log API response
        console.log('[APK API RESPONSE]:', data);

        if (!data?.status || !data?.data) {
            return await reply("❌ No results found for your query!");
        }
        const appInfo = data.data;

        // Construct info message
        let info = `
╭「 *APK DOWNLOADER* 」╮
│
│ 📱 *App Name*: ${appInfo.name || "Unknown"}
│ 👤 *Developer*: ${appInfo.developer || "Unknown"}
│ 🗓️ *Published*: ${appInfo.publish || "Unknown"}
│ 📏 *Size*: ${appInfo.size || "Unknown"}
│ ⭐ *Rating*: ${appInfo.stats?.rating?.average || "N/A"} (${appInfo.stats?.rating?.total?.toLocaleString() || "0"} votes)
│ ⬇️ *Downloads*: ${appInfo.stats?.downloads?.toLocaleString() || "Unknown"}
│ 🏪 *Store*: ${appInfo.store?.name || "Unknown"}
│ 🔗 *URL*: ${appInfo.download || "N/A"}
│
│ ⬇️ *Download Option*:
│ 1.1 Download APK
│
╰──────────────────╯
${config.FOOTER || "*© POWERD BY QUEEN GIMI*"}
`;

        // Send thumbnail with info
        const sentMsg = await conn.sendMessage(
            from,
            {
                image: { url: appInfo.image || "https://i.imgur.com/404.png" },
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
                const dlResponse = await fetch(apiUrl);
                if (!dlResponse.ok) throw new Error(`Download API failed with status ${dlResponse.status}`);
                const dlData = await dlResponse.json();

                // Log download response
                console.log('[APK DOWNLOAD RESPONSE]:', dlData);

                if (!dlData?.status || !dlData?.data?.download) {
                    return await conn.sendMessage(from, {
                        text: "❌ Failed to get download URL!",
                        edit: processingMsg.key
                    });
                }

                // Handle response
                if (responseText === "1.1") {
                    await conn.sendMessage(from, {
                        document: { url: dlData.data.download },
                        mimetype: 'application/vnd.android.package-archive',
                        fileName: `${appInfo.name || "app"}.apk`.replace(/[^a-z0-9_.-]/gi, '_'),
                        caption: config.FOOTER || "*© POWERD BY QUEEN GIMI*"
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
                console.error('[APK REPLY ERROR]:', error);
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
        console.error('[APK COMMAND ERROR]:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply(`❌ Error: ${error.message}`);
    }
});
