// api/distance.js — Enhanced Google Maps Distance Matrix with traffic
// Vercel Serverless Function
// Supports: single pair, multi-origin, multi-destination matrix
//
// Usage:
//   GET /api/distance?origins=addr1|addr2&destinations=addr3|addr4&departure_time=now
//   POST /api/distance { origins: [...], destinations: [...], departure_time: "now" }

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY not configured" });

  try {
    let origins, destinations, departureTime, mode;

    if (req.method === "POST") {
      ({ origins, destinations, departure_time: departureTime, mode } = req.body || {});
    } else {
      origins = req.query.origins;
      destinations = req.query.destinations;
      departureTime = req.query.departure_time;
      mode = req.query.mode;
    }

    if (!origins || !destinations) {
      return res.status(400).json({ error: "origins and destinations required. Separate multiple with |" });
    }

    // Build Google Maps Distance Matrix URL
    const params = new URLSearchParams({
      origins: Array.isArray(origins) ? origins.join("|") : origins,
      destinations: Array.isArray(destinations) ? destinations.join("|") : destinations,
      key: API_KEY,
      units: "imperial",
      mode: mode || "driving",
    });

    // Add departure_time for traffic data
    // "now" = current traffic, or unix timestamp for predicted traffic
    if (departureTime) {
      params.set("departure_time", departureTime === "now" ? "now" : departureTime);
      params.set("traffic_model", "best_guess"); // options: best_guess, pessimistic, optimistic
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      return res.status(400).json({ error: data.error_message || data.status, raw: data });
    }

    // Parse into a cleaner format
    const results = {
      origin_addresses: data.origin_addresses,
      destination_addresses: data.destination_addresses,
      matrix: data.rows.map((row, oi) => ({
        origin: data.origin_addresses[oi],
        destinations: row.elements.map((el, di) => ({
          destination: data.destination_addresses[di],
          status: el.status,
          distance: el.distance ? {
            text: el.distance.text,
            meters: el.distance.value,
            miles: (el.distance.value / 1609.34).toFixed(1),
          } : null,
          duration: el.duration ? {
            text: el.duration.text,
            seconds: el.duration.value,
            minutes: Math.round(el.duration.value / 60),
          } : null,
          // duration_in_traffic only available with departure_time
          duration_in_traffic: el.duration_in_traffic ? {
            text: el.duration_in_traffic.text,
            seconds: el.duration_in_traffic.value,
            minutes: Math.round(el.duration_in_traffic.value / 60),
          } : null,
        })),
      })),
    };

    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
