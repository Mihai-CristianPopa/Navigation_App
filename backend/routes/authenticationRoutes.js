import express from "express";
import { registerController } from "../controllers/registerController.js";
// import { deleteUserController } from "../controllers/deleteUserController.js";
import { loginController } from "../controllers/loginController.js";
import { logoutController } from "../controllers/logoutController.js";
import { requireAuthentication } from "../middleware/authMiddleware.js";
import { checkDatabaseForAuth } from "../middleware/dbIsUpMiddleware.js";

const router = express.Router();

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