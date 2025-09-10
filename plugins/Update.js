const { cmd } = require("../command");
const { exec } = require("child_process");
const fs = require('fs');

// Theme for update messages
const simpleTheme = {
  box: function(title, content) {
    return `⚙️ Update Hub ⚙️\n\n${title}\n\n${content}`;
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
          conversionSource: "update_hub",
          conversionType: "message"
        }
      }
    };
  },
  resultEmojis: ["⚡", "🔄", "✅"]
};

// Update command
cmd({
  pattern: "update1",
  react: "🔄",
  desc: "Update the bot with the latest repository changes",
  category: "Admin",
  filename: __filename,
}, async (conn, mek, m, { from, q, pushname, reply }) => {
  try {
    console.log(`[10:15 AM +0530] Update command initiated by ${pushname}`);

    // Notify user that update is starting
    await reply(simpleTheme.box("Update Started", 
      "Pulling the latest changes from the repository. Please wait..."));

    // Execute Git pull command
    exec("git pull", (error, stdout, stderr) => {
      if (error) {
        console.error(`[10:15 AM +0530] Git pull error: ${error.message}`);
        return reply(simpleTheme.box("Update Failed", 
          `Error during update: ${error.message}\nPlease check the repository or contact the admin.`));
      }

      if (stderr) {
        console.error(`[10:15 AM +0530] Git pull stderr: ${stderr}`);
        return reply(simpleTheme.box("Update Warning", 
          `Update completed with warnings: ${stderr}\nPlease check the logs.`));
      }

      console.log(`[10:15 AM +0530] Git pull output: ${stdout}`);
      if (stdout.includes("Already up to date.")) {
        return reply(simpleTheme.box("Update Status", 
          "No new changes to apply. Bot is already up to date!"));
      }

      // Notify user of successful update
      reply(simpleTheme.box("Update Successful", 
        "Repository updated successfully. Restarting the bot to apply changes..."));

      // Restart the bot (Heroku-specific restart)
      exec("heroku ps:restart -a <your-heroku-app-name>", (restartError) => {
        if (restartError) {
          console.error(`[10:15 AM +0530] Restart error: ${restartError.message}`);
          return reply(simpleTheme.box("Restart Failed", 
            `Update applied, but restart failed: ${restartError.message}\nManual restart required.`));
        }
        console.log(`[10:15 AM +0530] Bot restarted successfully`);
      });
    });

  } catch (e) {
    console.error("[10:15 AM +0530] Error in update command:", e);
    await reply(simpleTheme.box("Error", 
      `An unexpected error occurred: ${e.message || "Unknown error"}\nPlease try again later`));
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
  }
});
