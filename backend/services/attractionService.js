import client from "../db/mongoClient.js";

/**
 * 
 * @param {Object} attraction - it should contain the attraction search name and the options returned
 * by the API 
 * @returns a promise which should contain an object with the id generated for identification
 * in the database
 */
export async function insertAttraction(attraction) {
  const db = client.db("geocoding_results");
  const collection = db.collection("attractions");
  return await collection.insertOne(attraction);
}

// Currently not used
export async function getAttraction(attractionSearchName) {
  const db = client.db("geocoding_results");
  const collection = db.collection("attractions");
  return await collection.findOne({ attraction_search_name: attractionSearchName });
}
/**
 * 
 * @param {String} attractionSearchName 
 * @returns a promise which should contain the cached result for the attraction name or null
 */
export async function getAttractionOptions(attractionSearchName) {
  const db = client.db("geocoding_results");
  const collection = db.collection("attractions");
  return await collection.findOne({ attraction_search_name: attractionSearchName });
}

// Currently not used
export async function replaceAttraction(attractionSearchName, attractionReplacementDocument) {
  const db = client.db("geocoding_results");
  const collection = db.collection("attractions");
  return await collection.findOneAndReplace({ attraction_search_name: attractionSearchName }, attractionReplacementDocument);
}