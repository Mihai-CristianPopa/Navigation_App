import axios from "axios";
import logger from "../logger.js";
import { getAttractionOptions, insertAttraction } from "../services/attractionService.js";
import { getDailyApiRequestCount, incrementRequestCount } from "../services/userApiRequestsService.js";
import { config } from "../configs/config.js";
import { LIMIT } from "../utils/constants.js";
import { errorObj, infoLog, warnLog } from "../loggerHelper.js";
import { ERROR_OBJECTS, EXTERNAL_APIS, INFO_MESSAGE } from "../utils/constants.js";

const METHOD_FAILURE_MESSAGE = "geocodeController failed.";

const LOCATION_IQ = EXTERNAL_APIS.LOCATION_IQ.NAME;

const GEOCODE = EXTERNAL_APIS.LOCATION_IQ.ENDPOINTS.GEOCODE.NAME;

const V1 = EXTERNAL_APIS.LOCATION_IQ.ENDPOINTS.GEOCODE.VERSION;

export const geocodeController = async (req, res) => {
  let readFromCache, writeToCache;
  const startTime = Date.now();  
  const { place, readFromCache: readParam, writeToCache: writeParam } = req.query;
  let err;
  
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
    err = ERROR_OBJECTS.BAD_REQUEST("place");
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err);
  }
  
  const apiKey = config.locationIQApiKey;
  if (!apiKey) {
    err = ERROR_OBJECTS.MISSING_API_KEY(LOCATION_IQ);
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }

  try {
    // Step -1: If the attraction is cached then read it, no need for extra requests, this will also
    // not get counted towards the limit.
    const cachedAttraction = readFromCache ? await getAttractionOptions(place) : null;
    
    if (cachedAttraction) {
      infoLog(req, startTime, INFO_MESSAGE.GEOCODE_CACHE_FOUND);
      res.set("X-Cache", "HIT");
      return res.status(200).json(cachedAttraction);
    } else {
      // Step 0: Check whether external APIs can still be made for LocationIq
      const limitReached = await limitsReachedForExternalApi(req, res, startTime);

      if (limitReached === true) return;

      // Step 1: Make the Geocoding Location Iq request
      const response = await makeLocationIqGeocodeRequest(apiKey, place, req);

      const attractionOptionsToBeAdded = {
        attraction_search_name: place,
        options: response.data,
        created_at: new Date(),
        date: new Date().toISOString().split('T')[0]
      };
      
      // Step 2: Cache the result
      handleAttractionAdditionBasedOnCachingParameter(req, startTime, writeToCache, attractionOptionsToBeAdded);
      
      res.set("X-Cache", "MISS");
      return res.status(200).json(attractionOptionsToBeAdded);
    }
  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};

async function makeLocationIqGeocodeRequest(apiKey, place, req) {
  try {
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
    incrementRequestCount(req.user.id, req.user.email, LOCATION_IQ, GEOCODE, V1);
    return response;
  } catch(error) {
    incrementRequestCount(req.user.id, req.user.email, LOCATION_IQ, GEOCODE, V1);
    throw error;
  }
}

async function limitsReachedForExternalApi(req, res, startTime) {
  let err;
  let failed = false;
  const [perUserCount, totalCount] = await Promise.all([getDailyApiRequestCount(LOCATION_IQ, GEOCODE, V1, req.user.id, null), getDailyApiRequestCount(LOCATION_IQ, GEOCODE, V1)]);
  if (perUserCount > LIMIT.LOCATION_IQ_PER_USER_DAILY_REQUEST_LIMIT) {
    err = ERROR_OBJECTS.EXTERNAL_API_USER_LIMIT(LOCATION_IQ, GEOCODE, V1);
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    res.status(err.statusCode).json(ERROR_OBJECTS.FRONTEND_API_USER_LIMIT("geocoding"));
    failed = true;    
  }
  if (totalCount > LIMIT.LOCATION_IQ_TOTAL_DAILY_REQUEST) {
    err = ERROR_OBJECTS.EXTERNAL_API_TOTAL_LIMIT(LOCATION_IQ, GEOCODE, V1);
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    res.status(err.statusCode).json(ERROR_OBJECTS.FRONTEND_API_TOTAL_LIMIT("geocoding"));
    failed = true;
  }

  infoLog(req, startTime, INFO_MESSAGE.DAILY_EXTERNAL_API_REQUEST_COUNT(totalCount, LOCATION_IQ, GEOCODE, V1));
  return failed;
}

async function handleAttractionAdditionBasedOnCachingParameter(req, startTime, writeToCache, attractionOptionsToBeAdded) {
  if (writeToCache === true) {
    try {
      const insertedAttraction = await insertAttraction(attractionOptionsToBeAdded);
      infoLog(req, startTime, INFO_MESSAGE.ATTRACTION_CACHED(insertedAttraction.insertedId.toString()));
    } catch (error) {
      warnLog(req, startTime, INFO_MESSAGE.ATTRACTION_CACHING_FAILED);
    }
  } else {
    infoLog(req, startTime, INFO_MESSAGE.ATTRACTION_NOT_CACHED_ON_PURPOSE);
  }
}