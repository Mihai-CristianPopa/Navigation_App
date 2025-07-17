import axios from "axios";
import logger from "../logger.js";
import { getAttractionOptions, insertAttraction } from "../services/attractionService.js";
import { getDailyApiRequestCount, trackApiRequest } from "../services/apiTrackingService.js";
import logObj from "../loggerHelper.js";
import { config } from "../configs/config.js";

export const geocodeController = async (req, res) => {
  let readFromCache, writeToCache;
  const startTime = Date.now();  
  const { place, readFromCache: readParam, writeToCache: writeParam } = req.query;
  
  // Parse cache parameters
  if (req.app.locals.dbIsDown) {
    readFromCache = false;
    writeToCache = false;
  } else {
    const stringToBooleanMapper = new Map([["true", true], ["false", false]]);
    readFromCache = readParam !== undefined ? stringToBooleanMapper.get(readParam) : true;
    writeToCache = writeParam !== undefined ? stringToBooleanMapper.get(writeParam) : true;
  }

  if (!place) {
    logger.error("Missing 'place' query parameter", logObj(400, req, startTime));
    return res.status(400).json({ error: "Missing 'place' query parameter" });
  }
  
  const apiKey = config.locationIQApiKey;
  if (!apiKey) {
    logger.error("The API Key for LocationIQ is not available", logObj(403, req, startTime));
    return res.status(403).json({ error: "Missing authorization - no API Key for LocationIQ" });
  }

  try {
    const cachedAttraction = readFromCache ? await getAttractionOptions(place) : null;
    
    if (cachedAttraction) {
      logger.info("Response for the API request found in the cache", logObj(200, req, startTime));
      res.set("X-Cache", "HIT");
      return res.status(200).json(cachedAttraction);
    } else {
      const todayLocationIqRequests = await getDailyApiRequestCount("LocationIQ");
      logger.info(`Today there have been ${todayLocationIqRequests} LocationIQ request(s) made`);
      if (todayLocationIqRequests > 5000) {
        logger.error("Daily API limit reached", logObj(429, req, startTime));
        return res.status(429).json({ error: "Daily API limit reached" })
      }

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

      if (!req.app.locals.dbIsDown) {
        trackApiRequest("LocationIQ", "geocode", req.query, true);
      }

      const attractionOptionsToBeAdded = {
        attraction_search_name: place,
        options: response.data,
        created_at: new Date(),
        date: new Date().toISOString().split('T')[0]
      };
      
      if (writeToCache === true) {
        const insertedAttraction = await insertAttraction(attractionOptionsToBeAdded);
        logger.info(`Attraction with id ${insertedAttraction.insertedId.toString()} has been added to the attractions collection from the LocationIQ API`, logObj(response.status, req, startTime));
      } else {
        logger.info("Attraction information has not been cached to the database", logObj(response.status, req, startTime));
      }
      
      res.set("X-Cache", "MISS");
      return res.status(200).json(attractionOptionsToBeAdded);
    }
  } catch (err) {
    if (!req.app.locals.dbIsDown) {
        trackApiRequest("LocationIQ", "geocode", req.query, false);
    }
    logger.error("Failed to geocode", logObj(null, req, startTime, err));
    res.status(500).json({ error: "Failed to geocode" });
  }
};