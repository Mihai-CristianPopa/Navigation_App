import express from "express";
import { geocodeController } from "../controllers/geocodeController.js";
import { optimizeController } from "../controllers/optimizeController.js";
import { optimizeV2Controller } from "../controllers/optimizeV2Controller.js";
import { attractionDetailsController } from "../controllers/attractionDetailsController.js";
import { requireAuthentication } from "../middleware/authMiddleware.js";

const router = express.Router();


// Define the geocode route
router.get("/geocode", requireAuthentication, geocodeController);

router.get("/optimize", requireAuthentication, optimizeController);

router.get("/v2/optimize", requireAuthentication, optimizeV2Controller);

// TODO either remove this or keep it based on decision taken for the controller
router.get("/attraction-details", requireAuthentication, attractionDetailsController);

export default router;