import dotenv from "dotenv";
dotenv.config();

export const config = {
  locationIQApiKey: process.env.LOCATIONIQ_API_KEY,
  mongoUser: process.env.MONGO_USER,
  mongoPassword: process.env.MONGO_PASSWORD,
  port: process.env.PORT || 3000,
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173"
};