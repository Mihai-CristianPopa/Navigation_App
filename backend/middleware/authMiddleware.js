import { ObjectId } from "mongodb";
import logger from "../logger.js";
import logObj from "../loggerHelper.js";
import { getSessionId, clearSessionCookie, isSessionExpired } from "../utils/sessionCookieHandling.js";
import { deleteLoginSession, getLoginSession } from "../services/sessionService.js";

export const requireAuthentication = async (req, res, next) => {
  const startTime = Date.now();

  const sessionId = getSessionId(req);

  if (!sessionId) {
    logger.error("No session cookie found", logObj(401, req, startTime));
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
      authenticated: false
    });
  }

  if (!ObjectId.isValid(sessionId)) {
    logger.warn(`Invalid session ID format: ${sessionId}`, logObj(401, req, startTime));
    clearSessionCookie(res);
    return res.status(401).json({
      success: false,
      message: "Invalid session",
      authenticated: false
    });
  }

  try {
    const loginSession = await getLoginSession(sessionId);
    if (!loginSession) {
      logger.warn(`Session not found in the database: ${sessionId}`, logObj(401, req, startTime));
      return res.status(401).json({
        success: false,
        message: "Session not found",
        authenticated: false
      });
    }

    // Check the difference between the date of creation and the current moment and see whether it is smaller than
    // the expiration date
    if (isSessionExpired(loginSession.login_time)) {
      logger.info(`Session expired: ${sessionId}`, logObj(401, req, startTime));
    
      // Clean up expired session from database
    const sessionDeleted = await deleteLoginSession(sessionId);
    if (sessionDeleted.deletedCount !== 0) {
      logger.info(`Session ${sessionId} deleted successfully`, logObj(null, req, startTime));
    } else {
      logger.warn(`Deletion of the expired session: ${sessionId} failed`, logObj(401, req, startTime));
    }
    clearSessionCookie(res);
    
    return res.status(401).json({
        success: false,
        message: "Session expired",
        authenticated: false
      });
    }

    // Session is valid and active
    req.user = {
      id: loginSession.user_id,
      email: loginSession.email_address,
      loginTime: loginSession.login_time
    }

    logger.info(`Valid session for user: ${loginSession.email_address}`, logObj(200, req, startTime));
    next();

  } catch (error) {
    logger.error(`Session validation failed: ${error.message}`, logObj(500, req, startTime));
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      authenticated: false
    });
  }
};