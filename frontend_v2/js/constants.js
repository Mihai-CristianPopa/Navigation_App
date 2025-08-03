export const EVENTS = {
  // Location events
  USER_LOCATION_FOUND: "userLocationFound",
  USER_LOCATION_ERROR: "userLocationError",

  BACKEND_ORIGIN_FETCHED: "backendOriginFetched",

  REMOVE_ATTRACTIONS: "removeAttractions",

  STARTING_POINT_SET: "startingPointSet"
};

export const CURRENT_LOCATION = {
  id: () => `user-location-${Date.now()}`,
  name: "Current Location",
  description: (radius) => `Your current location is within ${radius} meters.`
};

export const MESSAGES = {
  ERROR: {
    NO_QUERY_FOUND: "There was no attraction inputted for the previous request.",
    NO_SUGGESTIONS: (q) => `No suggestions found for ${q}.`,
    REQUEST_ATTRACTION_INTERNAL_SERVER_ERROR: (q) => `There was an internal server error when processing: ${q}.`,
    BACKEND_NOT_AVAILABLE: "Currently the application functionality can not be used. Please try again later.",
    LESS_THAN_TWO_ATTRACTIONS: "Currently there are fewer than two attractions selected so you can not request the routing. Please add some more attractions.",
    LOCATION_NOT_FETCHED: "Your location has not been found. Please take into consideration that the first location you search and select will be considered your starting point." 
  },
  SUCCESS: {
    DEFAULT_APP_EXPLANATION: "This application is used for routing you to the attractions you want to see.",
    LOCATION_IS_STARTING_POINT: "Your current location is the starting point."
  }
}