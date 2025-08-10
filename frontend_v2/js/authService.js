import resolveBackendOrigin from "./checkBackend.js";
import { EVENTS } from "./constants.js";

class AuthService {
  constructor() {
    this._backendOrigin = null;
    this._user = null;
    this._isAuthenticated = false;
  }

  async initialize() {
    this._backendOrigin = await resolveBackendOrigin();
    const backendOriginFetchedEvent = new CustomEvent(EVENTS.BACKEND_ORIGIN_FETCHED, {
        detail: {
          backendOrigin: this._backendOrigin
        }
    });
    document.dispatchEvent(backendOriginFetchedEvent);
    if (this._backendOrigin) {
      await this.checkAuthStatus();
    }
    return !!this._backendOrigin;
  }

  async checkAuthStatus() {
    if (!this._backendOrigin) return false;

    try {
      const response = await fetch(`${this._backendOrigin}/authentication/me`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.authenticated) {
        this._user = data.user;
        this._isAuthenticated = true;
        return true;
      } else {
        this._user = null;
        this._isAuthenticated = false;
        return false;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this._user = null;
      this._isAuthenticated = false;
      return false;
    }
  }

  async login(email, password) {
    if (!this._backendOrigin) {
      throw new Error('Backend not available');
    }

    const response = await fetch(`${this._backendOrigin}/authentication/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    // Refresh user data
    const cookieProperlySet = await this.checkAuthStatus();

    if (response.ok && data.success && cookieProperlySet) {
      return { success: true };
    } else {
      return { 
        success: false, 
        message: data.message || 'Login failed' 
      };
    }
  }

  /** If registration works fine we will return an object containing ok: true, and a message.
   * In case of failure ok will not be sent.
   */
  async register(email, password) {
    if (!this._backendOrigin) {
      throw new Error('Backend not available');
    }
    try {
      const response = await fetch(`${this._backendOrigin}/authentication/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      const responseObject = {
        message: data.message
      }

      if (response.ok) {
        responseObject.ok = true;
      }
      return responseObject;
    } catch (error) {
      return {
        message: "Something went wrong with the registration request. Please try again later."
      }
    }
  }

  async logout() {
    if (!this._backendOrigin) return { success: true };

    try {
      const response = await fetch(`${this._backendOrigin}/authentication/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();
      
      // Always reset local state, even if server request fails
      this._user = null;
      this._isAuthenticated = false;
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Still reset local state
      this._user = null;
      this._isAuthenticated = false;
      return { success: true };
    }
  }

  get user() {
    return this._user;
  }

  get isAuthenticated() {
    return this._isAuthenticated;
  }

  get backendOrigin() {
    return this._backendOrigin;
  }
}

export default new AuthService();