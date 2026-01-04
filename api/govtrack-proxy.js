// api/govtrack-proxy.js
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  try {
    const { endpoint, sponsor, cosponsor, person, id, current_status } = req.query;

    let url = "https://www.govtrack.us/api/v2/";

    if (endpoint === "bill") {
      url += "bill?";
      if (sponsor) url += `sponsor=${sponsor}&`;
      if (cosponsor) url += `cosponsor=${cosponsor}&`;
      if (current_status) url += `current_status=${current_status}&`;
    } else if (endpoint === "role") {
      url += `role?person=${person}`;
    } else if (endpoint === "person") {
      url += `person/${id}`;
    } else {
      return res.status(400).json({ error: "Invalid endpoint" });
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GovTrack API error: ${response.status}`);
    }
    const data = await response.json();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Failed to fetch GovTrack data" });
  }
};
