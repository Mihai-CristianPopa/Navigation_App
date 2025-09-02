import bcrypt from "bcrypt";
import logger from "../logger.js";
import { errorObj, warnLog, infoLog } from "../loggerHelper.js";
import { ERROR_OBJECTS, INFO_MESSAGE, loginErrorMessageWrongCredentialsFrontendFacing } from "../utils/constants.js";
import { getUserByEmail } from "../services/userService.js";
import { createLoginSession } from "../services/sessionService.js";
import { setSessionCookie, createLoginSessionClearingIndex, sessionExpirationTimeInMiliseconds } from "../utils/sessionCookieHandling.js";

export const loginController = async (req, res) => {
  const startTime = Date.now();
  const { email, password } = req.body;
  const METHOD_FAILURE_MESSAGE = "loginController failed.";
  function handleLoginError(err, frontendMessage=null) {
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      if (frontendMessage) err.message = frontendMessage;
      return res.status(err.statusCode).json(err);
  }

  /** Needs to be executed only once, or in case something the storing time of the cookies changes. */
  async function setClearingIndexForSessionCookies() {
    const sessionClearingIndex =  await createLoginSessionClearingIndex();
    if (!sessionClearingIndex) {
      warnLog(req, startTime, "TTL for creating the login sessions failed to be created");
    }
  }

  if (!email) {
    return handleLoginError(ERROR_OBJECTS.BAD_REQUEST("email"));
  }

  if (!password) {
    return handleLoginError(ERROR_OBJECTS.BAD_REQUEST("password"));
  }

  try {
    const existingUser = await getUserByEmail(email);
    if (!existingUser) {
      return handleLoginError(ERROR_OBJECTS.NO_USER_FOUND_WITH_EMAIL(email), loginErrorMessageWrongCredentialsFrontendFacing);
    }

    const isSamePassword = bcrypt.compareSync(password, existingUser.password);
    if (!isSamePassword) {
      return handleLoginError(ERROR_OBJECTS.WRONG_PASSWORD(email), loginErrorMessageWrongCredentialsFrontendFacing);
    }
    
    // Only try reseting the clearing index if the time to maintain the cookies in the db changes
    if (sessionExpirationTimeInMiliseconds  !== 24 * 60 * 60 * 1000) await setClearingIndexForSessionCookies();
    
    const sessionData = await createLoginSession({
      user_id: existingUser._id,
      email_address: existingUser.email_address,
      login_time: new Date().toISOString()
    });

    infoLog(req, startTime, INFO_MESSAGE.LOGIN_SESSION_CREATED(sessionData.insertedId.toString(), email));

    setSessionCookie(res, sessionData.insertedId.toString());

    infoLog(req, startTime, INFO_MESSAGE.USER_LOGGED_IN(email));
    return res.status(200).json({
      message: INFO_MESSAGE.USER_LOGGED_IN(email)
    })

  } catch(error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
  

};