import { createClearingIndex } from "../services/commonService.js";

const SESSION_COOKIE_NAME = 'sid';

const sessionExpirationTimeInMiliseconds = 24 * 60 * 60 * 1000;

const COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  sameSite: 'none',
  secure: true,
  path: '/',
};

const SESSION_COOKIE_OPTIONS = {
//   // domain:   '.example.com',  // valid on any *.example.com
  ...COOKIE_BASE_OPTIONS,
  maxAge: sessionExpirationTimeInMiliseconds
};

const SESSION_CLEAR_OPTIONS = {
  ...COOKIE_BASE_OPTIONS
};

export const setSessionCookie = (res, sessionId) => {
  return res.cookie(SESSION_COOKIE_NAME, sessionId, SESSION_COOKIE_OPTIONS);
};

export const clearSessionCookie = (res) => {
  return res.clearCookie(SESSION_COOKIE_NAME, SESSION_CLEAR_OPTIONS);
};

export const getSessionId = (req) => {
  return req.cookies[SESSION_COOKIE_NAME];
};

export const isSessionExpired = (loginTimeISO) => {
  const loginTime = new Date(loginTimeISO);
  const currentTime = new Date();
  const timeDifference = currentTime - loginTime;
  
  return timeDifference >= sessionExpirationTimeInMiliseconds;
};

export const createLoginSessionClearingIndex = () => {
  return createClearingIndex("authentication", "sessions", "login_time", sessionExpirationTimeInMiliseconds);  
} 
