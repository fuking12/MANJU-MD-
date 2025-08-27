
    const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: process.env.SESSION_ID || "WB1F3IQI#7DJvblDwS7QCz0PpYRF4KgaqrJHrwSrC2xDmJovJ-Go",
MONGODB: process.env.MONGODB || "mongodb+srv://homodik802:G9le4VN9JGn5hcxQ@cluster0.auaczzj.mongodb.net/",
};
