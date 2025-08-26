const config = require('../config');
const { cmd } = require('../command');
const fetch = require('node-fetch');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');

cmd({
    pattern: "tg",
    alias: ["telegramsticker", "tgsticker"],
    react: "🎨",
    desc: "Download Telegram sticker pack and send as WhatsApp stickers (static and animated)",
    category: "download",
    use: ".tg <Telegram sticker pack URL>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q || !q.startsWith("https://t.me/addstickers/")) return await reply("❌ Please provide a valid Telegram sticker pack URL (e.g., https://t.me/addstickers/OpesIntisChary_by_fStikBot)!");

        // Log input for debugging
        console.log('[TG INPUT]:', { url: q });

        // Fetch sticker pack info using Delirius API
        const apiUrl = `https://delirius-apiofc.vercel.app/download/telegramsticker?url=${encodeURIComponent(q)}`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`API failed with status ${response.status}`);
        const data = await response.json();

        // Log API response
        console.log('[TG API RESPONSE]:', data);

        if (!data?.status || !data?.stickers?.length) {
            return await reply("❌ No stickers found in the pack!");
        }
        const packInfo = {
            name: data.name || "Unknown",
            title: data.title || "Unknown",
            stickerCount: data.stickers.length,
            stickers: data.stickers
        };

        // Construct info message
        let info = `
╭「 *TG STICKER DOWNLOADER* 」╮
│
│ 📛 *Pack Name*: ${packInfo.name}
│ 🎨 *Title*: ${packInfo.title}
│ 🔢 *Sticker Count*: ${packInfo.stickerCount}
│ 🛠️ *Sticker Type*: ${data.sticker_type || "Unknown"}
│ 😷 *Contains Masks*: ${data.contains_masks ? "Yes" : "No"}
│
│ ⚠️ *Note*: Static stickers (512x512, <100KB) and animated stickers (512x512, <300KB, <3s) will be sent. Some stickers may fail if incompatible.
│
│ ⬇️ *Download Option*:
│ 1.1 Download Stickers
│
╰─────────────────╯
${config.FOOTER || "*© POWERD BY QUEEN GIMI*"}
`;

        // Send info message
        const sentMsg = await conn.sendMessage(
            from,
            { text: info },
            { quoted: mek }
        );

        // Add reaction
        await conn.sendMessage(from, { react: { text: '📥', key: sentMsg.key } });

        // Function to check if .webm is static or animated
        const isAnimatedSticker = async (url) => {
            return new Promise((resolve, reject) => {
                ffmpeg.ffprobe(url, (err, metadata) => {
                    if (err) return reject(err);
                    const isVideo = metadata.streams.some(stream => stream.codec_type === 'video');
                    resolve(isVideo);
                });
            });
        };

        // Function to convert .webm to WebP animation
        const convertToWebP = async (inputUrl, outputPath) => {
            return new Promise((resolve, reject) => {
                ffmpeg(inputUrl)
                    .outputOptions([
                        '-vcodec libwebp',
                        '-vf scale=512:512,fps=15',
                        '-loop 0',
                        '-t 3', // Limit to 3 seconds
                        '-compression_level 6',
                        '-q:v 50' // Adjust quality to keep <300KB
                    ])
                    .output(outputPath)
                    .on('end', () => resolve(outputPath))
                    .on('error', (err) => reject(err))
                    .run();
            });
        };

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

                const processingMsg = await conn.sendMessage(from, { text: "⏳ Processing sticker pack... This may take a moment." }, { quoted: mek });

                if (responseText === "1.1") {
                    let successCount = 0;
                    for (let i = 0; i < packInfo.stickers.length; i++) {
                        const stickerUrl = packInfo.stickers[i].url;
                        try {
                            const isAnimated = await isAnimatedSticker(stickerUrl);
                            if (isAnimated) {
                                // Convert animated .webm to WebP
                                const outputPath = path.join('/tmp', `sticker_${Date.now()}_${i}.webp`);
                                await convertToWebP(stickerUrl, outputPath);
                                await conn.sendMessage(from, {
                                    sticker: { url: outputPath },
                                    mimetype: 'image/webp'
                                }, { quoted: mek });
                                // Clean up temporary file
                                await fs.unlink(outputPath);
                            } else {
                                // Send static sticker directly
                                await conn.sendMessage(from, {
                                    sticker: { url: stickerUrl },
                                    mimetype: 'image/webp'
                                }, { quoted: mek });
                            }
                            successCount++;
                            // Add delay to avoid rate-limiting
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        } catch (stickerError) {
                            console.error(`[TG STICKER SEND ERROR ${i + 1}]:`, stickerError);
                            await conn.sendMessage(from, {
                                text: `⚠️ Failed to send sticker ${i + 1}: ${stickerError.message}`
                            }, { quoted: mek });
                        }
                    }

                    // Update processing message
                    await conn.sendMessage(from, {
                        text: `✅ Successfully sent ${successCount} out of ${packInfo.stickerCount} stickers!`,
                        edit: processingMsg.key
                    });
                } else {
                    await conn.sendMessage(from, {
                        text: "❌ Invalid option selected! Please choose 1.1",
                        edit: processingMsg.key
                    });
                }

            } catch (error) {
                console.error('[TG REPLY ERROR]:', error);
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
        console.error('[TG COMMAND ERROR]:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply(`❌ Error: ${error.message}`);
    }
});
