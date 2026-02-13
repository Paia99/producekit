// api/directions.js — Google Maps Directions API with waypoint optimization
// Vercel Serverless Function
//
// Calculates optimal stop order for multi-pickup routes using Google's
// waypoint optimization. Returns leg-by-leg drive times with traffic.
//
// POST /api/directions
// {
//   origin: "42 Sunset Blvd, Echo Park",          // driver start
//   destination: "123 Studio Way, Burbank, CA",    // final destination (set/basecamp)
//   waypoints: [                                    // pickup stops
//     { address: "88 Vine St, Hollywood", label: "Mike Torres" },
//     { address: "7 Birch Rd, North Hollywood", label: "Danny Reeves" },
//     { address: "31 Magnolia Dr, Studio City", label: "Lena Kraft" }
//   ],
//   optimize: true,           // let Google find optimal order
//   arrival_time: "06:00",    // desired arrival at destination (HH:MM, 24h)
//   arrival_date: "2026-03-02", // YYYY-MM-DD (optional, defaults to today)
//   mode: "driving"           // driving | transit
// }

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY not configured" });

  try {
    const {
      origin,
      destination,
      waypoints = [],
      optimize = true,
      arrival_time,
      arrival_date,
      mode = "driving",
    } = req.body || {};

    if (!origin || !destination) {
      return res.status(400).json({ error: "origin and destination required" });
    }

    // Build waypoints string
    let waypointStr = "";
    if (waypoints.length > 0) {
      const addrs = waypoints.map(w => typeof w === "string" ? w : w.address);
      waypointStr = (optimize ? "optimize:true|" : "") + addrs.join("|");
    }

    // Calculate departure_time from arrival_time working backward (rough estimate)
    // We'll use "now" for real-time traffic, or compute a future timestamp
    let departureTime = "now";
    if (arrival_time && arrival_date) {
      // For future dates, convert to unix timestamp
      // Estimate: arrive by arrival_time, so depart ~2hrs earlier as initial guess
      const [h, m] = arrival_time.split(":").map(Number);
      const arrDate = new Date(`${arrival_date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
      // Subtract estimated 2 hours for departure
      const depDate = new Date(arrDate.getTime() - 2 * 60 * 60 * 1000);
      const now = new Date();
      if (depDate > now) {
        departureTime = Math.floor(depDate.getTime() / 1000).toString();
      }
    }

    const params = new URLSearchParams({
      origin,
      destination,
      key: API_KEY,
      mode,
      departure_time: departureTime,
      traffic_model: "best_guess",
    });
    if (waypointStr) params.set("waypoints", waypointStr);

    const url = `https://maps.googleapis.com/maps/api/directions/json?${params}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      return res.status(400).json({ error: data.error_message || data.status, raw: data });
    }

    const route = data.routes[0];
    if (!route) return res.status(400).json({ error: "No route found" });

    // Optimized waypoint order (0-indexed into original waypoints array)
    const optimizedOrder = route.waypoint_order || waypoints.map((_, i) => i);

    // Reorder waypoints to optimal order
    const orderedWaypoints = optimizedOrder.map(i => waypoints[i]);

    // Parse legs (origin→wp1, wp1→wp2, ..., wpN→destination)
    const legs = route.legs.map((leg, idx) => ({
      from: leg.start_address,
      to: leg.end_address,
      distance: {
        text: leg.distance.text,
        meters: leg.distance.value,
        miles: (leg.distance.value / 1609.34).toFixed(1),
      },
      duration: {
        text: leg.duration.text,
        seconds: leg.duration.value,
        minutes: Math.round(leg.duration.value / 60),
      },
      duration_in_traffic: leg.duration_in_traffic ? {
        text: leg.duration_in_traffic.text,
        seconds: leg.duration_in_traffic.value,
        minutes: Math.round(leg.duration_in_traffic.value / 60),
      } : null,
      // Which person is being picked up (null for last leg to destination)
      pickup: idx < orderedWaypoints.length ? orderedWaypoints[idx] : null,
    }));

    // Total trip stats
    const totalDistance = legs.reduce((s, l) => s + l.distance.meters, 0);
    const totalDuration = legs.reduce((s, l) => s + l.duration.seconds, 0);
    const totalTrafficDuration = legs.reduce((s, l) => s + (l.duration_in_traffic?.seconds || l.duration.seconds), 0);

    // Calculate pickup times working backward from arrival_time
    let pickupSchedule = null;
    if (arrival_time) {
      const [ah, am] = arrival_time.split(":").map(Number);
      let cursor = ah * 60 + am; // minutes from midnight at destination

      // Work backward from destination
      const schedule = [];
      for (let i = legs.length - 1; i >= 0; i--) {
        const driveMin = legs[i].duration_in_traffic?.minutes || legs[i].duration.minutes;
        cursor -= driveMin;
        if (i < legs.length - 1) {
          // Add 2 min buffer for each pickup stop
          cursor -= 2;
        }
        if (legs[i].pickup) {
          const h = Math.floor(((cursor % 1440) + 1440) % 1440 / 60);
          const m = ((cursor % 1440) + 1440) % 1440 % 60;
          schedule.unshift({
            ...legs[i].pickup,
            pickupTime: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
            driveMins: driveMin,
            fromAddress: legs[i].from,
          });
        }
      }

      // Driver depart time
      const dh = Math.floor(((cursor % 1440) + 1440) % 1440 / 60);
      const dm = ((cursor % 1440) + 1440) % 1440 % 60;

      pickupSchedule = {
        driverDepartTime: `${String(dh).padStart(2, "0")}:${String(dm).padStart(2, "0")}`,
        arrivalTime: arrival_time,
        pickups: schedule,
      };
    }

    // Build overview polyline for map (encoded polyline)
    const polyline = route.overview_polyline?.points || null;

    res.status(200).json({
      optimized_order: optimizedOrder,
      ordered_waypoints: orderedWaypoints,
      legs,
      total: {
        distance: { text: `${(totalDistance / 1609.34).toFixed(1)} mi`, meters: totalDistance },
        duration: { text: `${Math.round(totalDuration / 60)} min`, minutes: Math.round(totalDuration / 60) },
        duration_in_traffic: { text: `${Math.round(totalTrafficDuration / 60)} min`, minutes: Math.round(totalTrafficDuration / 60) },
      },
      pickup_schedule: pickupSchedule,
      polyline,
      google_maps_link: `https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${orderedWaypoints.map(w => encodeURIComponent(w.address || w)).join("/")}/${encodeURIComponent(destination)}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
