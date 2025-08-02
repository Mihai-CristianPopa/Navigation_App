import authService from './authService.js';
import { clearUserState } from "./main.js";

class AuthUI {
  constructor(manageAppExplanationParagraph) {
    this.authPanel = document.getElementById("used-for-hiding-auth-panel");
    this.userPanel = document.getElementById("used-for-hiding-user-panel");
    this.loginForm = document.getElementById("used-for-hiding-login-form");
    this.registerForm = document.getElementById("used-for-hiding-register-form");
    this.errorDiv = document.getElementById('auth-error');
    this.userEmailSpan = document.getElementById('user-email');
    this.manageAppExplanationParagraph = manageAppExplanationParagraph;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Form toggles
    document.getElementById('show-register').addEventListener('click', () => {
      this.showRegisterForm();
    });

    document.getElementById('show-login').addEventListener('click', () => {
      this.showLoginForm();
    });

    // Form submissions
    this.loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    this.registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleRegister();
    });

    // Logout
    document.getElementById('logout-button').addEventListener('click', () => {
      this.handleLogout();
    });
  }

  showAuthPanel() {
    this.authPanel.hidden = false;
    this.userPanel.hidden = true;
    this.hideError();
    this.showLoginForm();
  }

  showUserPanel(user) {
    this.authPanel.hidden = true;
    this.userPanel.hidden = false;
    this.userEmailSpan.textContent = user.email;
    document.body.classList.add('authenticated');
  }

  showLoginForm() {
    this.loginForm.hidden = false;
    this.registerForm.hidden = true;
    this.hideError();
    this.loginForm.firstElementChild.reset();
  }

  showLoginFormAfterRegistration(registeredEmail) {
    this.showLoginForm();
    document.getElementById("login-email").value = registeredEmail;
  }

  showRegisterForm() {
    this.loginForm.hidden = true;
    this.registerForm.hidden = false;
    this.hideError();
    this.registerForm.firstElementChild.reset();
  }

  showError(message) {
    this.errorDiv.textContent = message;
    this.errorDiv.hidden = false;
  }

  hideError() {
    this.errorDiv.hidden = true;
    this.errorDiv.textContent = '';
  }

  setLoading(form, isLoading) {
    if (isLoading) {
      form.classList.add('loading');
    } else {
      form.classList.remove('loading');
    }
  }

  showSearchPanelAndMessagePanel() {
    document.getElementById("used-for-hiding-controls-panel").hidden = false;
    document.getElementById("used-for-hiding-message-panel").hidden = false;
    this.manageAppExplanationParagraph.showDefaultAppSuccessMessage();
  }

  hideSearchPanelAndMessagePanel() {
    document.getElementById("used-for-hiding-controls-panel").hidden = true;
    document.getElementById("used-for-hiding-message-panel").hidden = true;
  }

  async handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    this.setLoading(this.loginForm, true);
    this.hideError();

    try {
      const result = await authService.login(email, password);
      
      if (result.success) {
        this.showUserPanel(authService.user);
        this.showSearchPanelAndMessagePanel();
      } else {
        this.showError(result.message);
      }
    } catch (error) {
      this.showError('Login failed. Please try again.');
      console.error('Login error:', error);
    } finally {
      this.setLoading(this.loginForm, false);
    }
  }

  async handleRegister() {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    if (password !== confirmPassword) {
      this.showError('Passwords do not match');
      return;
    }

    // if (password.length < 8) {
    //   this.showError('Password must be at least 8 characters long');
    //   return;
    // }

    this.setLoading(this.registerForm, true);
    this.hideError();

    try {
      const result = await authService.register(email, password);
      
      if (result.success) {
        this.showLoginFormAfterRegistration(email);
        // Auto-login after successful registration
        // const loginResult = await authService.login(email, password);
        // if (loginResult.success) {
        //   this.showUserPanel(authService.user);
        // } else {
        //   this.showLoginForm();
        //   this.showError('Registration successful! Please sign in.');
        // }
      } else {
        this.showError(result.message);
      }
    } catch (error) {
      this.showError('Registration failed. Please try again.');
      console.error('Registration error:', error);
    } finally {
      this.setLoading(this.registerForm, false);
    }
  }

  async handleLogout() {
    try {
      await authService.logout();
      this.showAuthPanel();
      this.hideSearchPanelAndMessagePanel();
      document.body.classList.remove('authenticated');
      
      // Clear any app state if needed
      clearUserState();
      // this.clearAppState();
    } catch (error) {
      console.error('Logout error:', error);
      // Still show auth panel even if logout request failed
      this.showAuthPanel();
      document.body.classList.remove('authenticated');
    }
  }

  clearAppState() {
    // Clear any user-specific app state here
    // For example, clear selected attractions, routes, etc.
    console.log('Clearing app state after logout');
  }
}

export default AuthUI;