import logger from "../logger.js";
import { warnLog, infoLog, errorObj } from "../loggerHelper.js";
import { deleteLoginSession } from "../services/sessionService.js";
import { getSessionId, clearSessionCookie } from "../utils/sessionCookieHandling.js";
import { ERROR_OBJECTS, INFO_MESSAGE } from "../utils/constants.js";

export const logoutController = async (req, res) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "logoutController failed.";

  function handleLogoutError(err) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
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
      return handleLogoutError(ERROR_OBJECTS.NO_COOKIE_LOGOUT());
    }
    deleteCookieFromDb(sessionId);

    clearSessionCookie(res);

    infoLog(req, startTime, INFO_MESSAGE.USER_LOGGED_OUT);

    return res.status(200).json({
        message: INFO_MESSAGE.USER_LOGGED_OUT
    })

  } catch(error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
  }

  clearSessionCookie(res);

  return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
};