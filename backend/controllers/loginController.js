import bcrypt from "bcrypt";
import logger from "../logger.js";
import logObj from "../loggerHelper.js";
import { loginErrorMessageMissingEmailAddressFromBody, loginErrorMessageMissingPasswordFromBody, loginErrorMessageNoUserFoundForTheEmail, loginErrorMessageWrongPassword, loginErrorMessageWrongCredentialsFrontendFacing } from "../utils/constants.js";
import { getUserByEmail } from "../services/userService.js";
import { createLoginSession } from "../services/sessionService.js";
import { setSessionCookie, createLoginSessionClearingIndex } from "../utils/sessionCookieHandling.js";
import { start } from "repl";

export const loginController = async (req, res) => {
  const startTime = Date.now();
  const { email, password } = req.body;

  if (!email) {
    logger.error(loginErrorMessageMissingEmailAddressFromBody, logObj(400, req, startTime));
    return res.status(400).json({
      success: false,
      message: loginErrorMessageMissingEmailAddressFromBody
    });
  }

  if (!password) {
    logger.error(loginErrorMessageMissingPasswordFromBody, logObj(400, req, startTime));
    return res.status(400).json({
      success: false,
      message: loginErrorMessageMissingPasswordFromBody
    });
  }

  try {
    logger.info(`Login attempt started for user with email ${email}`, logObj(null, req, startTime));
    const existingUser = await getUserByEmail(email);
    if (!existingUser) {
      logger.error(loginErrorMessageNoUserFoundForTheEmail(email), logObj(401, req, startTime));
      return res.status(401).json({
        success: false,
        message: loginErrorMessageWrongCredentialsFrontendFacing
      });
    }

    const isSamePassword = bcrypt.compareSync(password, existingUser.password);
    if (!isSamePassword) {
      logger.error(loginErrorMessageWrongPassword(email), logObj(401, req, startTime));
      return res.status(401).json({
        success: false,
        message: loginErrorMessageWrongCredentialsFrontendFacing
      });
    }
    
    // const sessionExpirationTimeInSeconds = 24 * 60 * 60 * 1000;
    const sessionClearingIndex =  await createLoginSessionClearingIndex();
    if (!sessionClearingIndex) {
      logger.warn("TTL for creating the login sessions failed to be created");
    }
    
    const sessionData = await createLoginSession({
      user_id: existingUser._id,
      email_address: existingUser.email_address,
      login_time: new Date().toISOString()
    });

    logger.info(`Login session with id ${sessionData.insertedId.toString()} has been created for user with email address ${email}`, logObj(null, req, startTime));

    setSessionCookie(res, sessionData.insertedId.toString());
    // res.cookie('sid', sessionData.insertedId.toString(), {
    //   // domain:   '.example.com',  // valid on any *.example.com
    //   // path:     '/',             // sent for every request to api.example.com
    //   httpOnly: true,            // JS on the page can’t read document.cookie
    //   // secure:   true,            // only over HTTPS
    //   sameSite: 'none',          // allow cross-site cookie sending
    //   maxAge:   sessionExpirationTimeInSeconds  // expires in 24 hours
    // });

    logger.info(`User with email ${email} has been logged in.`, logObj(200, req, startTime));
    return res.status(200).json({
      success: true,
      message: `User with email ${email} has been logged in.`
    })

  } catch(error) {
    logger.error(`Login failed for ${email}: ${error.message}`, logObj(500, req, startTime));
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
  

};