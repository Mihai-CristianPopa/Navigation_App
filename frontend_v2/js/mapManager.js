import { EVENTS, CURRENT_LOCATION } from "./constants.js";

export default class MapManager {
  /**
   * @param {string} mapContainerId - the string representing the id of the div where the map will be placed
   * @param {array} coordinates - [lat, lon] pairs where lat and lon are numbers
   * @param {number} zoom - Integer number, first set as 19
   * @param {string} zoomPosition - Options: "topleft", "topright", "bottomleft", "bottomright"
   */
  constructor(mapContainerId, coordinates, zoom, zoomPosition) {
    this._baseCoordinates = coordinates;
    this._locationRadius = 0;
    this._locationId = null;
    this._baseZoom = zoom;
    this._popupMarkers = [];
    this._permanentLabelMarkers = [];
    this._routeLayer = null;
    this._userLocationFetched = false;

    this._map = this._initMap(mapContainerId);
    this._setupEventListeners();
    this._locateUser();
    this._addZoomControl(zoomPosition);
    this._addTileLayer();
  };

  _setupEventListeners() {
    this._map.on("locationfound", (e) => {
      this._locationRadius = e.accuracy / 2;

      this._baseCoordinates = [e.latlng.lat, e.latlng.lng];

      this._userLocationFetched = true;

      this._locationId = CURRENT_LOCATION.id();

      this._addCurrentLocationToMapAndTriggerAttractionAdditionEvent();
    });

    this._map.on("locationerror", (e) => {
      console.warn("Location access denied or failed:", e.message);
      this._setBaseView();
      const locationErrorEvent = new CustomEvent(EVENTS.USER_LOCATION_ERROR, {
        detail: { error: e.message }
      });
      document.dispatchEvent(locationErrorEvent);
    });

  };

  _initMap(mapContainerId) {
    return L.map(mapContainerId, {
      zoomControl: false // Disable default zoom control
    });
  };

  _addZoomControl(position) {
    L.control.zoom({
      position: position
    }).addTo(this._map);
  };

  _addTileLayer() {
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors"
    }).addTo(this._map);
    this._map.r
  };

  /** @description Function to fit all markers in view */
  _fitAllMarkers() {
    if (this._popupMarkers.length === 0) return;
    
    // Create a bounds object
    const group = new L.featureGroup(this._popupMarkers);
    
    // Fit the map to show all markers
    this._map.fitBounds(group.getBounds(), {
      padding: [20, 20] // Add 20px padding around the bounds
    }); 
  };

  /**
   * Adds a marker with popup and a marker with permanent label and it zooms out to fit all
   * the markers on the screen.
   * @param {array} coordinates - [lat, lon] pairs where lat and lon are numbers
   * @param {string} permanentText - the user query
   * @param {string} popupContent - the full address returned by the api of the selected attraction
   */
  addNewlySelectedAttractionMarkers(coordinates, permanentText, popupContent) {
    this._addPopupMarker(coordinates, popupContent);
    this._addPermanentLabelMarker(coordinates, permanentText);
    this._fitAllMarkers();
  };

  /**
   * Updates the popup and the permanent labels with the routing order.
   * @param {array} selectedAttractions - the array of selected attractions
   * @param {Object} waypoint - waypoint object from the mapbox optimize api
   * @param {number} index - waypoint of the index
   */
  _updateMarkersWithRoutingOrder(selectedAttractions, waypoint, index) {
    const order = waypoint.waypoint_index + 1;
    const marker = this._popupMarkers[index];
    const labelMarker = this._permanentLabelMarkers[index];
    
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
  }

  /**
   * 
   * @param {array} selectedAttractions - the array of selected attractions 
   * @param {array} mapboxWaypoints - the array of waypoints from the mapbox optimize api
   * @param {Object} mapboxGeoJson - the geoJson element from the trip, outputed by the mapbox optimize api
   */
  showRouteWithNumberedMarkers(selectedAttractions, mapboxWaypoints, mapboxGeoJson) {
    mapboxWaypoints.forEach((waypoint, index) => {
      this._updateMarkersWithRoutingOrder(selectedAttractions, waypoint, index);
    });
    this._displayRoute(mapboxGeoJson);
  }

  _displayRoute(geojson) {
    this._routeLayer = L.geoJSON(geojson, { style: { color: "blue", weight: 5 } }).addTo(this._map);
  }

  _locateUser() {
    this._map.locate({ setView: true, maxZoom: this._baseZoom });
  }

  clearLastRoute() {
    if (this._routeLayer) {
      this._map.removeLayer(this._routeLayer);
      this._routeLayer = null;
    }
  }

  _addCurrentLocationToMapAndTriggerAttractionAdditionEvent() {
    this.addNewlySelectedAttractionMarkers(
        this._baseCoordinates,
        CURRENT_LOCATION.name,
        CURRENT_LOCATION.description(this._locationRadius)
      );
    const locationFoundEvent = new CustomEvent(EVENTS.USER_LOCATION_FOUND, {
        detail: {
          id: this._locationId,
          name: CURRENT_LOCATION.name,
          lat: this._baseCoordinates[0],
          lon: this._baseCoordinates[1],
        }
      });
      document.dispatchEvent(locationFoundEvent);
  }

  /** @description Clears the map whenever a user wants to log out. */
  resetMap() {
    this.clearLastRoute();
    this._removeMarkersFromMap(this._popupMarkers);
    this._removeMarkersFromMap(this._permanentLabelMarkers);
    
    document.dispatchEvent(new CustomEvent(EVENTS.REMOVE_ATTRACTIONS));

    this._popupMarkers = [];
    this._permanentLabelMarkers = [];

    // On the scenario where user shared his location we want to readd
    // his location as first attraction in list
    if (this._userLocationFetched) {
      this._addCurrentLocationToMapAndTriggerAttractionAdditionEvent();
    }

    this._setBaseView();
  }

  _setBaseView() {
    this._map.setView(this._baseCoordinates, this._baseZoom);
  }

  _addPopupMarker(coordinates, popupContent) {
    const newMarker = L.marker(coordinates).addTo(this._map).bindPopup(`<strong>${popupContent}</strong>`);
    this._popupMarkers.push(newMarker);
  };

  _removeMarkersFromMap(markersArray) {
    for (const marker of markersArray) {
      this._map.removeLayer(marker);
    }
  }

  _addPermanentLabelMarker(coordinates, permanentText) {
    const newMarker = L.marker(coordinates, {
      icon: L.divIcon({
          className: "marker-label",
          html: `<div class="label-content">${permanentText}</div>`,
          iconSize: [150, 25],
          iconAnchor: [75, -10] // Position above the marker
      }),
      interactive: false // Don't interfere with map interactions
    }).addTo(this._map);

    this._permanentLabelMarkers.push(newMarker);
  };

};