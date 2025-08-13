// Database check middleware for all authentication routes
export const checkDatabaseForAuth = (req, res, next) => {
  // This only runs when someone hits /authentication/* routes
  if (req.app.locals.dbIsDown) {
    return res.status(503).json({
      message: "Authentication services are temporarily unavailable.",
      error: "DATABASE_UNAVAILABLE"
    });
  }
  next(); // Continue to the actual route handler
};