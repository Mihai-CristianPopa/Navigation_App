import client from "../db/mongoClient.js";

export async function insertAttraction(attraction) {
  const db = client.db("geocoding_results");
  const collection = db.collection("attractions");
  return await collection.insertOne(attraction);
}

export async function getAttraction(attractionSearchName) {
  const db = client.db("geocoding_results");
  const collection = db.collection("attractions");
  return await collection.findOne({ attraction_search_name: attractionSearchName });
}