import resolveBackendOrigin from "./checkBackend.js";
import AttractionManager from "./attractionManager.js";
import MessageManager from "./messageManager.js";
import authService from "./authService.js";
import AuthUI from "./authUI.js";

const manageSelectedAttractions = new AttractionManager(document.getElementById("attractions-items"));
const manageAppExplanationParagraph = new MessageManager(document.getElementById("app-explanation"));
const authUI = new AuthUI(manageAppExplanationParagraph);

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

// // Wait for authentication before initializing the app
initializeApp();
const backendOrigin = authService.backendOrigin;

// const backendOrigin = await resolveBackendOrigin();
// const appExplanationParagraph = document.getElementById("app-explanation");
// if (backendOrigin) {
//   // By default the search container is hidden. Whenever there is a backend available
//   // Show the search container
//   // const inputOutputRow = document.getElementById("input-output-row");
//   // inputOutputRow.hidden = false;
//   document.getElementById("used-for-hiding-controls-panel").hidden = false;
//   manageAppExplanationParagraph.showDefaultAppSuccessMessage();
// } else {
//   // Add a message for the users that the map searching will not work
//   manageAppExplanationParagraph.showBackendNotAvailableMessage();
// }
// // manageAppExplanationParagraph.makeVisible(true);
// document.getElementById("used-for-hiding-message-panel").hidden = false;
// appExplanationParagraph.hidden = false;
// Initialize Map at University of Bucharest
var map = L.map("map", {
  zoomControl: false // Disable default zoom control
}).setView([44.435423, 26.102287], 19);

// Add zoom control to the right side
L.control.zoom({
  position: "bottomright" // Options: "topleft", "topright", "bottomleft", "bottomright"
}).addTo(map);

// Add OpenStreetMap Tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

let allMarkers = [];
let markerLabels = [];

// Add a marker - Removing the Unviersity Marker for now
// let userMarker = L.marker([44.435423, 26.102287]).addTo(map)
//     .bindPopup("Your Location")
//     .openPopup();
// allMarkers.push(userMarker);

// Get user's current location - Removing location finding for now
// map.locate({ setView: true, maxZoom: 16 });
// map.on("locationfound", function(e) {
//     var radius = e.accuracy / 2;
//     userMarker.setLatLng(e.latlng).bindPopup("You are within " + radius + " meters").openPopup();
// });

// // Add a search box using Leaflet Control Geocoder
// L.Control.geocoder().addTo(map);

// Store waypoints (start and destination)
// let waypoints = [];

// // Function to add waypoints when user clicks the map
// map.on("click", function(e) {
//     if (waypoints.length < 2) {
//         waypoints.push(L.latLng(e.latlng.lat, e.latlng.lng));

//         // Place a marker
//         L.marker([e.latlng.lat, e.latlng.lng]).addTo(map)
//             .bindPopup(waypoints.length === 1 ? "Start Point" : "Destination").openPopup();

//         // If two waypoints exist, calculate the route
//         if (waypoints.length === 2) {
//             L.Routing.control({
//                 waypoints: waypoints,
//                 routeWhileDragging: true
//             }).addTo(map);
//         }
//     }
// });
const searchInput          = document.getElementById("search-input");
// const searchButton   = document.getElementById("search-button");
const searchAttractionForm = document.getElementById("search-attraction-form");
// TODO use AttractionManager for the suggestion list also
const suggestionList = document.getElementById("suggestions");
const routingButton = document.getElementById("routing-button");
// const selectedAttractions = document.getElementById("attractions-items");
// function debounce(fn, wait = 300) {
//     let timeout;
//     return (...args) => {
//         clearTimeout(timeout);
//         timeout = setTimeout(() => fn(...args), wait);
//     };
// }

async function fetchSuggestions(q) {
  const res = await fetch(buildGeocodeApiUri(q));
  if (!res.ok) throw new Error(`Server error: ${res.status}`);

  // Expect JSON: [{ display_name, lat, lon }, …]
  return res.json();
}

const buildGeocodeApiUri = (place, readFromCache = true, writeToCache = true) => {
  const params = new URLSearchParams({
    place: place,
    readFromCache: readFromCache.toString(),
    writeToCache: writeToCache.toString()
  });
  return `${backendOrigin}/api/geocode?${params}`;
};

/**
 * @example Response {
 * code: "Ok",
 * waypoints: [
 * {distance: 145.02258276918147,
      name: "",
      location: [
        26.150666,
        44.437105,
      ],
      waypoint_index: 0,
      trips_index: 0,
 * },...],
 * trips: [
 * { geometry: {...},
 *   legs : []
 * }, ...]
 * }
 * @param {String} coordinates - a coordinates list string in format long,lat;
 * @returns 
 */
async function fetchTSPRouting(coordinates) {
  const res = await fetch(buildOptimizeApiUri(coordinates));
  if (!res.ok) throw new Error(`Server error: ${res.status} - ${res.statusText}`);
  
  const data = await res.json();
  if (data.code != "Ok") {
    throw new Error(`API returned error code: ${res.status} - ${data.code}`);
  }
  return data;
}

const buildOptimizeApiUri = (coordinatesList) => {
  const params = new URLSearchParams({
    coordinatesList: coordinatesList
  });
  return `${backendOrigin}/api/optimize?${params}`;
};

function clearSuggestions() {
  suggestionList.innerHTML = "";
  suggestionList.hidden    = true;
  searchInput.value = "";
  searchInput.setAttribute("aria-expanded", "false");
  hasSuggestions = false;
}

let lastSearchResponse;
let lastQuery;
let hasSuggestions = false;

// Main search function
async function performSearch() {
  lastQuery = searchInput.value.trim();
  if (!lastQuery) return manageAppExplanationParagraph.showNoQueryFoundErrorMessage();

  try {
    lastSearchResponse = await fetchSuggestions(lastQuery);
    const items = lastSearchResponse.options;
    if (!items.length) return manageAppExplanationParagraph.showNoSuggestionsFoundErrorMessage(lastQuery);

    manageAppExplanationParagraph.showDefaultAppSuccessMessage();

    items.forEach(({ display_name, lat, lon, place_id }) => {
      const li = document.createElement("li");
      li.textContent = display_name;
      li.dataset.lat = lat;
      li.dataset.lon = lon;
      li.dataset.id = place_id;
      suggestionList.append(li);
    });
    const li = document.createElement("li");
    li.textContent = "None of the above...";
    li.dataset.id = "-1";
    suggestionList.append(li);
    suggestionList.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
    hasSuggestions = true;
  } catch (err) {
    console.error(err);
    manageAppExplanationParagraph.showRequestErrorMessage(lastQuery);
  }
}

// Update your addRouteNumbers function
function addRouteNumbers(waypoints) {
  const selectedAttractions = manageSelectedAttractions.attractions;
  waypoints.forEach((waypoint, index) => {
    const order = waypoint.waypoint_index + 1;
    const marker = allMarkers[index];
    const labelMarker = markerLabels[index];
    
    if (marker && labelMarker) {
      const attractionNameFromBackendResponse = marker.getPopup().getContent().replace(/<[^>]*>/g, "");
      const attractionNameFromQuery = selectedAttractions[index].name;
      
      // Update popup with route order
      marker.setPopupContent(`<strong>${order}. ${attractionNameFromQuery}</strong>`);
      
      // Update permanent label with route order
      labelMarker.setIcon(L.divIcon({
        className: "marker-label route-label",
        html: `<div class="label-content route-order">${order}. ${attractionNameFromQuery}</div>`,
        iconSize: [150, 25],
        iconAnchor: [75, -10]
      }));
    }
  });
}

routingButton.addEventListener("click", async () => {
  if (!manageSelectedAttractions.enoughAttractionsToRoute) return manageAppExplanationParagraph.showNotEnoughAttractionsSelectedErrorMessage();
  const mapBoxOptimizeResponse = await fetchTSPRouting(manageSelectedAttractions.coordinatesString);
  manageAppExplanationParagraph.showDefaultAppSuccessMessage();
  addRouteNumbers(mapBoxOptimizeResponse.waypoints);
  L.geoJSON(mapBoxOptimizeResponse.trips[0].geometry, { style: { color: "blue", weight: 5 } }).addTo(map);
})

// Replaced the button and input events with the form submit event
searchAttractionForm.addEventListener("submit", (e) => {
  e.preventDefault();
  performSearch();
});

// Button click event
// searchButton.addEventListener("click", (e) => {
//     e.preventDefault();
//     performSearch();
// });
// Enter key event
// input.addEventListener("keypress", (e) => {
//     if (e.key === "Enter") {
//         e.preventDefault(); // Prevent form submission if inside a form
//         performSearch();
//     }
// });

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

document.addEventListener("click", collapseSuggestionsWhenClickingOutsideTheSearchContainer);

searchInput.addEventListener("focus", showCollapsedSuggestions);

searchInput.addEventListener("click", showCollapsedSuggestions);

suggestionList.addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (!li) return;

  if (li.dataset.id === "-1") {
    // Make another backend request and try again in a different form,
    // Maybe request a nearby city
    // For now just clear the value and the suggestions
    clearSuggestions();
  } else {
    const lat  = parseFloat(li.dataset.lat);
    const lon  = parseFloat(li.dataset.lon);
    const name = li.textContent;

    clearSuggestions();

    const selectedAttraction = {
        id: li.dataset.id,
        name: lastQuery || name,
        lat: lat,
        lon: lon
    };
    manageSelectedAttractions.addAttractionToContainer(selectedAttraction);

    const newMarker = L.marker([lat, lon])
        .addTo(map)
        .bindPopup(`<strong>${name}</strong>`)
        // .openPopup();

    // Create permanent label
    const labelMarker = L.marker([lat, lon], {
      icon: L.divIcon({
          className: "marker-label",
          html: `<div class="label-content">${lastQuery || name}</div>`,
          iconSize: [150, 25],
          iconAnchor: [75, -10] // Position above the marker
      }),
      interactive: false // Don't interfere with map interactions
    }).addTo(map);

    allMarkers.push(newMarker);
    markerLabels.push(labelMarker);
    fitAllMarkers();
  }
});

// Function to fit all markers in view
function fitAllMarkers() {
  if (allMarkers.length === 0) return;
  
  // Create a bounds object
  const group = new L.featureGroup(allMarkers);
  
  // Fit the map to show all markers
  map.fitBounds(group.getBounds(), {
    padding: [20, 20] // Add 20px padding around the bounds
  });

}