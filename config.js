
    const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: process.env.SESSION_ID || "qJdQyBwZ#4oyAI6wLqH0odkvFsXDZzetdAAgo_rKUpwybWkLut1w",
MONGODB: process.env.MONGODB || "mongodb+srv://homodik802:G9le4VN9JGn5hcxQ@cluster0.auaczzj.mongodb.net/",
};
