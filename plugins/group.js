const { readEnv } = require('../lib/database');
const { cmd, commands } = require('../command');


cmd({
    pattern: "mute",
    alias: ["lock"],
    desc: "Restrict group messaging to admins only",
    category: "group",
    react: "🔒",
    filename: __filename
},
async (conn, mek, m, { from, reply, isGroup, sender }) => {
    try {
        if (!isGroup) return reply("❌ This command works only in groups!");
        
        const jid = from;
        const metadata = await conn.groupMetadata(jid);
        const admins = metadata.participants
            .filter(p => p.admin)
            .map(p => p.id);
        
        const isAdmin = admins.includes(sender);
        if (!isAdmin) return reply("❌ You need to be admin to use this command!");
        
        await conn.groupSettingUpdate(jid, 'announcement');
        reply("🔒 Group muted! Only admins can send messages now.");

    } catch (e) {
        console.error("Mute Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});

cmd({
    pattern: "unmute",
    alias: ["unlock"],
    desc: "Allow all participants to message in group",
    category: "group",
    react: "🔓",
    filename: __filename
},
async (conn, mek, m, { from, reply, isGroup, sender }) => {
    try {
        if (!isGroup) return reply("❌ This command works only in groups!");
        
        const jid = from;
        const metadata = await conn.groupMetadata(jid);
        const admins = metadata.participants
            .filter(p => p.admin)
            .map(p => p.id);
        
        const isAdmin = admins.includes(sender);
        if (!isAdmin) return reply("❌ You need to be admin to use this command!");
        
        await conn.groupSettingUpdate(jid, 'not_announcement');
        reply("🔓 Group unmuted! Everyone can send messages now.");

    } catch (e) {
        console.error("Unmute Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});



//========================================================================



cmd({
    pattern: "invite",
    alias: ["link", "grouplink"],
    desc: "Get group invite link",
    category: "group",
    react: "🔗",
    filename: __filename
},
async (conn, mek, m, { from, reply, isGroup, sender }) => {
    try {
        if (!isGroup) return reply("❌ This command works only in groups!");
        
        const jid = from;
        const metadata = await conn.groupMetadata(jid);
        const isAdmin = metadata.participants.find(p => p.id === sender)?.admin;

        if (!isAdmin) return reply("❌ You need to be admin to get the invite link!");

        // Get existing invite code or create new
        const code = metadata.inviteCode || await conn.groupInviteCode(jid);
        const inviteLink = `https://chat.whatsapp.com/${code}`;

        await conn.sendMessage(from, {
            text: `🔗 *Group Invite Link* 🔗\n\n` +
                  `📛 Group: ${metadata.subject}\n` +
                  `👥 Participants: ${metadata.participants.length}\n` +
                  `🔗 Link: ${inviteLink}\n\n` +
                  `⚠️ Share carefully!`,
            contextInfo: {
                mentionedJid: [sender]
            }
        }, { quoted: mek });

    } catch (e) {
        console.error("Invite Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});

// Optional: Revoke invite link
cmd({
    pattern: "revoke",
    desc: "Revoke group invite link",
    category: "group",
    react: "🔄",
    filename: __filename
},
async (conn, mek, m, { from, reply, isGroup, sender }) => {
    try {
        if (!isGroup) return reply("❌ Group command only!");
        
        const metadata = await conn.groupMetadata(from);
        const isAdmin = metadata.participants.find(p => p.id === sender)?.admin;

        if (!isAdmin) return reply("❌ Admin only command!");
        
        await conn.groupRevokeInvite(from);
        reply("✅ Invite link revoked! New link generated.");
        
    } catch (e) {
        console.error("Revoke Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});

//=============================================================================




//====================================================================================






// 

// Add participants command
