import express from "express";
import { geocodeController } from "../controllers/geocodeController.js";
import { optimizeController } from "../controllers/optimizeController.js";
import { requireAuthentication } from "../middleware/authMiddleware.js";

const router = express.Router();


// Define the geocode route
router.get("/geocode", requireAuthentication, geocodeController);

router.get("/optimize", requireAuthentication, optimizeController);

export default router;