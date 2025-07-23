// TODO map the message from showDefaultAppSuccessMessage with the one from the HTML
export default class MessageManager {
  /**
   * @param containerElement - This is developed for the app-explanation <p>
   */
  constructor(containerElement) {
    this.container = containerElement;
  }

  showNoQueryFoundErrorMessage() {
    this.container.textContent = "There was no attraction inputted for the previous request";
    this.container.style.color = "red";
    this.container.style.fontWeight = "bold";    
  }

  showNoSuggestionsFoundErrorMessage() {
    this.container.textContent = `No suggestions found for ${lastQuery}.`;
    this.container.style.color = "red";
    this.container.style.fontWeight = "bold";    
  }

  showRequestErrorMessage() {
    this.container.textContent = `There was an internal server error when processing: ${lastQuery}.`;
    this.container.style.color = "red";
    this.container.style.fontWeight = "bold";    
  }

  showDefaultAppSuccessMessage() {
    this.container.textContent = "This application is used for routing you to the attractions you want to see.";
    this.container.style.color = "#000000";
    this.container.style.fontWeight = "normal";
  }

  showBackendNotAvailableMessage() {
    this.container.textContent = "Currently the application functionality can not be used. Please try again later.";
    this.container.style.color = "red";
    this.container.style.fontWeight = "bold";
  }

  makeVisible(shouldBeVisible) {
    this.container.hidden = !(shouldBeVisible === true);
  }

}