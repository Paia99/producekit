// api/route-optimize.js — Full route optimizer for production transport
// Vercel Serverless Function
//
// Takes a route with driver start, pickup stops, and destination + call time,
// then returns: optimal stop order, real drive times with traffic, and
// a complete pickup schedule working backward from call time.
//
// POST /api/route-optimize
// {
//   driver_start: "42 Sunset Blvd, Echo Park",     // where driver begins
//   destination: "123 Studio Way, Burbank, CA",     // set / basecamp
//   pickups: [
//     { id: "c6", name: "Danny Reeves", address: "7 Birch Rd, North Hollywood" },
//     { id: "c2", name: "Mike Torres", address: "88 Vine St, Hollywood" },
//     { id: "c5", name: "Lena Kraft", address: "31 Magnolia Dr, Studio City" }
//   ],
//   call_time: "06:00",         // HH:MM 24h — when everyone needs to be at destination
//   call_date: "2026-03-02",    // optional YYYY-MM-DD
//   buffer_minutes: 5,          // extra buffer added before call_time (default 5)
//   stop_duration: 2,           // minutes at each pickup stop (default 2)
//   traffic: true               // use real-time traffic (default true)
// }
//
// Returns:
// {
//   optimized: true,
//   schedule: {
//     driver_depart: "04:52",
//     stops: [
//       { id: "c6", name: "Danny Reeves", address: "...", pickup_time: "05:02", drive_to_next: 12, distance: "4.2 mi", traffic_note: "Light traffic" },
//       ...
//     ],
//     arrival: "05:55",    // arrival at destination (before buffer)
//     call_time: "06:00",
//   },
//   total_drive_minutes: 63,
//   total_distance_miles: 28.4,
//   google_maps_url: "https://...",
//   traffic_summary: "Moderate traffic expected. +8 min vs no-traffic estimate."
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
      driver_start,
      destination,
      pickups = [],
      call_time = "06:00",
      call_date,
      buffer_minutes = 5,
      stop_duration = 2,
      traffic = true,
    } = req.body || {};

    if (!driver_start || !destination) {
      return res.status(400).json({ error: "driver_start and destination required" });
    }

    if (pickups.length === 0) {
      return res.status(400).json({ error: "At least one pickup required" });
    }

    // Step 1: Call Directions API with waypoint optimization
    const waypointStr = "optimize:true|" + pickups.map(p => p.address).join("|");

    // Calculate a reasonable departure_time for traffic
    let departureTime = "now";
    if (call_date) {
      const [ch, cm] = call_time.split(":").map(Number);
      const arr = new Date(`${call_date}T${String(ch).padStart(2, "0")}:${String(cm).padStart(2, "0")}:00`);
      const dep = new Date(arr.getTime() - 3 * 60 * 60 * 1000); // estimate 3hr before
      const now = new Date();
      if (dep > now) departureTime = Math.floor(dep.getTime() / 1000).toString();
    }

    const params = new URLSearchParams({
      origin: driver_start,
      destination: destination,
      waypoints: waypointStr,
      key: API_KEY,
      mode: "driving",
      departure_time: traffic ? departureTime : undefined,
    });
    if (traffic) params.set("traffic_model", "best_guess");

    const url = `https://maps.googleapis.com/maps/api/directions/json?${params}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      return res.status(400).json({ error: data.error_message || data.status });
    }

    const route = data.routes[0];
    if (!route) return res.status(400).json({ error: "No route found" });

    // Step 2: Map optimized order
    const optOrder = route.waypoint_order || pickups.map((_, i) => i);
    const orderedPickups = optOrder.map(i => pickups[i]);

    // Step 3: Extract leg-by-leg timing
    const legs = route.legs; // legs[0] = driver→first pickup, legs[n] = last pickup→dest

    // Step 4: Calculate pickup schedule working backward from call_time
    const [callH, callM] = call_time.split(":").map(Number);
    let cursor = callH * 60 + callM - buffer_minutes; // arrive this many min before call

    // Work backward: last leg is final pickup → destination
    const schedule = [];
    let totalDrive = 0;
    let totalDriveNoTraffic = 0;
    let totalDistance = 0;

    // Process legs in reverse
    for (let i = legs.length - 1; i >= 0; i--) {
      const leg = legs[i];
      const driveWithTraffic = leg.duration_in_traffic
        ? Math.round(leg.duration_in_traffic.value / 60)
        : Math.round(leg.duration.value / 60);
      const driveNoTraffic = Math.round(leg.duration.value / 60);
      const distMiles = (leg.distance.value / 1609.34).toFixed(1);

      totalDrive += driveWithTraffic;
      totalDriveNoTraffic += driveNoTraffic;
      totalDistance += leg.distance.value;

      cursor -= driveWithTraffic;

      if (i > 0) {
        // This is a pickup stop (not the first leg from driver start)
        const pickupPerson = orderedPickups[i - 1];
        const trafficDelta = driveWithTraffic - driveNoTraffic;
        let trafficNote = "No data";
        if (leg.duration_in_traffic) {
          if (trafficDelta <= 1) trafficNote = "Clear roads";
          else if (trafficDelta <= 5) trafficNote = "Light traffic";
          else if (trafficDelta <= 12) trafficNote = "Moderate traffic";
          else trafficNote = "Heavy traffic";
        }

        const h = Math.floor(((cursor % 1440) + 1440) % 1440 / 60);
        const m = ((cursor % 1440) + 1440) % 1440 % 60;

        schedule.unshift({
          id: pickupPerson.id,
          name: pickupPerson.name,
          address: pickupPerson.address,
          pickup_time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
          drive_to_next_minutes: driveWithTraffic,
          drive_to_next_no_traffic: driveNoTraffic,
          distance_to_next: `${distMiles} mi`,
          traffic_note: trafficNote,
          google_address: leg.start_address, // resolved address from Google
        });

        // Subtract stop duration
        cursor -= stop_duration;
      }
    }

    // Driver depart time (remaining cursor value)
    const dh = Math.floor(((cursor % 1440) + 1440) % 1440 / 60);
    const dm = ((cursor % 1440) + 1440) % 1440 % 60;
    const driverDepart = `${String(dh).padStart(2, "0")}:${String(dm).padStart(2, "0")}`;

    // Arrival time at destination
    const arrMin = callH * 60 + callM - buffer_minutes;
    const arrH = Math.floor(((arrMin % 1440) + 1440) % 1440 / 60);
    const arrM = ((arrMin % 1440) + 1440) % 1440 % 60;
    const arrivalTime = `${String(arrH).padStart(2, "0")}:${String(arrM).padStart(2, "0")}`;

    // Traffic summary
    const trafficDiff = totalDrive - totalDriveNoTraffic;
    let trafficSummary;
    if (trafficDiff <= 2) trafficSummary = "Roads are clear. No significant traffic delays.";
    else if (trafficDiff <= 8) trafficSummary = `Light traffic. +${trafficDiff} min vs normal conditions.`;
    else if (trafficDiff <= 18) trafficSummary = `Moderate traffic expected. +${trafficDiff} min vs normal.`;
    else trafficSummary = `Heavy traffic! +${trafficDiff} min vs normal. Consider earlier departure.`;

    // Google Maps URL
    const gmapsUrl = `https://www.google.com/maps/dir/${encodeURIComponent(driver_start)}/${orderedPickups.map(p => encodeURIComponent(p.address)).join("/")}/${encodeURIComponent(destination)}`;

    res.status(200).json({
      optimized: true,
      original_order: pickups.map(p => p.id),
      optimized_order: orderedPickups.map(p => p.id),
      schedule: {
        driver_depart: driverDepart,
        driver_start_address: driver_start,
        stops: schedule,
        arrival: arrivalTime,
        destination_address: destination,
        call_time: call_time,
        buffer_minutes: buffer_minutes,
      },
      total_drive_minutes: totalDrive,
      total_drive_no_traffic: totalDriveNoTraffic,
      total_distance_miles: (totalDistance / 1609.34).toFixed(1),
      traffic_summary: trafficSummary,
      traffic_delay_minutes: trafficDiff,
      google_maps_url: gmapsUrl,
      polyline: route.overview_polyline?.points || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
