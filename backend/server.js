import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import logger from "./logger.js";
import dbClient from "./db/mongoClient.js";
import geocodeRoutes from "./routes/geocodeRoutes.js";
import authenticationRoutes from "./routes/authenticationRoutes.js";
import { config } from "./configs/config.js";
// import { createClearingIndex } from "./services/apiTrackingService.js";


const app = express();
const port = config.port;
const frontendOrigin = config.frontendOrigin;

// Middleware
app.use(cors({ origin: [frontendOrigin, "http://127.0.0.1:5500"] }));
app.use(express.json());
app.use(cookieParser());

// // Routes
// app.use("/api", geocodeRoutes);

// app.use("/authentication", authenticationRoutes);

// // Health check endpoint
// app.get("/health", (req, res) => {
//   res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
// });

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
  // try {
  //   await dbClient.connect();
  //   logger.info("Connection to MongoDB provided");
  //   app.locals.dbIsDown = false;
  // } catch (mongoError) {
  //   logger.error("Connection to MongoDB failed, only uncached requests will work");
  //   app.locals.dbIsDown = true;
  // }
  await connectToDatabase();

  setupRoutes();


  // This needed to be ran only once so removing it for now
  // try {
  //   await createClearingIndex();
  //   logger.info("Clearing index for API requests table has been created");
  // } catch (error) {
  //   logger.error("Error when creating the clearing index for the API requests table", error);
  // }
  
  app.listen(port, () => {
    logger.info(`Geocoding server running on http://localhost:${port}`);
    logger.info(`Accepting CORS from ${frontendOrigin} and http://127.0.0.1:5500`);
    logger.info(`Database status: ${app.locals.dbIsDown ? 'DOWN' : 'UP'}`);
  });
}

startServer();