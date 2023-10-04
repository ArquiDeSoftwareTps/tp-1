
require('dotenv').config();
const express = require('express');
const lynx = require('lynx');
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
//Period to be inspected from now up to this number of hours before
const metarCheckPeriod = 3;

const redisUrl = 'redis://redis:6379';
const redisClient = createClient({url: redisUrl});


(async () => {
    if (cacheEnabled)
    {
        console.log(`connecting to Redis using: ${redisUrl}`);
        await redisClient.connect();
        console.log(`Redis connected!`);
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
    //cacheTime == 0 means to avoid caching
    if (cacheEnabled && cacheTime > 0) {
        // Verify if the data is in the cache
        console.log(`checking Redis for key: ${cacheKey}`);

        const redis_response = await redisClient.get(cacheKey);

        if (redis_response !== null)
        {
            console.log(`Cache hit for key: ${cacheKey}`);
            // If the data is in the cache, return it
            res.send(JSON.parse(redis_response));
        }
        else {
            // If the data is not in the cache, make the request to the API
            try {
                console.log(`Cache miss for key: ${cacheKey}`);
                const response = await apiRequestFunction();

                // Store the data in the cache
                redisClient.set(cacheKey, JSON.stringify(response), {EX: cacheTime});

                res.send(response);
            } catch (e) {
                console.log(e);
                res.status(500).send("There has been a problem with the API:" + e.message );
            }
            }
        
    } else {
        // If the cache is disabled, make the request to the API
        try {
            const response = await apiRequestFunction();
            res.send(response);
        } catch (e) {
            console.log(e);
            res.status(500).send("There has been a problem with the API:" + e.message);
        }
    }
};


app.get('/ping', async (req, res) => {
        res.send("pong");
    } );

app.get('/busy', async (req, res) => {
    // Busy wait to generate load
    for (let start = new Date(); new Date() - start < 1000;);
    
    res.status(200).send("busy");
    return;
} );


app.get('/metar', async (req, res) => {
    const station = req.query.station;
    var metrics = new lynx('graphite', 8125);
    const timer = metrics.createTimer('metar_api_full');


    if (!station) {
        res.status(400).send("Station parameter is required");
        return;
    }
    const cacheKey = `metar:${station}`;

    const apiRequestFunction = async () => {
        const timer2 = metrics.createTimer('metar_api_request');
        const response = await axios.get(`https://www.aviationweather.gov/adds/dataserver_current/httpparam?dataSource=metars&requestType=retrieve&format=xml&stationString=${station}&hoursBeforeNow=${metarCheckPeriod}`
        ,
        {validateStatus: () => true});

        timer2.stop();

        if (!response) {
            res.status(404).send("There has been a problem with an external API");
            return;
        }

        console.log("Metar Response code:",response.status);

        if (response.status !== 200) {
            throw new Error("Received error from External API:" + response.status)
        }

        const parsed = parser.parse(response.data);
        
        if (parsed.response && parsed.response.data && parsed.response.data && parsed.response.data.METAR) {
            aux = parsed.response.data.METAR;

            const dataCount = Array.isArray(aux)
                ? aux.length
                : 1;
            console.log("data count:",dataCount);

            // Always return the first value
            const finalNode = dataCount > 1 ? aux[0] : aux;

            return  {"status":"ok", "data": decode(finalNode.raw_text) };
        }
        else {
            console.log("No data");
            return {"status":"no_data", "data":""}
        }
    };

    // data seems to be created at most every hour, but it takes time to be avaialable on the API
    // using a wider range and caching results for 30 minutes, we can increase the chance of getting the most recent results
    // and supporting the case of data aging for some airports
    await getFromCacheOrApi(cacheKey, apiRequestFunction, res, 30);
    timer.stop();
});



app.get('/spaceflight_news', async (req, res) => {
    const newsCount = req.query.n || 5;

    var metrics = new lynx('graphite', 8125);
    const timer = metrics.createTimer('spaceflight_news_api_full');

    const cacheKey = `spaceflight_news:${newsCount}`;

    const apiRequestFunction = async () => {
        const timer2 = metrics.createTimer('spaceflight_news_api_request');
        const response = await axios.get(`https://api.spaceflightnewsapi.net/v3/articles?_limit=${newsCount}`
        ,
        {validateStatus: () => true});
        timer2.stop();

        console.log("SpaceFlight News Response code:",response.status);

        if (response.status !== 200) {
            throw new Error("Received error from External API:" + response.status)
        }

        return response.data.map((item) => item.title);
    };

    // News extractor process runs every 10 minutes, as stated in the documentation: 
    // https://github.com/TheSpaceDevs/Tutorials/blob/main/faqs/faq_SNAPI.md#how-often-is-the-data-updated
    // It's not possible to know exactly when it runs, so we take a 5 min approach to increase the chance of getting a new version
    await getFromCacheOrApi(cacheKey, apiRequestFunction, res, 30);
    timer.stop();
});


app.get('/quote', async (req, res) => {
    const cacheKey = 'random_quote';
    var metrics = new lynx('graphite', 8125);
    const timer = metrics.createTimer('quote_api_full');

    const apiRequestFunction = async () => {
        var timer2 = metrics.createTimer('quote_api_request');

        const response = await axios.get('https://api.quotable.io/quotes/random',
        {validateStatus: () => true});

        timer2.stop();

        console.log("Quotable Response code:",response.status);

        if (response.status !== 200) {
            throw new Error("Received error from External API:" + response.status)
        }
        
        return response.data.map((item) => {
            return {quote: item.content, author: item.author};
        });

        
    };

    // Random quotes are required, so cache is being disabled despite api config
    await getFromCacheOrApi(cacheKey, apiRequestFunction, res, 0);
    timer.stop();
});

