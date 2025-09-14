const { cmd } = require("../command");

const axios = require("axios");

const os = require("os");

const path = require("path");

const fs = require("fs");

const https = require("https");

cmd({

  pattern: "ssub",

  react: "🎬",

  desc: "Search and download movies with Sinhala subtitles",

  category: "media",

  filename: __filename,

}, async (robin, mek, m, options) => {

  const from = options.from;

  const q = options.q;

  const reply = options.reply;

  

  try {

    if (!q) return reply("Please provide a search query (e.g., .ssub avengers)");

    await robin.sendMessage(from, { react: { text: "[Search]", key: mek.key } });

    const searchUrl = `https://apis.sandarux.sbs/api/download/sinhalasub/search?q=${encodeURIComponent(q)}`;

    console.log(`Fetching search from: ${searchUrl}`);

    

    const searchResponse = await axios.get(searchUrl, {

      timeout: 30000,

      headers: {

        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",

      },

    });

    const searchData = searchResponse.data;

    console.log("Search Response:", JSON.stringify(searchData, null, 2));

    if (!searchData.status || !Array.isArray(searchData.result) || searchData.result.length === 0) {

      await robin.sendMessage(from, { react: { text: "[X]", key: mek.key } });

      return reply("[X] No movies found for your query! Try a different query.");

    }

    const results = searchData.result;

    let searchList = "sɪɴʜᴀʟᴀ sᴜʙ ᴍᴏᴠɪᴇ sᴇᴀʀᴄʜ ʀᴇsᴜʟᴛs\n\n";

    results.forEach((item, index) => {

      searchList += `${index + 1}. *${item.title}*\n`;

    });

    searchList += "ʀᴇᴘʟʏ ᴡɪᴛʜ ᴍᴏᴠɪᴇ ɴᴜᴍʙᴇʀs:";

    const searchMsg = await robin.sendMessage(from, { text: searchList }, { quoted: mek });

    await robin.sendMessage(from, { react: { text: "[OK]", key: mek.key } });

    let movieHandled = false;

    const movieListener = (msgUpdate) => {

      if (movieHandled) return;

      const msg = msgUpdate.messages[0];

      if (!msg?.message?.extendedTextMessage) return;

      const selectedOption = msg.message.extendedTextMessage.text.trim();

      if (msg.message.extendedTextMessage.contextInfo?.stanzaId === searchMsg.key.id) {

        movieHandled = true;

        robin.ev.off("messages.upsert", movieListener);

        handleMovieSelection(selectedOption, msg, results, from, reply, robin);

      }

    };

    robin.ev.on("messages.upsert", movieListener);

  } catch (error) {

    console.error("SSub command error:", error);

    await robin.sendMessage(from, { react: { text: "[X]", key: mek.key } });

    reply("Command failed: " + (error.message || "Unknown error"));

  }

});

// Helper: Movie selection

async function handleMovieSelection(selectedOption, msg, results, from, reply, robin) {

  try {

    const index = parseInt(selectedOption) - 1;

    if (isNaN(index) || index < 0 || index >= results.length) {

      await robin.sendMessage(from, { react: { text: "[?]", key: msg.key } });

      return reply(`ᴘʟᴇᴀsᴇ ʀᴇᴘʟʏ ᴡɪᴛʜ ᴀ ᴠᴀɪʟᴅ ɴᴜᴍʙᴇʀ (1-${results.length}).`);

    }

    await robin.sendMessage(from, { react: { text: "[Wait]", key: msg.key } });

    const selectedMovie = results[index];

    const movieLink = selectedMovie.link;

    const detailsUrl = `https://apis.sandarux.sbs/api/download/sinhalasub-dl?q=${encodeURIComponent(movieLink)}`;

    console.log(`Fetching details from: ${detailsUrl}`);

    const detailsResponse = await axios.get(detailsUrl, {

      timeout: 30000,

      headers: {

        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",

      },

    });

    const detailsData = detailsResponse.data;

    console.log("Details Response:", JSON.stringify(detailsData, null, 2));

    if (!detailsData.success || !detailsData.result) {

      await robin.sendMessage(from, { react: { text: "[X]", key: msg.key } });

      return reply("[X] No details found for this movie!");

    }

    const movieDetails = detailsData.result;

    let detailsCard = `ᴍᴏᴠɪᴇ ᴅᴇᴛᴀɪʟs \n\n*${movieDetails.title}*\n\n`;

    detailsCard += ` ᴅᴀᴛᴇ: ${movieDetails.date}\n`;

    detailsCard += ` ᴄᴏɴᴛʀʏ: ${movieDetails.country}\n`;

    detailsCard += `ᴅᴜʀᴀᴛɪᴏɴ: ${movieDetails.duration}\n`;

    detailsCard += `ʀᴀᴛɪɴɢ: ${movieDetails.rating}\n`;

    detailsCard += ` ᴅᴇsᴄʀɪᴘᴛɪᴏɴ: ${movieDetails.description}\n`;

    // Send image iғ available

    const imageUrl = movieDetails.images && movieDetails.images.length > 0 ? movieDetails.images[0] : null;

    let imageSent = false;

    if (imageUrl) {

      try {

        const imageResponse = await axios.get(imageUrl, {

          responseType: "arraybuffer",

          timeout: 30000,

          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },

        });

        await robin.sendMessage(from, {

          image: Buffer.from(imageResponse.data),

          caption: detailsCard,

        }, { quoted: msg });

        imageSent = true;

      } catch (imageError) {

        console.error("Image fetch error:", imageError.message);

      }

    }

    if (!imageSent) {

      await robin.sendMessage(from, { text: detailsCard }, { quoted: msg });

    }

    await robin.sendMessage(from, { react: { text: "[OK]", key: msg.key } });

    // Download options

    await robin.sendMessage(from, { react: { text: "[Wait]", key: msg.key } });

    const downloadLinks = movieDetails.downloadLinks || [];

    let downloadCard = `ᴅᴏᴡɴʟᴏᴀᴅ ᴄʟɪᴄᴋ [SUB]\n\n*${movieDetails.title}*\n\n`;

    let optionCount = 1;

    downloadLinks.forEach((linkObj) => {

      downloadCard += `${optionCount}. ${linkObj.quality} (${linkObj.size}) - ${linkObj.lang}\n`;

      optionCount++;

    });

    if (downloadLinks.length === 0) {

      downloadCard += "No download links available.";

    } else {

      downloadCard += "ʀᴇᴘʟʏ ɴᴜᴍʙᴇʀ ᴛᴏ ᴍᴏᴠɪᴇ ᴅᴏᴡɴʟᴏᴀᴅ:";

    }

    const downloadMsg = await robin.sendMessage(from, { text: downloadCard }, { quoted: msg });

    await robin.sendMessage(from, { react: { text: "[OK]", key: msg.key } });

    let dlHandled = false;

    const dlListener = (dlMsgUpdate) => {

      if (dlHandled) return;

      const dlMsg = dlMsgUpdate.messages[0];

      if (!dlMsg?.message?.extendedTextMessage) return;

      const dlOptionStr = dlMsg.message.extendedTextMessage.text.trim();

      const dlOption = parseInt(dlOptionStr);

      if (dlMsg.message.extendedTextMessage.contextInfo?.stanzaId === downloadMsg.key.id) {

        dlHandled = true;

        robin.ev.off("messages.upsert", dlListener);

        handleDownload(dlOption, dlMsg, downloadLinks, movieDetails.title, from, reply, robin);

      }

    };

    robin.ev.on("messages.upsert", dlListener);

  } catch (error) {

    console.error("Movie selection error:", error);

    await robin.sendMessage(from, { react: { text: "[X]", key: msg.key } });

    reply("Error processing movie: " + error.message);

  }

}

// Helper: Download

async function handleDownload(dlOption, dlMsg, downloadLinks, title, from, reply, robin) {

  try {

    const index = dlOption - 1;

    if (isNaN(index) || index < 0 || index >= downloadLinks.length) {

      await robin.sendMessage(from, { react: { text: "[?]", key: dlMsg.key } });

      return reply(`ᴘʟᴇᴀsᴇ ʀᴇᴘʟʏ ᴡɪᴛʜ ᴀ ᴡᴀɪʟᴅ ɴᴜᴍʙᴇʀ (1-${downloadLinks.length}).`);

    }

    await robin.sendMessage(from, { react: { text: "[Wait]", key: dlMsg.key } });

    const selectedLink = downloadLinks[index];

    let downloadUrl = selectedLink.link;

    let finalFileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedLink.quality}.mp4`;

    const caption = `[Movie] ${title} - ${selectedLink.quality} (${selectedLink.size}) - Download`;

    const mimetype = "video/mp4";

    console.log(`Starting download from: ${downloadUrl}`);

    // Handle Pixeldrain: Extract file ID from /u/{fileId} format and use Dark Yasiya API for dl_link

    if (selectedLink.server === "Pixeldrain") {

      try {

        // Extract file ID from https://pixeldrain.com/u/{fileId}

        const fileIdMatch = downloadUrl.match(/\/u\/([a-zA-Z0-9]+)$/);

        if (!fileIdMatch) {

          throw new Error("Invalid Pixeldrain URL format");

        }

        const fileId = fileIdMatch[1];

        console.log(`Extracted Pixeldrain file ID: ${fileId}`);

        // Use Dark Yasiya API to get dl_link

        const apiUrl = `https://www.dark-yasiya-api.site/download/pixeldrain?url=https://pixeldrain.com/api/file/${fileId}`;

        const apiResponse = await axios.get(apiUrl, {

          timeout: 15000,

          headers: {

            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

          }

        });

        const apiData = apiResponse.data;

        console.log("Dark Yasiya API Response:", JSON.stringify(apiData, null, 2));

        if (apiData && apiData.status && apiData.result && apiData.result.dl_link) {

          downloadUrl = apiData.result.dl_link;

          console.log(`Direct download URL from Dark Yasiya: ${downloadUrl}`);

          // Use the fileName from API if available for better filename

          if (apiData.result.fileName) {

            finalFileName = apiData.result.fileName;

          }

        } else {

          throw new Error(`Dark Yasiya API error: No dl_link found. Response: ${JSON.stringify(apiData)}`);

        }

      } catch (pdError) {

        console.error("Pixeldrain handling error:", pdError.message);

        throw new Error(`Pixeldrain link invalid: ${pdError.message}`);

      }

    }

    // Now download from the final URL (dl_link or direct)

    const response = await new Promise((resolve, reject) => {

      const req = https.get(downloadUrl, {

        timeout: 30000,

        headers: {

          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",

          "Accept": "video/mp4,*/*;q=0.8",

          "Range": "bytes=0-",

          "Referer": "https://pixeldrain.com/"

        }

      }, (res) => {

        console.log(`Status: ${res.statusCode}, Content-Type: ${res.headers['content-type']}, Content-Length: ${res.headers['content-length']}`);

        

        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {

          console.log(`Redirect to: ${res.headers.location}`);

          const redirectReq = https.get(res.headers.location, (redirectRes) => {

            console.log(`Redirect Status: ${redirectRes.statusCode}, Type: ${redirectRes.headers['content-type']}`);

            resolve(redirectRes);

          });

          redirectReq.on('error', reject);

          redirectReq.setTimeout(30000, () => reject(new Error('Redirect timeout')));

          return;

        }

        if (res.statusCode !== 200) {

          let errorBody = '';

          res.setEncoding('utf8');

          res.on('data', chunk => { errorBody += chunk; });

          res.on('end', () => {

            console.log("Error Response Body:", errorBody.substring(0, 500));

            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage} - ${errorBody.substring(0, 200)}`));

          });

          return;

        }

        const contentType = res.headers['content-type'];

        if (!contentType || (!contentType.startsWith('video/') && !contentType.includes('octet-stream'))) {

          let htmlData = '';

          res.setEncoding('utf8');

          res.on('data', chunk => htmlData += chunk);

          res.on('end', () => {

            console.log("Invalid Response:", htmlData.substring(0, 500));

            reject(new Error(`Invalid content type: ${contentType || 'unknown'}. Likely not a video file.`));

          });

          return;

        }

        const contentLength = parseInt(res.headers['content-length'] || '0');

        if (contentLength < 50000) {

          reject(new Error(`File too small (${contentLength} bytes). Likely not a full video.`));

          return;

        }

        resolve(res);

      });

      req.on('error', reject);

      req.setTimeout(30000, () => reject(new Error('Request timeout')));

    });

    const tempDir = os.tmpdir();

    const tempFile = path.join(tempDir, `ssub_movie_${Date.now()}.mp4`);

    const writer = fs.createWriteStream(tempFile);

    response.pipe(writer);

    await new Promise((resolve, reject) => {

      writer.on("finish", async () => {

        try {

          const stats = fs.statSync(tempFile);

          console.log(`Download finished, file size: ${stats.size} bytes`);

          if (stats.size < 50000) {

            reject(new Error(`Downloaded file too small (${stats.size} bytes).`));

            return;

          }

          resolve();

        } catch (err) {

          reject(err);

        }

      });

      writer.on("error", reject);

      response.on("error", reject);

    });

    // Send as video message to preserve original quality

    await robin.sendMessage(from, {

      video: { url: tempFile },

      mimetype,

      fileName: finalFileName,

      caption,

    }, { quoted: dlMsg });

    await robin.sendMessage(from, { react: { text: "[Video]", key: dlMsg.key } });

    // Cleanup

    fs.unlink(tempFile, (err) => {

      if (err) console.error("Temp file cleanup error:", err);

    });

  } catch (error) {

    console.error("Download error:", error);

    await robin.sendMessage(from, { react: { text: "[X]", key: dlMsg.key } });

    reply("Download failed: " + (error.message || "Unknown error"));

  }

}