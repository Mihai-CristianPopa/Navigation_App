const errorMessageMissingBodyElement = " failed due to the body of the request missing the ";

const registrationErrorMessageMissingBodyElement = "Registration" + errorMessageMissingBodyElement;

const loginErrorMessageMissingBodyElement = "Login" + errorMessageMissingBodyElement;

export const registrationErrorMessageMissingEmailAddressFromBody = registrationErrorMessageMissingBodyElement + "email address.";

export const registrationErrorMessageMissingPasswordFromBody = registrationErrorMessageMissingBodyElement + "password.";

export const registrationErrorMessageUserWithEmailExists = "Registration failed because there already exists an user with this email address.";

export const loginErrorMessageMissingEmailAddressFromBody = loginErrorMessageMissingBodyElement + "email address.";

export const loginErrorMessageMissingPasswordFromBody = loginErrorMessageMissingBodyElement + "password.";

export const loginErrorMessageNoUserFoundForTheEmail = (email) => {
  `Login failed because there is no user with the email address ${email}`;
};

export const loginErrorMessageWrongPassword = (email) => {
  `Login failed due to the fact that the introduced password is wrong for the user with email address ${email}`;
};

export const loginErrorMessageWrongCredentialsFrontendFacing = "Login failed due to invalid email or password";

export const userDeletionErrorMessageMissingEmailAddressQueryParam = "User deletion failed due to email not existing as a query parameter.";

export const userDeletionSuccessMessage = (email) => {
  return `Deletion of the user with the email address ${email} was successful.`;
};

const userDeletionErrorMessageFailure = "User deletion failed for the user with the email address ";

export const userDeletionErrorMessageRequestFailedWithError = (email, error) =>{
  return userDeletionErrorMessageFailure + `${email} ` + `with the following error message ${error?.message}.`;
} 
export const userDeletionErrorMessageRequestFailed = (email) =>{
  return userDeletionErrorMessageFailure + `${email}.`;
}

export const LIMIT = {
  LOCATION_IQ_TOTAL_DAILY_REQUEST: 5000,

  MAPBOX_TOTAL_DAILY_REQUEST_LIMIT: 3300,
  
  // Suppose we have 10 users
  LOCATION_IQ_PER_USER_DAILY_REQUEST_LIMIT: 500,
  MAPBOX_PER_USER_DAILY_REQUEST_LIMIT: 3300
}

export const LOG_MESSAGE = {
  SUCCESS: {
    MBOX_DIRECTIONS_MATRIX: "Mapbox Directions Matrix API successfully returned a response.",
    OWN_ATTRACTIONS_ORDER_ALG: "Own attractions ordering algorithm finished successfully.",
    MBOX_DIRECTIONS_AFTER_ORDERING: "Mapbox Directions V5 API successfully returned a response.",
    GEOCODE_CACHE_FOUND: "Response for the Geocoding request found in the cache.",
    DAILY_EXTERNAL_API_REQUEST_COUNT: (count, externalApi, endpoint) => {
      return `Today there have been ${count} ${externalApi}/${endpoint} request(s) made.`;
    } 
  }
};

export const INFO_MESSAGE = {
  MBOX_DIRECTIONS_MATRIX: "Mapbox Directions Matrix API successfully returned a response.",
  OWN_ATTRACTIONS_ORDER_ALG: "Own attractions ordering algorithm finished successfully.",
  MBOX_DIRECTIONS_AFTER_ORDERING: "Mapbox Directions V5 API successfully returned a response.",
  GEOCODE_CACHE_FOUND: "Response for the Geocoding request found in the cache.",
  DAILY_EXTERNAL_API_REQUEST_COUNT: (count, externalApi, endpoint, version) => {
    return `Today there have been ${count} ${externalApi}/${endpoint}/${version} request(s) made.`;
  },
  ATTRACTION_CACHED: (dbAttractionId) => `Attraction with id ${dbAttractionId} has been added to the attractions collection from the LocationIQ API`,
  ATTRACTION_CACHING_FAILED: "Attraction information cachinh to the database failed",
  ATTRACTION_NOT_CACHED_ON_PURPOSE: "Attraction information has not been cached to the database since writeToCache has been set as false", 
}

export const ERROR_OBJECTS = {
    BAD_REQUEST: (missingField) =>  { 
        return {
          statusCode: 400,
          message: "Missing required inputs. Ensure that all necessary fields are included or calculated correctly.",
          details: `Missing field: ${missingField}`
        }
    },
    MISSING_API_KEY: (apiKeyUsage) => {
        return {
          statusCode: 500,
          message: "Internal server error. Backend configuration is missing an API key.",
          details: `Missing key: ${apiKeyUsage}`
        }
    },
    EXTERNAL_API_USER_LIMIT: (extrernalApi, endpoint, version) => {
      return {
        statusCode: 429,
        message: `Daily ${extrernalApi}/${endpoint}/${version} API limit reached for the user`,
      }
    },
    FRONTEND_API_USER_LIMIT: (kindOfRequests) => {
      return {
        statusCode: 429,
        message: `You have reached the maximum number of ${kindOfRequests} requests today. Please try again tomorrow.`
      }
    },
    EXTERNAL_API_TOTAL_LIMIT: (extrernalApi, endpoint, version) => {
      return {
        statusCode: 429,
        message: `Daily ${extrernalApi}/${endpoint}/${version} API total limit reached`,
      }
    },
    FRONTEND_API_TOTAL_LIMIT: (kindOfRequests) => {
      return {
        statusCode: 429,
        message: `The server has reached its maximum number of ${kindOfRequests} requests today. Please try again tomorrow.`
      }
    },
    FRONTEND_INTERNAL_SERVER_ERROR: {
      statusCode: 500,
      message: "Internal server error. Please try again later.",
    }
}

export const EXTERNAL_APIS = {
  LOCATION_IQ: {
    NAME: "LocationIq",
    ENDPOINTS: {
      GEOCODE: {
        NAME: "Geocode",
        VERSION: "v1"
      }
    }
  },
  MAPBOX: {
    NAME: "Mapbox",
    ENDPOINTS: {
      DIRECTIONS_MATRIX: {
        NAME: "Directions-Matrix",
        VERSION: "v1"
      },
      DIRECTIONS: {
        NAME: "Directions",
        VERSION: "v5"
      },
      OPTIMIZED_TRIPS: {
        NAME: "Optimized-Trips",
        VERSION: "v1"
      },
    }
  }
}

export const ENDPOINTS = {
  GEOCODE: "Geocode",
  DIRECTIONS_MATRIX: "Directions-Matrix",
  DIRECTIONS: "Directions",
  OPTIMIZED_TRIPS: "Optimized-Trips"
}

export const API_VERSIONS = {
  GEOCODE: "v1",
  DIRECTIONS_MATRIX: "v1",
  DIRECTIONS: "v5",
  OPTIMIZED_TRIPS: "v1"
}



