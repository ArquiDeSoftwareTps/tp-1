
require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.APP_PORT || 3001;

const axios = require('axios');

const { XMLParser } = require('fast-xml-parser');
const { decode } = require('metar-decoder');

const {createClient} = require('redis');

const parser = new XMLParser();

// Instead of require('nanoid')
import('nanoid').then(({ nanoid }) => {
    // Generate a random ID with a default length of 21 characters
    const id = nanoid();
  
    console.log('Generated ID:', id);

    app.use((req, res, next) => {
        res.setHeader('X-API-Id',id);
        next();
    });
  });
  
const cacheEnabled = process.env.ENABLE_CACHE === 'true';
const rateLimitEnabled = process.env.ENABLE_RATE_LIMIT === 'true';

const redisUrl = 'redis://redis-cache:6379';
const redisClient = createClient({url: redisUrl});


(async () => {
    if (cacheEnabled)
    {
        console.log(`connecting to Redis using: ${redisUrl}`);
        await redisClient.connect();
    }
    else 
    {
        console.log(`skipping connection to Redis`);
    }
})();

process.on('SIGTERM', async () => {
    if (cacheEnabled)
    {
        console.log(`shutting down connection to Redis from: ${redisUrl}`);
        await redisClient.quit();
    }
    else
    {
        console.log(`shutting down...`);
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
    console.log(`Caching is enabled: ${cacheEnabled}`);
    console.log(`Rate Limit is enabled: ${cacheEnabled}`);
    
});

app.get('/ping', async (req, res) => {
        res.send("pong");
        return;
    } );

app.get('/busy', async (req, res) => {
    // Busy wait to generate load
    for (let start = new Date(); new Date() - start < 1000;);
    
    res.status(200).send("busy");
    return;
} );


app.get('/metar', async (req, res) => {
    const station = req.query.station;
    if (!station) {
        res.status(400).send("Station parameter is required");
        return;
    }
    
    const response = await axios.get(`https://www.aviationweather.gov/adds/dataserver_current/httpparam?dataSource=metars&requestType=retrieve&format=xml&stationString=${station}&hoursBeforeNow=2`);
    if (!response){
        res.status(404).send("There has been a problem with an external API");
        return;
    }
    try {
        const parsed = parser.parse(response.data);
        const decoded = decode(parsed.response.data.METAR.raw_text);
        res.send(decoded);
    } catch (e) {
        console.log(response.data);
        res.status(404).send("There has been a problem parsing the API response");
        return;
    }
});


app.get('/spaceflight_news', async (req, res) => {
    const newsCount = req.query.n || 5;

    try {
        const response = await axios.get(`https://api.spaceflightnewsapi.net/v3/articles?_limit=${newsCount}`);
        const titles = response.data.map((item) => item.title);
        res.send(titles);
    } catch (e) {
        console.log(e);
        res.status(404).send("There has been a problem with the API");
        return;
    }
});

app.get('/quote', async (req, res) => {
    try {
        const response = await axios.get('https://api.quotable.io/quotes/random');
        const quote = response.data.map((item) => { return { quote: item.content, author: item.author } });
        res.send(quote);
    } catch (e) {
        console.log(e);
        res.status(404).send("There has been a problem with the API");
        return;
    }
});
