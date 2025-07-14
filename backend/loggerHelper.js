const loggerObject = function (status, req, startTime, err) {
    let errorMessage = ""
    const loggerObject = {}
    if (err) {
        status = err.status
        errorMessage = err.message
    }
    
    loggerObject.statusCode = status;
    if (req) {
        loggerObject.route = req.originalUrl;
        loggerObject.method = req.method;
    }
    if (startTime) {
        loggerObject.responseTime = `${Date.now() - startTime} ms`;
    }
    if (errorMessage) {
        loggerObject.errorMessage = errorMessage
    }
    return loggerObject;
}

export default loggerObject;