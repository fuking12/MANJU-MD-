const config = require('../config');
const { cmd, commands } = require('../command');
const axios = require('axios');

// TVmaze API configuration
const TVMAZE_BASE_URL = 'http://api.tvmaze.com';

// Helper functions
const cleanSummary = (text) => text ? text.replace(/<[^>]+>/g, '') : 'No summary available';
const formatSchedule = (schedule) => {
    if (!schedule.time) return schedule.days.join(', ');
    return `${schedule.days.join(', ')} at ${schedule.time}`;
};

cmd({
    pattern: "tv",
    react: "🎬",
    alias: ["tvsearch", "series"],
    desc: "Search for TV series information with rich presentation",
    category: "search",
    use: '.tv <series name>',
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, args, q, reply }) => {
    try {
        if (!q) return reply('🎥 *Please provide a TV series name!*\nExample: .tv Breaking Bad');

        const { data } = await axios.get(`${TVMAZE_BASE_URL}/search/shows?q=${encodeURIComponent(q)}`, {
            timeout: 10000,
            headers: {'User-Agent': 'CineVibes Bot/2.0'}
        });

        if (!data.length) return reply('🎞️ *No results found!* Let me check again...');

        const show = data[0].show;
        const premieredYear = show.premiered ? show.premiered.split('-')[0] : 'N/A';
        
        // Build beautiful message
        const infoMessage = `
🎭 *${show.name}* (${premieredYear})

▸ ⭐ *Rating:* ${show.rating?.average || 'N/A'} 
▸ 🕒 *Runtime:* ${show.runtime || 'N/A'} mins
▸ 📆 *Status:* ${show.status || 'Unknown'}
▸ 🌐 *Network:* ${show.network?.name || show.webChannel?.name || 'Streaming Platform'}
▸ 🗓️ *Schedule:* ${show.schedule ? formatSchedule(show.schedule) : 'Not scheduled'}
▸ 🎭 *Genres:* ${show.genres.join(' ‧ ') || 'N/A'}
▸ 🌍 *Language:* ${show.language || 'English'}

━━━━━━━━━━━━━━
📜 *Synopsis:*
${cleanSummary(show.summary).substring(0, 500)}${show.summary.length > 500 ? '...' : ''}

🔗 *Official Site:* ${show.officialSite || 'Not available'}
        `.trim();

        // Try to send high-quality image
        const imageUrl = show.image?.original || show.image?.medium;
        if (imageUrl) {
            try {
                const imgResponse = await axios.get(imageUrl, {responseType: 'arraybuffer'});
                
                await conn.sendMessage(from, {
                    image: Buffer.from(imgResponse.data, 'binary'),
                    caption: infoMessage,
                    contextInfo: {
                        externalAdReply: {
                            title: `🎬 ${show.name}`,
                            body: `⭐ ${show.rating?.average || 'N/A'} | ${show.status || 'Unknown'} | ${premieredYear}`,
                            mediaType: 1,
                            thumbnail: Buffer.from(imgResponse.data, 'binary'),
                            mediaUrl: show.officialSite || TVMAZE_BASE_URL,
                            sourceUrl: show.officialSite || TVMAZE_BASE_URL
                        }
                    }
                }, {quoted: mek});
            } catch (imgError) {
                console.log('Using fallback text-only response');
                await reply(infoMessage);
            }
        } else {
            await reply(`📺 *${show.name}*\n${infoMessage}`);
        }

    } catch (error) {
        console.error('TV Search Error:', error);
        reply('🎥 *Oops! Our cinema projector malfunctioned.*\nPlease try again later!');
    }
});
