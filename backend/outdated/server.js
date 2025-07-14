import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors";
import logger from "./logger.js";
import { getAttractionOptions, insertAttraction } from "./services/attractionService.js"
import logObj from "./loggerHelper.js";
import dbClient from "./db/mongoClient.js";

dotenv.config(); // Load .env -> process.env

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

let dbIsDown;

const stringToBooleanMapper = new Map([["true", true], ["false", false]]);

// app.use(cors());

// OR: more strict — allow only your frontend
logger.info(`Accepting CORS from ${FRONTEND_ORIGIN}`);
app.use(cors({ origin: FRONTEND_ORIGIN }));

app.get("/api/geocode", async (req, res) => {
  let readFromCache, writeToCache;
  const startTime = Date.now();  
  const { place, readFromCache: readParam, writeToCache: writeParam } = req.query;
  // We have added query parameters for reading from cache and writing to cache
  // By defauly the behavior is to have these set to true, both when running the backend
  // And also these to come as true from the frontend side with the request.
  // There is one scenario where these should stay as false, when the connection to the database
  // failed then caching should be set to false and stay that way
  if (dbIsDown) {
    readFromCache = false;
    writeToCache = false;
  } else {
    readFromCache = readParam !== undefined ? stringToBooleanMapper.get(readParam) : true;
    writeToCache = writeParam !== undefined ? stringToBooleanMapper.get(writeParam) : true;
  }

  if (!place) {
    logger.error("Missing 'place' query parameter", logObj(400, req, startTime));
    return res.status(400).json({ error: "Missing 'place' query parameter" });
  }
  
  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) {
    logger.error("The API Key for LocationIQ is not available", logObj(403, req, startTime));
    return res.status(403).json({ error: "Missing authorization - no API Key for LocationIQ" });
  }

  try {
    const cachedAttraction = readFromCache ? await getAttractionOptions(place) : null;
    // We check whether there is an entry in the database, and if it has the latest structure
    // Initially we used to cache only one attraction and not all the options provided by LocationIQ
    if (cachedAttraction && cachedAttraction.options) {
      logger.info("Response for the API request found in the cache", logObj(200, req, startTime));
      res.set("X-Cache", "HIT");
      return res.status(200).json(cachedAttraction)
    } else {
      const response = await axios.get(
      `https://us1.locationiq.com/v1/search.php`,
      {
        params: {
          key: apiKey,
          q: place,
          format: "json"
        }
      }
    );
      const attractionOptionsToBeAdded = { attraction_search_name: place, options: response.data };
      // If there is a cached attraction but it was not in the proper format in the database we update it
      // We have also added the writeToCache boolean here to be able to better test different scenarios
      // I don't think this conditional branch makes much sense to be here for now 
      // if (cachedAttraction && writeToCache) {
      //   const updatedAttraction = await replaceAttraction(place, attractionOptionsToBeAdded);
      //   logger.info(`Attraction with id ${updatedAttraction._id.toString()} has been updated in the attractions collection from the LocationIQ API`, logObj(response.status, req, startTime));
      //   res.set("X-Cache", "UPDATE");
      // } else 
      if (writeToCache === true) {
        const insertedAttraction = await insertAttraction(attractionOptionsToBeAdded);
        logger.info(`Attraction with id ${insertedAttraction.insertedId.toString()} has been added to the attractions collection from the LocationIQ API`, logObj(response.status, req, startTime));
      } else {
        logger.info("Attraction information has not been cached to the database", logObj(response.status, req, startTime));
      }
      res.set("X-Cache", "MISS");
      return res.status(200).json(response.data);
    }
  } catch (err) {
    logger.error("Failed to geocode", logObj(null, req, startTime, err));
    res.status(500).json({ error: "Failed to geocode" });
  }
});

async function startServer() {
  try {
    await dbClient.connect();
    logger.info("Connection to MongoDB provided");
  } catch (mongoError) {
    logger.error("Connection to MongoDB failed, only uncached requests will work");
    dbIsDown = true;
  }
  
  app.listen(PORT, () => {
    logger.info(`Geocoding server running on http://localhost:${PORT}`);
  });
}

startServer();

