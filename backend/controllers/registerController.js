import bcrypt from "bcrypt";
import logger from "../logger.js";
import logObj from "../loggerHelper.js";
import { registerUser, getUserByEmail } from "../services/userService.js";
// import { createLoginSession } from "../services/sessionService.js";
import { registrationErrorMessageMissingEmailAddressFromBody, registrationErrorMessageMissingPasswordFromBody, registrationErrorMessageUserWithEmailExists } from "../utils/constants.js";

export const registerController = async (req, res) => {
  const startTime = Date.now();
  const { email, password } = req.body;

  if (!email) {
    logger.error(registrationErrorMessageMissingEmailAddressFromBody, logObj(400, req, startTime));
    return res.status(400).json({
      success: false,
      message: registrationErrorMessageMissingEmailAddressFromBody
    });
  }

  if (!password) {
    logger.error(registrationErrorMessageMissingPasswordFromBody, logObj(400, req, startTime));
    return res.status(400).json({
      success: false,
      message: registrationErrorMessageMissingPasswordFromBody
    });
  }
  
  try {
    // Check if there is an existing user
    if (await getUserByEmail(email)){
      logger.error(registrationErrorMessageUserWithEmailExists, logObj(404, req, startTime));
      return res.status(404).json({
        success: false,
        message: registrationErrorMessageUserWithEmailExists
      });
    };

    logger.info(`Registration attempt started for user with email ${email}`, logObj(null, req, startTime));
    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await registerUser({
      email_address: email,
      password: hashedPassword,
      created_at: new Date(),
      date: new Date().toISOString().split('T')[0]
    });

    // Removing the session logic for now from the registration.
    // const sessionData = await createLoginSession({
    //   userId: newUser.insertedId.toString(),
    //   email: newUser.email_address,
    //   login_time: new Date().toISOString()
    // });

    // res.cookie('sid', sessionData.insertedId.toString(), {
    //   // domain:   '.example.com',  // valid on any *.example.com
    //   // path:     '/',             // sent for every request to api.example.com
    //   httpOnly: true,            // JS on the page can’t read document.cookie
    //   // secure:   true,            // only over HTTPS
    //   sameSite: 'none',          // allow cross-site cookie sending
    //   maxAge:   24 * 60 * 60 * 1000  // expires in 24 hours
    // });

    logger.info(`User registered successfully: ${email}`, logObj(null, req, startTime));
    res.status(201).json({
      success: true,
      message: 'User registered successfully'
    });
  } catch(error) {
    logger.error(`Registration failed for ${email}: ${error.message}`, logObj(500, req, startTime));

    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
  
};