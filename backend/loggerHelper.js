import logger from "./logger.js";

const defaultLog = (req, startTime) => {
    const log = {};
    if (req) {
        log.route = req.originalUrl;
        log.method = req.method;
        log.email = req?.user?.email || "";
    }
    if (startTime) {
        log.responseTime = `${Date.now() - startTime} ms`;
    }
    return log;
}

const loggerObject = (status, req, startTime, err) => {
    let errorMessage = "";
    const loggerObject = {};
    let details;
    if (err) {
        status = err.status;
        errorMessage = err.message;
        details = err.details;
    }
    loggerObject.statusCode = status;
    if (req) {
        loggerObject.route = req.originalUrl;
        loggerObject.method = req.method;
        loggerObject.email = req?.user?.email || "";
    }
    if (startTime) {
        loggerObject.responseTime = `${Date.now() - startTime} ms`;
    }
    if (errorMessage) {
        loggerObject.message = errorMessage;
        loggerObject.details = details;
    }
    return loggerObject;
}

export const infoLog = (req, startTime, message = "") => {
    const log = defaultLog(req, startTime);
    log.statusCode = 200;
    if (message) log.message = message;
    // return log;
    logger.info(log);
}

export const errorObj = (req, startTime, error) => {
    const log = defaultLog(req, startTime);
    log.statusCode = error?.statusCode || 500;
    log.message = error?.message || "An error occurred";
    if (error?.details) log.details = error.details;
    return log;
}

export const warnLog = (req, startTime, message = "") => {
    const log = defaultLog(req, startTime);
    if (message) log.message = message;
    // return log;
    logger.warn(log);
}

export default loggerObject;