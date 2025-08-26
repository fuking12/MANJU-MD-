const { cmd } = require("../command");

cmd({
    pattern: "forward",
    alias: ["fwd", "sendto"],
    desc: "Forward a message or file to a specified JID",
    category: "utility",
    filename: __filename
}, async (conn, mek, m, { from, sender, args, q, reply }) => {
    try {
        // Check if JID is provided
        if (!args[0]) {
            return reply("❌ Please provide a JID to forward the message to (e.g., /forward 123456789@s.whatsapp.net)");
        }

        const targetJid = args[0].trim();
        // Validate JID format (basic check)
        if (!targetJid.endsWith('@s.whatsapp.net') && !targetJid.endsWith('@g.us')) {
            return reply("❌ Invalid JID format! Use a valid WhatsApp JID (e.g., 123456789@s.whatsapp.net)");
        }

        // Check if the message is a reply (has quoted message)
        if (!m.message.extendedTextMessage || !m.message.extendedTextMessage.contextInfo) {
            return reply("❌ Please reply to a message or file to forward!");
        }

        // Get quoted message details
        const quotedMessage = m.message.extendedTextMessage.contextInfo.quotedMessage;
        if (!quotedMessage) {
            return reply("❌ No valid message or file found to forward!");
        }

        // Forward the quoted message
        await conn.sendMessage(
            targetJid,
            { forward: { key: m.message.extendedTextMessage.contextInfo, message: quotedMessage } },
            { quoted: null } // Avoid quoting in forwarded message
        );

        // Confirm to the user
        await reply(`✅ Message forwarded to ${targetJid}`);
        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("Error in forward command:", e);
        reply("❌ Failed to forward the message. Please try again!");
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});
