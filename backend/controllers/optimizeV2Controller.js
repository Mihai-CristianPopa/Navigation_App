import { config } from "../configs/config.js";
import logger from "../logger.js";
import { errorObj, infoLog } from "../loggerHelper.js";
import axios from "axios";
import { bruteForce } from "../algorithm/bruteForce.js";
import { computeStrTimeFromSeconds, computeKilometersFromMeters  } from "../utils/computations.js";
import { ERROR_OBJECTS, INFO_MESSAGE, LIMIT, EXTERNAL_APIS } from "../utils/constants.js";
import { getDailyApiRequestCount, incrementRequestCount } from "../services/userApiRequestsService.js";
import { optimizeController } from "./optimizeController.js";

const METHOD_FAILURE_MESSAGE = "optimizeV2Controller failure.";

const MAPBOX = EXTERNAL_APIS.MAPBOX.NAME;

const DIRECTIONS = EXTERNAL_APIS.MAPBOX.ENDPOINTS.DIRECTIONS.NAME;

const DIRECTIONS_VERSION = EXTERNAL_APIS.MAPBOX.ENDPOINTS.DIRECTIONS.VERSION;

const MATRIX = EXTERNAL_APIS.MAPBOX.ENDPOINTS.DIRECTIONS_MATRIX.NAME;

const MATRIX_VERSION = EXTERNAL_APIS.MAPBOX.ENDPOINTS.DIRECTIONS_MATRIX.VERSION;

// const { endpointPair: DIRECTIONS_MATRIX_DIRECTIONS, versionPair: VERSIONS } = getPairOfEndpointsAndVersions();


export const optimizeV2Controller = async (req, res) => {
  const startTime = Date.now();
  const {waypointIds, coordinatesList: coordinates} = req.query;
  let err;
  let apiKey;
  let matrixResponse;

  if (!waypointIds) {
    err = ERROR_OBJECTS.BAD_REQUEST("waypointIds");
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err);
  };

  if (!coordinates) {
    err = ERROR_OBJECTS.BAD_REQUEST("coordinatesList");
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err);
  };

  const profile = "driving";

  const mapboxMatrixRequestCount = coordinates.split(";").length ** 2;

  try {
    // Step 0: Check if external APIs can still be made
    const limitReached = await limitsReachedForExternalApi(req, res, startTime, mapboxMatrixRequestCount);

    if (limitReached.failed === true) return;

    if (limitReached.endpoint === EXTERNAL_APIS.MAPBOX.ENDPOINTS.OPTIMIZED_TRIPS.NAME) return optimizeController(req, res);

    if (limitReached.apiProvider === MAPBOX) {
      apiKey = config.mapboxApiKey;
      if (!apiKey) {
        err = ERROR_OBJECTS.MISSING_API_KEY(MAPBOX);
        logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
        return res.status(err.statusCode).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
      }
      matrixResponse = await getDirectionsMatrix(profile, coordinates, apiKey, req, startTime);
    } else if (limitReached.apiProvider === EXTERNAL_APIS.LOCATION_IQ.NAME) {
      apiKey = config.locationIQApiKey;
      if (!apiKey) {
        err = ERROR_OBJECTS.MISSING_API_KEY(EXTERNAL_APIS.LOCATION_IQ.NAME);
        logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
        return res.status(err.statusCode).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
      }
      matrixResponse = await getDirectionsMatrixLocationIq(coordinates, apiKey, req, startTime);
    }

    // Step 1: Request the matrix with distances
    // const response = await getDirectionsMatrix(profile, coordinates, apiKey, req, startTime);
    // response.data returns 
    // {destinations, distances, durations, sources}
    // distances and durations can be the matrix sent for computations in

    // Step 2: Take the matrix with distances and order the attractions in the most  efficient way to see all of them
    const waypointIdArray = waypointIds.split(";");
    const distancesMatrix = matrixResponse.data?.distances || matrixResponse.data?.durations
    const fastestRoute = bruteForce(waypointIdArray, distancesMatrix);
    
    infoLog(req, startTime, INFO_MESSAGE.OWN_ATTRACTIONS_ORDER_ALG);
  
    const coordinateListForRouting = createCoordinateListForRouting(fastestRoute, coordinates.split(";"));

    // Step 3: Get the routing that will be displayed on the map
    if (limitReached.apiProvider === EXTERNAL_APIS.LOCATION_IQ.NAME) {
      apiKey = config.mapboxApiKey;
      if (!apiKey) {
        err = ERROR_OBJECTS.MISSING_API_KEY(MAPBOX);
        logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
        return res.status(err.statusCode).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
      }
    }
    const directionsResponse = await getDirections(profile, coordinateListForRouting, apiKey, req, startTime);

    const route = directionsResponse.data?.routes[0];
    const totalTimeDurationInSeconds = route?.duration;
    const legs = route?.legs;
    const geometry = route?.geometry;

    if (fastestRoute.steps.length !== legs.length) throw new Error("The routing API called has fewer steps than needed for the number of attractions inputted");
    for (let i = 0; i <= fastestRoute.stepCount - 1; i++) {
      fastestRoute.steps[i]["duration"] = computeStrTimeFromSeconds(legs[i].duration);
      fastestRoute.steps[i]["distance"] = computeKilometersFromMeters(fastestRoute.steps[i]["distance"]);
    }
    fastestRoute.totalDuration = computeStrTimeFromSeconds(totalTimeDurationInSeconds);
    fastestRoute.totalDistance = computeKilometersFromMeters(fastestRoute.totalDistance);
    const finalIndicesArray = createAnArrayWithFinalWaypointIndices(fastestRoute);
    const stops = finalIndicesArray.map(waypointIdx => waypointIdArray[waypointIdx]);
    stops.push(waypointIdArray[0]);
    
    return res.status(200).json({
      fastestRoute,
      timeDurationArray: fastestRoute.steps.map(step => step.duration),
      finalIndicesArray,
      stops,
      geometry
    });
    
  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};

/** First we check whether the directions API which increments by 1 on each run has reached its limit. If that reached its limit we do not have a fallback so we return an error message.
 *  Second, we check whether the Mapbox matrix API which increments by n^2 on each run has reached its limit. If so, we check whether the Location Iq API provider has reached its limit,
 *  as it shares the same limit with the Location Iq geocoding API. If so, we fallback to the Mapbox optimize API which increments by one on each run.
 *  https://docs.mapbox.com/api/navigation/matrix/#matrix-api-pricing
 *  https://docs.mapbox.com/api/navigation/optimization-v1/#optimization-v1-api-pricing 
 */
async function limitsReachedForExternalApi(req, res, startTime, mapboxMatrixRequestCount) {
  let err;
  let failed = false;
  let apiProvider = MAPBOX;
  let endpoint = MATRIX;
  const [directionsPerUserCount, directionsTotalCount, matrixPerUserCount, matrixTotalCount] = await Promise.all([getDailyApiRequestCount(MAPBOX, DIRECTIONS, DIRECTIONS_VERSION, req.user.id, null, false), 
                                                            getDailyApiRequestCount(MAPBOX, DIRECTIONS, DIRECTIONS_VERSION), 
                                                            getDailyApiRequestCount(MAPBOX, MATRIX, MATRIX_VERSION, req.user.id, null, true), 
                                                            getDailyApiRequestCount(MAPBOX, MATRIX, MATRIX_VERSION, null, null, true)]);
  if (directionsPerUserCount > LIMIT.MAPBOX_PER_USER_DAILY_REQUEST_LIMIT) {
    err = ERROR_OBJECTS.EXTERNAL_API_USER_LIMIT(MAPBOX, DIRECTIONS, DIRECTIONS_VERSION);
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    res.status(err.statusCode).json(ERROR_OBJECTS.FRONTEND_API_USER_LIMIT("routing"));
    failed = true;    
  }
  if (directionsTotalCount > LIMIT.MAPBOX_TOTAL_DAILY_REQUEST_LIMIT) {
    err = ERROR_OBJECTS.EXTERNAL_API_TOTAL_LIMIT(MAPBOX, DIRECTIONS, DIRECTIONS_VERSION);
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    res.status(err.statusCode).json(ERROR_OBJECTS.FRONTEND_API_TOTAL_LIMIT("routing"));
    failed = true;
  }
  if (matrixPerUserCount + mapboxMatrixRequestCount > LIMIT.MAPBOX_PER_USER_DAILY_REQUEST_LIMIT || matrixTotalCount + mapboxMatrixRequestCount > LIMIT.MAPBOX_TOTAL_DAILY_REQUEST_LIMIT) {
    // Check the overall Location Iq requests count, as they share the same limit
    const [lIqPerUserCount, lIqTotalCount] = await Promise.all([getDailyApiRequestCount(EXTERNAL_APIS.LOCATION_IQ.NAME, null, null, req.user.id, null, false), getDailyApiRequestCount(EXTERNAL_APIS.LOCATION_IQ.NAME, null, null, null, null, false)]);
    if (lIqPerUserCount <= LIMIT.LOCATION_IQ_PER_USER_DAILY_REQUEST_LIMIT && lIqTotalCount <= LIMIT.LOCATION_IQ_TOTAL_DAILY_REQUEST) {
      apiProvider = EXTERNAL_APIS.LOCATION_IQ.NAME;
      endpoint = EXTERNAL_APIS.LOCATION_IQ.ENDPOINTS.DIRECTIONS_MATRIX.NAME
    } else endpoint = EXTERNAL_APIS.MAPBOX.ENDPOINTS.OPTIMIZED_TRIPS.NAME;
  }
  if (!failed) infoLog(req, startTime, INFO_MESSAGE.OPTIMIZATION_REQUEST_TO_BE_CALLED_WITH(apiProvider, endpoint));
  return {failed, apiProvider, endpoint};
}

/**
 * https://api.mapbox.com/directions-matrix/v1/{profile}/{coordinates}
 * profile can be mapbox/(driving/walking/cycling/driving-traffic)
 * coordinates are `<longitude1>,<lat1>;<long2>,<lat2>`;
 * @param {*} profile 
 * @param {*} coordinates 
 * @param {*} apiKey 
 * @param {*} req 
 * @param {*} startTime 
 * @returns 
 */
async function getDirectionsMatrix(profile, coordinates, apiKey, req, startTime) {
  const requestCount = coordinates.split(";").length ** 2;
  try {
    const response = await axios.get(
      `https://api.mapbox.com/directions-matrix/v1/mapbox/${profile}/${coordinates}`,
      {
        params: {
          access_token: apiKey,
          sources: "all",
          destinations: "all",
          annotations: "distance,duration"
        }
      }
    );
    infoLog(req, startTime, INFO_MESSAGE.MBOX_DIRECTIONS_MATRIX);
    incrementRequestCount(req.user.id, req.user.email, MAPBOX, MATRIX, MATRIX_VERSION, requestCount);
    return response;
  } catch (error) {
    incrementRequestCount(req.user.id, req.user.email, MAPBOX, MATRIX, MATRIX_VERSION, requestCount);
    throw error;
  }
}

async function getDirectionsMatrixLocationIq(coordinates, apiKey, req, startTime) {
  try {
    const response = await axios.get(
      `https://us1.locationiq.com/v1/matrix/driving/${coordinates}`,
      {
        params: {
          key: apiKey,
          annotations: "distance,duration"
        }
      }
    );
    infoLog(req, startTime, INFO_MESSAGE.DIRECTIONS_MATRIX(EXTERNAL_APIS.LOCATION_IQ.NAME));
    incrementRequestCount(req.user.id, req.user.email, EXTERNAL_APIS.LOCATION_IQ.NAME, EXTERNAL_APIS.LOCATION_IQ.ENDPOINTS.DIRECTIONS_MATRIX.NAME, EXTERNAL_APIS.LOCATION_IQ.ENDPOINTS.DIRECTIONS_MATRIX.VERSION);
    return response;
  } catch (error) {
    incrementRequestCount(req.user.id, req.user.email, EXTERNAL_APIS.LOCATION_IQ.NAME, EXTERNAL_APIS.LOCATION_IQ.ENDPOINTS.DIRECTIONS_MATRIX.NAME, EXTERNAL_APIS.LOCATION_IQ.ENDPOINTS.DIRECTIONS_MATRIX.VERSION);
    throw error;
  }
}

/**
 * https://docs.mapbox.com/api/navigation/directions/
 * Optional parameters for the mapbox/driving profile: arrive_by, depart_at formatted in one of three ISO 8601 formats
 * https://en.wikipedia.org/wiki/ISO_8601 YYYY-MM-DDThh:mm:ssZ / YYYY-MM-DDThh:mmss±hh:mm / YYYY-MM-DDThh:mm
 * @param {*} profile 
 * @param {*} coordinateListForRouting 
 * @param {*} apiKey 
 * @param {*} req 
 * @param {*} startTime 
 * @returns 
 */
async function getDirections(profile, coordinateListForRouting, apiKey, req, startTime) {
  try {
    const directionsResponse = await axios.get(
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinateListForRouting}`,
      {
        params: {
          access_token: apiKey,
          geometries: "geojson"
        }
      }
    );
    infoLog(req, startTime, INFO_MESSAGE.MBOX_DIRECTIONS_AFTER_ORDERING);
    incrementRequestCount(req.user.id, req.user.email, MAPBOX, DIRECTIONS, DIRECTIONS_VERSION);
    return directionsResponse;
  } catch (error) {
    incrementRequestCount(req.user.id, req.user.email, MAPBOX, DIRECTIONS, DIRECTIONS_VERSION);
    throw error;
  }
  
}

/**  We could also use the destination_waypoint_idx from each of the steps to create this coordinate list and we would not need the mapping anymore */
function createCoordinateListForRouting(fastestRoute, inputCoordinatesArray) {
  // Based on our algorithm, the first waypoint in the matrix will always be the first in routing also
  const coordinatesArray = [inputCoordinatesArray[0]];
  // Removing 2 from the stepCount because the last step is the return to the initial point
  // So that one we do not want to take into consideration, as it is default behavior.
  // Actually it seems that the Directions Api behavior does not include returning to the first point
  // So removing only 1 again
  const routeSteps = fastestRoute.steps;
  for (let i = 0; i <= fastestRoute.stepCount - 1; i++) {
    // For each of the step we want to add the coordinates of the destination
    coordinatesArray.push(inputCoordinatesArray[routeSteps[i].destination_waypoint_idx])
  }
  return coordinatesArray.join(";");
}

/** Needed in the frontend to update the markers order. */
function createAnArrayWithFinalWaypointIndices(fastestRoute) {
  const array = [];
  array.push(fastestRoute.steps[0].source_waypoint_idx);

  for (let i = 1; i <= fastestRoute.stepCount - 1; i++) {
    array.push(fastestRoute.steps[i].source_waypoint_idx);
  }
  return array;
}

// function getPairOfEndpointsAndVersions(){
//   const endpoints = EXTERNAL_APIS.MAPBOX.ENDPOINTS;

//   const endpointPair = `${endpoints.DIRECTIONS_MATRIX.NAME},${endpoints.DIRECTIONS.NAME}`;

//   const versionPair = `${endpoints.DIRECTIONS_MATRIX.VERSION},${endpoints.DIRECTIONS.VERSION}`;

//   return {endpointPair, versionPair};
// }

