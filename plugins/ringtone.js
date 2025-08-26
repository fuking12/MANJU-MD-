const config = require('../config');
const { cmd } = require('../command');
const fetch = require('node-fetch');

cmd({
    pattern: "ringtone",
    alias: ["ringtonedl", "rtone"],
    react: "🎵",
    desc: "Search and download ringtones using BK9 API",
    category: "download",
    use: ".ringtone <ringtone name>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a ringtone name to search for!");

        // Log input for debugging
        console.log('[RINGTONE INPUT]:', { query: q });

        // Fetch ringtone list using BK9 API
        const apiUrl = `https://bk9.fun/download/RingTone?q=${encodeURIComponent(q)}`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`API failed with status ${response.status}`);
        const data = await response.json();

        // Log API response
        console.log('[RINGTONE API RESPONSE]:', data);

        if (!data?.status || !data?.BK9?.length) {
            return await reply("❌ No ringtones found for your query!");
        }

        // Limit to top 5 results
        const ringtones = data.BK9.slice(0, 5);

        // Construct search results message
        let searchResults = `
╭「 *RINGTONE SEARCH* 」╮
│
│ 🔎 *Search Query*: ${q}
│ 📋 *Select a ringtone by replying with its number*:
│
${ringtones.map((rt, index) => `│ ${index + 1}. ${rt.title || "Unknown"}`).join('\n')}
│
╰─────────────────╯
${config.FOOTER || "*© ᴘᴏᴡᴇᴀʀᴅ ʙʏ ᴍᴀɴᴊᴜ-ᴍᴅ*"}
`;

        // Send search results message
        const searchMsg = await conn.sendMessage(
            from,
            { text: searchResults },
            { quoted: mek }
        );

        // Add reaction
        await conn.sendMessage(from, { react: { text: '🔎', key: searchMsg.key } });

        // Handle ringtone selection
        const handleSelection = async (messageUpdate) => {
            try {
                const msg = messageUpdate.messages[0];
                if (!msg?.message || !msg?.message?.extendedTextMessage) return;

                const responseText = msg.message.extendedTextMessage.text;
                const isReply = msg.message.extendedTextMessage.contextInfo.stanzaId === searchMsg.key.id;

                if (!isReply) return;

                // Remove listener after response
                conn.ev.off('messages.upsert', handleSelection);

                const selectedIndex = parseInt(responseText) - 1;
                if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= ringtones.length) {
                    return await conn.sendMessage(from, {
                        text: "❌ Invalid selection! Please reply with a number between 1 and " + ringtones.length,
                        edit: searchMsg.key
                    });
                }

                const selectedRingtone = ringtones[selectedIndex];

                // Construct ringtone info message
                let info = `
╭「 *RINGTONE DOWNLOADER* 」╮
│
│ 🎵 *Title*: ${selectedRingtone.title || "Unknown"}
│ 🌐 *Source*: ${selectedRingtone.source || "Unknown"}
│ 🔗 *Audio URL*: ${selectedRingtone.audio}
│
│ ⬇️ *Choose Download Option*:
│ 1.1 Audio Message (MP3)
│ 1.2 Document File (MP3)
│
╰────────────────╯
${config.FOOTER || "*© POWERD BY QUEEN GIMI*"}
`;

                // Send ringtone info message
                const infoMsg = await conn.sendMessage(
                    from,
                    { text: info },
                    { quoted: mek }
                );

                // Add reaction
                await conn.sendMessage(from, { react: { text: '🎶', key: infoMsg.key } });

                // Handle download option
                const handleDownload = async (downloadUpdate) => {
                    try {
                        const dlMsg = downloadUpdate.messages[0];
                        if (!dlMsg?.message || !dlMsg?.message?.extendedTextMessage) return;

                        const dlResponseText = dlMsg.message.extendedTextMessage.text;
                        const isDlReply = dlMsg.message.extendedTextMessage.contextInfo.stanzaId === infoMsg.key.id;

                        if (!isDlReply) return;

                        // Remove listener after response
                        conn.ev.off('messages.upsert', handleDownload);

                        const processingMsg = await conn.sendMessage(from, { text: "⏳ Processing your request..." }, { quoted: mek });

                        const audioUrl = selectedRingtone.audio;
                        if (!audioUrl) {
                            return await conn.sendMessage(from, {
                                text: "❌ Failed to get audio URL!",
                                edit: processingMsg.key
                            });
                        }

                        // Handle download options
                        if (dlResponseText === "1.1") {
                            await conn.sendMessage(from, {
                                audio: { url: audioUrl },
                                mimetype: 'audio/mpeg',
                                ptt: false
                            }, { quoted: mek });
                        } else if (dlResponseText === "1.2") {
                            await conn.sendMessage(from, {
                                document: { url: audioUrl },
                                mimetype: 'audio/mpeg',
                                fileName: `${selectedRingtone.title || "ringtone"}.mp3`.replace(/[^a-z0-9_.-]/gi, '_'),
                                caption: config.FOOTER || "*© POWERD BY QUEEN GIMI*"
                            }, { quoted: mek });
                        } else {
                            return await conn.sendMessage(from, {
                                text: "❌ Invalid option selected! Please choose 1.1 or 1.2",
                                edit: processingMsg.key
                            });
                        }

                        // Update processing message
                        await conn.sendMessage(from, {
                            text: "✅ Download completed successfully!",
                            edit: processingMsg.key
                        });

                    } catch (error) {
                        console.error('[RINGTONE DOWNLOAD ERROR]:', error);
                        await conn.sendMessage(from, {
                            text: `❌ Error: ${error.message}`,
                            edit: processingMsg.key
                        });
                    }
                };

                // Set up download listener with 60-second timeout
                conn.ev.on('messages.upsert', handleDownload);
                setTimeout(() => conn.ev.off('messages.upsert', handleDownload), 60000);

            } catch (error) {
                console.error('[RINGTONE SELECTION ERROR]:', error);
                await conn.sendMessage(from, {
                    text: `❌ Error: ${error.message}`,
                    edit: searchMsg.key
                });
            }
        };

        // Set up selection listener with 60-second timeout
        conn.ev.on('messages.upsert', handleSelection);
        setTimeout(() => conn.ev.off('messages.upsert', handleSelection), 60000);

    } catch (error) {
        console.error('[RINGTONE COMMAND ERROR]:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply(`❌ Error: ${error.message}`);
    }
});
