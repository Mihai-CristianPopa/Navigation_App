export const EVENTS = {
  // Location events
  USER_LOCATION_FOUND: "userLocationFound",
  USER_LOCATION_ERROR: "userLocationError",

  BACKEND_ORIGIN_FETCHED: "backendOriginFetched",

  REMOVE_ATTRACTIONS: "removeAttractions"
};

// export const CURRENT_LOCATION = "Current Location";

// export const CURRENT_LOCATION_DESCRIPTION = (radius) => {
//   return `Your current location is within ${radius} meters.`;
// }

export const CURRENT_LOCATION = {
  id: () => `user-location-${Date.now()}`,
  name: "Current Location",
  description: (radius) => `Your current location is within ${radius} meters.`
};