const config = require('../config')
const os = require('os')
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { generateForwardMessageContent, prepareWAMessageFromContent, generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const { cmd, commands } = require('../command')
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson} = require('../lib/functions')
const { exec } = require("child_process");

cmd({
  pattern: "update",
  react: "ℹ️",
  desc: "Update your bot to the latest version",
  use: ".update",
  category: "main",
  filename: __filename
},
async (conn, mek, m, { reply, isOwner, isSachintha, isSavi, isSadas, isMani, isMe }) => {
  if (!isOwner && !isSachintha && !isSavi && !isSadas && !isMani && !isMe) return;

  try {
    // Let the user know an update has started
    await reply(`🔄 *Bot Update in Progress...*  
📦 *Fetching latest code & restarting services...*`);

    // Wait before executing to ensure user sees message
    setTimeout(() => {
      exec('pm2 restart all', (error, stdout, stderr) => {
        if (error) {
          console.error(error);
          reply('❌ *Update failed during restart!*');
        }
      });
    }, 3000); // 3-second delay before restart

  } catch (e) {
    console.error(e);
    reply('🚨 *An unexpected error occurred during update.*');
  }
});
