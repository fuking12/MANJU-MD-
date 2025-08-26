const config = require('../config')
const { generateForwardMessageContent, prepareWAMessageFromContent, generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

const { cmd, commands } = require('../command')
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson} = require('../lib/functions')
const mimeTypes = require("mime-types");
const fs = require('fs');
const path = require('path');

cmd({
    pattern: "forward",
    react: "",
alias: ["f"],
     desc: "forwerd film and msg",
    use: ".f jid",
    category: "owner",
    filename: __filename
},
async(conn, mek, m,{from, l, prefix, quoted, body, isCmd, isSudo, isOwner, isMe, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isIsuru, isTharu,  isSupporters, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {


if (!q || !m.quoted) {
return reply("*Please give me a Jid and Quote a Message to continue.*");
}
 
  let jidList = q.split(',').map(jid => jid.trim());
  if (jidList.length === 0) {
    return reply("*Provide at least one Valid Jid. ⁉️*");
  }
 
  let Opts = {
    key: mek.quoted?.["fakeObj"]?.["key"]
  };
  
  if (mek.quoted.documentWithCaptionMessage?.message?.documentMessage) {
    let docMessage = mek.quoted.documentWithCaptionMessage.message.documentMessage;
    const mimeTypes = require("mime-types");
    let ext = mimeTypes.extension(docMessage.mimetype) || "file";
    docMessage.fileName = docMessage.fileName || `file.${ext}`;
  }
  
  Opts.message = mek.quoted;
  let successfulJIDs = [];

  for (let i of jidList) {
try {
await conn.forwardMessage(i, Opts, false);
successfulJIDs.push(i);
} catch (error) {
console.log(e);
}
}

if (successfulJIDs.length > 0) {
return reply(`*Message Forwarded*\n\n` + successfulJIDs.join("\n"))
} else {
console.log(e)
}
});

cmd({
    pattern: "send",
    alias: ["forward2"],
    desc: "send msgs",
    category: "owner",
    use: '.send < Jid address >',
    filename: __filename
},

async (conn, mek, m, { from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
try{ 

if (!q || !m.quoted) {
return reply("*Please give me a Jid and Quote a Message to continue.*");
}

	
if (!q || !m.quoted) {
return await reply(`❌ *Please give me a jid and quote a message you want*\n\n*Use the ${envData.PREFIX}jid command to get the Jid*`)
}  

  let jidList = q.split(',').map(jid => jid.trim());

	

if(m.quoted && m.quoted.type === "stickerMessage"){
let image = await m.quoted.download()
            let sticker = new Sticker(image, {
                pack: "⦁ SAVIYA-MD ⦁",
                author: "⦁ SAVIYA-X-MD ⦁",
                type: StickerTypes.FULL, //q.includes("--default" || '-d') ? StickerTypes.DEFAULT : q.includes("--crop" || '-cr') ? StickerTypes.CROPPED : q.includes("--circle" || '-ci') ? StickerTypes.CIRCLE : q.includes("--round" || '-r') ? StickerTypes.ROUNDED : StickerTypes.FULL,
                categories: ["🤩", "🎉"],
                id: "12345",
                quality: 75,
                background: "transparent",
            });
            const buffer = await sticker.toBuffer();

const successful = [];

  for (let jid of jidList) {
    try {
        conn.sendMessage(jid, { sticker: buffer });
      successful.push(jid);
    } catch (err) {
      console.log(`❌ Failed to forward to ${jid}:`, err);
    }
  }
  

let ss = '`'
reply(`*This ${m.quoted.type} has been successfully sent to the jid address ${ss}${q}${ss}.*  ✅`)
m.react("✔️")  

}else if(m.quoted && m.quoted.type === "imageMessage"){
if(m.quoted.imageMessage && m.quoted.imageMessage.caption){
const cap = m.quoted.imageMessage.caption
let image = await m.quoted.download()
const successfull = [];

  for (let jid of jidList) {
    try {
        conn.sendMessage(jid, { image: image, caption: cap });
      successfull.push(jid);
    } catch (err) {
      console.log(`❌ Failed to forward to ${jid}:`, err);
    }
  }
  

   
let ss = '`'
reply(`*This ${ss}${m.quoted.type} has been successfully sent to the jid address   ✅`)
m.react("✔️")
	
}else{
let image = await m.quoted.download()
const successfulll = [];

  for (let jid of jidList) {
    try {
         conn.sendMessage(jid, { image: image });
      successfulll.push(jid);
    } catch (err) {
      console.log(`❌ Failed to forward to ${jid}:`, err);
    }
  }
  
 
let ss = '`'
reply(`*This ${ss}${m.quoted.type} has been successfully sent to the jid address   ✅`)
m.react("✔️")  
}	
	
}else if(m.quoted && m.quoted.type === "videoMessage"){
let fileLengthInBytes = m.quoted.videoMessage.fileLength
const fileLengthInMB = fileLengthInBytes / (1024 * 1024);
if(fileLengthInMB >= 50 ){
reply("*❌ Video files larger than 50 MB cannot be send.*")
}else{
let video = await m.quoted.download()
const jid = q || from

if(m.quoted.videoMessage.caption){
 
 conn.sendMessage(jid, { video: video, mimetype: 'video/mp4',caption: m.quoted.videoMessage.caption});
let ss = '`'
reply(`*This ${ss}${m.quoted.type}${ss} has been successfully sent to the jid address ${ss}${q}${ss}.*  ✅`)
m.react("✔️")
 
 }else{

  const jid = q || from
 conn.sendMessage(jid, { video: video, mimetype: 'video/mp4'});
  let ss = '`'
reply(`*This ${ss}${m.quoted.type}${ss} has been successfully sent to the jid address ${ss}${q}${ss}.*  ✅`)
m.react("✔️")
}

}	

}else if(m.quoted && m.quoted.type === "documentMessage" || m.quoted.type === "documentWithCaptionMessage"){	

const jid = q || from
if(m && m.quoted && m.quoted.documentMessage){
let fileLengthInBytes = m.quoted.documentMessage.fileLength	
const fileLengthInMB = fileLengthInBytes / (1024 * 1024);

if(fileLengthInMB >= 50 ){
reply("*❌ Document files larger than 50 MB cannot be send.*")
}else{
	
let mmt = m.quoted.documentMessage.mimetype 	
let fname = m.quoted.documentMessage.fileName
let audio = await m.quoted.download() 
 conn.sendMessage(jid, { document: audio, mimetype: mmt, fileName: fname });
 let ss = '`'
reply(`*This ${ss}${m.quoted.type}${ss} has been successfully sent to the jid address ${ss}${q}${ss}.*  ✅`)
m.react("✔️") 
}
 }else if(m.quoted.type === "documentWithCaptionMessage"){
let fileLengthInBytes = m.quoted.documentWithCaptionMessage.message.documentMessage.fileLength
const fileLengthInMB = fileLengthInBytes / (1024 * 1024);
if(fileLengthInMB >= 50 ){
reply("*❌ Document files larger than 50 MB cannot be send.*")
}else{
let audio = await m.quoted.download()
let Dmmt =m.quoted.documentWithCaptionMessage.message.documentMessage.mimetype

let Dfname = m.quoted.documentWithCaptionMessage.message.documentMessage.fileName

  const jid = q || from
let cp = m.quoted.documentWithCaptionMessage.message.documentMessage.caption

 conn.sendMessage(jid, { document: audio, mimetype: Dmmt,caption: cp, fileName: Dfname });
let ss = '`'
reply(`*This ${ss}${m.quoted.type}${ss} has been successfully sent to the jid address ${ss}${q}${ss}.*  ✅`)
m.react("✔️")

}

}
			
}else if(m.quoted && m.quoted.type === "audioMessage"){	
let fileLengthInBytes = m.quoted.audioMessage.fileLength
const fileLengthInMB = fileLengthInBytes / (1024 * 1024);
if(fileLengthInMB >= 50 ){
reply("*❌ Audio files larger than 50 MB cannot be send.*")
}else{
let audio = await m.quoted.download()
const jid = q || from
if(m.quoted.audioMessage.ptt === true){
 
 conn.sendMessage(jid, { audio: audio, mimetype: 'audio/mpeg', ptt: true, fileName: `${m.id}.mp3` });
 let ss = '`'
reply(`*This ${ss}${m.quoted.type}${ss} has been successfully sent to the jid address ${ss}${q}${ss}.*  ✅`)
m.react("✔️") 
 
 }else{
  const jid = q || from
 conn.sendMessage(jid, { audio: audio, mimetype: 'audio/mpeg', fileName: `${m.id}.mp3` });
let ss = '`'
reply(`*This ${ss}${m.quoted.type}${ss} has been successfully sent to the jid address ${ss}${q}${ss}.*  ✅`)
m.react("✔️")
}

}	
}else if(m.quoted && m.quoted.type === "viewOnceMessageV2Extension"){		
let met = m
const jet = {
    key: {
        remoteJid: mek.key.remoteJid,
        fromMe: false,
        id: met.key.id,
    },
    messageTimestamp: met.messageTimestamp,
    pushName: met.pushName,
    broadcast: met.broadcast,
    status: 2,
    message: {
        audioMessage: {
            url: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.url,
            mimetype: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.mimetype,
            fileSha256: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.fileSha256,
            fileLength: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.fleLength,
            seconds: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.seconds,
	    ptt: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.ptt,
            mediaKey: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.mediaKey,
            fileEncSha256: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.fileEncSha256,
            directPath: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.directPath, 
            mediaKeyTimestamp: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.mediaKeyTimestamp, 
	    waveform: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.waveform,
        },
    },
    id: met.id,
    chat: met.chat,
    fromMe: met.fromMe,
    isGroup: met.isGroup,
    sender: met.sender,
    type: 'audioMessage',
    msg: {
        url: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.url,
            mimetype: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.mimetype,
            fileSha256: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.fileSha256,
            fileLength: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.fleLength,
            seconds: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.seconds,
	    ptt: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.ptt,
            mediaKey: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.mediaKey,
            fileEncSha256: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.fileEncSha256,
            directPath: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.directPath, 
            mediaKeyTimestamp: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.mediaKeyTimestamp, 
	    waveform: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2Extension.message.audioMessage.waveform,
    },
    
};

const mlvv = sms(conn, jet);
var nameJpg = getRandom('');
let buff = await mlvv.download(nameJpg);
let fileType = require('file-type');
let type = fileType.fromBuffer(buff);
await fs.promises.writeFile("./" + type.ext, buff);
await sleep(1000)
let caps = jet.message.audioMessage.caption || "⦁ ᴘʀᴀʙᴀᴛʜ-ᴍᴅ ⦁"


const jid = q || from
  conn.sendMessage(jid, { audio:  { url: "./" + type.ext }, mimetype: 'audio/mpeg', ptt: true, viewOnce:true, fileName: `${m.id}.mp3` });
  
let ss = '`'
reply(`*This ${ss}${m.quoted.type}${ss} has been successfully sent to the jid address ${ss}${q}${ss}.*  ✅`)
m.react("✔️")

}else if(m.quoted && m.quoted.viewOnceMessageV2 && m.quoted.viewOnceMessageV2.message.videoMessage){
let met = m

const jet = {
            key: {
              remoteJid: mek.key.remoteJid,
              fromMe: false,
              id: met.key.id,
            },
            messageTimestamp: met.messageTimestamp,
            pushName: met.pushName,
            broadcast: met.broadcast,
            status: 2,
            message: {
              videoMessage: {
                url: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.url,
                mimetype: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.mimetype,
                caption: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.caption,
                fileSha256: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.fileSha256,
                fileLength: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.fleLength,
                seconds: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.seconds,
                mediaKey: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.mediaKey,
                height: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.height,
                width: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.width,
                fileEncSha256: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.fileEncSha256,
                directPath: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.directPath,
                mediaKeyTimestamp: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.mediaKeyTimestamp,
                jpegThumbnail: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.jpegThumbnail,
              },
            },
            id: met.id,
            chat: met.chat,
            fromMe: met.fromMe,
            isGroup: met.isGroup,
            sender: met.sender,
            type: 'videoMessage',
            msg: {
              url: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.url,
                mimetype: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.mimetype,
                caption: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.caption,
                fileSha256: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.fileSha256,
                fileLength: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.fleLength,
                seconds: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.seconds,
                mediaKey: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.mediaKey,
                height: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.height,
                width: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.width,
                fileEncSha256: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.fileEncSha256,
                directPath: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.directPath,
                mediaKeyTimestamp: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.mediaKeyTimestamp,
                jpegThumbnail: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.jpegThumbnail,
            },
            body: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage.caption,
          };

        const mlvv = sms(conn, jet);
        var nameJpg = getRandom('');
        let buff = await mlvv.download(nameJpg);
        let fileType = require('file-type');
        let type = fileType.fromBuffer(buff);
        await fs.promises.writeFile("./" + type.ext, buff);
	await sleep(1000)
	let caps = jet.message.videoMessage.caption || "⦁ ᴘʀᴀʙᴀᴛʜ-ᴍᴅ ⦁"
         
	const jid = q || from
  conn.sendMessage(jid, { video: { url: "./" + type.ext }, caption: caps, viewOnce:true });	
  let ss = '`'
reply(`*This ${ss}${m.quoted.type}${ss} has been successfully sent to the jid address ${ss}${q}${ss}.*  ✅`)
m.react("✔️")
}else if(m.quoted && m.quoted.viewOnceMessageV2 && m.quoted.viewOnceMessageV2.message.imageMessage){
let met = m
const jet = {
    key: {
        remoteJid: mek.key.remoteJid,
        fromMe: false,
        id: met.key.id,
    },
    messageTimestamp: met.messageTimestamp,
    pushName: met.pushName,
    broadcast: met.broadcast,
    status: 2,
    message: {
        imageMessage: {
            url: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.url,
            mimetype: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.mimetype,
            caption: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.caption,
            fileSha256: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.fileSha256,
            fileLength: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.fleLength,
            height: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.height,
            width: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.width,
            mediaKey: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.mediaKey,
            fileEncSha256: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.fileEncSha256,
            directPath: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.directPath,
            mediaKeyTimestamp: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.mediaKeyTimestamp,
            jpegThumbnail: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.jpegThumbnail,
        },
    },
    id: met.id,
    chat: met.chat,
    fromMe: met.fromMe,
    isGroup: met.isGroup,
    sender: met.sender,
    type: 'imageMessage',
    msg: {
        url: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.url,
        mimetype: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.mimetype,
        caption: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.caption,
        fileSha256: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.fileSha256,
        fileLength: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.fleLength,
        height: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.height,
        width: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.width,
        mediaKey: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.mediaKey,
        fileEncSha256: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.fileEncSha256,
        directPath: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.directPath,
        mediaKeyTimestamp: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.mediaKeyTimestamp,
        jpegThumbnail: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.jpegThumbnail,
    },
    body: mek.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.imageMessage.caption,
};

const mlvv = sms(conn, jet);
var nameJpg = getRandom('');
let buff = await mlvv.download(nameJpg);
let fileType = require('file-type');
let type = fileType.fromBuffer(buff);
await fs.promises.writeFile("./" + type.ext, buff);
await sleep(1000)
let caps = jet.message.imageMessage.caption || "⦁ ᴘʀᴀʙᴀᴛʜ-ᴍᴅ ⦁"
 const jid = q || from

  conn.sendMessage(jid, { image: { url: "./" + type.ext }, caption: caps,viewOnce:true });
 let ss = '`'
reply(`*This ${ss}${m.quoted.type}${ss} has been successfully sent to the jid address ${ss}${q}${ss}.*  ✅`)
m.react("✔️") 
}else if(q || m.quoted && m.quoted.type === "conversation"){

const jid = q || from
conn.sendMessage(jid,{text: m.quoted.msg})
let ss = '`'
reply(`*This ${ss}${m.quoted.type}${ss} has been successfully sent to the jid address ${ss}${q}${ss}.*  ✅`)
m.react("✔️")
}else{
const mass= await conn.sendMessage(from, { text: `❌ *Please Give me message!*\n\n${envData.PREFIX}send <Jid>`}, { quoted: mek });
return await conn.sendMessage(from, { react: { text: '❓', key: mass.key } });
    
}

 } catch(e) {
console.log(e);
return reply('error!!')
 }
});
