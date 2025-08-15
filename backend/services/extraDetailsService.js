import client from "../db/mongoClient.js";

/** Function used to cache the OSM result. */
export async function insertExtraAttractionDetails(detailsObject) {
  const db = client.db("geocoding_results");
  const collection = db.collection("attractions_extra_details");
  return await collection.insertOne(detailsObject);
}

/** Used for checking whether there is an existent cache for the attraction
 * Can be used either to search by osmId and osmType or by wikidataId.
 */

export async function getExtraAttractionDetails(searchObject) {
  const db = client.db("geocoding_results");
  const collection = db.collection("attractions_extra_details");
  return await collection.findOne(searchObject);
}