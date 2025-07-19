import express from "express";
import { geocodeController } from "../controllers/geocodeController.js";
import { optimizeController } from "../controllers/optimizeController.js";

const router = express.Router();

// Define the geocode route
router.get("/geocode", geocodeController);

router.get("/optimize", optimizeController);

export default router;