const { cmd } = require("../command");
const axios = require("axios");
const TMDB_API_KEY = "267e38d9f7dd69a9f609d281ed878515";

const movieSessions = new Map();

cmd({
    pattern: "minfo",
    alias: ["film", "moviedetails"],
    desc: "Search and get detailed movie information with trailer",
    category: "search",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, sender, args, q, reply }) => {
    try {
        if (!q) return reply("Please provide a movie name");

        // Search for movies
        const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}`;
        const searchRes = await axios.get(searchUrl);
        
        if (!searchRes.data?.results?.length) {
            return reply("❌ No movies found with that name");
        }

        const results = searchRes.data.results.slice(0, 5);
        let movieList = "🎬 *Movie Search Results* 🎬\n\n";
        results.forEach((movie, index) => {
            const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
            movieList += `*${index + 1}.* ${movie.title} ${year !== 'N/A' ? `(${year})` : ''}\n`;
            if (movie.overview) movieList += `   📝 ${truncateText(movie.overview, 50)}\n\n`;
        });
        movieList += "\n🔢 *Reply with number (1-5) to select*";

        // Send the movie list
        const sentMsg = await conn.sendMessage(
            from,
            { 
                text: movieList,
                contextInfo: {
                    externalAdReply: {
                        title: "🎥 Movie Search",
                        body: `Results for: ${q}`,
                        thumbnailUrl: "https://i.ibb.co/7QZqD0B/movie.png",
                        mediaType: 1
                    }
                }
            },
            { quoted: mek }
        );

        // Store the session
        movieSessions.set(sender, {
            timestamp: Date.now(),
            results: results,
            messageId: sentMsg.key.id
        });

        // Handle number replies
        conn.ev.on('messages.upsert', async (msgUpdate) => {
            const msg = msgUpdate.messages[0];
            if (!msg.message?.extendedTextMessage) return;

            const selectedNumber = parseInt(msg.message.extendedTextMessage.text);
            const session = movieSessions.get(sender);

            if (!session || msg.key.remoteJid !== from) return;
            if (Date.now() - session.timestamp > 300000) {
                movieSessions.delete(sender);
                return reply("❌ Session expired. Please search again.");
            }

            if (msg.message.extendedTextMessage.contextInfo?.stanzaId === session.messageId) {
                if (isNaN(selectedNumber) || selectedNumber < 1 || selectedNumber > 5) {
                    return reply("❌ Please select a valid number between 1-5");
                }

                const movie = session.results[selectedNumber - 1];
                movieSessions.delete(sender);

                // Get detailed movie information
                const detailsUrl = `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits,release_dates,videos`;
                const detailsRes = await axios.get(detailsUrl);
                const details = detailsRes.data;

                // Find YouTube trailer
                const trailer = details.videos?.results?.find(v => 
                    v.type === 'Trailer' && v.site === 'YouTube'
                );
                const trailerLink = trailer ? 
                    `🎥 *Trailer:* https://youtu.be/${trailer.key}` : 
                    '';

                // Format detailed information
                const caption = `🎬 *${details.title}* ${details.release_date ? `(${new Date(details.release_date).getFullYear()})` : ''}

⭐ *Rating:* ${details.vote_average?.toFixed(1) || 'N/A'} / 10 (${details.vote_count?.toLocaleString() || 0} votes)
⌛ *Runtime:* ${details.runtime ? `${Math.floor(details.runtime/60)}h ${details.runtime%60}m` : 'N/A'}
🗓️ *Release Date:* ${details.release_date || 'N/A'}
🌐 *Language:* ${formatLanguage(details.original_language)}

🎭 *Genres:* ${details.genres?.map(g => g.name).join(', ') || 'N/A'}

👥 *Cast:* ${formatCast(details.credits?.cast)}

📖 *Plot:* ${details.overview || 'No description available'}

${trailerLink}

> *𝐂 𝐈 𝐍 𝐄 𝐕 𝐈 𝐁 𝐄 𝐒  𝐋 𝐊*`;

                // Send movie details with poster
                await conn.sendMessage(
                    from,
                    {
                        image: { url: `https://image.tmdb.org/t/p/w780${details.poster_path}` },
                        caption: caption,
                        mimetype: 'image/jpeg',
                        contextInfo: {
                            externalAdReply: {
                                title: details.title,
                                body: `⭐ ${details.vote_average?.toFixed(1) || 'N/A'} | ${details.release_date?.slice(0,4) || ''}`,
                                thumbnailUrl: `https://image.tmdb.org/t/p/w780${details.poster_path}`,
                                mediaType: 1
                            }
                        }
                    },
                    { quoted: mek }
                );
            }
        });

    } catch (e) {
        console.error("Error in movie command:", e);
        reply("❌ Failed to process your request");
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});

// Helper functions
function truncateText(text, length) {
    return text.length > length ? text.substring(0, length) + '...' : text;
}

function formatLanguage(langCode) {
    const languages = {
        en: 'English', es: 'Spanish', fr: 'French',
        de: 'German', ja: 'Japanese', ko: 'Korean',
        hi: 'Hindi', cn: 'Chinese', ru: 'Russian'
    };
    return languages[langCode] || langCode.toUpperCase();
}

function formatCast(cast) {
    if (!cast?.length) return 'N/A';
    return cast.slice(0, 3).map(actor => 
        `• ${actor.name} as ${actor.character || 'Unknown'}`
    ).join('\n');
}
