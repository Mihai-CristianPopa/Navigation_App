import logger from "../logger.js";
import logObj from "../loggerHelper.js";
import { deleteLoginSession } from "../services/sessionService.js";
import { getSessionId, clearSessionCookie } from "../utils/sessionCookieHandling.js";

export const logoutController = async (req, res) => {
  const startTime = Date.now();

  const sessionId = getSessionId(req);

  if (!sessionId) {
    logger.error("Logout attempt without session cookie", logObj(401, req, startTime));
    return res.status(401).json({
      success: false,
      message: "No active session found"
    });
  }

  try {
    const sessionDeleted = await deleteLoginSession(sessionId);
    if (sessionDeleted.deletedCount !== 0) {
      logger.info(`Session ${sessionId} deleted successfully`, logObj(null, req, startTime));
    } else {
      logger.warn(`Logout attempt with invalid session: ${sessionId}`, logObj(401, req, startTime));
    }

    clearSessionCookie(res);

    logger.info("User was logged out successfully", logObj(200, req, startTime));
    return res.status(200).json({
        success: true,
        message: "User was logged out sucessfully"
    })

  } catch(error) {
    logger.error(`Logout failed. ${error.message}`, logObj(500, req, startTime));
  }

  clearSessionCookie(res);

  return res.status(500).json({
      success: false,
      message: 'Internal server error during logout'
  });
};