import logger from "../logger.js";
import logObj from "../loggerHelper.js";
import { deleteUser } from "../services/userService.js";
import { userDeletionSuccessMessage, userDeletionErrorMessageMissingEmailAddressQueryParam, userDeletionErrorMessageRequestFailed, userDeletionErrorMessageRequestFailedWithError } from "../utils/constants.js";

export const deleteUserController = async (req, res) => {
  const startTime = Date.now();
  const { email } = req.query;

  if (!email) {
    logger.error(userDeletionErrorMessageMissingEmailAddressQueryParam, logObj(400, req, startTime));
    return res.status(400).json({message: userDeletionErrorMessageMissingEmailAddressQueryParam });
  }

  try {
    const deletedUser = await deleteUser(email);
    if (deletedUser.acknowledged === true) {
      logger.info(userDeletionSuccessMessage(email), logObj(204, req, startTime));
      return res.status(200).json({message: userDeletionSuccessMessage(email)});
    } else {
      logger.error(userDeletionErrorMessageRequestFailed(email), logObj(500, req, startTime));
      return res.status(500).json({message: userDeletionErrorMessageRequestFailed(email)});
    }
  } catch (error) {
    logger.error(userDeletionErrorMessageRequestFailedWithError(email, error), logObj(500, req, startTime));
    return res.status(500).json({message: userDeletionErrorMessageRequestFailedWithError(email, error)});
  }

};