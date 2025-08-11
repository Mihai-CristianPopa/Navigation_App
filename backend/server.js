import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import logger from "./logger.js";
import dbClient from "./db/mongoClient.js";
import geocodeRoutes from "./routes/geocodeRoutes.js";
import authenticationRoutes from "./routes/authenticationRoutes.js";
import { config } from "./configs/config.js";

const app = express();
const port = config.port;
const frontendOrigin = config.frontendOrigin;

// Middleware
app.use(cors({
  origin: [frontendOrigin, "http://127.0.0.1:5500", "https://mihai-cristianpopa.github.io"],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

function setupRoutes() {
  // Routes
  app.use("/api", geocodeRoutes);

  app.use("/authentication", authenticationRoutes);

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({
      status: app.locals.dbIsDown ? "DEGRADED" : "OK",
      database: app.locals.dbIsDown ? "DOWN" : "UP",
      timestamp: new Date().toISOString()
    });
  });
}

async function connectToDatabase() {
  try {
    await dbClient.connect();
    logger.info("Connection to MongoDB provided");
    app.locals.dbIsDown = false;
  } catch (mongoError) {
    logger.error("Connection to MongoDB failed, only uncached requests will work");
    app.locals.dbIsDown = true;
  }
}

async function startServer() {

  await connectToDatabase();

  setupRoutes();

  app.listen(port, () => {
    logger.info(`Geocoding server running on http://localhost:${port}`);
    logger.info(`Accepting CORS from ${frontendOrigin}, http://127.0.0.1:5500 and https://mihai-cristianpopa.github.io`);
    logger.info(`Database status: ${app.locals.dbIsDown ? 'DOWN' : 'UP'}`);
  });
}

startServer();