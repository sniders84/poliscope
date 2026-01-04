// api/govtrack-proxy.js
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  const { cosponsor } = req.query;
  try {
    const response = await fetch(`https://www.govtrack.us/api/v2/bill?cosponsor=${cosponsor}`);
    const data = await response.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch GovTrack data" });
  }
};
