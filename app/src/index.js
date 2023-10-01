
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


app.get('/metar', async (req, res) => {
        const station = req.query.station;
        if (!station) {
            res.status(400).send("Station parameter is required");
            return;
        }

        if (cacheEnabled) {
            // Verificar si los datos están en caché
            redisClient.get(`metar:${station}`, async (err, cachedData) => {
                if (err) {
                    console.error(err);
                    res.status(500).send("Error checking cache");
                    return;
                }

                if (cachedData) {
                    // Los datos están en caché, servirlos desde la caché
                    res.send(JSON.parse(cachedData));
                } else {
                    // Los datos no están en caché, realizar la solicitud a la API externa
                    const response = await axios.get(`https://www.aviationweather.gov/adds/dataserver_current/httpparam?dataSource=metars&requestType=retrieve&format=xml&stationString=${station}&hoursBeforeNow=1`);
                    if (!response) {
                        res.status(404).send("There has been a problem with an external API");
                        return;
                    }

                    try {
                        const parsed = parser.parse(response.data);
                        const decoded = decode(parsed.response.data.METAR.raw_text);

                        // Almacenar los datos en caché durante un tiempo determinado (ajusta el tiempo según tus necesidades)
                        redisClient.setex(`metar:${station}`, 3600, JSON.stringify(decoded));

                        res.send(decoded);
                    } catch (e) {
                        console.log(response.data);
                        res.status(404).send("There has been a problem parsing the API response");
                    }
                }
            });
        } else {
            const response = await axios.get(`https://www.aviationweather.gov/adds/dataserver_current/httpparam?dataSource=metars&requestType=retrieve&format=xml&stationString=${station}&hoursBeforeNow=1`);
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
            }
        }
});


app.get('/spaceflight_news', async (req, res) => {
    const newsCount = req.query.n || 5;

    if (cacheEnabled) {
        // Verificar si los datos están en caché
        redisClient.get(`spaceflight_news:${newsCount}`, async (err, cachedData) => {
            if (err) {
                console.error(err);
                res.status(500).send("Error checking cache");
                return;
            }

            if (cachedData) {
                // Los datos están en caché, servirlos desde la caché
                res.send(JSON.parse(cachedData));
            } else {
                // Los datos no están en caché, realizar la solicitud a la API externa
                try {
                    const response = await axios.get(`https://api.spaceflightnewsapi.net/v3/articles?_limit=${newsCount}`);
                    const titles = response.data.map((item) => item.title);

                    // Almacenar los datos en caché durante un tiempo determinado (ajusta el tiempo según tus necesidades)
                    redisClient.setex(`spaceflight_news:${newsCount}`, 3600, JSON.stringify(titles));

                    res.send(titles);
                } catch (e) {
                    console.log(e);
                    res.status(404).send("There has been a problem with the API");
                }
            }
        });
    } else {
        // Si el caché está deshabilitado, realizar la solicitud a la API externa sin almacenar en caché
        // (mantén este código como está)
        try {
            const response = await axios.get(`https://api.spaceflightnewsapi.net/v3/articles?_limit=${newsCount}`);
            const titles = response.data.map((item) => item.title);
            res.send(titles);
        } catch (e) {
            console.log(e);
            res.status(404).send("There has been a problem with the API");
        }
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
