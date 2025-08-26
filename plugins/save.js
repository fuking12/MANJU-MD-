const { cmd } = require('../command');

cmd({
    pattern: "save",
    desc: "To download the status video or photo with a quote",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, isCreater, isCoOwner, reply }) => {
    try {
        const media = quoted?.videoMessage || quoted?.imageMessage;
        if (!media) {
            return await conn.sendMessage(from, { text: "*❌ ᴘʟᴇᴀꜱᴇ ʀᴇᴘʟʏ ᴛᴏ ᴀ ꜱᴛᴀᴛᴜꜱ ᴠɪᴅᴇᴏ ᴏʀ ᴘʜᴏᴛᴏ ᴛᴏ ꜱᴀᴠᴇ ɪᴛ!!*" }, { quoted: mek });
        }

        const mediaBuffer = await m.quoted.download();
        if (!mediaBuffer) {
            return await conn.sendMessage(from, { text: "*❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ ᴍᴇᴅɪᴀ.*" }, { quoted: mek });
        }

        if (quoted?.videoMessage) {
            await conn.sendMessage(isOwner ? conn.user.id : from, { video: mediaBuffer, caption: media?.caption }, { quoted: mek });
        } else if (quoted?.imageMessage) {
            await conn.sendMessage(isOwner ? conn.user.id : from, { image: mediaBuffer, caption: media?.caption }, { quoted: mek });
        }

        return await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        console.log(e);
        await conn.sendMessage(from, { text: `❌ *Error:* ${e.message || "Failed to process the save command."}` });
    }
});
