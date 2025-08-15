import AttractionManager from "./attractionManager.js";
import MessageManager from "./messageManager.js";
import authService from "./authService.js";
import AuthUI from "./authUI.js";
import ServiceUri from "./serviceUri.js";
import MapManager from "./mapManager.js";
import { EVENTS } from "./constants.js";
import RouteSummaryHandler from "./routeSummaryHandler.js";

const manageSelectedAttractions = new AttractionManager(document.getElementById("attractions-items"));
const manageTextAreas = new MessageManager(document.getElementById("message-panel"), document.getElementById("location-status"));
const authUI = new AuthUI(manageTextAreas);
const geocodingRequestManager = new ServiceUri();
const routeSummaryHandler = new RouteSummaryHandler(document.getElementById("route-panel"));
const mapManager = new MapManager("map", [44.435423, 26.102287], 19, "bottomright", routeSummaryHandler);

let lastSearchResponse = null;
let lastQuery = null;
let hasSuggestions = false;
let countriesCache = null;
const searchedQueries = [];
const queriesForWhichFallbackSuggestionWasRequested = [];

const searchInput = document.getElementById("search-input");
const suggestionList = document.getElementById("suggestions");

// Initialize authentication first
async function initializeApp() {
const backendAvailable = await authService.initialize();
  
  if (backendAvailable) {
    if (authService.isAuthenticated) {
      // User is already logged in
      authUI.showAuthenticatedUserAppState(authService.user);
    } else {
      // User needs to authenticate
      authUI.showNotAuthenticatedUserAppState();
    }
  } else {
    // Backend not available - show limited functionality
    manageTextAreas.showBackendNotAvailableMessage();
  }
}

export function clearUserState() {
  clearSuggestions();

  manageSelectedAttractions.removeAllAttractions();

  mapManager.resetMap();

  // Clear countries cache when user logs out
  countriesCache = null;
  sessionStorage.removeItem('countries');

  searchedQueries = [];
  queriesForWhichFallbackSuggestionWasRequested = [];

  lastSearchResponse = null;
  lastQuery = null;
  hasSuggestions = false;
}

initializeApp();

function clearSearchQuery() {
  searchInput.value = "";
}

function clearSuggestions(clearSearch = true) {
  if (clearSearch === true) clearSearchQuery();
  suggestionList.innerHTML = "";
  suggestionList.hidden    = true;
  searchInput.setAttribute("aria-expanded", "false");
  hasSuggestions = false;
}

/** Adds the suggestions to the suggestion list and displays them. */
function processGeocodingSearchResults(items) {
    manageTextAreas.showDefaultAppSuccessMessage();

    // DocumentFragment optimizes the DOM interaction when running append repeatedly 
    const frag = document.createDocumentFragment();
    // When this request is sent for the LocationIq we are retrieving osm_id and osm_type
    // And when the geocoding goes through mapbox we get back the wikidata_id
    items.forEach(({ type, display_name, lat, lon, place_id, osm_id, osm_type, wikidata_id }) => {
      const li = document.createElement("li");
      li.textContent = `${type}: ${display_name}`;
      li.dataset.lat = lat;
      li.dataset.lon = lon;
      li.dataset.id = place_id;
      li.dataset.osmId = osm_id;
      li.dataset.osmType = osm_type;
      li.dataset.wikidataId = wikidata_id;
      frag.append(li);
    });

    const li = document.createElement("li");
    li.textContent = "None of the above...";
    li.dataset.id = "-1";
    frag.append(li);

    suggestionList.append(frag);
    suggestionList.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
    hasSuggestions = true;
}

/** Handles the response of the suggestions request. */
async function performSearch() {
  const currentQuery = searchInput.value.trim();
  if (!currentQuery) return manageTextAreas.showNoQueryFoundErrorMessage("attraction");

  lastQuery = currentQuery;

  try {
    lastSearchResponse = await geocodingRequestManager.fetchSuggestions(lastQuery);
    searchedQueries.push(currentQuery);
    const items = lastSearchResponse.options;
    if (!items.length) return manageTextAreas.showNoSuggestionsFoundErrorMessage(lastQuery);
    processGeocodingSearchResults(items);
  } catch (err) {
    console.error(err);
    manageTextAreas.showRequestErrorMessage(lastQuery);
  }
}

/** Handles the selected suggestion. If selected suggestion is a proper entry, then markers are added to the map,
 * Otherwise, if user selects none of the above first time, a popup opens where the user can select the country from which
 * The attraction he wants to see is and a new request to get suggestions is made to a different provider while passing
 * Also the country code. If the user clicks None of the above a second time, that is still pending to be implemented.
 */
async function processSelectedSuggestion(event) {
  const li = event.target.closest("li");
  if (!li) return;

  if (li.dataset.id === "-1" && !queriesForWhichFallbackSuggestionWasRequested.includes(lastQuery)) {
    // Make another backend request and try again in a different form,
    // Maybe request a nearby city
    // For now just clear the value and the suggestions
    clearSuggestions(false);
    showLocationSelectionDialog();
  } else if (li.dataset.id === "-1" && queriesForWhichFallbackSuggestionWasRequested.includes(lastQuery)){
    clearSuggestions();
    manageTextAreas.showNoSuggestionMatch(lastQuery);
    // show failure message
    // provide a different way of selecting that specific attraction
    // maybe center on the city they are interested in
  } else {
    const lat  = parseFloat(li.dataset.lat);
    const lon  = parseFloat(li.dataset.lon);
    const name = li.textContent;

    clearSuggestions();

    const attractionDetails = await geocodingRequestManager.fetchExtraAttractionDetails({
      osmId: li.dataset.osmId,
      osmType: li.dataset.osmType,
      wikidataId: li.dataset.wikidataId
    });

    const selectedAttraction = {
        id: li.dataset.id,
        name: lastQuery,
        description: name,
        lat: lat,
        lon: lon
    };
    manageSelectedAttractions.addAttractionToContainer(selectedAttraction);

    mapManager.addNewlySelectedAttractionMarkers(li.dataset.id, [lat, lon], lastQuery, name, attractionDetails);
  }
}

/** Check if countries are available already in the current session cache. If not call loadCountries method.
 * Then display the popover after clearing its fields.
 */
async function showLocationSelectionDialog() {
  const overlay = document.getElementById("used-for-hiding-location-dialog-overlay");
  const countrySelect = document.getElementById("country-select");
  // const cityInput = document.getElementById("city-select");
  
  // Load countries if not already loaded
  if (!countriesCache) {
    try {
      const countries = await loadCountries();
      populateCountrySelect(countries);

      countrySelect.value = "";
      // cityInput.value = "";
      overlay.hidden = false;
      setTimeout(() => countrySelect.focus(), 100);

    } catch (error) {
      console.error('Failed to load countries for dialog:', error);
      manageTextAreas.showCountrySelectionDialogErrorMessage();
      clearSearchQuery();
      return;
    }
  }
}

/** Load contries from the session storage. */
function loadItemsFromSessionStorage() {
  const cachedCountries = sessionStorage.getItem('countries');
  if (cachedCountries) {
    try {
      countriesCache = JSON.parse(cachedCountries);
      return countriesCache;
    } catch (error) {
      console.warn('Failed to parse cached countries:', error);
      sessionStorage.removeItem('countries');
    }
  }
}

/** Check if there are currently countries stored at the variable level. If not check in the session storage.
 * Finally make a request to the backend.
 */
async function loadCountries() {
  // Check if we already have countries cached in session
  if (countriesCache) return countriesCache;

  loadItemsFromSessionStorage();

  // Fetch from backend
  try {
    const response = await geocodingRequestManager.fetchCountries();
    countriesCache = response.countries;
    
    // Cache in session storage
    sessionStorage.setItem('countries', JSON.stringify(countriesCache));
    
    return countriesCache;
  } catch (error) {
    console.error('Failed to load countries from backend:', error);
  }
}

/** Hide the popup with the country selection for the new backend request. */
function hideLocationSelectionDialog() {
  const overlay = document.getElementById("used-for-hiding-location-dialog-overlay");
  overlay.hidden = true;
}

// Add event listeners for location dialog
document.getElementById("location-dialog-cancel").addEventListener("click", () => {
  hideLocationSelectionDialog();
});

document.getElementById("location-dialog-search").addEventListener("click", (e) => {
  e.preventDefault();
  handleStructuredSearch();
});

/** Handles the response of the fallback geocoding request. */
async function handleStructuredSearch() {
  // const cityInput = document.getElementById("city-select");
  // const city = cityInput.value.trim();
  const countrySelect = document.getElementById("country-select");
  const countryCode = countrySelect.value.trim();
  if (!countryCode) {
    manageTextAreas.showNoQueryFoundErrorMessage("country");
    return;
  }

  hideLocationSelectionDialog();

  try {
    // Perform the structured search request
    lastSearchResponse = await geocodingRequestManager.fetchSuggestionsFallback(lastQuery, countryCode);
    const items = lastSearchResponse.options;
    if (!items.length) return manageTextAreas.showNoSuggestionsFoundErrorMessage(lastQuery);
    queriesForWhichFallbackSuggestionWasRequested.push(lastQuery);
    processGeocodingSearchResults(items);
  } catch (error) {
    console.error(error);
    manageTextAreas.showRequestErrorMessage(`${lastQuery} ${country} ${city}`);
  }
}

/** Creates the default options in select comboboxes. Example "Select a Country...". */
function createSelectDefaultOption(defaultTextContent) {
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = defaultTextContent;
  return defaultOption;
}

/** Populates a select dynamically based on a callback used for processing arrays, where the array is the source
 * of the select population.
 */
function populateSelect(selectId, defaultText, array, callback) {
  const selectElement = document.getElementById(selectId)
  // DocumentFragment optimizes the DOM interaction when running append repeatedly 
  let frag = document.createDocumentFragment();
  selectElement.innerHTML = '';

  frag.append(createSelectDefaultOption(defaultText));

  callback(frag, array);

  selectElement.append(frag);
  // Enable the select
  selectElement.disabled = false;
}

function populateCountrySelect(countries) {
  populateSelect("country-select", 'Select a country...', countries,  (frag, countries) => { 
    countries.forEach(country => {
      const option = document.createElement('option');
      option.value = country.code;
      option.textContent = country.name;
      frag.append(option);
    });
  });
}

function collapseSuggestionsWhenClickingOutsideTheSearchContainer(event) {
  // if there was no request sent then there are no suggestions to be shown nor hidden
  // if the suggestionList is hidden it might be the case that there was already a click outsinde
  // the search-container so no reason to run the same logic again
  if (!hasSuggestions || suggestionList.hiddden) return;

  const searchContainer = document.getElementById("search-container");
  if (!searchContainer.contains(event.target)) {
    // Then hide the suggestion list
    suggestionList.hidden = true;
    searchInput.setAttribute("aria-expanded", "false");
  }
}

function showCollapsedSuggestions() {
  if (!hasSuggestions) return;

  suggestionList.hidden = false;
  searchInput.setAttribute("aria-expanded", "true");
}

document.getElementById("routing-button").addEventListener("click", async () => {
  if (!manageSelectedAttractions.enoughAttractionsToRoute) return manageTextAreas.showNotEnoughAttractionsSelectedErrorMessage();
  mapManager.clearLastRoute();
  try {
    // const mapBoxOptimizeResponse = await geocodingRequestManager.fetchTSPRouting(manageSelectedAttractions.coordinatesString);
    const ownOptimizationResponse = await geocodingRequestManager.fetchOwnTspRouting(manageSelectedAttractions.waypointIds, manageSelectedAttractions.coordinatesString);
    // manageTextAreas.showDefaultAppSuccessMessage();
    manageTextAreas.hideMessagePanel();
    // mapManager.showRouteWithNumberedMarkers(mapBoxOptimizeResponse.waypoints, mapBoxOptimizeResponse.trips[0].geometry);
    mapManager.showRouteWithNumberedMarkersV2(ownOptimizationResponse);
  } catch (error) {
    manageTextAreas.showErrorWhileGettingRoute();
  }
});

document.getElementById("clear-route-button").addEventListener("click", () => {
  // mapManager.resetMap();
  clearUserState();
  manageTextAreas.showDefaultAppSuccessMessage();
});

// Replaced the button and input events with the form submit event
document.getElementById("search-attraction-form").addEventListener("submit", (e) => {
  e.preventDefault();
  performSearch();
});

// document.addEventListener(EVENTS.REMOVE_ATTRACTIONS, () => manageSelectedAttractions.removeAllAttractions());

document.addEventListener(EVENTS.USER_LOCATION_FOUND, (e) => {
  manageSelectedAttractions.addAttractionToContainer(e.detail);
  manageTextAreas.showLocationIsStartingPoint();
  console.log('User location added to attractions:', e.detail);
});

document.addEventListener(EVENTS.USER_LOCATION_ERROR, (e) => {
  console.error('Failed to get user location:', e.detail.error);
  manageTextAreas.showLocationNotFoundFirstWaypointBecomesStartingPoint();
});

document.addEventListener("click", collapseSuggestionsWhenClickingOutsideTheSearchContainer);

searchInput.addEventListener("focus", showCollapsedSuggestions);

searchInput.addEventListener("click", showCollapsedSuggestions);

suggestionList.addEventListener("click", processSelectedSuggestion);

document.addEventListener(EVENTS.CURRENT_LOCATION_NOT_THE_STARTING_POINT_ANYMORE, () => manageTextAreas.showLocationIsNotTheStartingPointAnymore());
document.addEventListener(EVENTS.CURRENT_LOCATION_REMOVED, () => manageTextAreas.showLocationHasBeenRemoved());
document.addEventListener(EVENTS.CURRENT_LOCATION_SET_AS_START, () => manageTextAreas.showLocationIsStartingPoint());