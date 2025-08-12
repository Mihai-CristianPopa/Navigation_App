import resolveBackendOrigin from "./checkBackend.js";
import AttractionManager from "./attractionManager.js";
import MessageManager from "./messageManager.js";
import authService from "./authService.js";
import AuthUI from "./authUI.js";
import ServiceUri from "./serviceUri.js";
import MapManager from "./mapManager.js";
import { EVENTS } from "./constants.js";

const manageSelectedAttractions = new AttractionManager(document.getElementById("attractions-items"));
const manageAppExplanationParagraph = new MessageManager(document.getElementById("app-explanation"), document.getElementById("location-status"));
const authUI = new AuthUI(manageAppExplanationParagraph);
const geocodingRequestManager = new ServiceUri();
const mapManager = new MapManager("map", [44.435423, 26.102287], 19, "bottomright");


let lastSearchResponse = null;
let lastQuery = null;
let hasSuggestions = false;
let countriesCache = null;

const searchInput          = document.getElementById("search-input");
const suggestionList = document.getElementById("suggestions");

// // Initialize authentication first
async function initializeApp() {
const backendAvailable = await authService.initialize();
  
  if (backendAvailable) {
    if (authService.isAuthenticated) {
//       // User is already logged in
      authUI.showUserPanel(authService.user);
      showSearchPanelAndMessagePanel();
    } else {
//       // User needs to authenticate
      authUI.showAuthPanel();
      hideSearchPanelAndMessagePanel();
    }
  } else {
    // Backend not available - show limited functionality
    manageAppExplanationParagraph.showBackendNotAvailableMessage();
    document.getElementById("used-for-hiding-message-panel").hidden = false;
    // hideSearchPanelAndMessagePanel();
  }
}

function showSearchPanelAndMessagePanel() {
  document.getElementById("used-for-hiding-controls-panel").hidden = false;
  document.getElementById("used-for-hiding-message-panel").hidden = false;
  manageAppExplanationParagraph.showDefaultAppSuccessMessage();
}

function hideSearchPanelAndMessagePanel() {
  document.getElementById("used-for-hiding-controls-panel").hidden = true;
  document.getElementById("used-for-hiding-message-panel").hidden = true;
}

export function clearUserState() {
  clearSuggestions();

  manageSelectedAttractions.removeAllAttractions();

  mapManager.resetMap();

  // Clear countries cache when user logs out
  countriesCache = null;
  sessionStorage.removeItem('countries');

  lastSearchResponse = null;
  lastQuery = null;
  hasSuggestions = false;
}

// Wait for authentication before initializing the app
initializeApp();



function clearSuggestions() {
  suggestionList.innerHTML = "";
  suggestionList.hidden    = true;
  searchInput.value = "";
  searchInput.setAttribute("aria-expanded", "false");
  hasSuggestions = false;
}

function processGeocodingSearchResults(items) {
    manageAppExplanationParagraph.showDefaultAppSuccessMessage();

    // DocumentFragment optimizes the DOM interaction when running append repeatedly 
    const frag = document.createDocumentFragment();

    items.forEach(({ display_name, lat, lon, place_id }) => {
      const li = document.createElement("li");
      li.textContent = display_name;
      li.dataset.lat = lat;
      li.dataset.lon = lon;
      li.dataset.id = place_id;
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

// Main search function
async function performSearch() {
  lastQuery = searchInput.value.trim();
  if (!lastQuery) return manageAppExplanationParagraph.showNoQueryFoundErrorMessage();

  try {
    lastSearchResponse = await geocodingRequestManager.fetchSuggestions(lastQuery);
    const items = lastSearchResponse.options;
    if (!items.length) return manageAppExplanationParagraph.showNoSuggestionsFoundErrorMessage(lastQuery);

    // manageAppExplanationParagraph.showDefaultAppSuccessMessage();

    // // DocumentFragment optimizes the DOM interaction when running append repeatedly 
    // const frag = document.createDocumentFragment();

    // items.forEach(({ display_name, lat, lon, place_id }) => {
    //   const li = document.createElement("li");
    //   li.textContent = display_name;
    //   li.dataset.lat = lat;
    //   li.dataset.lon = lon;
    //   li.dataset.id = place_id;
    //   frag.append(li);
    // });

    // const li = document.createElement("li");
    // li.textContent = "None of the above...";
    // li.dataset.id = "-1";
    // frag.append(li);

    // suggestionList.append(frag);
    // suggestionList.hidden = false;
    // searchInput.setAttribute("aria-expanded", "true");
    // hasSuggestions = true;
    processGeocodingSearchResults(items);
  } catch (err) {
    console.error(err);
    manageAppExplanationParagraph.showRequestErrorMessage(lastQuery);
  }
}

function processSelectedSuggestion(event) {
  const li = event.target.closest("li");
  if (!li) return;

  if (li.dataset.id === "-1") {
    // Make another backend request and try again in a different form,
    // Maybe request a nearby city
    // For now just clear the value and the suggestions
    // clearSuggestions();
    showLocationSelectionDialog();
  } else {
    const lat  = parseFloat(li.dataset.lat);
    const lon  = parseFloat(li.dataset.lon);
    const name = li.textContent;

    clearSuggestions();

    const selectedAttraction = {
        id: li.dataset.id,
        name: lastQuery,
        description: name,
        lat: lat,
        lon: lon
    };
    manageSelectedAttractions.addAttractionToContainer(selectedAttraction);

    mapManager.addNewlySelectedAttractionMarkers(li.dataset.id, [lat, lon], lastQuery, name);
  }
}

async function showLocationSelectionDialog() {
  const overlay = document.getElementById("used-for-hiding-location-dialog-overlay");
  const countrySelect = document.getElementById("country-select");
  const cityInput = document.getElementById("city-input");
  
  // Load countries if not already loaded
  if (!countriesCache) {
    try {
      const countries = await loadCountries();
      populateCountrySelect(countries);
    } catch (error) {
      console.error('Failed to load countries for dialog:', error);
      manageAppExplanationParagraph.showRequestErrorMessage('Failed to load countries');
      return;
    }
  }

  // Reset form
  countrySelect.value = "";
  cityInput.value = "";
  
  // Show dialog
  overlay.hidden = false;
  
  // Focus on country select
  setTimeout(() => countrySelect.focus(), 100);
}

async function loadCountries() {
  // Check if we already have countries cached in session
  if (countriesCache) {
    return countriesCache;
  }

  // Check session storage first
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

  // Fetch from backend
  try {
    const response = await geocodingRequestManager.fetchCountries();
    countriesCache = response.countries || [];
    
    // Cache in session storage
    sessionStorage.setItem('countries', JSON.stringify(countriesCache));
    
    return countriesCache;
  } catch (error) {
    console.error('Failed to load countries from backend:', error);
    
    // Fallback to hardcoded list if backend fails
    countriesCache = [
      'United States', 'United Kingdom', 'Germany', 'France', 'Italy', 
      'Spain', 'Netherlands', 'Belgium', 'Switzerland', 'Austria',
      'Poland', 'Romania', 'Czech Republic', 'Hungary', 'Portugal',
      'Greece', 'Croatia', 'Slovenia', 'Slovakia', 'Bulgaria',
      'Canada', 'Australia', 'Japan', 'South Korea', 'Brazil',
      'Mexico', 'India', 'China'
    ];
    
    // Cache the fallback list
    sessionStorage.setItem('countries', JSON.stringify(countriesCache));
    
    return countriesCache;
  }
}

function hideLocationSelectionDialog() {
  const overlay = document.getElementById("used-for-hiding-location-dialog-overlay");
  overlay.hidden = true;
}

// Add event listeners for location dialog
document.getElementById("location-dialog-cancel").addEventListener("click", () => {
  hideLocationSelectionDialog();
  // clearSuggestions();
});

document.getElementById("location-dialog-search").addEventListener("click", (event) => {
  event.preventDefault();
  handleStructuredSearch();
});

function handleStructuredSearch() {
  const countrySelect = document.getElementById("country-select");
  const cityInput = document.getElementById("city-input");
  
  const country = countrySelect.value.trim();
  const city = cityInput.value.trim();


  if (!country) {
    manageAppExplanationParagraph.showNoQueryFoundErrorMessage();
    return;
  }

  hideLocationSelectionDialog();

  try {
    // Perform the structured search request
    // processGeocodingSearchResults(items);
  } catch (error) {
    console.error(error);
    manageAppExplanationParagraph.showRequestErrorMessage(`${lastQuery} ${country} ${city}`);
  }
}

function populateCountrySelect(countries) {
  const countrySelect = document.getElementById("country-select");
  // DocumentFragment optimizes the DOM interaction when running append repeatedly 
  const frag = document.createDocumentFragment();
  
  // Clear existing options
  countrySelect.innerHTML = '';
  
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select a country...';
  frag.append(defaultOption);
  
  // Add country options
  countries.forEach(country => {
    const option = document.createElement('option');
    option.value = country.code;
    option.textContent = country.name;
    frag.append(option);
  });
  
  countrySelect.append(frag);
  // Enable the select
  countrySelect.disabled = false;
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
  if (!manageSelectedAttractions.enoughAttractionsToRoute) return manageAppExplanationParagraph.showNotEnoughAttractionsSelectedErrorMessage();
  mapManager.clearLastRoute();
  try {
    // const mapBoxOptimizeResponse = await geocodingRequestManager.fetchTSPRouting(manageSelectedAttractions.coordinatesString);
    const ownOptimizationResponse = await geocodingRequestManager.fetchOwnTspRouting(manageSelectedAttractions.waypointIds, manageSelectedAttractions.coordinatesString);
    manageAppExplanationParagraph.showDefaultAppSuccessMessage();
    // mapManager.showRouteWithNumberedMarkers(mapBoxOptimizeResponse.waypoints, mapBoxOptimizeResponse.trips[0].geometry);
    mapManager.showRouteWithNumberedMarkersV2(ownOptimizationResponse);
  } catch (error) {
    manageAppExplanationParagraph.showErrorWhileGettingRoute();
  }
});

document.getElementById("clear-route-button").addEventListener("click", () => mapManager.resetMap());

// Replaced the button and input events with the form submit event
document.getElementById("search-attraction-form").addEventListener("submit", (e) => {
  e.preventDefault();
  performSearch();
});

document.addEventListener(EVENTS.REMOVE_ATTRACTIONS, () => manageSelectedAttractions.removeAllAttractions());

document.addEventListener(EVENTS.USER_LOCATION_FOUND, (e) => {
  manageSelectedAttractions.addAttractionToContainer(e.detail);
  manageAppExplanationParagraph.showLocationIsStartingPoint();
  console.log('User location added to attractions:', e.detail);
});

document.addEventListener(EVENTS.USER_LOCATION_ERROR, (e) => {
  console.error('Failed to get user location:', e.detail.error);
  manageAppExplanationParagraph.showLocationNotFoundFirstWaypointBecomesStartingPoint();
});

document.addEventListener("click", collapseSuggestionsWhenClickingOutsideTheSearchContainer);

searchInput.addEventListener("focus", showCollapsedSuggestions);

searchInput.addEventListener("click", showCollapsedSuggestions);

suggestionList.addEventListener("click", processSelectedSuggestion);