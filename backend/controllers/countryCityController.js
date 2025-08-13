import logger from "../logger.js";
import { infoLog, errorObj } from "../loggerHelper.js";
import { ERROR_OBJECTS } from "../utils/constants.js";
import { Country, City } from "country-state-city";

export const countryController = async (req, res) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "countryController failed.";
  try {
    const countryObjects = Country.getAllCountries();
    const countries = countryObjects.map(country => ({
      name: country.name,
      code: country.isoCode
    }));
    res.status(200).json({
      countries
    });
    infoLog(req, startTime, "Countries extracted successfully.");
  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
}

export const cityController = async (req, res) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "cityController failed.";
  const {countryCode} = req.query;
  try {
    if (!countryCode) {
      const error = ERROR_OBJECTS.BAD_REQUEST("countryCode");
      logger.error(errorObj(req, startTime, error));
      return res.status(error.statusCode).json(error);
    }
    const cityObjects = City.getCitiesOfCountry(countryCode);
    const cityNames = cityObjects.map(city => city.name);
    res.status(200).json({
      cityNames
    });
    infoLog(req, startTime, `Cities extracted successfully for ${countryCode}.`);
  } catch {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
}