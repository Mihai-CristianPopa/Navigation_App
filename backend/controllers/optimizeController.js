import { config } from "../configs/config.js";
import logger from "../logger.js";
import {errorObj, infoLog} from "../loggerHelper.js";
import { getDailyApiRequestCount, incrementRequestCount } from "../services/userApiRequestsService.js";
import axios from "axios";
import { LIMIT, EXTERNAL_APIS, ERROR_OBJECTS, INFO_MESSAGE } from "../utils/constants.js";
import { computeStrTimeFromSeconds, computeKilometersFromMeters  } from "../utils/computations.js";

const METHOD_FAILURE_MESSAGE = "optimizeController failure.";

const MAPBOX = EXTERNAL_APIS.MAPBOX.NAME;

const OPTIMIZE = EXTERNAL_APIS.MAPBOX.ENDPOINTS.OPTIMIZED_TRIPS.NAME;

const OPTIMIZE_VERSION = EXTERNAL_APIS.MAPBOX.ENDPOINTS.OPTIMIZED_TRIPS.VERSION;

export const optimizeController = async (req, res) => {
  const startTime = Date.now();
  const {waypointIds, coordinatesList: coordinates} = req.query;
  const profile = "driving";

  async function getOptimization(apiKey) {
    try {
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
      incrementRequestCount(req.user.id, req.user.email, MAPBOX, OPTIMIZE, OPTIMIZE_VERSION);
      infoLog(req, startTime, `MapBox Optimization API successfully retrieved a response with internal status code ${response.data.code}`);
      return response;
    } catch (error) {
      incrementRequestCount(req.user.id, req.user.email, MAPBOX, OPTIMIZE, OPTIMIZE_VERSION);
      throw error;
    }
  }

  async function limitsReachedForExternalApi() {
    let failed = false;
    const [perUserCount, totalCount] = await Promise.all([getDailyApiRequestCount(MAPBOX, OPTIMIZE, OPTIMIZE_VERSION, req.user.id, null, false), 
      getDailyApiRequestCount(MAPBOX, OPTIMIZE, OPTIMIZE_VERSION)]);
    if (perUserCount > LIMIT.MAPBOX_PER_USER_DAILY_REQUEST_LIMIT) {
      const err = ERROR_OBJECTS.EXTERNAL_API_USER_LIMIT(MAPBOX, OPTIMIZE, OPTIMIZE_VERSION);
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      res.status(err.statusCode).json(ERROR_OBJECTS.FRONTEND_API_USER_LIMIT("optimization"));
      failed = true;
    }
    if (totalCount > LIMIT.MAPBOX_TOTAL_DAILY_REQUEST_LIMIT) {
      const err = ERROR_OBJECTS.EXTERNAL_API_TOTAL_LIMIT(MAPBOX, OPTIMIZE, OPTIMIZE_VERSION);
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      res.status(err.statusCode).json(ERROR_OBJECTS.FRONTEND_API_TOTAL_LIMIT("optimization"));
      failed = true;
    }
    infoLog(req, startTime, INFO_MESSAGE.DAILY_EXTERNAL_API_REQUEST_COUNT(totalCount, MAPBOX, OPTIMIZE, OPTIMIZE_VERSION));
    return failed;
  }

  if (!waypointIds) {
    err = ERROR_OBJECTS.BAD_REQUEST("waypointIds");
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err);
  };

  if (!coordinates) {
    const err = ERROR_OBJECTS.BAD_REQUEST("coordinatesList");
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err);
  };

  const apiKey = config.mapboxApiKey;
  if (!apiKey) {
    const err = ERROR_OBJECTS.MISSING_API_KEY(MAPBOX);
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
  // https://docs.mapbox.com/api/navigation/optimization-v1/
  // https://api.mapbox.com/optimized-trips/v1/{profile}/{coordinates}
  // profile can be mapbox/(driving/walking/cycling/driving-traffic)
  // coordinates are <longitude1>,<lat1>;<long2>,<lat2>;
  try {
    const limitsReached = await limitsReachedForExternalApi();

    if (limitsReached) return;

    const response = await getOptimization(apiKey)
    const legs = response.data?.trips[0]?.legs;
    const waypoints = response.data?.waypoints;

    const waypointIdArray = waypointIds.split(";");
    const finalIndicesArray = [];

    for (let i = 0; i <= waypointIdArray.length - 1; i++) {
      finalIndicesArray.push(waypoints.findIndex(waypoint => waypoint.waypoint_index === i));
    }

    const stops = finalIndicesArray.map(waypointIdx => waypointIdArray[waypointIdx]);
    stops.push(waypointIdArray[0]);

    const fastestRoute = {
      steps: legs,
      totalDuration: computeStrTimeFromSeconds(response.data?.trips[0]?.duration),
      totalDistance: computeKilometersFromMeters(response.data?.trips[0]?.distance)
    }

    const finalResponse = {
      timeDurationArray: legs?.map(leg => computeStrTimeFromSeconds(leg.duration)),
      finalIndicesArray,
      stops,
      fastestRoute,
      geometry: response.data?.trips[0]?.geometry
    }
    return res.status(200).json(finalResponse);
  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
  

};