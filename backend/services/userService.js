import client from "../db/mongoClient.js";

/**
 * Adds a user to the database with a specific structure
 * @param {Object} user - must contain the email address, the hashed password
 * @returns a promise of the user addition request
 */
export function registerUser(user) {
  const db = client.db("authentication");
  const collection = db.collection("users");
  return collection.insertOne(user);
};

/**
 * Looks up a user from the database based on the email address
 * @param {String} emailAddress - the email address of the user to searched in the database
 * @returns a promise of the user searching request, if none exists,
 * the result after await will be null, otherwise the result will be the entry from the db
 */
export function getUserByEmail(emailAddress) {
  const db = client.db("authentication");
  const collection = db.collection("users");
  return collection.findOne({ email_address: emailAddress });
}

/**
 * Deletes a user from the database based on the email address
 * @param {String} emailAddress - the email address of the user to be deleted
 * @returns a promise of the deletion request
 */
export function deleteUser(emailAddress) {
  const db = client.db("authentication");
  const collection = db.collection("users");
  return collection.deleteOne({ email_address: emailAddress });
}

