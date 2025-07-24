export default class MessageManager {
  /**
   * @param containerElement - This is developed for the app-explanation <p>
   */
  constructor(containerElement) {
    this.container = containerElement;
  }

  /**
   * @description Used when user makes a search attraction request without inputting any query.
   */
  showNoQueryFoundErrorMessage() {
    this.container.textContent = "There was no attraction inputted for the previous request";
    this.container.style.color = "red";
    this.container.style.fontWeight = "bold";    
  }

  /**
   * @description Used when no suggestions are found for the query which was used.
   * @param {String} query - Attraction used for the request
   */
  showNoSuggestionsFoundErrorMessage(query) {
    this.container.textContent = `No suggestions found for ${query}.`;
    this.container.style.color = "red";
    this.container.style.fontWeight = "bold";    
  }

  /**
   * @description Used when an error occured with the request for the last query.
   * @param {String} query - Attraction used for the request
   */
  showRequestErrorMessage(query) {
    this.container.textContent = `There was an internal server error when processing: ${query}.`;
    this.container.style.color = "red";
    this.container.style.fontWeight = "bold";    
  }

  /**
   * @description Always show this message to describe the use of the application, if everything works as expected.
   */
  showDefaultAppSuccessMessage() {
    this.container.textContent = "This application is used for routing you to the attractions you want to see.";
    this.container.style.color = "#000000";
    this.container.style.fontWeight = "normal";
  }

  /**
   * @description Used when there is no backend available for the application.
   */
  showBackendNotAvailableMessage() {
    this.container.textContent = "Currently the application functionality can not be used. Please try again later.";
    this.container.style.color = "red";
    this.container.style.fontWeight = "bold";
  }

  /**
   * @description Used when calling the routing approach and there are fewer than two attractions selected.
   */
  showNotEnoughAttractionsSelectedErrorMessage() {
    this.container.textContent = "Currently there are fewer than two attractions selected so you can not request the routing. Please add some more attractions.";
    this.container.style.color = "red";
    this.container.style.fontWeight = "bold";
  }

  /**
   * 
   * @param {*} shouldBeVisible - true to make the container visible, false to hide it
   */
  makeVisible(shouldBeVisible) {
    this.container.hidden = !(shouldBeVisible === true);
  }

}