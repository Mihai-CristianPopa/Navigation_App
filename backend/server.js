import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors";

dotenv.config(); // Load .env -> process.env

const app = express();
const PORT = process.env.PORT || 3000;

// app.use(cors());

// OR: more strict — allow only your frontend
app.use(cors({ origin: "http://localhost:5173" }));

app.get("/api/geocode", async (req, res) => {
  const { place } = req.query;

  if (!place) {
    return res.status(400).json({ error: "Missing place query" });
  }
  
  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) {
    return res.status(403).json({ error: "Missing authorization" });
  }

  try {
    const response = await axios.get(
      `https://us1.locationiq.com/v1/search.php`,
      {
        params: {
          key: apiKey,
          q: place,
          format: "json"
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to geocode" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
