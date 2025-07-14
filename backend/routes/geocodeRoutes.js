import express from "express";
import { geocodeController } from "../controllers/geocodeController.js";

const router = express.Router();

// Define the geocode route
router.get("/geocode", geocodeController);

export default router;