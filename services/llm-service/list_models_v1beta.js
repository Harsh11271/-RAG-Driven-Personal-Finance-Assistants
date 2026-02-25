const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("API Key missing");
    process.exit(1);
}

const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

axios.get(listModelsUrl)
    .then(response => {
        console.log("--- Available Models ---");
        const models = response.data.models || [];
        models.forEach(m => console.log(m.name, `(${m.displayName})`));
        console.log("------------------------");
    })
    .catch(error => {
        console.error("Error listing models:", error.response ? error.response.data : error.message);
    });
