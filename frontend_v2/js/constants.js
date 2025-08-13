export const EVENTS = {
  // Location events
  USER_LOCATION_FOUND: "userLocationFound",
  USER_LOCATION_ERROR: "userLocationError",

  BACKEND_ORIGIN_FETCHED: "backendOriginFetched",

  REMOVE_ATTRACTIONS: "removeAttractions",

  REMOVE_SINGLE_ATTRACTION: "removeSingleAttraction",

  REMOVE_SINGLE_ATTRACTION_REQUESTED: "removeSingleAttractionRequested",

  ATTRACTION_REMOVAL_CONFIRMED: "removeSingleAttractionConfirmed",

  STARTING_POINT_SET: "startingPointSet",
  CURRENT_LOCATION_REMOVED: "currentLocationRemoved",
  CURRENT_LOCATION_NOT_THE_STARTING_POINT_ANYMORE: "curentLocationNotStart",
  CURRENT_LOCATION_SET_AS_START: "currentLocationIsStart"
};

export const CURRENT_LOCATION = {
  id: () => `user-location-${Date.now()}`,
  name: "Current Location",
  description: (radius) => `Your current location is within ${radius} meters.`
};

export const MESSAGES = {
  ERROR: {
    NO_QUERY_FOUND: "There was no attraction inputted for the previous request.",
    NO_INPUT_FOUND: (i) => `There was no ${i} inputted for the previous request.`,
    NO_SUGGESTIONS: (q) => `No suggestions found for ${q}.`,
    NO_SUGGESTION_MATCHED_USER_PERSPECTIVE: (q) => `No suggestions matched your search: ${q}. Please try inputting its exact name from the map.`,
    REQUEST_ATTRACTION_INTERNAL_SERVER_ERROR: (q) => `There was an internal server error when processing: ${q}.`,
    COUNTRY_SELECTION_DIALOG_FAILURE: 'Failed to load the country selection dialog. Please try again later.',
    BACKEND_NOT_AVAILABLE: "Currently the application functionality can not be used. Please try again later.",
    LESS_THAN_TWO_ATTRACTIONS: "Currently there are fewer than two attractions selected so you can not request the routing. Please add some more attractions.",
    LOCATION_NOT_FETCHED: "Your location has not been found. Please take into consideration that the first location you search and select will be considered your starting point.",
    GET_ROUTE_ERROR: "There was an error when getting the route. Please try again later."
  },
  SUCCESS: {
    DEFAULT_APP_EXPLANATION: "Plan the fastest route to visit your chosen attractions, starting and ending at your selected point.",
    LOCATION_IS_STARTING_POINT: "Your current location is the starting point."
  },
  WARN: {
    LOCATION_HAS_BEEN_REMOVED: "Your current location has been removed from the waypoint list, the first waypoint will act as the start and endpoint of your route.",
    LOCATION_NOT_STARTING_POINT_ANYMORE: "Your current location is not the starting point anymore, the first waypoint will act as the start and endpoint of your route."
  }
}