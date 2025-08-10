import bcrypt from "bcrypt";
import logger from "../logger.js";
import {errorObj, infoLog} from "../loggerHelper.js";
import { registerUser, getUserByEmail } from "../services/userService.js";
import { ERROR_OBJECTS, INFO_MESSAGE } from "../utils/constants.js";

const METHOD_FAILURE_MESSAGE = "registerController failed.";

export const registerController = async (req, res) => {
  const startTime = Date.now();
  const { email, password } = req.body;
  let err;

  if (!email) {
    err = ERROR_OBJECTS.BAD_REQUEST("email");
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err);
  }

  if (!password) {
    err = ERROR_OBJECTS.BAD_REQUEST("password");
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err);
  }
  
  try {
    // Check if there is an existing user
    if (await getUserByEmail(email)){
      err = ERROR_OBJECTS.USER_ALREADY_EXISTS;
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(err.statusCode).json(err);
    };

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await registerUser({
      email_address: email,
      password: hashedPassword,
      created_at: new Date(),
      date: new Date().toISOString().split('T')[0]
    });

    infoLog(req, startTime, INFO_MESSAGE.USER_REGISTERED(email));
    res.status(201).json({
      message: INFO_MESSAGE.USER_REGISTERED(email)
    });
  } catch(error) {
    logger.error(`${METHOD_FAILURE_MESSAGE} for ${email}`, errorObj(req, startTime, error));
    res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
  
};