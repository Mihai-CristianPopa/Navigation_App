import { bruteForce } from "../algorithm/bruteForce.js";
import { TEST_SCENARIOS } from "../utils/testOptimizationConstants.js";
import logger from "../logger.js";
import { buildNearestNeighborResponse } from "../algorithm/nearestNeighbour.js";
import { EXTERNAL_APIS, INFO_MESSAGE } from "../utils/constants.js";
import { config } from "../configs/config.js";
import axios from "axios";
import { incrementRequestCount } from "../services/userApiRequestsService.js";
import { errorObj, infoLog } from "../loggerHelper.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import simplifyGeojson from "simplify-geojson";
import { twoOpt } from "../algorithm/twoOpt.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagesDir = path.join(__dirname, "..", "images");

export const testOptimizationController = async (req, res) => {

  async function getDirectionsGeometry(coordinateListForRouting) {
    const startTime = Date.now();
    try {
      const directionsResponse = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinateListForRouting}`,
        {
          params: {
            access_token: config.mapboxApiKey,
            geometries: "geojson"
          }
        }
      );
      infoLog(req, startTime, INFO_MESSAGE.MBOX_DIRECTIONS_AFTER_ORDERING);
      incrementRequestCount(null, null, EXTERNAL_APIS.MAPBOX.NAME, EXTERNAL_APIS.MAPBOX.ENDPOINTS.DIRECTIONS.NAME, EXTERNAL_APIS.MAPBOX.ENDPOINTS.DIRECTIONS.VERSION);
      return directionsResponse.data?.routes[0].geometry;
    } catch (error) {
      incrementRequestCount(null, null, EXTERNAL_APIS.MAPBOX.NAME, EXTERNAL_APIS.MAPBOX.ENDPOINTS.DIRECTIONS.NAME, EXTERNAL_APIS.MAPBOX.ENDPOINTS.DIRECTIONS.VERSION);
      throw error;
    }
    
  }

    async function getMapboxImage(steps, coordinatesList, coordsById, algorithm="nearestNeighbour", width = 900, height = 600, styleId = "mapbox/streets-v12") {
      let geojson;
      
      function saveImage(response) {
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${timestamp}-${algorithm}-${steps.length}.png`;
        const filepath = path.join(imagesDir, filename);
        fs.writeFileSync(filepath, response.data);
        console.log("Image saved successfully");
      }

      async function getMapboxStaticImage() {
        let overlay;
        try {
          overlay = `geojson(${encodeURIComponent(JSON.stringify(geojson))})`;

          const url = `https://api.mapbox.com/styles/v1/${styleId}/static/${overlay}/auto/${width}x${height}?padding=40&access_token=${config.mapboxApiKey}`;

          const response = await axios.get(url, {
              responseType: 'arraybuffer'
          });
          return response;
        } catch (error) {
          // The case where the geoJson is too large
          if (error.status === 413) {
            let tolerance = 0.01;
            while (true) {
              overlay = `geojson(${encodeURIComponent(JSON.stringify(simplifyGeojson(geojson, tolerance)))})`;
              if (overlay.length < 8012) break;
              tolerance += 0.001;
            }
            const url = `https://api.mapbox.com/styles/v1/${styleId}/static/${overlay}/auto/${width}x${height}?padding=40&access_token=${config.mapboxApiKey}`;

            const response = await axios.get(url, {
                responseType: 'arraybuffer'
            });
            return response;
          }
          console.error(error);
        }
        
      }
      
      try {
        const lineCoords = [];
        const initialWaypointCoords = coordsById[steps[0].source_id];
        lineCoords.push([Number(initialWaypointCoords.lng), Number(initialWaypointCoords.lat)]);
        
        const orderedIds = steps.map(s => s.destination_id);

        for (const id of orderedIds) {
          const c = coordsById[id];
          lineCoords.push([Number(c.lng), Number(c.lat)]); // GeoJSON expects [lng, lat]
        }
        const geometry = await getDirectionsGeometry(coordinatesList);

        const markerFeatures = lineCoords.slice(0, lineCoords.length - 1).map((coordinates, index) => ({
            type: "Feature",
            properties: { "marker-color": "#33aa33", "marker-size": "large", "marker-symbol": (index + 1).toString() },
            geometry: { type: "Point", coordinates }
          }));

        geojson = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              stroke: "#ff3333",
              "stroke-width": 4,
              "stroke-opacity": 0.9
            },
            geometry
          },
          ...markerFeatures
        ]
        };
        
        const response = await getMapboxStaticImage();

        saveImage(response);
        
      } catch (e) {
        logger.error("File saving failed", e);
      }
  }
    async function getDirectionsMatrixLocationIq(coordinates) {
        const startTime = Date.now();
        try {
            const response = await axios.get(
            `https://eu1.locationiq.com/v1/matrix/driving/${coordinates}`,
            {
                params: {
                key: config.locationIQApiKey,
                annotations: "distance,duration"
                }
            }
            );
            infoLog(req, startTime, INFO_MESSAGE.DIRECTIONS_MATRIX(EXTERNAL_APIS.LOCATION_IQ.NAME));
            incrementRequestCount(null, null, EXTERNAL_APIS.LOCATION_IQ.NAME, EXTERNAL_APIS.LOCATION_IQ.ENDPOINTS.DIRECTIONS_MATRIX.NAME, EXTERNAL_APIS.LOCATION_IQ.ENDPOINTS.DIRECTIONS_MATRIX.VERSION);
            return response;
        } catch (error) {
            incrementRequestCount(null, null, EXTERNAL_APIS.LOCATION_IQ.NAME, EXTERNAL_APIS.LOCATION_IQ.ENDPOINTS.DIRECTIONS_MATRIX.NAME, EXTERNAL_APIS.LOCATION_IQ.ENDPOINTS.DIRECTIONS_MATRIX.VERSION);
            throw error;
        }
    }

    async function createShuffledTestData(waypointCount, testScenario = TEST_SCENARIOS.TWENTY_FIVE_POINTS) {
        const waypoints = shuffleWaypoints(waypointCount, testScenario);
        const directionsResponse = await getDirectionsMatrixLocationIq(waypoints.coordinatesArray.join(";"));
        const data = directionsResponse.data;
        return {
            ...waypoints,
            distanceMatrix: data.distances,
            durationMatrix: data.durations
        }
    }

    function shuffleWaypoints(waypointCount, testScenario) {
        // Create paired array from your current structure
        const waypoints = testScenario.waypointIdArray.map((id, index) => ({
            id: id,
            coordinates: testScenario.coordinatesArray[index],
            originalIndex: index  // Keep track of original position for matrix lookups
        }));

        // Shuffle the paired data
        for (let i = waypoints.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [waypoints[i], waypoints[j]] = [waypoints[j], waypoints[i]];
        }

        const slicedWaypoints = waypoints.slice(0, waypointCount);

        const coordsById = {};

        for (let i = 0; i < slicedWaypoints.length; i++) {
          const [lng, lat] = slicedWaypoints[i].coordinates.split(",");
          coordsById[slicedWaypoints[i].id] = {lat, lng};
        }

        return {
            coordsById,
            waypointIdArray: slicedWaypoints.map(waypoint => waypoint.id),
            coordinatesArray: slicedWaypoints.map(waypoint => waypoint.coordinates),
            originalIndices: slicedWaypoints.map(waypoint => waypoint.originalIndex) // For matrix reordering if needed
        };
    }
    const {waypointCount, useDistanceMatrix, algorithm} = req.query;
    let route;
    const testData = await createShuffledTestData(Number.parseInt(waypointCount));

    logger.info("After shuffle waypoint order: ", testData.waypointIdArray);

    const matrix = useDistanceMatrix === "true" ? testData.distanceMatrix : testData.durationMatrix;
    if (algorithm === "bruteForce") route = bruteForce(testData.waypointIdArray, matrix, useDistanceMatrix === "true");
    else if (algorithm === "twoOpt") route = twoOpt(testData.waypointIdArray, matrix, useDistanceMatrix === "true")
    else if (algorithm === "twoOptNN") {
      route = buildNearestNeighborResponse(testData.waypointIdArray, matrix, useDistanceMatrix === "true");
      route = twoOpt(testData.waypointIdArray, matrix, useDistanceMatrix === "true", route.steps.map(s => s.destination_waypoint_idx));
    } else if (algorithm === "twoOptvsNNvstwoOptNN") {
      const routes = [];

      route = twoOpt(testData.waypointIdArray, matrix, useDistanceMatrix === "true");
      await getMapboxImage(route.steps, createCoordinateListForRouting(route, testData.coordinatesArray), testData.coordsById, route.algorithm);
      logger.info(`Result of ${route.algorithm} algorithm computed in ${route.computeTime}`, route);
      routes.push(route);

      route = buildNearestNeighborResponse(testData.waypointIdArray, matrix, useDistanceMatrix === "true");
      await getMapboxImage(route.steps, createCoordinateListForRouting(route, testData.coordinatesArray), testData.coordsById, route.algorithm);
      logger.info(`Result of ${route.algorithm} algorithm computed in ${route.computeTime}`, route);
      routes.push(route);

      route = twoOpt(testData.waypointIdArray, matrix, useDistanceMatrix === "true", route.steps.map(s => s.destination_waypoint_idx));
      await getMapboxImage(route.steps, createCoordinateListForRouting(route, testData.coordinatesArray), testData.coordsById, route.algorithm);
      logger.info(`Result of ${route.algorithm} algorithm computed in ${route.computeTime}`, route);
      routes.push(route);

      // logger.info("All routes", routes);

      return res.status(200).json(routes);

    }
    else if (algorithm === "all") {
      const routes = [];
      
      // The brute force algorithm breaks in case there are more than 9 way-points
      if (matrix.length <= 9) {
        route = bruteForce(testData.waypointIdArray, matrix, useDistanceMatrix === "true");
        logger.info(`Result of ${route.algorithm} algorithm computed in ${route.computeTime}`, route);
        await getMapboxImage(route.steps, createCoordinateListForRouting(route, testData.coordinatesArray), testData.coordsById, route.algorithm);

        routes.push(route);
      }

      route = twoOpt(testData.waypointIdArray, matrix, useDistanceMatrix === "true");
      await getMapboxImage(route.steps, createCoordinateListForRouting(route, testData.coordinatesArray), testData.coordsById, route.algorithm);
      logger.info(`Result of ${route.algorithm} algorithm computed in ${route.computeTime}`, route);
      routes.push(route);
      
      route = buildNearestNeighborResponse(testData.waypointIdArray, matrix, useDistanceMatrix === "true");
      logger.info(`Result of ${route.algorithm} algorithm computed in ${route.computeTime}`);
      await getMapboxImage(route.steps, createCoordinateListForRouting(route, testData.coordinatesArray), testData.coordsById, route.algorithm);
      routes.push(route);
      
      route = twoOpt(testData.waypointIdArray, matrix, useDistanceMatrix === "true", route.steps.map(s => s.destination_waypoint_idx));
      logger.info(`Result of ${route.algorithm} algorithm computed in ${route.computeTime}`, route);
      await getMapboxImage(route.steps, createCoordinateListForRouting(route, testData.coordinatesArray), testData.coordsById, route.algorithm);

      
      routes.push(route);
      logger.info("All routes", routes);

      return res.status(200).json(routes);
    }
    else route = buildNearestNeighborResponse(testData.waypointIdArray, matrix, useDistanceMatrix === "true");
    await getMapboxImage(route.steps, createCoordinateListForRouting(route, testData.coordinatesArray), testData.coordsById, algorithm);
    logger.info(`Result of search algorithm computed in ${route.computeTime}`, route);
    res.status(200).json(route);
}

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

    // function createTestMatrix(matrixDimension, testData = TEST_SCENARIOS.TWENTY_FIVE_POINTS) {
    //     const dist_mat = [];
    //     const dur_mat = []; 
    //     for (let i = 0; i < matrixDimension; i++) {
    //         let line_of_dist = []
    //         let line_of_dur = []
    //         for (let j = 0; j < matrixDimension; j++) { 
    //             line_of_dist.push(testData.distanceMatrix[i][j]);
    //             line_of_dur.push(testData.durationMatrix[i][j]);
    //         }
    //         dist_mat.push(line_of_dist);
    //         dur_mat.push(line_of_dur);
    //     }
        
    //     return {
    //         waypointIdArray: testData.waypointIdArray.slice(0, matrixDimension),
    //         distanceMatrix: dist_mat,
    //         durationMatrix: dur_mat
    //     };
    //     const json_dist_mat = JSON.stringify(dist_mat);
    //     const json_dur_mat = JSON.stringify(dur_mat);
    //     console.log(1);
    // }


// function createTestData() {
    // const five_by_five_dist = [];
    // const five_by_five_dur = [];
    // const ten_by_ten_dist = [];
    // const ten_by_ten_dur = [];
    // const fift_by_fift_dist = [];
    // const fift_by_fift_dur = [];
    // const twenty_by_twenty_dist = [];
    // const twenty_by_twenty_dur = [];
    // for (let i = 0; i < 20; i++) {
    //     let line_of_five_dist = []
    //     let line_of_five_dur = []
    //     let line_of_ten_dist = []
    //     let line_of_ten_dur = []
    //     let line_of_fift_dist = []
    //     let line_of_fift_dur = []
    //     let line_of_twenty_dist = []
    //     let line_of_twenty_dur = []
    //     for (let j = 0; j < 20; j++) {
    //         if (i < 5 && j < 5) {
    //             line_of_five_dist.push(testData.distanceMatrix[i][j]);
    //             line_of_five_dur.push(testData.durationMatrix[i][j]);
    //             line_of_ten_dist.push(testData.distanceMatrix[i][j]);
    //             line_of_ten_dur.push(testData.durationMatrix[i][j]);
    //             line_of_fift_dist.push(testData.distanceMatrix[i][j]);
    //             line_of_fift_dur.push(testData.durationMatrix[i][j]);
    //             line_of_twenty_dist.push(testData.distanceMatrix[i][j]);
    //             line_of_twenty_dur.push(testData.durationMatrix[i][j]);

    //             if (line_of_five_dist.length === 5) five_by_five_dist.push(line_of_five_dist);
    //             if (line_of_five_dur.length === 5) five_by_five_dur.push(line_of_five_dur);
    //         } else if (i < 10 && j < 10) {
    //             line_of_ten_dist.push(testData.distanceMatrix[i][j]);
    //             line_of_ten_dur.push(testData.durationMatrix[i][j]);
    //             line_of_fift_dist.push(testData.distanceMatrix[i][j]);
    //             line_of_fift_dur.push(testData.durationMatrix[i][j]);
    //             line_of_twenty_dist.push(testData.distanceMatrix[i][j]);
    //             line_of_twenty_dur.push(testData.durationMatrix[i][j]);

    //             if (line_of_ten_dist.length === 10) ten_by_ten_dist.push(line_of_ten_dist);
    //             if (line_of_ten_dur.length === 10) ten_by_ten_dur.push(line_of_ten_dur);
    //         } else if (i < 15 && j < 15) {
    //             line_of_fift_dist.push(testData.distanceMatrix[i][j]);
    //             line_of_fift_dur.push(testData.durationMatrix[i][j]);
    //             line_of_twenty_dist.push(testData.distanceMatrix[i][j]);
    //             line_of_twenty_dur.push(testData.durationMatrix[i][j]);

    //             if (line_of_fift_dist.length === 15) fift_by_fift_dist.push(line_of_fift_dist);
    //             if (line_of_fift_dur.length === 15) fift_by_fift_dur.push(line_of_fift_dur);
    //         } else if (i < 20 && j < 20) {
    //             line_of_twenty_dist.push(testData.distanceMatrix[i][j]);
    //             line_of_twenty_dur.push(testData.durationMatrix[i][j]);

    //             if (line_of_twenty_dist.length === 20) twenty_by_twenty_dist.push(line_of_twenty_dist);
    //             if (line_of_twenty_dur.length === 20) twenty_by_twenty_dur.push(line_of_twenty_dur);
    //         }
    //     }
    // }
    // const json_five_by_five_dist = JSON.stringify(five_by_five_dist);
    // const json_five_by_five_dur = JSON.stringify(five_by_five_dur);
    // const json_ten_by_ten_dist = JSON.stringify(ten_by_ten_dist);
    // const json_ten_by_ten_dur = JSON.stringify(ten_by_ten_dur);
    // const json_fift_by_fift_dist = JSON.stringify(fift_by_fift_dist);
    // const json_fift_by_fift_dur = JSON.stringify(fift_by_fift_dur);
    // const json_twenty_by_twenty_dist = JSON.stringify(twenty_by_twenty_dist);
    // const json_twenty_by_twenty_dur = JSON.stringify(twenty_by_twenty_dur);
    // console.log(1)
// }