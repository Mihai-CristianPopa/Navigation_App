import { EVENTS } from "./constants.js";


export default class ServiceUri {
  constructor() {
    this._backendOrigin = null;
    this._setupEventListeners();
  };

  _setupEventListeners() {
    document.addEventListener(EVENTS.BACKEND_ORIGIN_FETCHED, (e) => {
      this._backendOrigin = e.detail.backendOrigin;
      console.log('ServiceUri: Backend origin set to:', this._backendOrigin);
    });
  };

  _backendAvailable() {
    return !!this._backendOrigin;
  };

  _validateBackendAvailable() {
    if (!this._backendAvailable) {
      throw new Error('ServiceUri not ready - backend origin not available');
    }
  };

  _buildOptimizeApiUri = (coordinatesList) => {
    const params = new URLSearchParams({
      coordinatesList: coordinatesList
    });
    return `${this._backendOrigin}/api/optimize?${params}`;
  };

  _buildOwnOptimizeApiUri = (waypointIds, coordinatesList) => {
    const params = new URLSearchParams({
      waypointIds,
      coordinatesList: coordinatesList
    });
    return `${this._backendOrigin}/api/v2/optimize?${params}`;
  };

  _buildGeocodeApiUri = (place, readFromCache = true, writeToCache = true) => {
    const params = new URLSearchParams({
      place: place,
      readFromCache: readFromCache.toString(),
      writeToCache: writeToCache.toString()
    });
    return `${this._backendOrigin}/api/geocode?${params}`;
  };

  _fetchWithCredentials = (uri) => {
    return fetch(uri, {
      credentials: "include"
    });
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
  async fetchTSPRouting(coordinates) {
    this._validateBackendAvailable();
    const res = await this._fetchWithCredentials(this._buildOptimizeApiUri(coordinates));
    if (!res.ok) throw new Error(`Server error: ${res.status} - ${res.statusText}`);
    
    const data = await res.json();
    if (data.code != "Ok") {
      throw new Error(`API returned error code: ${res.status} - ${data.code}`);
    }
    return data;
  }

  async fetchOwnTspRouting(waypointIds, coordinates) {
    this._validateBackendAvailable();
    const res = await this._fetchWithCredentials(this._buildOwnOptimizeApiUri(waypointIds, coordinates));
    if (!res.ok) throw new Error(`Server error: ${res.status} - ${res.statusText}`);
    const data = await res.json();
    return data;
  }

  async fetchSuggestions(q) {
    this._validateBackendAvailable();
    const res = await this._fetchWithCredentials(this._buildGeocodeApiUri(q));
    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    // Expect JSON: [{ display_name, lat, lon }, …]
    return res.json();
  }

};