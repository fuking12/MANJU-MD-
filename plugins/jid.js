const { cmd } = require("../command");
const axios = require("axios");

cmd({
    pattern: "jid",
    alias: ["getjid"],
    desc: "Get the JID of current chat",
    category: "owner",
    use: '.jid',
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await reply(from);

    } catch (error) {
        console.error('JID Command Error:', error);
        await reply('❌ Error fetching JID. Please try again.');
    }
});
