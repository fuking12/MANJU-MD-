const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: process.env.SESSION_ID || "kBBDBQSS#3H78bTFt1tc5piXCMPMQmoE7-itur8SQ63PVCo-cWl8",
MONGODB: process.env.MONGODB || "mongodb+srv://homodik802:G9le4VN9JGn5hcxQ@cluster0.auaczzj.mongodb.net/",
};
