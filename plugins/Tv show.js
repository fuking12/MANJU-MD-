const { cmd } = require("../command");
const axios = require("axios");
const os = require("os");
const path = require("path");
const fs = require("fs");

// Global fetchWithRetry for all helpers
const fetchWithRetry = async (url, retries = 3) => {
  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://subz.lk/",
        "Origin": "https://subz.lk",
      },
    });
    return response;
  } catch (error) {
    console.error("API Error:", error.response ? error.response.data : error.message);
    if (error.response?.status === 500 && retries > 0) {
      console.log(`500 error - retrying... (${retries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
};

cmd({
  pattern: "tvsearch",
  react: "☠️",
  desc: "Search and download TV series",
  category: "media",
  filename: __filename,
}, async (robin, mek, m, options) => {
  const from = options.from;
  const q = options.q;
  const reply = options.reply;
  
  try {
    if (!q) return reply("Please provide a search query (e.g., .tvsearch Zorro)");

    await robin.sendMessage(from, { react: { text: "[Search]", key: mek.key } });

    const searchUrl = `https://subtv.netlify.app/api/search/search?text=${encodeURIComponent(q)}`;
    console.log(`Fetching search from: ${searchUrl}`);
    
    const searchResponse = await fetchWithRetry(searchUrl);
    const searchData = searchResponse.data;
    console.log("Search Response:", JSON.stringify(searchData, null, 2));

    let results = Array.isArray(searchData) ? searchData : (searchData.results || []);

    if (results.length === 0) {
      await robin.sendMessage(from, { react: { text: "[X]", key: mek.key } });
      return reply("[X] No TV series found for your query! Try a different query.");
    }

    let searchList = "TV SERIES SEARCH RESULTS [TV]\n\n";
    results.forEach((item, index) => {
      searchList += `${index + 1}. *${item.title || "Untitled"}*\n`;
      searchList += `   Desc: ${item.description || "No description"}\n`;
      searchList += `   Status: ${item.status || "N/A"}\n\n`;
    });
    searchList += "Reply with a number to select a series:";

    const searchMsg = await robin.sendMessage(from, { text: searchList }, { quoted: mek });
    await robin.sendMessage(from, { react: { text: "[OK]", key: mek.key } });

    let seriesHandled = false;
    const seriesListener = (msgUpdate) => {
      if (seriesHandled) return;
      const msg = msgUpdate.messages[0];
      if (!msg?.message?.extendedTextMessage) return;
      const selectedOption = msg.message.extendedTextMessage.text.trim();
      if (msg.message.extendedTextMessage.contextInfo?.stanzaId === searchMsg.key.id) {
        seriesHandled = true;
        robin.ev.off("messages.upsert", seriesListener);
        handleSeriesSelection(selectedOption, msg, results, from, reply, robin);
      }
    };
    robin.ev.on("messages.upsert", seriesListener);

  } catch (error) {
    console.error("TVSearch command error:", error);
    await robin.sendMessage(from, { react: { text: "[X]", key: mek.key } });
    reply("Command failed: " + (error.message || "Unknown error"));
  }
});

// Helper: Series selection
async function handleSeriesSelection(selectedOption, msg, results, from, reply, robin) {
  try {
    const index = parseInt(selectedOption) - 1;
    if (isNaN(index) || index < 0 || index >= results.length) {
      await robin.sendMessage(from, { react: { text: "[?]", key: msg.key } });
      return reply(`Please reply with a valid number (1-${results.length}).`);
    }

    await robin.sendMessage(from, { react: { text: "[Wait]", key: msg.key } });

    const selectedSeries = results[index];
    const seriesUrl = selectedSeries.url;
    const episodesUrl = `https://episodesub.netlify.app/.netlify/functions/episodes?url=${encodeURIComponent(seriesUrl)}`;
    console.log(`Fetching episodes from: ${episodesUrl}`);

    const episodesResponse = await fetchWithRetry(episodesUrl);
    const episodesData = episodesResponse.data;
    console.log("Episodes Response:", JSON.stringify(episodesData, null, 2));

    const episodes = episodesData.episodes || [];

    if (episodes.length === 0) {
      await robin.sendMessage(from, { react: { text: "[X]", key: msg.key } });
      return reply("[X] No episodes found for this series!");
    }

    let episodesList = `TV SERIES EPISODES [TV]\n\n*${selectedSeries.title || "Untitled"}*\n\n`;
    episodes.forEach((episode, eIndex) => {
      episodesList += `${eIndex + 1}. *${episode.title || `Episode ${eIndex + 1}` }*\n`;
      episodesList += `   Desc: ${episode.description || "No description"}\n`;
      episodesList += `   URL: ${episode.url}\n\n`;
    });
    episodesList += "Reply with a number to select an episode:";

    const episodesMsg = await robin.sendMessage(from, { text: episodesList }, { quoted: msg });
    await robin.sendMessage(from, { react: { text: "[OK]", key: msg.key } });

    let episodeHandled = false;
    const episodeListener = (epMsgUpdate) => {
      if (episodeHandled) return;
      const epMsg = epMsgUpdate.messages[0];
      if (!epMsg?.message?.extendedTextMessage) return;
      const epSelectedOption = epMsg.message.extendedTextMessage.text.trim();
      if (epMsg.message.extendedTextMessage.contextInfo?.stanzaId === episodesMsg.key.id) {
        episodeHandled = true;
        robin.ev.off("messages.upsert", episodeListener);
        handleEpisodeSelection(epSelectedOption, epMsg, episodes, from, reply, robin, selectedSeries);
      }
    };
    robin.ev.on("messages.upsert", episodeListener);

  } catch (error) {
    console.error("Series selection error:", error);
    await robin.sendMessage(from, { react: { text: "[X]", key: msg.key } });
    reply("Error processing series: " + error.message);
  }
}

// Helper: Episode selection
async function handleEpisodeSelection(epSelectedOption, epMsg, episodes, from, reply, robin, selectedSeries) {
  try {
    const eIndex = parseInt(epSelectedOption) - 1;
    if (isNaN(eIndex) || eIndex < 0 || eIndex >= episodes.length) {
      await robin.sendMessage(from, { react: { text: "[?]", key: epMsg.key } });
      return reply(`Please reply with a valid episode number (1-${episodes.length}).`);
    }

    await robin.sendMessage(from, { react: { text: "[Wait]", key: epMsg.key } });

    const selectedEpisode = episodes[eIndex];
    const episodeUrl = selectedEpisode.url;
    const detailsUrl = `https://subdetailes.netlify.app/api/details?url=${encodeURIComponent(episodeUrl)}`;
    console.log(`Fetching details from: ${detailsUrl}`);

    let detailsResponse;
    try {
      detailsResponse = await fetchWithRetry(detailsUrl);
    } catch (detailsError) {
      console.error("Details API fallback:", detailsError.message);
      detailsResponse = { data: { title: selectedEpisode.title, description: selectedEpisode.description || "No description available", image_url: null } };
    }

    const detailsData = detailsResponse.data;
    console.log("Details Response:", JSON.stringify(detailsData, null, 2));

    let detailsCard = `TV EPISODE DETAILS [TV]\n\n*${selectedEpisode.title || `Episode ${eIndex + 1}` }*\n\n`;

    let cleanTitle = detailsData.title || "No Title";
    cleanTitle = cleanTitle.replace(/Subz LK \| Sinhala Subtitle \| /gi, "").trim();

    detailsCard += `Title: ${cleanTitle}\n`;
    detailsCard += `Description: ${detailsData.description || "No description available"}\n`;

    const imageExtensions = /\.(jpg|jpeg|png|gif)$/i;
    const imageUrl = detailsData.image_url;
    let imageSent = false;

    if (imageUrl && imageExtensions.test(imageUrl)) {
      try {
        console.log(`Attempting to fetch image: ${imageUrl}`);
        const imageResponse = await axios.get(imageUrl, {
          responseType: "arraybuffer",
          timeout: 30000,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        });
        console.log(`Image fetched successfully: ${imageUrl}`);
        await robin.sendMessage(from, {
          image: Buffer.from(imageResponse.data),
          caption: detailsCard,
        }, { quoted: epMsg });
        imageSent = true;
      } catch (imageError) {
        console.error("Image fetch error:", imageError.message);
      }
    }

    if (!imageSent) {
      await robin.sendMessage(from, { text: detailsCard }, { quoted: epMsg });
    }

    await robin.sendMessage(from, { react: { text: "[OK]", key: epMsg.key } });

    // Download options
    await robin.sendMessage(from, { react: { text: "[Wait]", key: epMsg.key } });

    const downloadBaseUrl = `https://subztvdl.netlify.app/api/download?url=${encodeURIComponent(episodeUrl)}`;
    console.log(`Fetching download links from: ${downloadBaseUrl}`);

    const downloadResponse = await fetchWithRetry(downloadBaseUrl);
    const downloadData = downloadResponse.data;
    console.log("Download Response:", JSON.stringify(downloadData, null, 2));

    // Use downloadLink as primary GDrive URL for saviya-kolla
    let gdriveUrl = downloadData.downloadLink || downloadData.movieLink || null;
    const subtitleUrl = downloadData.subtitleLink || null;

    let downloadCard = `DOWNLOAD OPTIONS [TV]\n\n*${selectedEpisode.title || `Episode ${eIndex + 1}` }*\n\n`;

    let optionCount = 1;
    if (gdriveUrl) {
      downloadCard += `${optionCount}. Movie Link\n`;
      optionCount++;
    }
    if (subtitleUrl) {
      downloadCard += `${optionCount}. Subtitle Link\n`;
    }
    if (!gdriveUrl && !subtitleUrl) {
      downloadCard += "No download links available.";
    } else {
      downloadCard += "Reply with a number to download:";
    }

    const downloadMsg = await robin.sendMessage(from, { text: downloadCard }, { quoted: epMsg });
    await robin.sendMessage(from, { react: { text: "[OK]", key: epMsg.key } });

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
        handleDownload(dlOption, dlMsg, gdriveUrl, subtitleUrl, selectedEpisode, from, reply, robin);
      }
    };
    robin.ev.on("messages.upsert", dlListener);

  } catch (error) {
    console.error("Episode selection error:", error);
    await robin.sendMessage(from, { react: { text: "[X]", key: epMsg.key } });
    reply("Error processing episode: " + error.message);
  }
}

// Helper: Download (enhanced quota bypass to fix small file & stream error)
async function handleDownload(dlOption, dlMsg, gdriveUrl, subtitleUrl, selectedEpisode, from, reply, robin) {
  try {
    const isMovie = dlOption === 1 && gdriveUrl;
    const isSub = dlOption === 2 && subtitleUrl;

    if (!isMovie && !isSub) {
      await robin.sendMessage(from, { react: { text: "[?]", key: dlMsg.key } });
      return reply("Please reply with a valid number for download options.");
    }

    let fileName, caption, mimetype, tempFile, directDownloadUrl;
    const tempDir = os.tmpdir();

    if (isMovie) {
      // Call saviya-kolla API to get direct download link
      const saviyaApiUrl = `https://saviya-kolla-api.koyeb.app/download/gdrive?url=${encodeURIComponent(gdriveUrl)}`;
      console.log(`Fetching direct link from saviya-kolla API: ${saviyaApiUrl}`);

      const saviyaResponse = await fetchWithRetry(saviyaApiUrl);
      const saviyaData = saviyaResponse.data;
      console.log("Saviya API Response:", JSON.stringify(saviyaData, null, 2));

      if (!saviyaData.status || !saviyaData.result || !saviyaData.result.downloadLink) {
        throw new Error("Failed to get direct download link from Saviya API");
      }

      directDownloadUrl = saviyaData.result.downloadLink;
      fileName = saviyaData.result.name || `${selectedEpisode.title || "TV_Episode"}.mkv`;
      caption = `[Movie] ${selectedEpisode.title || "TV Episode"} - Download`;
      mimetype = "video/x-matroska";
      console.log(`Starting download from saviya direct link: ${directDownloadUrl}`);
      tempFile = path.join(tempDir, `tv_movie_${Date.now()}.mkv`);
    } else {
      // Direct subtitle download
      directDownloadUrl = subtitleUrl;
      fileName = `${selectedEpisode.title || "TV_Episode"}.srt`;
      caption = `[Subtitle] ${selectedEpisode.title || "TV Episode"} - Download`;
      mimetype = "text/plain";
      console.log(`Starting subtitle download from: ${directDownloadUrl}`);
      tempFile = path.join(tempDir, `tv_subtitle_${Date.now()}.srt`);
    }

    // Enhanced download with quota bypass (prevents small file & stream crash)
    let response;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        let finalUrl = directDownloadUrl;
        // Enhanced quota bypass: Check initial response for warning
        if (isMovie && finalUrl.includes('drive.google.com/uc?export=download')) {
          console.log(`Attempt ${attempt}: Checking for GDrive quota warning...`);
          const initResponse = await axios.get(finalUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
            timeout: 30000,
          });

          const initDataStr = initResponse.data.toString();
          const initSize = initDataStr.length;

          // Early check: If initial response small (HTML warning), extract token
          if (initResponse.headers['content-type']?.includes('text/html') && initSize < 10240 && initDataStr.includes('confirm=')) {
            console.log("Detected quota warning – extracting confirm token...");
            // Multiple regex for different warning formats (2025 updates)
            let tokenMatch = initDataStr.match(/confirm=([0-9A-Za-z_]+)/) || 
                             initDataStr.match(/name="confirm" value="([0-9A-Za-z_]+)"/) ||
                             initDataStr.match(/confirm=([^&"\s]+)/);
            if (tokenMatch) {
              const token = tokenMatch[1];
              finalUrl += `&confirm=${token}`;
              console.log(`Bypassed quota with token: ${token.substring(0, 10)}...`);
            } else {
              throw new Error("Could not extract confirm token – quota exceeded.");
            }
          } else if (initSize < 10240) {
            throw new Error("Initial response too small – likely quota warning without token.");
          }
        }

        response = await axios({
          method: "get",
          url: finalUrl,
          responseType: "stream",
          timeout: 120000 * attempt,
          headers: { 
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });
        break;
      } catch (downloadError) {
        console.error(`${isMovie ? 'Movie' : 'Subtitle'} download attempt ${attempt} failed:`, downloadError.message);
        if (attempt === 3) {
          if (isMovie && (downloadError.message.includes('quota') || downloadError.message.includes('confirm'))) {
            reply("Download failed: Quota exceeded. Manual fix (2025 method): 1. Open movie link in browser. 2. Right-click > Add shortcut to Drive (or Ctrl+Alt+R). 3. Go to your Drive folder > Right-click shortcut > Download. Or try subtitle (reply 2). Quota resets in 24h. Alternative: Use MultCloud.com to transfer.");
          }
          throw downloadError;
        }
        await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
      }
    }

    const writer = fs.createWriteStream(tempFile);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", async () => {
        try {
          const stats = fs.statSync(tempFile);
          console.log(`Download finished, file size: ${stats.size} bytes`);
          
          // Enhanced small file check: Reject safely if <10KB
          if (isMovie && stats.size < 10240) {
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            reject(new Error("Downloaded small file (quota warning page). Bypass failed – try manual shortcut method."));
            return;
          }
          
          resolve();
        } catch (statError) {
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
          reject(statError);
        }
      });
      writer.on("error", (err) => {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        reject(err);
      });
    });

    await robin.sendMessage(from, {
      document: { url: tempFile },
      mimetype,
      fileName,
      caption,
    }, { quoted: dlMsg });

    const reactText = isMovie ? "[Video]" : "[Sub]";
    await robin.sendMessage(from, { react: { text: reactText, key: dlMsg.key } });

    // Cleanup
    fs.unlink(tempFile, (err) => {
      if (err) console.error("Temp file cleanup error:", err);
    });

  } catch (error) {
    console.error("Download error:", error);
    await robin.sendMessage(from, { react: { text: "[X]", key: dlMsg.key } });
    reply("Download failed: " + (error.message || "Unknown error. Try subtitle if available."));
  }
}
