export default class RouteSummaryHandler {
  /**
   * @param containerElement - this is thought for route summary panel
   */
  constructor(containerElement) {
    this.container = containerElement;
  }

  hideRouteSummary() {
    this.container.hidden = true;
  }

  showRouteSummary() {
    this.container.hidden = false;
  }

  clearRouteSummary() {
    this.hideRouteSummary();
    const line = document.getElementById('routeLine');
    const totalEl = document.getElementById('routeTotal');
    line.innerHTML = '';
    totalEl.textContent = "";
  }

  renderRouteLine(stops, legs, total) {
  const line = document.getElementById('routeLine');
  const totalEl = document.getElementById('routeTotal');
  line.innerHTML = '';

  stops.forEach((name, i) => {
    const stopEl = document.createElement('div');
    stopEl.className = 'stop';
    stopEl.textContent = name;
    line.appendChild(stopEl);

    if (i < stops.length - 1) {
      const legEl = document.createElement('div');
      legEl.className = 'leg';
      const time = document.createElement('span');
      time.className = 'leg-time';
      time.textContent = legs[i];
      legEl.appendChild(time);
      line.appendChild(legEl);
    }
  });

  totalEl.textContent = `Total: ${total}`;
  this.showRouteSummary();
}
}