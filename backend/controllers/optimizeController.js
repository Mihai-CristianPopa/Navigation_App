import { config } from "../configs/config.js";
import logger from "../logger.js";
import logObj from "../loggerHelper.js";
import { getDailyApiRequestCount, incrementRequestCount } from "../services/userApiRequestsService.js";
import axios from "axios";
import { LIMIT } from "../utils/constants.js";

export const optimizeController = async (req, res) => {
  const startTime = Date.now();
  const {coordinatesList: coordinates} = req.query;
  const profile = "driving";
  if (!coordinates) {
    err = BAD_REQUEST("coordinatesList");
    logger.error("optimizeController failure", logObj(null, req, startTime, err));
    return res.status(400).json(err);
  };

  const apiKey = config.mapboxApiKey;
  if (!apiKey) {
    logger.error("The API Key for MapBox is not configured in the backend", logObj(500, req, startTime));
    return res.status(500).json({ error: "The API Key for MapBox is not configured in the backend" });
  }
  // https://docs.mapbox.com/api/navigation/optimization-v1/
  // https://api.mapbox.com/optimized-trips/v1/{profile}/{coordinates}
  // profile can be mapbox/(driving/walking/cycling/driving-traffic)
  // coordinates are <longitude1>,<lat1>;<long2>,<lat2>;
  try {
    const [perUserCount, totalCount] = await Promise.all([getDailyApiRequestCount("MapBox/Optimize/V1", req.user.id, null), getDailyApiRequestCount("MapBox/Optimize/V1")]);
    if (perUserCount > LIMIT.MAPBOX_PER_USER_DAILY_REQUEST_LIMIT) {
          logger.error("Daily Mapbox Optimize API limit reached for the user", logObj(429, req, startTime));
          return res.status(429).json({ error: "You have reached the maximum number of routing requests today. Please try again tomorrow." });
    }
    if (totalCount > LIMIT.MAPBOX_TOTAL_DAILY_REQUEST_LIMIT) {
          logger.error("Daily Mapbox Optimize API total limit reached", logObj(429, req, startTime));
          return res.status(429).json({ error: "The server has reached its maximum routing limit for today. Please try again tomorrow." });
    }
        logger.info(`Today there have been ${totalCount} MapBox/Optimize/V1 request(s) made`);
    const response = await axios.get(
        `https://api.mapbox.com/optimized-trips/v1/mapbox/${profile}/${coordinates}`,
        {
          params: {
            access_token: apiKey,
            roundtrip: true,
            source: "first",
            geometries: "geojson"
          }
        }
      );
    incrementRequestCount(req.user.id, req.user.email, "MapBox", "Optimize", "V1");
    logger.info(`MapBox API successfully retrieved a response with internal status code ${response.data.code}`, logObj(response.status, req, startTime));
    return res.status(response.status).json(response.data);
    // if (response.status === 200 && response.data.code === "Ok"){
    //   return res.status(200).json(response.data.trips[0].geometry);
    // } else {
    //   return res.status(response.status).json(response.data);
    // }
  } catch (error) {
    logger.error("Some error occurred during the MapBox Optimize API call", logObj(null, req, startTime, error));
    res.status(500).json(error);
  }
  

};