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

  _buildUriWithParams = (uri, params) => {
    const ecodedParams = new URLSearchParams(params);
    return `${uri}?${ecodedParams}`;
  } 

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

  async fetchCountries() {
    const url = `${this._backendOrigin}/api/countries`;
    
    const response = await this._fetchWithCredentials(url);
  
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  
    return response.json();
  }

  async fetchCities(countryCode) {
    const url = `${this._backendOrigin}/api/cities`;
    
    const response = await this._fetchWithCredentials(this._buildUriWithParams(url, {countryCode}));
  
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
  
    return response.json();
  }

  // TODO maybe add proximity parameter
  async fetchSuggestionsFallback(place, countryCode) {
    const url = `${this._backendOrigin}/api/geocode-fallback`;

    const response = await this._fetchWithCredentials(this._buildUriWithParams(url, {place, countryCode}));

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
  
    return response.json();
  }

  getExtraAttractionDetailsRequestParams(object) {
    const {osmId, osmType, wikidataId} = object;
    if (osmId !== "undefined" && osmType !== "undefined") return { osmId, osmType };
    if (wikidataId !== "undefined") return { wikidataId };
    throw new Error("No parameters found for extracting extra details.");
  }

  /** This function is called with either the OSM data from LocationIq or wikidata from Mapbox */
  async fetchExtraAttractionDetails(object) {
    try {
      const url = `${this._backendOrigin}/api/extra-details`;
      const response = await this._fetchWithCredentials(this._buildUriWithParams(url, this.getExtraAttractionDetailsRequestParams(object)));

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
    
      return response.json();
    } catch(error) {
      console.error("Extra details could not be fetched right now.", error);
    }
    

  }

};