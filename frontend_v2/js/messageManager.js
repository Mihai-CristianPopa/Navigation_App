import { MESSAGES } from "./constants.js";

export default class MessageManager {
  /**
   * @param generalInformationParagraph - This is developed for the app-explanation <p>
   * @param locationInformationParagraph
   */
  constructor(generalInformationParagraph, locationInformationParagraph) {
    this.generalInformationParagraph = generalInformationParagraph;
    this.locationInformationParagraph = locationInformationParagraph;
  }

  _showSuccessMessage(message, container = this.generalInformationParagraph) {
    container.textContent = message
    container.style.color = "#000000";
    container.style.fontWeight = "normal";
  }

  _showErrorMessage(message, container = this.generalInformationParagraph) {
    container.textContent = message;
    container.style.color = "red";
    container.style.fontWeight = "bold"; 
  }

  /**
   * @description Used when user makes a search attraction request without inputting any query.
   */
  showNoQueryFoundErrorMessage() {
    this._showErrorMessage(MESSAGES.ERROR.NO_QUERY_FOUND);
  }

  /**
   * @description Used when no suggestions are found for the query which was used.
   * @param {String} q - Attraction used for the request
   */
  showNoSuggestionsFoundErrorMessage(q) {
    this._showErrorMessage(MESSAGES.ERROR.NO_SUGGESTIONS(q));  
  }

  /**
   * @description Used when an error occured with the request for the last query.
   * @param {String} q - Attraction used for the request
   */
  showRequestErrorMessage(q) {
    this._showErrorMessage(MESSAGES.ERROR.REQUEST_ATTRACTION_INTERNAL_SERVER_ERROR(q));
  }

  /**
   * @description Always show this message to describe the use of the application, if everything works as expected.
   */
  showDefaultAppSuccessMessage() {
    this._showSuccessMessage(MESSAGES.SUCCESS.DEFAULT_APP_EXPLANATION);
  }

  /**
   * @description Used when there is no backend available for the application.
   */
  showBackendNotAvailableMessage() {
    this._showErrorMessage(MESSAGES.ERROR.BACKEND_NOT_AVAILABLE);
  }

  /**
   * @description Used when calling the routing approach and there are fewer than two attractions selected.
   */
  showNotEnoughAttractionsSelectedErrorMessage() {
    this._showErrorMessage(MESSAGES.ERROR.LESS_THAN_TWO_ATTRACTIONS);
  }

  showLocationNotFoundFirstWaypointBecomesStartingPoint() {
    this._showErrorMessage(MESSAGES.ERROR.LOCATION_NOT_FETCHED, this.locationInformationParagraph);
  }

  showLocationIsStartingPoint() {
    this._showSuccessMessage(MESSAGES.SUCCESS.LOCATION_IS_STARTING_POINT, this.locationInformationParagraph);
  }
}