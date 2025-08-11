import { ObjectId } from "mongodb";
import logger from "../logger.js";
import { warnLog, infoLog, errorObj } from "../loggerHelper.js";
import { getSessionId, clearSessionCookie, isSessionExpired } from "../utils/sessionCookieHandling.js";
import { deleteLoginSession, getLoginSession } from "../services/sessionService.js";
import { ERROR_OBJECTS } from "../utils/constants.js";

export const requireAuthentication = async (req, res, next) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "requireAuthentication middleware failed.";

  async function handleAuthError(err, sessionId, removeCookie = true) {
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      if (removeCookie === true && sessionId) {
        await deleteCookieFromDb(sessionId);
        clearSessionCookie(res);
      }
      return res.status(err.statusCode).json(err);
  }

  async function deleteCookieFromDb(sessionId) {
    const sessionDeleted = await deleteLoginSession(sessionId);
    if (sessionDeleted.deletedCount !== 0) {
      infoLog(req, startTime, `Session ${sessionId} deleted successfully`);
    } else {
      warnLog(req, startTime, `Deletion of the expired session: ${sessionId} failed`);
    }
  }

  try {
    const sessionId = getSessionId(req);

    if (!sessionId) {
      return handleAuthError(ERROR_OBJECTS.NO_COOKIE_FOUND(), sessionId, false);
    }

    if (!ObjectId.isValid(sessionId)) {
      return handleAuthError(ERROR_OBJECTS.INVALID_SESSION_ID(), sessionId);
    }

    const loginSession = await getLoginSession(sessionId);
    if (!loginSession) {
      return handleAuthError(ERROR_OBJECTS.SESSION_NOT_FOUND(), sessionId);
    }

    // Check the difference between the date of creation and the current moment and see whether it is smaller than
    // the expiration date
    if (isSessionExpired(loginSession.login_time)) {
      return handleAuthError(ERROR_OBJECTS.SESSION_EXPIRED(), sessionId, true);
      }

    // Session is valid and active
    req.user = {
      id: loginSession.user_id,
      email: loginSession.email_address,
      loginTime: loginSession.login_time
    }

    infoLog(req, startTime, `Valid session for user: ${loginSession.email_address}.`);
    next();
  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};