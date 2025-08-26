const { updateEnv, readEnv } = require('../lib/database');
const EnvVar = require('../lib/mongodbenv');
const { cmd } = require('../command');

cmd({
    pattern: "setting",
    alias: ["settings", "config"],
    desc: "Update MODE, AUTO_READ_STATUS, AUTO_VOICE, AUTO_STICKER, AUTO_REPLY, or CHATBOT environment variables",
    category: "owner",
    use: '.setting',
    filename: __filename
},
async (conn, mek, m, { from, reply, isOwner }) => {
    if (!isOwner) return await reply("❌ *This command is only for the owner!*");

    try {
        // Fetch current values of environment variables
        const currentEnv = await EnvVar.find({ key: { $in: ['MODE', 'AUTO_READ_STATUS', 'AUTO_VOICE', 'AUTO_STICKER', 'AUTO_REPLY', 'CHATBOT'] } });
        const mode = currentEnv.find(env => env.key === 'MODE')?.value || 'Unknown';
        const autoReadStatus = currentEnv.find(env => env.key === 'AUTO_READ_STATUS')?.value || 'Unknown';
        const autoVoice = currentEnv.find(env => env.key === 'AUTO_VOICE')?.value || 'Unknown';
        const autoSticker = currentEnv.find(env => env.key === 'AUTO_STICKER')?.value || 'Unknown';
        const autoReply = currentEnv.find(env => env.key === 'AUTO_REPLY')?.value || 'Unknown';
        const chatbot = currentEnv.find(env => env.key === 'CHATBOT')?.value || 'Unknown';

        // Menu with image
        let info = `⚙️ *SETTINGS CONFIGURATOR* ⚙️\n\n` +
                   `🔧 *Current Settings:*\n` +
                   `🛠 *MODE:* ${mode}\n` +
                   `📖 *AUTO_READ_STATUS:* ${autoReadStatus}\n` +
                   `🎙 *AUTO_VOICE:* ${autoVoice}\n` +
                   `🎨 *AUTO_STICKER:* ${autoSticker}\n` +
                   `💬 *AUTO_REPLY:* ${autoReply}\n` +
                   `🤖 *CHATBOT:* ${chatbot}\n\n` +
                   `🔽 *Reply with your choice:*\n` +
                   `1.1 *Set MODE* 🛠\n` +
                   `1.2 *Set AUTO_READ_STATUS* 📖\n` +
                   `1.3 *Set AUTO_VOICE* 🎙\n` +
                   `1.4 *Set AUTO_STICKER* 🎨\n` +
                   `1.5 *Set AUTO_REPLY* 💬\n` +
                   `1.6 *Set CHATBOT* 🤖\n\n` +
                   `*© 𝙿𝙾𝚆𝙴𝚁𝙳 𝙱𝚈 𝚀𝚄𝙴𝙴𝙽 𝙶𝙸𝙼𝙸*`;

        const imageUrl = 'https://ik.imagekit.io/6ilngyaqa/1752148389745-1000386145_W78uElpLF2.jpg';
        const sentMsg = await conn.sendMessage(from, { image: { url: imageUrl }, caption: info }, { quoted: mek });
        const messageID = sentMsg.key.id;
        await conn.sendMessage(from, { react: { text: '⚙️', key: sentMsg.key } });

        // Listen for user reply
        conn.ev.on('messages.upsert', async (messageUpdate) => {
            try {
                const mekInfo = messageUpdate?.messages[0];
                if (!mekInfo?.message) return;

                const messageType = mekInfo?.message?.conversation || mekInfo?.message?.extendedTextMessage?.text;
                const isReplyToSentMsg = mekInfo?.message?.extendedTextMessage?.contextInfo?.stanzaId === messageID;

                if (!isReplyToSentMsg) return;

                let userReply = messageType.trim();
                let msg;

                if (userReply === "1.1") {
                    // Show MODE options
                    msg = await conn.sendMessage(from, {
                        text: `🛠 *Select MODE:*\n` +
                              `2.1 *Public*\n` +
                              `2.2 *Private*\n` +
                              `2.3 *Groups*\n` +
                              `2.4 *Inbox*`
                    }, { quoted: mek });

                    // Listen for MODE selection
                    conn.ev.on('messages.upsert', async (modeUpdate) => {
                        try {
                            const modeMek = modeUpdate?.messages[0];
                            if (!modeMek?.message) return;

                            const modeType = modeMek?.message?.conversation || modeMek?.message?.extendedTextMessage?.text;
                            const isReplyToModeMsg = modeMek?.message?.extendedTextMessage?.contextInfo?.stanzaId === msg.key.id;

                            if (!isReplyToModeMsg) return;

                            let modeReply = modeType.trim();
                            let newMode;

                            if (modeReply === "2.1") newMode = "public";
                            else if (modeReply === "2.2") newMode = "private";
                            else if (modeReply === "2.3") newMode = "groups";
                            else if (modeReply === "2.4") newMode = "inbox";
                            else return await reply("❌ *Invalid MODE choice! Reply with 2.1, 2.2, 2.3, or 2.4.*");

                            // Update MODE
                            await updateEnv('MODE', newMode);
                            await conn.sendMessage(from, {
                                text: `✅ *MODE updated successfully to:* ${newMode}`,
                                edit: msg.key
                            });
                        } catch (error) {
                            console.error('Error updating MODE:', error);
                            await reply(`❌ *Error updating MODE:* ${error.message || "Error!"}`);
                        }
                    });

                } else if (userReply === "1.2" || userReply === "1.3" || userReply === "1.4" || userReply === "1.5" || userReply === "1.6") {
                    // Determine which variable to update
                    const keyMap = {
                        "1.2": "AUTO_READ_STATUS",
                        "1.3": "AUTO_VOICE",
                        "1.4": "AUTO_STICKER",
                        "1.5": "AUTO_REPLY",
                        "1.6": "CHATBOT"
                    };
                    const selectedKey = keyMap[userReply];

                    // Show true/false options
                    msg = await conn.sendMessage(from, {
                        text: `📖 *Select ${selectedKey}:*\n` +
                              `2.1 *True*\n` +
                              `2.2 *False*`
                    }, { quoted: mek });

                    // Listen for true/false selection
                    conn.ev.on('messages.upsert', async (statusUpdate) => {
                        try {
                            const statusMek = statusUpdate?.messages[0];
                            if (!statusMek?.message) return;

                            const statusType = statusMek?.message?.conversation || statusMek?.message?.extendedTextMessage?.text;
                            const isReplyToStatusMsg = statusMek?.message?.extendedTextMessage?.contextInfo?.stanzaId === msg.key.id;

                            if (!isReplyToStatusMsg) return;

                            let statusReply = statusType.trim();
                            let newStatus;

                            if (statusReply === "2.1") newStatus = "true";
                            else if (statusReply === "2.2") newStatus = "false";
                            else return await reply(`❌ *Invalid ${selectedKey} choice! Reply with 2.1 or 2.2.*`);

                            // Update the selected variable
                            await updateEnv(selectedKey, newStatus);
                            await conn.sendMessage(from, {
                                text: `✅ *${selectedKey} updated successfully to:* ${newStatus}`,
                                edit: msg.key
                            });
                        } catch (error) {
                            console.error(`Error updating ${selectedKey}:`, error);
                            await reply(`❌ *Error updating ${selectedKey}:* ${error.message || "Error!"}`);
                        }
                    });

                } else {
                    return await reply("❌ *Invalid choice! Reply with 1.1, 1.2, 1.3, 1.4, 1.5, or 1.6.*");
                }

            } catch (error) {
                console.error('Error processing settings:', error);
                await reply(`❌ *An error occurred:* ${error.message || "Error!"}`);
            }
        });

    } catch (error) {
        console.error('Error fetching settings:', error);
        await reply(`❌ *Error fetching settings:* ${error.message || "Error!"}`);
    }
});
