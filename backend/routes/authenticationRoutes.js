import express from "express";
import { registerController } from "../controllers/registerController.js";
// import { deleteUserController } from "../controllers/deleteUserController.js";
import { loginController } from "../controllers/loginController.js";
import { logoutController } from "../controllers/logoutController.js";
import { requireAuthentication } from "../middleware/authMiddleware.js";
import { checkDatabaseForAuth } from "../middleware/dbIsUpMiddleware.js";
import { config } from "../configs/config.js";

const router = express.Router();

// Apply database check to ALL authentication routes
router.use(checkDatabaseForAuth);

router.post("/logout", logoutController);

router.post("/login", loginController);

router.post("/register", registerController);

// TODO this should be accessible only to the admin role
// Removed for data-safety
// router.delete("/delete-user", deleteUserController);

const user = {
  id: "01",
  email: "admin@test.com",
  login_time: "2025-08-14T10:55:47.772Z"
}

if (!config.is_prod) {
  console.log("Skip authentication")
  router.get("/me", (req, res) => {
    return res.status(200).json({
        message: "User authenticated successfully.",
        user
      });
  });
} else {
  router.get("/me", requireAuthentication, (req, res) => {
    return res.status(200).json({
        message: "User authenticated successfully.",
        user: req.user
      });
});
}



export default router;