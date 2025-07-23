import { config } from "../configs/config.js";
import logger from "../logger.js";
import logObj from "../loggerHelper.js";
import axios from "axios";

export const optimizeController = async (req, res) => {
  const startTime = Date.now();
  const {coordinatesList: coordinates} = req.query;
  const profile = "driving";
  // Arcul de Triumf
  // lat
  // "44.46719015"
  // lon
  // "26.078127050916656"
  // Arena Nationala
  // lat
  // "44.4372494"
  // lon
  // "26.15247577172729"
  // Slanic Prahova
  // lat
  // "45.2357777"
  // lon
  // "25.9399087"
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
    logger.info(`MapBox API successfully retrieved a response with internal status code ${response.data.code}`, logObj(response.status, req, startTime));
    if (response.status === 200 && response.data.code === "Ok"){
      return res.status(200).json(response.data.trips[0].geometry);
    } else {
      return res.status(response.status).json(response.data);
    }
  } catch (error) {
    logger.error("Some error occurred during the MapBox Optimize API call", logObj(null, req, startTime, error));
    res.status(500).json(error);
  }
  

};