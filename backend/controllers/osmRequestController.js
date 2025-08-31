import logger from "../logger.js";
import { errorObj, infoLog } from "../loggerHelper.js";
import { ERROR_OBJECTS } from "../utils/constants.js";
import { getExtraAttractionDetails, insertExtraAttractionDetails } from "../services/extraDetailsService.js";
import axios from "axios";

export const osmRequestController = async (req, res) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "osmRequestController failure.";
  const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
  const UA = 'MapNavigationApp/1.0 (mihaipopa00@gmail.com)';

  async function extractDataFromTags(tags, osmId, osmType) {
    let wikiDataImage;
    const wikiDataId = tags.wikidata || null;
    if (wikiDataId) {
      const wikidataResults = await fetchWikidataBatch([wikiDataId]);
      wikiDataImage = normalizeImage(wikidataResults[wikiDataId]?.imageUrl || null);
    }

    // Extract contact + hours from OSM
    const osmName = tags.name || null;
    const osmEnglishName = tags["name:en"] || null;
    const osmWebsite = tags.website || tags['contact:website'] || null;
    const openingHours = tags.opening_hours || null;
    const phone = tags.phone || tags['contact:phone'] || null;
    const email = tags.email || tags['contact:email'] || null;

    return {
      osmId,
      osmType,
      osmName,
      osmEnglishName,
      osmWebsite,
      openingHours,
      phone,
      email,
      osmImage: wikiDataImage,
      wikidataId: wikiDataId,
      created_at: new Date(),
      date: new Date().toISOString().split('T')[0]
    }

  }

  function normalizeImage(raw) {
    if (!raw) return null;
    // If it's already a URL, just return it
    if (/^https?:\/\//i.test(raw)) return raw.trim();

    // If it's a Commons filename (e.g. "File:Triumphal_Arch.jpg" or "Triumphal_Arch.jpg"),
    // convert to a hotlinkable URL via Special:FilePath
    const file = raw.replace(/^File:/i, '').trim();
    if (!file) return null;
    return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(file);
  }

  async function cacheSearchResult(result) {
    try {
      await insertExtraAttractionDetails(result);
    } catch (error) {
      logger.error("Caching of the attraction details failed.", errorObj(req, startTime, error));
    }
  }

  async function checkTheCache(searchObject) {
    try {
      const cachedResult = await getExtraAttractionDetails(searchObject);
      return cachedResult;
    } catch (error) {
      logger.error("Cache not available for attraction.", errorObj(req, startTime, error));
    }
    return null;
  }

  async function fetchDetailsStartingFromOsm(osmId, osmType) {
    const cacheResult = await checkTheCache({ osmId, osmType });
    if (cacheResult) {
      infoLog(req, startTime, "Successfully fetched extra details from the cache.");
      return res.status(200).json(cacheResult);
    }

    const overpassQL = `[out:json][timeout:25];(${osmType}(${osmId}););out tags center;`;
    const overpassResp = await axios.get(OVERPASS_URL, {
      params: { data: overpassQL },
      headers: { 'User-Agent': UA },
      timeout: 15_000,
    });

    const element = overpassResp.data?.elements?.[0];
    const tags = element?.tags;
    if (!element || !tags) {
      const err = ERROR_OBJECTS.NO_DATA_FOUND(osmId, osmType);
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(err.statusCode).json(err);
    }

    const result = await extractDataFromTags(tags, osmId, osmType);
    res.status(200).json(result);
    cacheSearchResult(result);
    infoLog(req, startTime, "Successfully fetched extra details.");
  }

  async function fetchDetailsStartingFromWikidata(wikidataId) {
    const cacheResult = await checkTheCache({ wikidataId });
    if (cacheResult) {
      infoLog(req, startTime, "Successfully fetched extra details from the cache.");
      return res.status(200).json(cacheResult);
    }

    const wikidataResults = await fetchWikidataBatch([wikidataId]);
    const wikidataSearchResult = wikidataResults[wikidataId];
    const wikiDataImage = normalizeImage(wikidataSearchResult?.imageUrl || null);

    const result = {
      wikidataId,
      osmImage: wikiDataImage,
      osmWebsite: wikidataSearchResult?.officialWebsite || null,
      name: wikidataSearchResult?.label || null,
      description: wikidataSearchResult?.description || null,
      created_at: new Date(),
      date: new Date().toISOString().split('T')[0]
    }

    res.status(200).json(result);
    cacheSearchResult(result);
    infoLog(req, startTime, "Successfully fetched extra details.");
  }

  async function fetchWikidataBatch(qids) {
    const values = qids.map(q => `wd:${q}`).join(" ");
    const query = `
      SELECT ?item ?itemLabel ?itemDescription ?image ?official_website WHERE {
        VALUES ?item { ${values} }
        OPTIONAL { ?item wdt:P18 ?image. }
        OPTIONAL { ?item wdt:P856 ?official_website. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
    `;
    const url = 'https://query.wikidata.org/sparql?format=json&query=' +
                encodeURIComponent(query);
  
    const res = await axios.get(url, {
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': UA
      },
      timeout: 15_000
    });
    const json = res.data;
    // transform results into a map { Qid: {label,desc,image} }
    const map = {};
    json.results.bindings.forEach(b => {
      const q = b.item.value.split('/').pop(); 
      map[q] = {
        label:       b.itemLabel.value,
        description: b.itemDescription?.value || '',
        imageUrl:    b.image?.value || null,
        officialWebsite: b.official_website?.value || null
      };
    });
    return map;
  }

  try {
    const {osmId, osmType, wikidataId} = req.query;

    if (!((osmId && osmType) || wikidataId)) {
      const err = ERROR_OBJECTS.BAD_REQUEST("osmId,osmType/waypointId");
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(err.statusCode).json(err);
    }

    if (osmId && osmType) return fetchDetailsStartingFromOsm(osmId, osmType);

    if (wikidataId) return fetchDetailsStartingFromWikidata(wikidataId);
  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};