import logger from "../logger.js";
import { infoLog, errorObj } from "../loggerHelper.js";
import { ERROR_OBJECTS, EXTERNAL_APIS, INFO_MESSAGE, LIMIT } from "../utils/constants.js";
import { config } from "../configs/config.js";
import { getDailyApiRequestCount, incrementRequestCount } from "../services/userApiRequestsService.js";
import axios from "axios";

export const geocodeFallbackController = async (req, res) => {
  const startTime = Date.now();
  const { place, countryCode, proximity } = req.query;
  const METHOD_FAILURE_MESSAGE = "geocodeFallbackController failed.";
  const MAPBOX = EXTERNAL_APIS.MAPBOX.NAME;
  const GEOCODE = EXTERNAL_APIS.MAPBOX.ENDPOINTS.GEOCODE.NAME;
  const VERSION = EXTERNAL_APIS.MAPBOX.ENDPOINTS.GEOCODE.VERSION;

  // https://api.mapbox.com/search/geocode/v6/forward?q={search_text}
  async function makeMapboxGeocodeRequest(params) {
    try {
      const response = await axios.get(
        "https://api.mapbox.com/search/geocode/v6/forward",
        {
          params
        }
      );
      incrementRequestCount(req.user.id, req.user.email, MAPBOX, GEOCODE, VERSION);
      infoLog(req, startTime, "Successfully computed the mapbox suggestions");   
      return response;
    } catch (error) {
      incrementRequestCount(req.user.id, req.user.email, MAPBOX, GEOCODE, VERSION);
      throw error;
    }
  }

async function limitsReachedForExternalApi() {
  let err;
  let failed = false;
  const [perUserCount, totalCount] = await Promise.all([getDailyApiRequestCount(MAPBOX, GEOCODE, VERSION, req.user.id, null, false), getDailyApiRequestCount(MAPBOX, GEOCODE, VERSION)]);
  if (perUserCount > LIMIT.MAPBOX_PER_USER_DAILY_REQUEST_LIMIT) {
    err = ERROR_OBJECTS.EXTERNAL_API_USER_LIMIT(MAPBOX, GEOCODE, VERSION);
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    res.status(err.statusCode).json(ERROR_OBJECTS.FRONTEND_API_USER_LIMIT("routing"));
    failed = true;    
  }
  if (totalCount > LIMIT.MAPBOX_TOTAL_DAILY_REQUEST_LIMIT) {
    err = ERROR_OBJECTS.EXTERNAL_API_TOTAL_LIMIT(MAPBOX, GEOCODE, VERSION);
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    res.status(err.statusCode).json(ERROR_OBJECTS.FRONTEND_API_TOTAL_LIMIT("routing"));
    failed = true;
  }
  infoLog(req, startTime, INFO_MESSAGE.DAILY_EXTERNAL_API_REQUEST_COUNT(totalCount, MAPBOX, GEOCODE, VERSION));
  return failed;
}


  try {
    if (!place) {
      const err = ERROR_OBJECTS.BAD_REQUEST("place");
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(err.statusCode).json(err);
    }

    if (!countryCode) {
      const err = ERROR_OBJECTS.BAD_REQUEST("countryCode");
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(err.statusCode).json(err);
    }

    const apiKey = config.mapboxApiKey;
    if (!apiKey) {
      const err = ERROR_OBJECTS.MISSING_API_KEY("MapBox");
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(err.statusCode).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
    }

    const limitReached = await limitsReachedForExternalApi(req, res, startTime);

    if (limitReached === true) return;

    const mapboxParams = {
      access_token: apiKey,
      q: place,
      country: countryCode,
      limit: 10
    }

    if (proximity) {
      mapboxParams.proximity = proximity;
    }

    const response = await makeMapboxGeocodeRequest(mapboxParams);
    const features = response.data?.features; // this contains an array of features
    
    const options = [];
    for (const feature of features) {
      let properties = feature.properties;
      options.push({
        place_id : feature.id,
        lat : properties.coordinates.latitude,
        lon : properties.coordinates.longitude,
        display_name : properties.full_address,
        type: properties.feature_type,
        wikidata_id : properties.context.place.wikidata_id
      })
    }
    return res.status(200).json({options}); 
  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
}