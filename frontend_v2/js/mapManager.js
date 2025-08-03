import { EVENTS, CURRENT_LOCATION } from "./constants.js";
import DialogManager from "./dialogManager.js";

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

    this._dialogManager = new DialogManager();

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

    document.addEventListener(EVENTS.STARTING_POINT_SET, (e) => {
      const attractionId = e.detail.dataset.id;
      this._moveMarkerFirst(attractionId);
    });

    document.addEventListener(EVENTS.REMOVE_SINGLE_ATTRACTION_REQUESTED, async (e) => {
      // There is already a routing displayed
      if (this._routeLayer) {
        // Show popup do you want to continue with deleting this attraction?
        // If yes, the previous route will be removed from the map.
        const shouldContinue = await this._dialogManager.showConfirmation({
          title: 'Remove Attraction',
          message: 'Removing this attraction will clear the current route. Do you want to continue?',
          continueText: 'Remove',
          cancelText: 'Keep'
        });

        if (!shouldContinue) {
          console.log('User cancelled attraction removal');
          return; // User cancelled, don't remove attraction
        }

        // User confirmed, clear the route
        this.clearLastRoute();
        this._clearRoutingOrder();
        console.log('Route cleared due to attraction removal');
      }
      const listItem = e.detail;
      const attractionId = listItem.dataset.id;
      this._removeMarkersAssociatedToAttraction(attractionId);
      console.log('Attraction markers removed from map');

      document.dispatchEvent(new CustomEvent(EVENTS.ATTRACTION_REMOVAL_CONFIRMED, {
        detail: listItem
      }));
    });
      // console.log("Should remove markers");
      // remove the markers of the attraction
      // maybe also the markers positions should pe updated, if the user
      // decides to delete one of the attractions after the routing was done
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
    const group = new L.featureGroup(this._popupMarkers.map(markerObject => markerObject.markerReference));
    
    // Fit the map to show all markers
    this._map.fitBounds(group.getBounds(), {
      padding: [20, 20] // Add 20px padding around the bounds
    }); 
  };

  /**
   * Adds a marker with popup and a marker with permanent label and it zooms out to fit all
   * the markers on the screen.
   * @param {string} id - the unique identifier of the attractions same as the one maintained for the list item
   * @param {array} coordinates - [lat, lon] pairs where lat and lon are numbers
   * @param {string} searchQuery - the user' search query
   * @param {string} fullAttractionName - the full address returned by the api of the selected attraction
   */
  addNewlySelectedAttractionMarkers(id, coordinates, searchQuery, fullAttractionName) {
    this._addPopupMarker(id, coordinates, searchQuery, fullAttractionName);
    this._addPermanentLabelMarker(id, coordinates, searchQuery, fullAttractionName);
    this._fitAllMarkers();
  };

  _clearRoutingOrder() {
    for(let i = 0; i <= this._popupMarkers.length - 1; i++) {
      const currentPopupMarker = this._popupMarkers[i];
      const currentLabelMarker = this._permanentLabelMarkers[i];
      this._updatePopupMarkerContent(currentPopupMarker, currentPopupMarker.fullAttractionName);
      this._updatePermanentLabelMarketIcon(currentLabelMarker, false, currentLabelMarker.searchQuery);
    }
  }

  _getMarkerReference(marker) {
    const markerReference = marker?.markerReference;
    if (markerReference) return markerReference;
    return marker;
  }

  _updatePopupMarkerContent(marker, text) {
    marker = this._getMarkerReference(marker);
    marker.setPopupContent(this._getPopupMarkerContent(text));
  }

  _updatePermanentLabelMarketIcon(marker, withOrder, text) {
    marker = this._getMarkerReference(marker);
    marker.setIcon(this._getPermanentLabelMarkerIcon(withOrder, text));
  }

  _getPopupMarkerContent(popupContent) {
    return `<strong>${popupContent}</strong>`;
  }

  _getPermanentLabelMarkerIcon(addRouteLabel, text) {
    let className = "marker-label";
    let htmlClass = "label-content";
    if (addRouteLabel) {
      className += " route-label";
      htmlClass += " route-order";
    }
    return L.divIcon({
      className,
      html: `<div class=${htmlClass}>${text}</div>`,
      iconSize: [150, 25],
      iconAnchor: [75, -10]
    });
  }
  
  /**
   * Updates the popup and the permanent labels with the routing order.
   * @param {Object} waypoint - waypoint object from the mapbox optimize api
   * @param {number} index - waypoint of the index
   */
  _updateMarkersWithRoutingOrder(waypoint, index) {
    const order = waypoint.waypoint_index + 1;
    const markerObject = this._popupMarkers[index];
    const labelMarkerObject = this._permanentLabelMarkers[index];
    
    if (markerObject && labelMarkerObject) {
      const marker = markerObject.markerReference;
      const labelMarker = labelMarkerObject.markerReference;
      const attractionNameFromQuery = markerObject.searchQuery;
      const fullAttractionName = markerObject.fullAttractionName;

      // Update popup with route order
      // marker.setPopupContent(this._getPopupMarkerContent(`${order}. ${fullAttractionName}`));

      this._updatePopupMarkerContent(marker, `${order}. ${fullAttractionName}`);
      
      // Update permanent label with route order
      // labelMarker.setIcon(this._getPermanentLabelMarkerIcon(true, `${order}. ${attractionNameFromQuery}`));
      this._updatePermanentLabelMarketIcon(labelMarker, true, `${order}. ${attractionNameFromQuery}`);
    }
  }

  /**
   * 
   * @param {array} mapboxWaypoints - the array of waypoints from the mapbox optimize api
   * @param {Object} mapboxGeoJson - the geoJson element from the trip, outputed by the mapbox optimize api
   */
  showRouteWithNumberedMarkers(mapboxWaypoints, mapboxGeoJson) {
    mapboxWaypoints.forEach((waypoint, index) => {
      this._updateMarkersWithRoutingOrder(waypoint, index);
    });
    this._displayRoute(mapboxGeoJson);
  }

  _displayRoute(geojson) {
    this._routeLayer = L.geoJSON(geojson, { style: { color: "blue", weight: 5 } }).addTo(this._map);
  }

  _locateUser() {
    this._map.locate({ setView: true, maxZoom: this._baseZoom });
  }

  _removeElementInArrayBasedOnIndex(array, index) {
    const removedMarker = array.splice(index, 1)[0];
    this._removeMarkerFromMap(removedMarker);
  }

  _removeMarkersAssociatedToAttraction(attractionId) {
    const indexOfMarkerToRemove = this._popupMarkers.findIndex(marker => marker.id === attractionId);
    this._removeElementInArrayBasedOnIndex(this._popupMarkers, indexOfMarkerToRemove);
    this._removeElementInArrayBasedOnIndex(this._permanentLabelMarkers, indexOfMarkerToRemove);
  }

  _moveElementFirstInArrayBasedOnIndex(array, index){
    array.unshift(array.splice(index, 1)[0]);
  }

  _moveMarkerFirst(attractionId) {
    const indexOfMarkerToMove = this._popupMarkers.findIndex(marker => marker.id === attractionId);
    this._moveElementFirstInArrayBasedOnIndex(this._popupMarkers, indexOfMarkerToMove);
    this._moveElementFirstInArrayBasedOnIndex(this._permanentLabelMarkers, indexOfMarkerToMove);
  }

  clearLastRoute() {
    if (this._routeLayer) {
      this._map.removeLayer(this._routeLayer);
      this._routeLayer = null;
    }
  }

  _addCurrentLocationToMapAndTriggerAttractionAdditionEvent() {
    this.addNewlySelectedAttractionMarkers(
        this._locationId,
        this._baseCoordinates,
        CURRENT_LOCATION.name,
        CURRENT_LOCATION.description(this._locationRadius)
      );
    const locationFoundEvent = new CustomEvent(EVENTS.USER_LOCATION_FOUND, {
        detail: {
          id: this._locationId,
          name: CURRENT_LOCATION.name,
          description: CURRENT_LOCATION.description(this._locationRadius),
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

  _addPopupMarker(id, coordinates, searchQuery, fullAttractionName) {
    const newMarker = L.marker(coordinates, {
      title: fullAttractionName
    }).addTo(this._map).bindPopup(this._getPopupMarkerContent(fullAttractionName));
    this._storeMarker(this._popupMarkers, id, newMarker, searchQuery, fullAttractionName);
  };

  _removeMarkerFromMap(marker) {
    this._map.removeLayer(marker.markerReference);
  }

  _removeMarkersFromMap(markersArray) {
    for (const marker of markersArray) {
      this._removeMarkerFromMap(marker);
    }
  }

  _storeMarker(array, id, markerReference, searchQuery, fullAttractionName) {
    // Object shorthand - property names match variable names
    array.push({
      id,
      markerReference,
      searchQuery,
      fullAttractionName
    });
  }

  _addPermanentLabelMarker(id, coordinates, searchQuery, fullAttractionName) {
    const newMarker = L.marker(coordinates, {
      icon: this._getPermanentLabelMarkerIcon(false, searchQuery),
      interactive: false // Don't interfere with map interactions
    }).addTo(this._map);

    this._storeMarker(this._permanentLabelMarkers, id, newMarker, searchQuery, fullAttractionName);
  };

};