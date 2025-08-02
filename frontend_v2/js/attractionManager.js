import { EVENTS } from "./constants.js";
export default class AttractionManager {
  /**
   * @param containerElement - this is thought for list elements <ul>/<ol>
   */
  constructor(containerElement) {
    this.container = containerElement;
    this._setupEventListeners();
  }

  _setupEventListeners() {
  this.container.addEventListener('click', (e) => {
    if (e.target.classList.contains('set-start-button')) {
      e.stopPropagation();
      const listItem = e.target.closest('li');
      this._moveAttractionAsFirst(listItem);
      this._updateButtonStates();
      document.dispatchEvent(new CustomEvent(EVENTS.STARTING_POINT_SET, {
        detail: listItem
      }));
    }
  });
  }

  _updateButtonStates() {
    const listItems = this.container.querySelectorAll('li');
    listItems.forEach((item, index) => {
      const button = item.querySelector('.set-start-button');
      if (button) {
        if (index === 0) {
          button.textContent = "Starting Point";
          button.disabled = true;
          item.classList.add('start-attraction');
        } else {
          button.textContent = "Set as Start";
          button.disabled = false;
          item.classList.remove('start-attraction');
        }
      }
    });
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
        name: lastQuery,
        description: name,
        lat: lat,
        lon: lon
      };  
   * @returns the newly added entry 
   */
  addAttractionToContainer(attractionData) {
    const { id, name, description, lat, lon } = attractionData;
    
    const outputEntry = document.createElement("li");
    outputEntry.dataset.lat = lat;
    outputEntry.dataset.lon = lon;
    outputEntry.dataset.id = id;
    outputEntry.dataset.name = name;
    outputEntry.dataset.description = description;

    const attractionContent = document.createElement("div");
    attractionContent.className = "attraction-content";

    const attractionText = document.createElement("span");
    attractionText.className = "attraction-text";
    attractionText.textContent = name;

    const setStartButton = document.createElement("button");
    setStartButton.className = "set-start-button";
    setStartButton.textContent = "Set as Start";
    setStartButton.type = "button";

    attractionContent.append(attractionText, setStartButton);
    outputEntry.append(attractionContent);
    this.container.append(outputEntry);

    this._updateButtonStates();
    
    return outputEntry;
  }

  _moveAttractionAsFirst(attractionListItem) {
    this.container.prepend(attractionListItem);
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