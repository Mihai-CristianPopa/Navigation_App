import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors";
import logger from "./logger.js";
import { getAttraction, insertAttraction } from "./services/attractionService.js"

dotenv.config(); // Load .env -> process.env

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

// app.use(cors());

// OR: more strict — allow only your frontend
logger.info(`Accepting CORS from ${FRONTEND_ORIGIN}`);
app.use(cors({ origin: FRONTEND_ORIGIN }));

app.get("/api/geocode", async (req, res) => {
  const { place } = req.query;

  if (!place) {
    logger.error("Missing 'place' query parameter", {
      statusCode: 400,
      route: req.originalUrl,
      method: req.method
    });
    return res.status(400).json({ error: "Missing place query" });
  }
  
  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) {
    logger.error("The API Key for LocationIQ is not available", {
      statusCode: 403,
      route: req.originalUrl,
      method: req.method
    });
    return res.status(403).json({ error: "Missing authorization" });
  }

  try {
    const cachedAttraction = await getAttraction(place);
    if (cachedAttraction) {
      res.set("X-Cache", "HIT");
      res.status(200).json(cachedAttraction)
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
      const attractionToBeAdded = response.data[0];
      attractionToBeAdded.attraction_search_name = place;
      const insertedAttraction = await insertAttraction(attractionToBeAdded);
      logger.info(`Attraction with id ${insertedAttraction.insertedId.toString()} has been added to the attractions collection`)
      res.set("X-Cache", "MISS");
      res.status(200).json(response.data);
    }
  } catch (err) {
    logger.error("Failed to geocode", {
      statusCode: err.status,
      message: err.message,
      route: req.originalUrl,
      method: req.method,
      place: place
    });
    res.status(500).json({ error: "Failed to geocode" });
  }
});

app.listen(PORT, () => {
  logger.info(`Geocoding server running on http://localhost:${PORT}`);
});
