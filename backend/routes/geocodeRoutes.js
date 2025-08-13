import express from "express";
import { geocodeController } from "../controllers/geocodeController.js";
import { optimizeController } from "../controllers/optimizeController.js";
import { optimizeV2Controller } from "../controllers/optimizeV2Controller.js";
import { attractionDetailsController } from "../controllers/attractionDetailsController.js";
import { cityController, countryController } from "../controllers/countryCityController.js";
import { geocodeFallbackController } from "../controllers/geocodingFallbackController.js";
import { requireAuthentication } from "../middleware/authMiddleware.js";
import { checkDatabaseForAuth } from "../middleware/dbIsUpMiddleware.js";

const router = express.Router();

router.use(checkDatabaseForAuth);
router.use(requireAuthentication);

// Define the geocode route
router.get("/geocode", geocodeController); 

// TODO add requireAuthentication
router.get("/geocode-fallback", geocodeFallbackController);

router.get("/countries", countryController);

router.get("/cities", cityController);

router.get("/optimize", optimizeController);

router.get("/v2/optimize", optimizeV2Controller);

// TODO either remove this or keep it based on decision taken for the controller
router.get("/attraction-details", attractionDetailsController);

export default router;