import logger from "../logger.js";
import { errorObj, infoLog } from "../loggerHelper.js";
import { deleteUser } from "../services/userService.js";
import { userDeletionSuccessMessage, ERROR_OBJECTS } from "../utils/constants.js";

const METHOD_FAILURE_MESSAGE = "deleteUserController failed.";

export const deleteUserController = async (req, res) => {
  const startTime = Date.now();
  const { email } = req.query;
  let err;

  if (!email) {
    err = ERROR_OBJECTS.BAD_REQUEST("email");
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err);
  }

  try {
    const deletedUser = await deleteUser(email);
    if (deletedUser.acknowledged === true) {
      infoLog(req, startTime, userDeletionSuccessMessage(email));
      return res.status(200).json({message: userDeletionSuccessMessage(email)});
    } else {
      err = ERROR_OBJECTS.DELETION_FAILED(email);
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(500).json(err);
    }
  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }

};