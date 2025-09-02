export const registrationErrorMessageUserWithEmailExists = (email) => `Registration failed because there already exists an user with email address ${email}.`;

export const loginErrorMessageNoUserFoundForTheEmail = (email) => `Login failed because there is no user with the email address ${email}`;

export const loginErrorMessageWrongPassword = (email) => `Login failed due to the fact that the introduced password is wrong for the user with email address ${email}`;

export const loginErrorMessageWrongCredentialsFrontendFacing = "Login failed due to invalid email or password";

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

const STANDARD_UNAUTH_COOKIE_OBJ = {
  statusCode: 401,
  message: "User is not authenticated."
}

export const LIMIT = {
  LOCATION_IQ_TOTAL_DAILY_REQUEST: 5000,

  MAPBOX_TOTAL_DAILY_REQUEST_LIMIT: 3300,
  
  // Suppose we have 10 users
  LOCATION_IQ_PER_USER_DAILY_REQUEST_LIMIT: 500,
  MAPBOX_PER_USER_DAILY_REQUEST_LIMIT: 330
}

export const FAILED_TO_INCREMENT_REQUEST_COUNT = (email, apiProvider, endpoint, version) => `Failed to log API request for user ${email} ${apiProvider}/${endpoint}/${version}`;

export const FAILED_TO_GET_REQUEST_COUNT = (apiProvider, endpoint, version) => `Failed to get daily API request count for ${apiProvider}/${endpoint}/${version}`;

export const INFO_MESSAGE = {
  DIRECTIONS_MATRIX: (apiProvider) => `${apiProvider} Matrix API successfully returned a response.`,
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
  USER_REGISTERED: (email) => `User ${email} registered successfully`,
  LOGIN_SESSION_CREATED: (sessionId, email) => `Login session with id ${sessionId} has been created for user with email address ${email}`,
  USER_LOGGED_IN: (email) => `User with email ${email} has been logged in.`,
  USER_LOGGED_OUT: "User was logged out successfully.",
  OPTIMIZATION_REQUEST_TO_BE_CALLED_WITH: (apiProvider, endpoint) => `Optimization request to be called with ${apiProvider}/${endpoint}.`
}

export const ERROR_OBJECTS = {
    BAD_REQUEST: (missingField) =>  { 
        return {
          statusCode: 400,
          message: "Missing required inputs. Ensure that all necessary fields are included or calculated correctly.",
          details: `Missing field: ${missingField}`
        }
    },
    USER_ALREADY_EXISTS: (email) => {
      return {
        statusCode: 400,
        message: registrationErrorMessageUserWithEmailExists(email)
      };
    },
    NO_COOKIE_FOUND: () => {
      STANDARD_UNAUTH_COOKIE_OBJ.details = "No session cookie found.";
      return STANDARD_UNAUTH_COOKIE_OBJ;
    },
    INVALID_SESSION_ID: () => {
      STANDARD_UNAUTH_COOKIE_OBJ.details = "Invalid session ID format.";
      return STANDARD_UNAUTH_COOKIE_OBJ;
    },
    SESSION_NOT_FOUND: () => {
      STANDARD_UNAUTH_COOKIE_OBJ.details = "Session not found in the database.";
      return STANDARD_UNAUTH_COOKIE_OBJ;
    },
    SESSION_EXPIRED: () => {
      STANDARD_UNAUTH_COOKIE_OBJ.details = "Session expired.";
      return STANDARD_UNAUTH_COOKIE_OBJ;
    },
    NO_COOKIE_LOGOUT: () => {
      STANDARD_UNAUTH_COOKIE_OBJ.details = "Logout attempt without session cookie.";
      return STANDARD_UNAUTH_COOKIE_OBJ;
    },
    NO_USER_FOUND_WITH_EMAIL: (email) => {
      return {
        statusCode: 401,
        message: loginErrorMessageNoUserFoundForTheEmail(email)
      };
    },
    WRONG_PASSWORD: (email) => {
      return {
        statusCode: 401,
        message: loginErrorMessageWrongPassword(email)
      };
    },
    NO_DATA_FOUND: (osmId, osmType) =>  { 
        return {
          statusCode: 404,
          message: `No data found for the extra details request with the osm_id: ${osmId} and osm_type: ${osmType}.`,
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
    },
    DELETION_FAILED: (email) => {
      return {
      statusCode: 500,
      message: userDeletionErrorMessageRequestFailed(email)
    };
    }
    
}

export const EXTERNAL_APIS = {
  LOCATION_IQ: {
    NAME: "LocationIq",
    ENDPOINTS: {
      GEOCODE: {
        NAME: "Geocode",
        VERSION: "v1"
      },
      DIRECTIONS_MATRIX: {
        NAME: "Directions-Matrix",
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
      GEOCODE: {
        NAME: "Geocode",
        VERSION: "v6"
      }
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



