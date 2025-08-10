import { config } from "../configs/config.js";
import logger from "../logger.js";
import { errorObj, infoLog } from "../loggerHelper.js";
import axios from "axios";
import { bruteForce } from "../algorithm/bruteForce.js";
import { computeStrTimeFromSeconds, computeKilometersFromMeters  } from "../utils/computations.js";
import { ERROR_OBJECTS, LOG_MESSAGE } from "../utils/constants.js";

const METHOD_FAILURE_MESSAGE = "optimizeV2Controller failure.";

export const optimizeV2Controller = async (req, res) => {
  const startTime = Date.now();
  const {waypointIds, coordinatesList: coordinates} = req.query;
  let err;

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
  const apiKey = config.mapboxApiKey;
  if (!apiKey) {
    err = ERROR_OBJECTS.MISSING_API_KEY("MapBox");
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
  // https://docs.mapbox.com/api/navigation/matrix/
  // https://api.mapbox.com/directions-matrix/v1/{profile}/{coordinates}
  // profile can be mapbox/(driving/walking/cycling/driving-traffic)
  // coordinates are <longitude1>,<lat1>;<long2>,<lat2>;
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
    infoLog(req, startTime, LOG_MESSAGE.SUCCESS.MBOX_DIRECTIONS_MATRIX);
    // response.data returns 
    // {destinations, distances, durations, sources}
    // distances and durations can be the matrix sent for computations in
    const waypointIdArray = waypointIds.split(";");
    const distancesMatrix = response.data?.distances || response.data?.durations
    const fastestRoute = bruteForce(waypointIdArray, distancesMatrix);
    
    // logger.info(infoLog(req, startTime, LOG_MESSAGE.SUCCESS.OWN_ATTRACTIONS_ORDER_ALG));
    infoLog(req, startTime, LOG_MESSAGE.SUCCESS.OWN_ATTRACTIONS_ORDER_ALG);
  
    const coordinateListForRouting2 = createCoordinateListForRoutingV2(fastestRoute, coordinates.split(";"));
    
    // https://docs.mapbox.com/api/navigation/directions/
    // Optional parameters for the mapbox/driving profile: arrive_by, depart_at formatted in one of three ISO 8601 formats
    // https://en.wikipedia.org/wiki/ISO_8601 YYYY-MM-DDThh:mm:ssZ / YYYY-MM-DDThh:mmss±hh:mm / YYYY-MM-DDThh:mm
    const directionsResponse = await axios.get(
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinateListForRouting2}`,
      {
        params: {
          access_token: apiKey,
          geometries: "geojson"
        }
      }
    );

    infoLog(req, startTime, LOG_MESSAGE.SUCCESS.MBOX_DIRECTIONS_AFTER_ORDERING);

    const route = directionsResponse.data?.routes[0];
    const totalTimeDurationInSeconds = route?.duration;
    const legs = route?.legs;
    const geometry = route?.geometry;

    if (fastestRoute.steps.length !== legs.length) throw new Error("The routing API called has fewer steps than needed for the number of attractions inputted");
    for (let i = 0; i <= fastestRoute.stepCount - 1; i++) {
      fastestRoute.steps[i]["timeDuration"] = computeStrTimeFromSeconds(legs[i].duration);
      fastestRoute.steps[i]["distance"] = computeKilometersFromMeters(fastestRoute.steps[i]["distance"]);
    }
    fastestRoute.totalTimeDuration = computeStrTimeFromSeconds(totalTimeDurationInSeconds);
    fastestRoute.totalDistance = computeKilometersFromMeters(fastestRoute.totalDistance)

    return res.status(200).json({
      fastestRoute,
      timeDurationArray: fastestRoute.steps.map(step => step.timeDuration),
      finalIndicesArray: createAnArrayWithFinalWaypointIndices(fastestRoute),
      geometry
    });
    
  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};


/**  We could also use the destination_waypoint_idx from each of the steps to create this coordinate list and we would not need the mapping anymore */
function createCoordinateListForRoutingV2(fastestRoute, inputCoordinatesArray) {
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