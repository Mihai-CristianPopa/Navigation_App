import { config } from "../configs/config.js";
import logger from "../logger.js";
import logObj from "../loggerHelper.js";
import axios from "axios";
// TODO either remove this or update it
export const attractionDetailsController = async (req, res) => {
  const startTime = Date.now();
  const {lat, lon} = req.query;

  if (!lat) {
    logger.error("Latitude query parameter missing from request", logObj(400, req, startTime));
    return res.status(400).json({
      success: false,
      message: "Latitude coordinate is required"
    });
  }

  if (!lon) {
    logger.error("Longitude query parameter missing from request", logObj(400, req, startTime));
    return res.status(400).json({
      success: false,
      message: "Longitude coordinate is required"
    });
  }

  const apiKey = config.rapidApiKey;
  if (!apiKey) {
    logger.error("The API Key for RapidApi is not configured in the backend", logObj(500, req, startTime));
    return res.status(500).json({ error: "The API Key for RapidApi is not configured in the backend" });
  }

  try {

    const response = await axios.get(
      "https://opentripmap-places-v1.p.rapidapi.com/en/places/radius", {
        params: {
          radius: "500",
          limit: "1",
          lon,
          lat
        },
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": "opentripmap-places-v1.p.rapidapi.com"
        }
      }
    );

    const wikidataId = response?.data?.features[0]?.properties?.wikidata;

    if (!wikidataId) {
      logger.warn(`No Wikidata found for attraction with coordinates, lat: ${lat}, and lon: ${lon}`, logObj(500, req, startTime));
      return res.status(500).json({
        success: false,
        message: "No Wikidata found for attraction, default to the feature name"
      });
    }

    const wikiDataResponse = await axios.get(
      `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`,
      {
        headers: {
          "User-Agent": "Map-Navigation-App mihaipopa00@gmail.com"
        }
      }
    );

    console.log(wikiDataResponse);

    const sparqlWikiDataResponse = await fetchWikidataBatch([wikidataId]);

    console.log(sparqlWikiDataResponse);

  } catch (error) {
    logger.error("Unexpected error when fetching the attraction details", logObj(500, req, startTime));
    return res.status(500).json({message: "Unexpected error when fetching the attraction details"});
  }
};

async function fetchWikidataBatch(qids) {
  const values = qids.map(q => `wd:${q}`).join(" ");
  const query = `
    SELECT ?item ?itemLabel ?itemDescription ?image WHERE {
      VALUES ?item { ${values} }
      OPTIONAL { ?item wdt:P18 ?image. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `;
  const url = 'https://query.wikidata.org/sparql?format=json&query=' +
              encodeURIComponent(query);

  const res = await fetch(url, {
    headers: {
    'Accept': 'application/sparql-results+json',
    'User-Agent': "Map-Navigation-App mihaipopa00@gmail.com"
  }
  });
  const json = await res.json();
  // transform results into a map { Qid: {label,desc,image} }
  const map = {};
  json.results.bindings.forEach(b => {
    const q = b.item.value.split('/').pop(); 
    map[q] = {
      label:       b.itemLabel.value,
      description: b.itemDescription?.value || '',
      imageUrl:    b.image?.value || null
    };
  });
  return map;
}

// usage
// const qids = features
//   .map(f => f.properties.wikidata)
//   .filter(q => q != null);
// const wikiDataMap = await fetchWikidataBatch(qids);