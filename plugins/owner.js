const { cmd } = require('../command');

// Owner command to send vCard with hardcoded details
cmd({
    pattern: "owner",
    desc: "Send owner contact information",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, reply, sender }) => {
    try {
        // Check cooldown
        const lastUsed = conn.ownerCooldown?.get(sender) || 0;
        if (Date.now() - lastUsed < 5000) {
            return reply("⏳ Please wait 5 seconds before using .owner again.");
        }

        // Hardcoded vCard details
        const ownerName = 'Keshara Liyanaarachchi';
        const ownerOrg = 'QUEEN GIMI';
        const ownerWaid = '94728866985';
        const ownerPhone = '+94728866985';

        // Define vCard
        const vcard = 'BEGIN:VCARD\n' // metadata of the contact card
            + 'VERSION:3.0\n'
            + `FN:${ownerName}\n` // full name
            + `ORG:${ownerOrg};\n` // organization
            + `TEL;type=CELL;type=VOICE;waid=${ownerWaid}:${ownerPhone}\n` // WhatsApp ID + phone number
            + 'END:VCARD';

        // Send vCard
        await conn.sendMessage(
            from,
            { 
                contacts: { 
                    displayName: ownerName.split(' ')[0], // Use first name for display
                    contacts: [{ vcard }] 
                },
                contextInfo: {
                    mentionedJid: [sender]
                }
            },
            { quoted: mek }
        );

        // Update cooldown
        if (!conn.ownerCooldown) conn.ownerCooldown = new Map();
        conn.ownerCooldown.set(sender, Date.now());

    } catch (e) {
        console.error("Owner Command Error:", e);
        reply("❌ Failed to send owner contact. Please try again later.");
    }
});
