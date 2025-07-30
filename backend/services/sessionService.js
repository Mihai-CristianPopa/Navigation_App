import client from "../db/mongoClient.js";
import { ObjectId } from "mongodb";

/**
 * Adds a session to the database with a specific structure
 * @param {Object} session - must contain the id and email of the user for which it was created and the creation date
 * @returns a promise of the session addition request
 */
export function createLoginSession(session) {
  const db = client.db("authentication");
  const collection = db.collection("sessions");
  return collection.insertOne(session);
}

/**
 * @description Used when logging out for deleting the session instance from the backend.
 * @param {string} sessionId - the string representing the login session id
 * @returns a promise which contains the number of deleted items from the database
 */
export function deleteLoginSession(sessionId) {
  const db = client.db("authentication");
  const collection = db.collection("sessions");
  return collection.deleteOne({ _id: new ObjectId(sessionId) });
}

/**
 * @description Used when checking whether a user is logged in or not when first entering the page.
 * @param {string} sessionId - the string representing the login session id
 * @returns a promise which contains the session if there exists one in the database
 */
export function getLoginSession(sessionId) {
  const db = client.db("authentication");
  const collection = db.collection("sessions");
  return collection.findOne({ _id: new ObjectId(sessionId) });
}