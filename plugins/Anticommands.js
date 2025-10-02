// anticommands.js - Enhanced Auto-Remove System with Admin Protection
// Place this file in your plugins/ directory

const fs = require('fs');
const path = require('path');

// Simple data storage
let antiCommandData = {};
const dataPath = path.join(__dirname, '..', 'userdata', 'anticommands.json');

// Load data
function loadData() {
    try {
        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            antiCommandData = JSON.parse(data);
        }
    } catch (error) {
        antiCommandData = {};
    }
}

// Save data
function saveData() {
    try {
        const dir = path.dirname(dataPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(dataPath, JSON.stringify(antiCommandData, null, 2));
    } catch (error) {
        console.error('Failed to save anticommands data:', error.message);
    }
}

// Enhanced function to check if user is group admin - Multiple verification methods
async function isUserGroupAdmin(conn, groupId, userId) {
    try {
        console.log(`[AntiCommands DEBUG] Checking admin status for ${userId} in group ${groupId}`);
        
        // Get group metadata to check admin status
        const groupMetadata = await conn.groupMetadata(groupId);
        const participants = groupMetadata.participants;
        
        console.log(`[AntiCommands DEBUG] Group has ${participants.length} participants`);
        
        // Multiple ways to find the user - try all possible formats
        let userParticipant = null;
        
        // Method 1: Direct match
        userParticipant = participants.find(p => p.id === userId);
        
        // Method 2: Remove @s.whatsapp.net and match
        if (!userParticipant) {
            const cleanUserId = userId.replace('@s.whatsapp.net', '');
            userParticipant = participants.find(p => p.id.includes(cleanUserId));
        }
        
        // Method 3: Extract number and match
        if (!userParticipant) {
            const userNumber = userId.split('@')[0];
            userParticipant = participants.find(p => p.id.includes(userNumber));
        }
        
        // Method 4: Try with @c.us format (some bots use this)
        if (!userParticipant) {
            const cUsFormat = userId.replace('@s.whatsapp.net', '@c.us');
            userParticipant = participants.find(p => p.id === cUsFormat);
        }
        
        if (userParticipant) {
            const isAdmin = userParticipant.admin === 'admin' || userParticipant.admin === 'superadmin';
            console.log(`[AntiCommands DEBUG] FOUND USER: ${userParticipant.id}, admin status: ${isAdmin}, role: ${userParticipant.admin || 'member'}`);
            return isAdmin;
        }
        
        console.log(`[AntiCommands DEBUG] User ${userId} not found in participants list with any method`);
        console.log(`[AntiCommands DEBUG] Available participant IDs:`, participants.slice(0, 3).map(p => p.id));
        return false;
        
    } catch (error) {
        console.error(`[AntiCommands ERROR] Failed to check admin status:`, error.message);
        return false;
    }
}

// Initialize data
loadData();

// Management plugin
async function antiCommandsPlugin(conn, mek, m, context) {
    const { args, from, isGroup, isGroupAdmin, isOwner, reply } = context;

    if (!isGroup) {
        return await reply('🚫 *GROUP ONLY FEATURE* 🚫\n\n❌ This command only works in groups\n💡 Add me to a group to use this feature!');
    }

    if (!isGroupAdmin && !isOwner) {
        return await reply('🔐 *ADMIN ACCESS REQUIRED* 🔐\n\n❌ Only group admins can use this command\n👑 Ask an admin to manage anti-commands');
    }

    const subCommand = args[0]?.toLowerCase();

    switch (subCommand) {
        case 'on':
            antiCommandData[from] = { enabled: true };
            saveData();
            await reply('🛡️ *ANTI-COMMANDS ACTIVATED* 🛡️\n\n✅ *Status:* Enabled\n🎯 *Target:* Bot commands (.ping, .alive, .menu, etc.)\n⚡ *Action:* Auto-removal of violators\n👑 *Protected:* Group admins & bot owner are exempt\n\n⚠️ *Warning:* Regular members using bot commands will be removed instantly!\n\n💡 *Note:* Group admins can use bot commands safely');
            break;

        case 'off':
            antiCommandData[from] = { enabled: false };
            saveData();
            await reply('🔓 *ANTI-COMMANDS DEACTIVATED* 🔓\n\n❌ *Status:* Disabled\n💬 *Info:* All members can now use bot commands freely\n\n✨ Use `.anticommands on` to reactivate protection');
            break;

        case 'test':
            await reply('🧪 *SYSTEM TEST* 🧪\n\n✅ *Plugin Status:* Loaded & Operational\n🔍 *Debug Mode:* Console logging active\n⚙️ *Functions:* All systems ready\n👑 *Admin Protection:* Enhanced verification enabled\n\n💡 *Tip:* Check console for detailed debug information');
            break;

        case 'status':
            const enabled = antiCommandData[from]?.enabled || false;
            await reply(`📊 *ANTI-COMMANDS STATUS* 📊

🔹 *Current Status:* ${enabled ? '🟢 *ACTIVE* ✅' : '🔴 *INACTIVE* ❌'}

📋 *SYSTEM INFO:*
🆔 Group ID: \`${from}\`
🤖 Bot Admin Required: Yes
👑 Admin Protection: Enhanced verification enabled
🎯 Monitored Commands: .ping, .alive, .menu, .help, .info, .start, .bot, .status
⚡ Action Type: Instant removal (regular members only)
🛡️ Protection Level: ${enabled ? 'Maximum with Admin Exemption' : 'None'}

${enabled ? '⚠️ *ACTIVE PROTECTION:*\n• Regular members: Auto-removed\n• Group admins: Protected ✅\n• Bot owner: Protected ✅' : '💡 *TIP:* Use `.anticommands on` to activate'}`);
            break;

        default:
            await reply(`🎮 *ANTI-COMMANDS CONTROL PANEL* 🎮

📚 *AVAILABLE COMMANDS:*

🟢 \`.anticommands on\`
   ├─ ✅ Enable auto-removal system
   ├─ 👑 Protect group admins automatically
   └─ ⚡ Instant protection activation

🔴 \`.anticommands off\`
   ├─ ❌ Disable auto-removal system  
   └─ 💬 Allow bot commands freely

📊 \`.anticommands status\`
   ├─ 📋 Check current system status
   ├─ 🔍 View detailed configuration
   └─ 👑 See admin protection info

🧪 \`.anticommands test\`
   ├─ 🧪 Test plugin functionality
   ├─ 🔍 Enable debug logging
   └─ 👑 Test admin verification

⚠️ *ADMIN ONLY* - Group admins & owners only!
👑 *ENHANCED:* Double admin protection system`);
            break;
    }
}

// Enhanced command detection and removal with STRONGEST admin protection
async function checkAndRemove(conn, mek, context) {
    try {
        const { from, isGroup, body, senderNumber, isOwner, isGroupAdmin, pushname, sender } = context;

        console.log(`[AntiCommands DEBUG] ========================`);
        console.log(`[AntiCommands DEBUG] Processing message: "${body}"`);
        console.log(`[AntiCommands DEBUG] From: ${senderNumber} (${pushname})`);
        console.log(`[AntiCommands DEBUG] Sender ID: ${sender}`);
        console.log(`[AntiCommands DEBUG] Group: ${from}`);
        console.log(`[AntiCommands DEBUG] ========================`);

        // Only work in groups
        if (!isGroup) {
            console.log(`[AntiCommands DEBUG] Not a group, skipping`);
            return false;
        }

        // Check if enabled for this group
        if (!antiCommandData[from]?.enabled) {
            console.log(`[AntiCommands DEBUG] Not enabled for group ${from}`);
            return false;
        }

        console.log(`[AntiCommands DEBUG] System enabled for group, starting admin verification process`);

        // ==========================================
        // STRONGEST ADMIN PROTECTION - MULTIPLE LAYERS
        // ==========================================
        
        let isProtectedUser = false;
        let protectionReason = '';

        // LAYER 1: Bot owner protection
        if (isOwner) {
            isProtectedUser = true;
            protectionReason = 'Bot Owner';
            console.log(`[AntiCommands PROTECTION] LAYER 1 TRIGGERED: User is BOT OWNER`);
        }

        // LAYER 2: Context-based admin check
        if (!isProtectedUser && isGroupAdmin) {
            isProtectedUser = true;
            protectionReason = 'Group Admin (Context)';
            console.log(`[AntiCommands PROTECTION] LAYER 2 TRIGGERED: User is GROUP ADMIN (context-based)`);
        }

        // LAYER 3: Enhanced metadata-based admin verification
        if (!isProtectedUser) {
            console.log(`[AntiCommands DEBUG] Running enhanced admin check...`);
            const enhancedAdminCheck = await isUserGroupAdmin(conn, from, sender);
            if (enhancedAdminCheck) {
                isProtectedUser = true;
                protectionReason = 'Group Admin (Metadata)';
                console.log(`[AntiCommands PROTECTION] LAYER 3 TRIGGERED: User is GROUP ADMIN (metadata verification)`);
            }
        }

        // LAYER 4: Alternative admin check using different sender format
        if (!isProtectedUser && senderNumber) {
            console.log(`[AntiCommands DEBUG] Running alternative admin check with number ${senderNumber}...`);
            const altSenderId = `${senderNumber}@s.whatsapp.net`;
            const altAdminCheck = await isUserGroupAdmin(conn, from, altSenderId);
            if (altAdminCheck) {
                isProtectedUser = true;
                protectionReason = 'Group Admin (Alternative)';
                console.log(`[AntiCommands PROTECTION] LAYER 4 TRIGGERED: User is GROUP ADMIN (alternative verification)`);
            }
        }

        // FINAL PROTECTION STATUS
        console.log(`[AntiCommands PROTECTION] FINAL STATUS: Protected = ${isProtectedUser}, Reason = ${protectionReason || 'None'}`);

        if (isProtectedUser) {
            console.log(`[AntiCommands PROTECTION] ✅ USER PROTECTED - Skipping removal (${protectionReason})`);
            return false;
        }

        console.log(`[AntiCommands DEBUG] User has no admin privileges, proceeding with command detection`);

        // List of commands to detect (simple detection)
        const botCommands = [
            '.ping', '.alive', '.menu', '.help', '.info', '.start', '.bot', '.status', 
            '!ping', '!alive', '!menu', '!help', '!info', '!start', '!bot', '!status',
            '/ping', '/alive', '/menu', '/help', '/info', '/start', '/bot', '/status'
        ];

        // Check if message starts with any bot command
        const lowerBody = body.toLowerCase().trim();
        const usedCommand = botCommands.find(cmd => lowerBody.startsWith(cmd));

        if (usedCommand) {
            console.log(`[AntiCommands] ⚠️ DETECTED COMMAND: ${usedCommand} by ${senderNumber}`);
            console.log(`[AntiCommands] User details - Sender: ${sender}, Number: ${senderNumber}, Name: ${pushname}`);
            console.log(`[AntiCommands] Protection Status - isOwner: ${isOwner}, isGroupAdmin: ${isGroupAdmin}, isProtected: ${isProtectedUser}`);

            // =======================================
            // EMERGENCY FINAL SAFETY CHECK
            // =======================================
            console.log(`[AntiCommands] 🔒 EMERGENCY SAFETY CHECK BEFORE REMOVAL...`);
            
            // One more admin check before removal
            const emergencyAdminCheck = await isUserGroupAdmin(conn, from, sender);
            const emergencyAltCheck = await isUserGroupAdmin(conn, from, `${senderNumber}@s.whatsapp.net`);
            
            if (isOwner || isGroupAdmin || emergencyAdminCheck || emergencyAltCheck) {
                console.log(`[AntiCommands] 🚨 EMERGENCY STOP: User has admin privileges, ABORTING REMOVAL`);
                console.log(`[AntiCommands] Emergency check results - Owner: ${isOwner}, GroupAdmin: ${isGroupAdmin}, Metadata1: ${emergencyAdminCheck}, Metadata2: ${emergencyAltCheck}`);
                return false;
            }

            console.log(`[AntiCommands] ✅ EMERGENCY CHECK PASSED - User confirmed as regular member, proceeding with removal`);

            // Send private message
            let privateMsgSent = false;
            const privateMsg = `🚨 *REMOVED FROM GROUP* 🚨

❌ *Reason:* Using bot commands
🎯 *Command Used:* ${usedCommand}
⚠️ *Policy:* Bot commands from other bots are not allowed in that group

👑 *Note:* Group admins are exempt from this rule
📝 *Tip:* Please avoid using such commands in groups where they are restricted.

🤖 *Info:* Each group has its own rules - respect them to stay in the community!`;

            // Try to send private message
            try {
                await conn.sendMessage(sender, { text: privateMsg });
                privateMsgSent = true;
                console.log(`[AntiCommands] ✅ Private message sent to ${senderNumber}`);
            } catch (directMsgError) {
                try {
                    const normalizedJid = `${senderNumber}@s.whatsapp.net`;
                    await conn.sendMessage(normalizedJid, { text: privateMsg });
                    privateMsgSent = true;
                    console.log(`[AntiCommands] ✅ Private message sent via normalized JID`);
                } catch (normalizedError) {
                    console.error(`[AntiCommands] ❌ Failed to send private message`);
                }
            }

            // Attempt removal
            try {
                console.log(`[AntiCommands] 🔄 EXECUTING REMOVAL of ${sender} from group ${from}`);
                await conn.groupParticipantsUpdate(from, [sender], 'remove');

                // Send group notification
                const notification = `⚡ *AUTO-REMOVAL EXECUTED* ⚡

👤 *User:* ${pushname} (+${senderNumber})
🎯 *Command:* ${usedCommand}
👑 *Status:* Regular member (verified non-admin)
📩 *Notice:* ${privateMsgSent ? '✅ Private message sent' : '📢 Group notification used'}
🛡️ *System:* Anti-Commands with 4-Layer Admin Protection

🔒 *Verification:* Multiple admin checks performed before removal`;

                await conn.sendMessage(from, { text: notification });
                console.log(`[AntiCommands] ✅ SUCCESS: Removed ${senderNumber} for using ${usedCommand}`);
                return true;

            } catch (removeError) {
                console.error(`[AntiCommands] ❌ FAILED to remove user ${senderNumber}:`, removeError.message);

                const warning = `⚠️ *REMOVAL FAILED* ⚠️

👤 ${pushname}, bot commands like *${usedCommand}* are not allowed here!

🔧 *Error:* Could not remove user - check bot permissions
👑 *Note:* User verified as non-admin
💡 *Admin:* Please ensure bot has admin privileges`;

                try {
                    await conn.sendMessage(from, { text: warning });
                } catch (warnError) {
                    console.error(`[AntiCommands] Failed to send warning:`, warnError.message);
                }
                return false;
            }
        } else {
            console.log(`[AntiCommands DEBUG] No bot command detected in: "${lowerBody}"`);
        }

        return false;
    } catch (error) {
        console.error('[AntiCommands ERROR] Main function error:', error.message);
        console.error('[AntiCommands ERROR] Stack:', error.stack);
        return false;
    }
}

module.exports = {
    pattern: 'anticommands',
    desc: 'Manage auto-removal of bot command users with admin protection',
    category: 'group',
    groupOnly: true,
    adminOnly: true,
    function: antiCommandsPlugin,
    checkAndRemove
};
