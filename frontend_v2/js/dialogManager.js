export default class DialogManager {
  constructor() {
    this.overlay = document.getElementById("used-for-hiding-confirmation-dialog-overlay");
    this.dialog = document.getElementById('confirmation-dialog');
    this.title = document.getElementById('dialog-title');
    this.message = document.getElementById('dialog-message');
    this.cancelButton = document.getElementById('dialog-cancel');
    this.continueButton = document.getElementById('dialog-continue');
    
    this._setupEventListeners();
  }

  _setupEventListeners() {
    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.overlay.hidden) {
        this.hide();
      }
    });
  }

  /**
   * Show confirmation dialog
   * @param {Object} options - Dialog configuration
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Dialog message
   * @param {string} options.continueText - Continue button text
   * @param {string} options.cancelText - Cancel button text
   * @returns {Promise<boolean>} - Resolves to true if user clicked continue, false if cancelled
   */
  showConfirmation({
    title = 'Confirm Action',
    message = 'Are you sure you want to continue?',
    continueText = 'Continue',
    cancelText = 'Cancel'
  } = {}) {
    return new Promise((resolve) => {
      // Set content
      this.title.textContent = title;
      this.message.textContent = message;
      this.continueButton.textContent = continueText;
      this.cancelButton.textContent = cancelText;

      // Remove previous event listeners
      const newCancelButton = this.cancelButton.cloneNode(true);
      const newContinueButton = this.continueButton.cloneNode(true);
      this.cancelButton.parentNode.replaceChild(newCancelButton, this.cancelButton);
      this.continueButton.parentNode.replaceChild(newContinueButton, this.continueButton);
      this.cancelButton = newCancelButton;
      this.continueButton = newContinueButton;

      // Add event listeners
      this.cancelButton.addEventListener('click', () => {
        this.hide();
        resolve(false);
      });

      this.continueButton.addEventListener('click', () => {
        this.hide();
        resolve(true);
      });

      // Show dialog
      this.show();
    });
  }

  show() {
    this.overlay.hidden = false;
    // Focus the cancel button by default for better UX
    setTimeout(() => this.cancelButton.focus(), 100);
  }

  hide() {
    this.overlay.hidden = true;
  }
}