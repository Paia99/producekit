export default function handler(req, res) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY not set" });
  }
  // Return the key for client-side Places library loading
  // In production you'd want to restrict this with HTTP referrer checks
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).json({ key });
}
