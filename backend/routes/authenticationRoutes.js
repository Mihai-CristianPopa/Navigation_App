import express from "express";
import { registerController } from "../controllers/registerController.js";
import { deleteUserController } from "../controllers/deleteUserController.js";
import { loginController } from "../controllers/loginController.js";
import { logoutController } from "../controllers/logoutController.js";
import { requireAuthentication } from "../middleware/authMiddleware.js";

const router = express.Router();

// Database check middleware for all authentication routes
const checkDatabaseForAuth = (req, res, next) => {
  // This only runs when someone hits /authentication/* routes
  if (req.app.locals.dbIsDown) {
    return res.status(503).json({
      success: false,
      message: "Authentication services are temporarily unavailable.",
      error: "DATABASE_UNAVAILABLE"
    });
  }
  next(); // Continue to the actual route handler
};

// Apply database check to ALL authentication routes
router.use(checkDatabaseForAuth);

router.post("/logout", logoutController);

router.post("/login", loginController);

router.post("/register", registerController);

// TODO this should be accessible only to the admin role
// Removed for data-safety
// router.delete("/delete-user", deleteUserController);

router.get("/me", requireAuthentication, (req, res) => {
  return res.status(200).json({
      message: "User authenticated successfully.",
      user: req.user
    });
});

export default router;