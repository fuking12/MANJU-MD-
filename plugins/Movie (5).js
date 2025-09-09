const { cmd } = require("../command");

const axios = require('axios');

const NodeCache = require('node-cache');

const fs = require('fs');

const fsp = require('fs').promises;

const path = require('path');

// Cache initialization with 1 minute TTL

const searchCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// Simplified theme for details card

const simpleTheme = {

  box: function(title, content) {

    return `🎬 Movie Hub 🎬\n\n${title}\n\n${content}`;

  },

  getForwardProps: function() {

    return {

      contextInfo: {

        forwardingScore: 999,

        isForwarded: true,

        stanzaId: "BAE5" + Math.random().toString(16).substr(2, 12).toUpperCase(),

        mentionedJid: [],

        conversionData: {

          conversionDelaySeconds: 0,

          conversionSource: "movie_hub",

          conversionType: "message"

        }

      }

    };

  },

  resultEmojis: ["📽️", "🎥", "🎬", "📽️", "🎞️"]

};

// Temporary file path for downloading

const tempDir = path.join(__dirname, 'temp');

const ensureTempDir = async () => {

  try {

    await fsp.mkdir(tempDir, { recursive: true });

  } catch (err) {

    console.error(`[01:06 PM +0530] Failed to create temp directory: ${err.message}`);

  }

};

// Film search and download command

cmd({

  pattern: "film",

  react: "🎬",

  desc: "Get Movies from Movie Hub to Enjoy Cinema",

  category: "Movie Hub",

  filename: __filename,

}, async (conn, mek, m, { from, q, pushname, reply }) => {

  if (!q) {

    return reply(simpleTheme.box("Sinhala Sub Movie", 

      "Use: .film <film name>\n✨ Ex: .film 2025\nMovie Hub List"));

  }

  try {

    await ensureTempDir();

    // Step 1: Check cache for movie info

    const cacheKey = `film_search_${q.toLowerCase()}`;

    let searchData = searchCache.get(cacheKey);

    if (!searchData) {

      const searchUrl = `https://searchsub.netlify.app/api/search/search?text=${encodeURIComponent(q)}`;

      let retries = 3;

      

      while (retries > 0) {

        try {

          console.log(`[01:06 PM +0530] Attempting search API call to ${searchUrl}`);

          const searchResponse = await axios.get(searchUrl, { timeout: 15000 });

          console.log("[01:06 PM +0530] Raw search response:", JSON.stringify(searchResponse.data, null, 2));

          

          searchData = searchResponse.data.filter(item => item.status === 200);

          

          if (!Array.isArray(searchData) || searchData.length === 0) {

            console.log("[01:06 PM +0530] Search API returned empty or invalid data after filtering:", searchData);

            throw new Error("No movies found or invalid response from search API");

          }

          

          searchCache.set(cacheKey, searchData);

          console.log(`[01:06 PM +0530] Successfully fetched ${searchData.length} movies`);

          break;

        } catch (error) {

          retries--;

          console.error(`[01:06 PM +0530] Search API call failed (attempt ${4 - retries}/3): ${error.message}`, error.response?.data || "No response data");

          if (retries === 0) throw new Error("Failed to fetch movie list after multiple attempts");

          await new Promise(resolve => setTimeout(resolve, 2000));

        }

      }

    }

    // Step 2: Format movie list

    let filmList = `🎬 SinhalaSub Movie Results 🎬\n\n`;

    filmList += `🔍 Search: ${q}\n\n`;

    filmList += `📝 Reply with the number of the movie you want:\n\n`;

    const films = searchData.slice(0, 10).map((film, index) => ({

      number: index + 1,

      title: film.title || `Untitled Movie ${index + 1}`,

      year: film.year || "N/A",

      link: film.url || `https://sub.lk/movies/${film.title.toLowerCase().replace(/ /g, '-')}-${film.year || '2025'}-sinhala-sub`,

      image: film.image || "https://i.ibb.co/5Yb4VZy/snowflake.jpg",

      imdb: film.ratings?.imdb || 'N/A'

    }));

    films.forEach(film => {

      console.log(`[01:06 PM +0530] Movie ${film.number}: ${film.title} (Link: ${film.link})`);

      filmList += `${film.number}. ${film.title} (${film.year})\n`;

    });

    filmList += `\n*Powered by Movie Hub*`;

    // Step 3: Send movie list

    const sentMessage = await conn.sendMessage(from, {

      text: filmList,

      ...simpleTheme.getForwardProps()

    }, { quoted: mek });

    // Step 4: Wait for movie selection

    const filmSelectionHandler = async (update) => {

      const message = update.messages[0];

      if (!message?.message?.extendedTextMessage) return;

      const userReply = message.message.extendedTextMessage.text.trim();

      if (message.message.extendedTextMessage.contextInfo?.stanzaId !== sentMessage.key.id) return;

      const selectedNumber = parseInt(userReply);

      const selectedFilm = films.find(film => film.number === selectedNumber);

      if (!selectedFilm) {

        await conn.sendMessage(from, {

          text: simpleTheme.box("Invalid Selection", 

            "Please select a valid number from the list"),

          ...simpleTheme.getForwardProps()

        }, { quoted: message });

        return;

      }

      console.log(`[01:06 PM +0530] Selected movie: ${selectedFilm.title} (Link: ${selectedFilm.link})`);

      // Remove film selection listener

      conn.ev.off("messages.upsert", filmSelectionHandler);

      let details = null;

      let thumbnailUrl = selectedFilm.image;

      try {

        // Step 5: Get movie details

        const detailsUrl = `https://detailssub.netlify.app/api/details/functions?url=${encodeURIComponent(selectedFilm.link)}`;

        console.log(`[01:06 PM +0530] Attempting details API call to ${detailsUrl}`);

        const detailsResponse = await axios.get(detailsUrl, { timeout: 15000 });

        console.log("[01:06 PM +0530] Raw details response:", JSON.stringify(detailsResponse.data, null, 2));

        details = detailsResponse.data;

        if (!details || !details.title) {

          throw new Error("Failed to fetch movie details or invalid response");

        }

        // Step 6: Select highest quality thumbnail from imageLinks

        if (details.imageLinks && details.imageLinks.length > 0) {

          thumbnailUrl = details.imageLinks[details.imageLinks.length - 1];

          console.log(`[01:06 PM +0530] Selected thumbnail: ${thumbnailUrl}`);

        }

      } catch (detailsError) {

        console.error(`[01:06 PM +0530] Details error: ${detailsError.message}`);

        details = {

          title: selectedFilm.title,

          imdb: selectedFilm.imdb || 'N/A',

          description: 'No description available',

          movieUrl: selectedFilm.link

        };

      }

      // Step 7: Display details card with high-quality thumbnail

      let detailsCard = `🎥 *Movie Details* 🎬\n\n`;

      detailsCard += `*Title*: ${details.title}\n`;

      detailsCard += `*IMDb*: ${details.imdb}\n`;

      detailsCard += `*Description*: ${details.description}\n`;

      detailsCard += `\n🔗 *Movie URL*: ${details.movieUrl}\n`;

      await conn.sendMessage(from, {

        image: { url: thumbnailUrl },

        caption: simpleTheme.box("Movie Details", detailsCard),

        ...simpleTheme.getForwardProps()

      }, { quoted: message });

      // Step 8: Get download links automatically

      const downloadUrl = `https://downsub.netlify.app//api/download/functions?url=${encodeURIComponent(details.movieUrl || selectedFilm.link)}`;

      console.log(`[01:06 PM +0530] Attempting download API call to ${downloadUrl}`);

      let downloadData;

      let downloadRetries = 3;

      while (downloadRetries > 0) {

        try {

          const downloadResponse = await axios.get(downloadUrl, { timeout: 15000 });

          console.log("[01:06 PM +0530] Raw download response:", JSON.stringify(downloadResponse.data, null, 2));

          downloadData = downloadResponse.data;

          if (downloadData.status !== 200 || !Array.isArray(downloadData.downloadLinks) || downloadData.downloadLinks.length === 0) {

            throw new Error("No download links available or invalid response");

          }

          break;

        } catch (error) {

          downloadRetries--;

          console.error(`[01:06 PM +0530] Download API call failed (attempt ${4 - downloadRetries}/3): ${error.message}`, error.response?.data || "No response data");

          if (downloadRetries === 0) throw error;

          await new Promise(resolve => setTimeout(resolve, 2000));

        }

      }

      // Step 9: Display download menu list with redirectUrl

      const downloadLinks = downloadData.downloadLinks.map((link, i) => ({

        number: i + 1,

        quality: link.quality,

        size: link.size,

        url: link.redirectLink

      }));

      let downloadOptions = `📥 *Download Options for ${selectedFilm.title} (${selectedFilm.year})* 📥\n\n`;

      downloadOptions += `🎬 *Available Quality Buttons*:\n\n`;

      downloadLinks.forEach(link => {

        downloadOptions += `${link.number}. ${link.quality} (${link.size}) - Redirect: ${link.url}\n`;

      });

      downloadOptions += `\nReply with the quality button number to download the movie.`;

      downloadOptions += `\n*Powered by Movie Hub*`;

      const downloadButtonMessage = await conn.sendMessage(from, {

        image: { url: thumbnailUrl },

        caption: simpleTheme.box("Download Qualities", downloadOptions),

        ...simpleTheme.getForwardProps()

      }, { quoted: message });

      // Step 10: Wait for quality selection

      const qualitySelectionHandler = async (updateQuality) => {

        const qualityMessage = updateQuality.messages[0];

        if (!qualityMessage?.message?.extendedTextMessage) return;

        const qualityReply = qualityMessage.message.extendedTextMessage.text.trim();

        if (qualityMessage.message.extendedTextMessage.contextInfo?.stanzaId !== downloadButtonMessage.key.id) return;

        console.log(`[01:06 PM +0530] Quality reply received: ${qualityReply}`);

        

        const selectedQualityNumber = parseInt(qualityReply);

        const selectedLink = downloadLinks.find(link => link.number === selectedQualityNumber);

        if (!selectedLink) {

          console.log(`[01:06 PM +0530] Invalid quality number selected: ${qualityReply}`);

          await conn.sendMessage(from, {

            text: simpleTheme.box("Invalid Quality", 

              "Please select a valid quality button number"),

            ...simpleTheme.getForwardProps()

          }, { quoted: qualityMessage });

          return;

        }

        console.log(`[01:06 PM +0530] Selected quality: ${selectedLink.quality} (URL: ${selectedLink.url})`);

        

        // Remove quality selection listener

        conn.ev.off("messages.upsert", qualitySelectionHandler);

        // Step 11: Process redirectUrl through Dark-Yasiya API for PixelDrain

        let finalDownloadUrl = selectedLink.url;

        if (selectedLink.url.includes("pixeldrain.com/u/")) {

          const downloadUrlDark = `https://www.dark-yasiya-api.site/download/pixeldrain?url=${encodeURIComponent(selectedLink.url)}`;

          console.log(`[01:06 PM +0530] Attempting Dark-Yasiya API call to ${downloadUrlDark}`);

          let darkResponse;

          let darkRetries = 3;

          while (darkRetries > 0) {

            try {

              darkResponse = await axios.get(downloadUrlDark, { timeout: 15000 });

              console.log("[01:06 PM +0530] Raw Dark-Yasiya response:", JSON.stringify(darkResponse.data, null, 2));

              if (darkResponse.data.status && darkResponse.data.result?.dl_link) {

                finalDownloadUrl = darkResponse.data.result.dl_link;

                selectedLink.quality = darkResponse.data.result.fileName.replace(/\.\w+$/, '').split('(')[0].trim();

                selectedLink.size = (darkResponse.data.result.fileSize / (1024 * 1024)).toFixed(2) + " MB";

                console.log(`[01:06 PM +0530] Updated download URL to dl_link: ${finalDownloadUrl}`);

              } else {

                throw new Error("Invalid response from Dark-Yasiya API");

              }

              break;

            } catch (darkError) {

              darkRetries--;

              console.error(`[01:06 PM +0530] Dark-Yasiya API call failed (attempt ${4 - darkRetries}/3): ${darkError.message}`, darkError.response?.data || "No response data");

              if (darkRetries === 0) throw darkError;

              await new Promise(resolve => setTimeout(resolve, 2000));

            }

          }

        }

        // Step 12: Download and send the movie file as document to WhatsApp

        try {

          console.log(`[01:06 PM +0530] Starting download from: ${finalDownloadUrl}`);

          // Create a temporary file path

          const tempFilePath = path.join(tempDir, `${selectedFilm.title.replace(/[^\w\s]/gi, '')}_${selectedLink.quality.replace(/\s+/g, '_')}.mp4`);

          

          // Fetch the file with enhanced redirect and error handling

          let downloadAttempt = 0;

          const maxAttempts = 3;

          let response;

          while (downloadAttempt < maxAttempts) {

            try {

              response = await axios({

                method: 'get',

                url: finalDownloadUrl,

                responseType: 'stream',

                maxRedirects: 10,

                timeout: 60000,

                headers: {

                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',

                  'Accept': '*/*'

                }

              });

              break;

            } catch (error) {

              downloadAttempt++;

              console.error(`[01:06 PM +0530] Download attempt ${downloadAttempt}/${maxAttempts} failed for ${finalDownloadUrl}: ${error.message}`, error.response?.status, error.response?.headers);

              if (downloadAttempt === maxAttempts) throw error;

              await new Promise(resolve => setTimeout(resolve, 3000));

            }

          }

          // Pipe the stream to a file

          const writer = fs.createWriteStream(tempFilePath);

          response.data.pipe(writer);

          await new Promise((resolve, reject) => {

            writer.on('finish', resolve);

            writer.on('error', reject);

          });

          // Check file size

          const fileStats = await fsp.stat(tempFilePath);

          const fileSize = fileStats.size;

          const minSize = 1024 * 1024; // 1MB minimum size

          console.log(`[01:06 PM +0530] Downloaded file size: ${fileSize} bytes`);

          if (fileSize < minSize) {

            await fsp.unlink(tempFilePath);

            throw new Error(`Downloaded file size (${fileSize} bytes) too small, likely not the original movie`);

          }

          // Send the file as a document

          await conn.sendMessage(from, {

            document: { url: tempFilePath },

            mimetype: "video/mp4",

            fileName: `${selectedFilm.title.replace(/[^\w\s]/gi, '')}_${selectedLink.quality.replace(/\s+/g, '_')}.mp4`,

            caption: `🎬 ${selectedFilm.title} (${selectedFilm.year})\n\nQuality: ${selectedLink.quality}\nSize: ${selectedLink.size}\n\nEnjoy your movie!`,

            ...simpleTheme.getForwardProps()

          }, { quoted: qualityMessage });

          await conn.sendMessage(from, { 

            react: { 

              text: simpleTheme.resultEmojis[Math.floor(Math.random() * simpleTheme.resultEmojis.length)], 

              key: qualityMessage.key 

            } 

          });

          // Clean up temporary file

          await fsp.unlink(tempFilePath);

          console.log(`[01:06 PM +0530] Successfully sent movie and cleaned up temp file`);

        } catch (downloadError) {

          console.error(`[01:06 PM +0530] Failed to send movie: ${downloadError.message}`, downloadError.stack);

          await conn.sendMessage(from, {

            text: simpleTheme.box("Download Failed", 

              `Failed to send the movie. The file may be invalid or the link requires manual download:\n\n${finalDownloadUrl}\n\nError: ${downloadError.message}`),

            ...simpleTheme.getForwardProps()

          }, { quoted: qualityMessage });

        }

      };

      // Register quality selection listener

      conn.ev.on("messages.upsert", qualitySelectionHandler);

    };

    // Register film selection listener

    conn.ev.on("messages.upsert", filmSelectionHandler);

  } catch (e) {

    console.error("[01:06 PM +0530] Error in film command:", e);

    const errorMsg = simpleTheme.box("Error", 

      `Sorry, an error occurred:\n\n${e.message || "Unknown error"}\n\nPlease try again later`);

    

    await reply(errorMsg);

    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });

  }

});