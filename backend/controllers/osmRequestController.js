import logger from "../logger.js";
import { errorObj, infoLog } from "../loggerHelper.js";
import { ERROR_OBJECTS, INFO_MESSAGE, LIMIT, EXTERNAL_APIS } from "../utils/constants.js";
import { getExtraAttractionDetails, insertExtraAttractionDetails } from "../services/extraDetailsService.js";
import { fetchWikidataBatch } from "../controllers/attractionDetailsController.js";
import axios from "axios";

export const osmRequestController = async (req, res) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "osmRequestController failure.";
  const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
  const UA = 'MapNavigationApp/1.0 (mihaipopa00@gmail.com)';

  async function extractDataFromTags(tags, osmId, osmType) {
    let wikidataResults;
    const wikiDataId = tags.wikidata || null;
    if (wikiDataId) wikidataResults = await fetchWikidataBatch([wikiDataId]);
    // Extract contact + hours from OSM
    const osmName = tags.name || null;
    const osmEnglishName = tags["name:en"] || null;
    const osmWebsite = tags.website || tags['contact:website'] || null;
    const openingHours = tags.opening_hours || null;
    const phone = tags.phone || tags['contact:phone'] || null;
    const email = tags.email || tags['contact:email'] || null;

    // Try to get an image from OSM (either a URL or a Commons filename)
    // const osmImageRaw = tags.image || tags['wikimedia_commons'] || null;
    // const osmImage = normalizeImage(osmImageRaw);
    const wikiDataImage = normalizeImage(wikidataResults[wikiDataId]?.imageUrl || null);
    // const wikiDataId = tags.wikidata || null;wikiDataImage

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
      wikiDataId,
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

  async function cacheOsmResult(result) {
    try {
      await insertExtraAttractionDetails(result);
    } catch (error) {
      logger.error("Caching of the attraction details failed.", errorObj(req, startTime, error));
    }
  }

  async function checkTheCache(osmId, osmType) {
    try {
      const cachedResult = await getExtraAttractionDetails(osmId, osmType);
      return cachedResult;
    } catch (error) {
      logger.error("Cache not available for attraction.", errorObj(req, startTime, error));
    }
    return null;
  }

  try {
    const {osmId, osmType, wikidataId} = req.query;

    if (!((osmId && osmType) || wikidataId)) {
      const err = ERROR_OBJECTS.BAD_REQUEST("osmId,osmType/waypointId");
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(err.statusCode).json(err);
    }

    const cacheResult = await checkTheCache(osmId, osmType);
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
    cacheOsmResult(result);
    infoLog(req, startTime, "Successfully fetched extra details.");
  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};