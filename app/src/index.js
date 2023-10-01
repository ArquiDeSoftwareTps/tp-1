
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

const getFromCacheOrApi = async (cacheKey, apiRequestFunction, res, cacheTime) => {
    if (cacheEnabled) {
        // Verify if the data is in the cache
        redisClient.get(cacheKey, async (err, cachedData) => {
            if (err) {
                console.error(err);
                res.status(500).send("Error checking cache");
                return;
            }

            if (cachedData) {
                // If the data is in the cache, return it
                res.send(JSON.parse(cachedData));
            } else {
                // If the data is not in the cache, make the request to the API
                try {
                    const response = await apiRequestFunction();

                    // Store the data in the cache
                    redisClient.setex(cacheKey, cacheTime, JSON.stringify(response));

                    res.send(response);
                } catch (e) {
                    console.log(e);
                    res.status(404).send("There has been a problem with the API");
                }
            }
        });
    } else {
        // If the cache is disabled, make the request to the API
        try {
            const response = await apiRequestFunction();
            res.send(response);
        } catch (e) {
            console.log(e);
            res.status(404).send("There has been a problem with the API");
        }
    }
};


app.get('/ping', async (req, res) => {
        res.send("pong");
    } );


app.get('/metar', async (req, res) => {
    const station = req.query.station;
    if (!station) {
        res.status(400).send("Station parameter is required");
        return;
    }

    const cacheKey = `metar:${station}`;

    const apiRequestFunction = async () => {
        const response = await axios.get(`https://www.aviationweather.gov/adds/dataserver_current/httpparam?dataSource=metars&requestType=retrieve&format=xml&stationString=${station}&hoursBeforeNow=1`);
        if (!response) {
            res.status(404).send("There has been a problem with an external API");
            return;
        }

        const parsed = parser.parse(response.data);
        return decode(parsed.response.data.METAR.raw_text);
    };

    await getFromCacheOrApi(cacheKey, apiRequestFunction, res, 3600);
});



app.get('/spaceflight_news', async (req, res) => {
    const newsCount = req.query.n || 5;

    const cacheKey = `spaceflight_news:${newsCount}`;

    const apiRequestFunction = async () => {
        const response = await axios.get(`https://api.spaceflightnewsapi.net/v3/articles?_limit=${newsCount}`);
        return response.data.map((item) => item.title);
    };

    await getFromCacheOrApi(cacheKey, apiRequestFunction, res, 3600);
});


app.get('/quote', async (req, res) => {
    const cacheKey = 'random_quote';

    const apiRequestFunction = async () => {
        const response = await axios.get('https://api.quotable.io/quotes/random');
        return response.data.map((item) => {
            return {quote: item.content, author: item.author};
        });
    };

    await getFromCacheOrApi(cacheKey, apiRequestFunction, res, 3600);
});

