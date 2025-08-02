// TODO add a method which moves one of the attractions first
export default class AttractionManager {
  /**
   * @param containerElement - this is thought for list elements <ul>/<ol>
   */
  constructor(containerElement) {
    this.container = containerElement;
  }

  /**
   *
   * @returns {Array} containing all elements from the list
   */
  get attractions() {
    const listItems = this.container.querySelectorAll('li');
    return Array.from(listItems).map(li => ({
      id: li.dataset.id,
      name: li.textContent,
      lat: parseFloat(li.dataset.lat),
      lon: parseFloat(li.dataset.lon),
      element: li // Include DOM element reference
    }));
  }

  /**
   * 
   * @param {Object} attractionData - Should contain at least the id, name, lat and lon
   * @example {
        id: li.dataset.id,
        name: lastQuery || name,
        lat: lat,
        lon: lon
      };  
   * @returns the newly added entry 
   */
  addAttractionToContainer(attractionData) {
    const { id, name, lat, lon } = attractionData;        
    const outputEntry = document.createElement("li");
    outputEntry.dataset.lat = lat;
    outputEntry.dataset.lon = lon;
    outputEntry.dataset.id = id;
    outputEntry.textContent = name;
    this.container.append(outputEntry);
    
    return outputEntry;
  }

  removeAllAttractions() {
    this.container.innerHTML = "";
  }

  /**
   * @description Used to get the coordinates list for the MapBox API Optimize request
   * @returns {String} which contains the list of coordinates of the attractions in lon,lat; format
   */
  get coordinatesString() {
    return this.attractions
      .map(attraction => `${attraction.lon},${attraction.lat}`)
      .join(";");
  }

  /**
   * @description Used to get the number of selected suggestions.
   */
  get length() {
    return this.container.querySelectorAll('li').length;
  }

  /**
   * @description Used to check whether there are at least two attractions selected.
   */
  get enoughAttractionsToRoute() {
    return this.length >= 2;
  }
}