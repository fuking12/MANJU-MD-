const { cmd } = require("../command");
const { File } = require('megajs');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

// Temporary file path for downloading
const tempDir = path.join(__dirname, 'temp');
const ensureTempDir = async () => {
  try {
    await fsp.mkdir(tempDir, { recursive: true });
  } catch (err) {
    console.error(`[12:56 PM +0530] Failed to create temp directory: ${err.message}`);
  }
};

// Simplified theme for messages
const simpleTheme = {
  box: function(title, content) {
    return `🎬 MEGA Hub 🎬\n\n${title}\n\n${content}`;
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
          conversionSource: "mega_hub",
          conversionType: "message"
        }
      }
    };
  },
  resultEmojis: ["📥", "🎥", "📤", "📦"]
};

// MEGA file download command
cmd({
  pattern: "mega",
  react: "📥",
  desc: "Download files from MEGA links",
  category: "MEGA Hub",
  filename: __filename,
}, async (conn, mek, m, { from, q, pushname, reply }) => {
  if (!q) {
    return reply(simpleTheme.box("MEGA Download", 
      "Use: .mega <MEGA URL>\n✨ Ex: .mega https://mega.nz/file/example#example"));
  }

  try {
    await ensureTempDir();

    // Validate MEGA URL
    const megaUrl = q.trim();
    if (!megaUrl.match(/^https:\/\/mega\.(nz|co\.nz)\/(?:file|folder)\/[#!\w-]+$/)) {
      return reply(simpleTheme.box("Invalid URL", 
        "Please provide a valid MEGA URL (e.g., https://mega.nz/file/example#example)"));
    }

    console.log(`[12:56 PM +0530] Processing MEGA URL: ${megaUrl}`);
    const file = File.fromURL(megaUrl);

    // Load file attributes
    await file.loadAttributes();
    console.log(`[12:56 PM +0530] File attributes loaded: ${file.name}, Size: ${file.size} bytes`);

    // Check file size against WhatsApp limit (2GB = 2,147,483,648 bytes)
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      return reply(simpleTheme.box("Size Error", 
        `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds WhatsApp's 2GB limit.`));
    }

    // Download the file with limited retries
    const tempFilePath = path.join(tempDir, file.name.replace(/[^\w\s.]/gi, '_'));
    let downloadAttempt = 0;
    const maxAttempts = 4; // Limited to 3-4 attempts
    let downloadedSize = 0;

    while (downloadAttempt < maxAttempts) {
      const writer = fs.createWriteStream(tempFilePath);
      const stream = file.download({ timeout: 600000 }); // 10-minute timeout for large files

      stream.on('data', (chunk) => {
        downloadedSize += chunk.length;
        console.log(`[12:56 PM +0530] Downloaded ${downloadedSize} bytes`);
      });

      stream.on('error', (error) => {
        console.error(`[12:56 PM +0530] Stream error on attempt ${downloadAttempt + 1}: ${error.message}`);
        writer.end();
      });

      stream.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // Check if downloaded size matches expected size
      const fileStats = await fsp.stat(tempFilePath);
      if (Math.abs(fileStats.size - file.size) < 1024 || fileStats.size >= 1024 * 1024) { // Allow 1KB tolerance
        break;
      } else {
        downloadAttempt++;
        await fsp.unlink(tempFilePath);
        console.log(`[12:56 PM +0530] Attempt ${downloadAttempt}/${maxAttempts} failed, size ${fileStats.size} bytes, retrying...`);
        if (downloadAttempt === maxAttempts) {
          throw new Error(`Downloaded file size (${fileStats.size} bytes) does not match expected (${file.size} bytes) after ${maxAttempts} attempts`);
        }
      }
    }

    // Verify final file size
    const finalStats = await fsp.stat(tempFilePath);
    if (finalStats.size < 1024 * 1024 && finalStats.size < file.size) {
      await fsp.unlink(tempFilePath);
      throw new Error(`Downloaded file size (${finalStats.size} bytes) too small compared to expected (${file.size} bytes)`);
    }

    // Send the file as a document
    await conn.sendMessage(from, {
      document: { url: tempFilePath },
      mimetype: file.mimeType || "application/octet-stream",
      fileName: file.name,
      caption: `📥 ${file.name}\n\nSize: ${(file.size / (1024 * 1024)).toFixed(2)} MB\n\nDownloaded from MEGA!`,
      ...simpleTheme.getForwardProps()
    }, { quoted: mek });

    await conn.sendMessage(from, { 
      react: { 
        text: simpleTheme.resultEmojis[Math.floor(Math.random() * simpleTheme.resultEmojis.length)], 
        key: mek.key 
      } 
    });

    // Clean up temporary file
    await fsp.unlink(tempFilePath);
    console.log(`[12:56 PM +0530] Successfully sent ${file.name} and cleaned up`);

  } catch (e) {
    console.error("[12:56 PM +0530] Error in mega command:", e);
    const errorMsg = simpleTheme.box("Error", 
      `Sorry, an error occurred:\n\n${e.message || "Unknown error"}\n\nPlease try again later`);
    
    await reply(errorMsg);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
  }
});
