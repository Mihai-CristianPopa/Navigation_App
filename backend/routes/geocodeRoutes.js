import express from "express";
import { geocodeController } from "../controllers/geocodeController.js";
import { optimizeController } from "../controllers/optimizeController.js";
import { optimizeV2Controller } from "../controllers/optimizeV2Controller.js";
import { attractionDetailsController } from "../controllers/attractionDetailsController.js";
import { cityController, countryController } from "../controllers/countryCityController.js";
import { geocodeFallbackController } from "../controllers/geocodingFallbackController.js";
import { requireAuthentication } from "../middleware/authMiddleware.js";

const router = express.Router();


// Define the geocode route
router.get("/geocode", requireAuthentication, geocodeController);

// TODO add requireAuthentication
router.get("/geocode-fallback", requireAuthentication, geocodeFallbackController);

router.get("/countries", requireAuthentication, countryController);

router.get("/cities", requireAuthentication, cityController);

router.get("/optimize", requireAuthentication, optimizeController);

router.get("/v2/optimize", requireAuthentication, optimizeV2Controller);

// TODO either remove this or keep it based on decision taken for the controller
router.get("/attraction-details", requireAuthentication, attractionDetailsController);

export default router;