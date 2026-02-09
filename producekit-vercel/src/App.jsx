import { useState, useCallback, useRef, useEffect } from "react";

// ─── CONFIG ──────────────────────────────────────────────────
// API auto-detection: tries live /api/route-optimize on Vercel, falls back to demo
// No config needed — just deploy and it works

// ─── SAMPLE DATA ─────────────────────────────────────────────
const DEPARTMENTS = ["Camera","Grip","Electric","Art","Wardrobe","Hair/Makeup","Sound","Transport","Production","Directing","Stunts","VFX","Catering"];

const initialCrew = [
  { id: "c1", name: "Sarah Chen", dept: "Camera", role: "DP", phone: "+1 555-0101", email: "sarah@prod.com", rate: 850, union: true, status: "confirmed", notes: "", address: "14 Oak Lane, Burbank, CA" },
  { id: "c2", name: "Mike Torres", dept: "Grip", role: "Key Grip", phone: "+1 555-0102", email: "mike@prod.com", rate: 650, union: true, status: "confirmed", notes: "", address: "88 Vine St, Hollywood, CA" },
  { id: "c3", name: "Ava Petrov", dept: "Directing", role: "1st AD", phone: "+1 555-0103", email: "ava@prod.com", rate: 750, union: true, status: "confirmed", notes: "", address: "22 Elm Ave, Glendale, CA" },
  { id: "c4", name: "James Okafor", dept: "Sound", role: "Boom Op", phone: "+1 555-0104", email: "james@prod.com", rate: 500, union: false, status: "available", notes: "", address: "5 Cedar Blvd, Pasadena, CA" },
  { id: "c5", name: "Lena Kraft", dept: "Wardrobe", role: "Costume Designer", phone: "+1 555-0105", email: "lena@prod.com", rate: 700, union: true, status: "confirmed", notes: "", address: "31 Magnolia Dr, Studio City, CA" },
  { id: "c6", name: "Danny Reeves", dept: "Electric", role: "Gaffer", phone: "+1 555-0106", email: "danny@prod.com", rate: 650, union: true, status: "confirmed", notes: "", address: "7 Birch Rd, North Hollywood, CA" },
  { id: "c7", name: "Rosa Vega", dept: "Hair/Makeup", role: "Key MUA", phone: "+1 555-0107", email: "rosa@prod.com", rate: 600, union: false, status: "hold", notes: "", address: "19 Palm Way, Sherman Oaks, CA" },
  { id: "c8", name: "Tom Blake", dept: "Transport", role: "Transport Captain", phone: "+1 555-0108", email: "tom@prod.com", rate: 550, union: true, status: "confirmed", notes: "", address: "42 Sunset Blvd, Echo Park, CA" },
];

const CAST = [
  { id: 1, name: "Emily Frost", role: "LEAD - Diana", address: "The Roosevelt Hotel, 7000 Hollywood Blvd, CA" },
  { id: 2, name: "Marcus Webb", role: "LEAD - Jack", address: "Chateau Marmont, 8221 Sunset Blvd, CA" },
  { id: 3, name: "Suki Tanaka", role: "SUPPORT - Rose", address: "112 Hillcrest Rd, Beverly Hills, CA" },
  { id: 4, name: "Dev Patel", role: "SUPPORT - Omar", address: "8 Wilshire Pl, Santa Monica, CA" },
  { id: 5, name: "Claire Duval", role: "DAY - Waitress", address: "66 Melrose Ave, West Hollywood, CA" },
];

const STRIP_COLORS = { "D/INT": "#E8C94A", "D/EXT": "#D4943A", "N/INT": "#4A7EE8", "N/EXT": "#7B4AE8" };

const initialStrips = [
  { id: "s1", scene: "1", type: "D/INT", location: "Diana's Apartment", cast: [1, 3], pages: 2.5, synopsis: "Diana discovers the letter" },
  { id: "s2", scene: "2", type: "D/EXT", location: "City Park", cast: [1, 2], pages: 1.75, synopsis: "Diana and Jack meet" },
  { id: "s3", scene: "3", type: "N/INT", location: "Restaurant", cast: [1, 2, 5], pages: 3, synopsis: "Dinner scene - the argument" },
  { id: "s4", scene: "4", type: "D/INT", location: "Office", cast: [2, 4], pages: 1.25, synopsis: "Jack confronts Omar" },
  { id: "s5", scene: "5", type: "N/EXT", location: "Rooftop", cast: [1], pages: 2, synopsis: "Diana's monologue" },
  { id: "s6", scene: "6", type: "D/EXT", location: "City Park", cast: [1, 3, 4], pages: 1.5, synopsis: "Rose reveals the truth" },
  { id: "s7", scene: "7", type: "D/INT", location: "Diana's Apartment", cast: [1, 2], pages: 3.25, synopsis: "Reconciliation" },
  { id: "s8", scene: "8", type: "N/INT", location: "Hospital", cast: [1, 2, 3, 4], pages: 2.75, synopsis: "The accident aftermath" },
  { id: "s9", scene: "9", type: "D/EXT", location: "Beach", cast: [1, 2], pages: 1, synopsis: "Final scene - new beginning" },
];

const initialDays = [
  { id: "d1", label: "Day 1", date: "2026-03-02", strips: ["s1", "s7"], callTime: "06:00" },
  { id: "d2", label: "Day 2", date: "2026-03-03", strips: ["s2", "s6", "s9"], callTime: "07:00" },
  { id: "d3", label: "Day 3", date: "2026-03-04", strips: ["s3", "s5"], callTime: "14:00" },
  { id: "d4", label: "Day 4", date: "2026-03-05", strips: ["s4", "s8"], callTime: "06:00" },
];

const VEHICLE_TYPES = [
  { id: "van15", label: "15-Seat Van", capacity: 15, icon: "\u{1F690}" },
  { id: "van8", label: "8-Seat Minivan", capacity: 8, icon: "\u{1F690}" },
  { id: "car", label: "Sedan", capacity: 4, icon: "\u{1F697}" },
  { id: "suv", label: "SUV", capacity: 6, icon: "\u{1F699}" },
  { id: "truck", label: "Truck / Grip", capacity: 2, icon: "\u{1F69B}" },
  { id: "motorhome", label: "Cast Motorhome", capacity: 2, icon: "\u{1F3E0}" },
];

const initialVehicles = [
  { id: "v1", type: "van15", plate: "CA-PROD-01", label: "Unit Van A", driverId: "c8", color: "#3b82f6" },
  { id: "v2", type: "van8", plate: "CA-PROD-02", label: "Cast Van", driverId: null, color: "#22c55e" },
  { id: "v3", type: "suv", plate: "CA-PROD-03", label: "Producer Car", driverId: null, color: "#f59e0b" },
  { id: "v4", type: "motorhome", plate: "CA-PROD-04", label: "Lead Motorhome", driverId: null, color: "#ef4444" },
  { id: "v5", type: "truck", plate: "CA-PROD-05", label: "Grip Truck", driverId: null, color: "#8b5cf6" },
];

const LOCATIONS_DB = [
  { id: "loc1", name: "Diana's Apartment (Set)", address: "123 Studio Way, Burbank, CA" },
  { id: "loc2", name: "City Park (Griffith)", address: "4730 Crystal Springs Dr, Los Angeles, CA" },
  { id: "loc3", name: "Restaurant (Il Cielo)", address: "9018 Burton Way, Beverly Hills, CA" },
  { id: "loc4", name: "Office (Downtown)", address: "350 S Grand Ave, Los Angeles, CA" },
  { id: "loc5", name: "Rooftop (Standard)", address: "550 S Flower St, Los Angeles, CA" },
  { id: "loc6", name: "Hospital (County)", address: "1200 N State St, Los Angeles, CA" },
  { id: "loc7", name: "Beach (Malibu)", address: "23000 Pacific Coast Highway, Malibu, CA" },
  { id: "loc8", name: "Basecamp / Unit Base", address: "3800 Barham Blvd, Burbank, CA" },
];

const initialRoutes = [
  { id: "r1", vehicleId: "v2", dayId: "d1", label: "Cast Pickup \u2014 Day 1",
    stops: [
      { type: "pickup", personType: "cast", personId: 3, address: "112 Hillcrest Rd, Beverly Hills, CA", pickupTime: "05:15", estDrive: 22, distance: "", trafficNote: "" },
      { type: "pickup", personType: "cast", personId: 1, address: "The Roosevelt Hotel, 7000 Hollywood Blvd, CA", pickupTime: "05:40", estDrive: 15, distance: "", trafficNote: "" },
      { type: "destination", locationId: "loc1", address: "123 Studio Way, Burbank, CA", arrivalTime: "06:00", estDrive: 0 },
    ], notes: "Emily has early MU call", status: "confirmed", optimized: false, gmapsUrl: "", totalDrive: null, totalDistance: null, trafficSummary: "" },
  { id: "r2", vehicleId: "v1", dayId: "d1", label: "Crew Shuttle \u2014 Day 1",
    stops: [
      { type: "pickup", personType: "crew", personId: "c6", address: "7 Birch Rd, North Hollywood, CA", pickupTime: "05:00", estDrive: 10, distance: "", trafficNote: "" },
      { type: "pickup", personType: "crew", personId: "c2", address: "88 Vine St, Hollywood, CA", pickupTime: "05:15", estDrive: 12, distance: "", trafficNote: "" },
      { type: "pickup", personType: "crew", personId: "c5", address: "31 Magnolia Dr, Studio City, CA", pickupTime: "05:30", estDrive: 15, distance: "", trafficNote: "" },
      { type: "destination", locationId: "loc8", address: "3800 Barham Blvd, Burbank, CA", arrivalTime: "05:50", estDrive: 0 },
    ], notes: "", status: "confirmed", optimized: false, gmapsUrl: "", totalDrive: null, totalDistance: null, trafficSummary: "" },
];

// ─── ICONS ───────────────────────────────────────────────────
const I = {
  Dashboard: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Crew: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Strip: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
  CallSheet: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Transport: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  Phone: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Drag: () => <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" opacity="0.4"><circle cx="4" cy="3" r="1.5"/><circle cx="10" cy="3" r="1.5"/><circle cx="4" cy="9" r="1.5"/><circle cx="10" cy="9" r="1.5"/><circle cx="4" cy="15" r="1.5"/><circle cx="10" cy="15" r="1.5"/></svg>,
  X: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Film: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>,
  Sun: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/></svg>,
  Clock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Map: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Send: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Route: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M12 19h4.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H18"/></svg>,
  Users: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
  Zap: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  ExternalLink: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  Loader: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
  AlertTriangle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  CheckCircle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
};

// ─── SHARED UI ───────────────────────────────────────────────
const StatusBadge = ({ status }) => { const c = { confirmed:"#22c55e",available:"#3b82f6",hold:"#f59e0b",unavailable:"#ef4444",draft:"#888",dispatched:"#3b82f6" }; return <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",color:c[status]||"#888",background:(c[status]||"#888")+"18",padding:"2px 8px",borderRadius:4}}><span style={{width:6,height:6,borderRadius:"50%",background:c[status]||"#888"}}/>{status}</span>; };
const TrafficBadge = ({ note }) => { if(!note)return null; const c = {"Clear roads":"#22c55e","Light traffic":"#22c55e","Moderate traffic":"#f59e0b","Heavy traffic":"#ef4444"}; return <span style={{fontSize:10,fontWeight:600,color:c[note]||"#888",background:(c[note]||"#888")+"15",padding:"2px 6px",borderRadius:3}}>{note}</span>; };
const Modal = ({ title, onClose, children, width = 560 }) => (<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(4px)"}} onClick={onClose}><div onClick={e=>e.stopPropagation()} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:12,width,maxWidth:"95vw",maxHeight:"85vh",overflow:"auto",boxShadow:"0 25px 60px rgba(0,0,0,0.5)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:"1px solid #2a2d35",position:"sticky",top:0,background:"#1a1d23",zIndex:1}}><h3 style={{margin:0,fontSize:16,fontWeight:700,color:"#f0f0f0"}}>{title}</h3><button onClick={onClose} style={{background:"none",border:"none",color:"#888",cursor:"pointer",padding:4}}><I.X/></button></div><div style={{padding:20}}>{children}</div></div></div>);
const IS = {width:"100%",background:"#12141a",border:"1px solid #2a2d35",borderRadius:6,padding:"8px 12px",color:"#e0e0e0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
const LS = {display:"block",fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4};
const BP = {background:"#E8C94A",color:"#111",border:"none",borderRadius:6,padding:"8px 20px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"};
const BS = {background:"#2a2d35",color:"#ccc",border:"1px solid #3a3d45",borderRadius:6,padding:"8px 16px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"};
const BD = {...BS,color:"#ef4444",borderColor:"#ef444433"};
const fmtTime = t => {if(!t)return"\u2014";const[h,m]=t.split(":");const hr=parseInt(h);return`${hr>12?hr-12:hr===0?12:hr}:${m} ${hr>=12?"PM":"AM"}`;};
const subMin = (time,mins) => {if(!time)return"";const[h,m]=time.split(":").map(Number);const t=h*60+m-mins;const nh=Math.floor(((t%1440)+1440)%1440/60);const nm=((t%1440)+1440)%1440%60;return`${String(nh).padStart(2,"0")}:${String(nm).padStart(2,"0")}`;};

const spinKeyframes = `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`;

// ─── API HELPER ──────────────────────────────────────────────
async function callRouteOptimize(route, vehicles, crew, day) {
  const vehicle = vehicles.find(v => v.id === route.vehicleId);
  const driver = crew.find(c => c.id === vehicle?.driverId);
  const driverStart = driver?.address || vehicle?.label || "Burbank, CA";
  const dest = route.stops.find(s => s.type === "destination");
  const pickups = route.stops.filter(s => s.type === "pickup").map(s => {
    const name = s.personType === "cast"
      ? CAST.find(c => String(c.id) === String(s.personId))?.name || "Unknown"
      : crew.find(c => c.id === s.personId)?.name || "Unknown";
    return { id: String(s.personId), name, address: s.address, personType: s.personType };
  });

  // Try live API first (/api/route-optimize on same domain)
  try {
    const resp = await fetch("/api/route-optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driver_start: driverStart,
        destination: dest?.address || "",
        pickups,
        call_time: dest?.arrivalTime || day?.callTime || "06:00",
        call_date: day?.date,
        buffer_minutes: 5,
        stop_duration: 2,
        traffic: true,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (!data.error) return { ...data, demo: false };
    }
  } catch (_) { /* API not available, fall through to demo */ }

  // DEMO MODE — simulate API response with realistic data
  await new Promise(r => setTimeout(r, 1200));
  const fakeDrives = pickups.map(() => 8 + Math.floor(Math.random() * 20));
  const fakeDistances = pickups.map(() => (2 + Math.random() * 12).toFixed(1));
  const trafficNotes = ["Clear roads","Light traffic","Moderate traffic","Light traffic"];
  const [ch, cm] = (dest?.arrivalTime || day?.callTime || "06:00").split(":").map(Number);
  let cursor = ch * 60 + cm - 5;
  const schedule = [];
  for (let i = pickups.length - 1; i >= 0; i--) {
    cursor -= fakeDrives[i];
    if (i < pickups.length - 1) cursor -= 2;
    const h = Math.floor(((cursor % 1440) + 1440) % 1440 / 60);
    const m = ((cursor % 1440) + 1440) % 1440 % 60;
    schedule.unshift({
      ...pickups[i],
      pickup_time: `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`,
      drive_to_next_minutes: fakeDrives[i],
      distance_to_next: `${fakeDistances[i]} mi`,
      traffic_note: trafficNotes[i % trafficNotes.length],
    });
  }
  cursor -= (5 + Math.floor(Math.random() * 10));
  const dh = Math.floor(((cursor % 1440) + 1440) % 1440 / 60);
  const dm = ((cursor % 1440) + 1440) % 1440 % 60;
  const totalDrive = fakeDrives.reduce((a, b) => a + b, 0) + 5 + Math.floor(Math.random() * 10);
  const totalDist = fakeDistances.reduce((a, b) => a + parseFloat(b), 0).toFixed(1);
  const trafficDelay = Math.floor(Math.random() * 12);
  return {
    demo: true,
    schedule: {
      driver_depart: `${String(dh).padStart(2,"0")}:${String(dm).padStart(2,"0")}`,
      stops: schedule,
      arrival: subMin(dest?.arrivalTime || "06:00", 5),
      call_time: dest?.arrivalTime || day?.callTime || "06:00",
    },
    total_drive_minutes: totalDrive,
    total_distance_miles: totalDist,
    traffic_summary: trafficDelay <= 2 ? "Roads are clear. No significant delays." : trafficDelay <= 8 ? `Light traffic. +${trafficDelay} min vs normal.` : `Moderate traffic. +${trafficDelay} min vs normal.`,
    traffic_delay_minutes: trafficDelay,
    google_maps_url: `https://www.google.com/maps/dir/${encodeURIComponent(driverStart)}/${pickups.map(p => encodeURIComponent(p.address)).join("/")}/${encodeURIComponent(dest?.address || "")}`,
  };
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
const DashboardModule = ({ crew, days, strips, routes, vehicles, setTab }) => {
  const today = days[0]; const todayStrips = today?today.strips.map(sid=>strips.find(s=>s.id===sid)).filter(Boolean):[];
  const totalPages = todayStrips.reduce((s,x)=>s+x.pages,0); const totalCast = [...new Set(todayStrips.flatMap(s=>s.cast))];
  const todayRoutes = routes.filter(r=>r.dayId===today?.id);
  const stats = [{l:"Crew",v:crew.length,c:"#3b82f6"},{l:"Days",v:days.length,c:"#E8C94A"},{l:"Scenes",v:strips.length,c:"#22c55e"},{l:"Vehicles",v:vehicles.length,c:"#f59e0b"}];
  return <div>
    <div style={{marginBottom:28}}><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Production Dashboard</h2><p style={{margin:"4px 0 0",color:"#888",fontSize:14}}>The Letter — Meridian Films</p></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
      {stats.map(s=><div key={s.l} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:"18px 16px",borderTop:`3px solid ${s.c}`}}><div style={{fontSize:28,fontWeight:800,color:s.c}}>{s.v}</div><div style={{fontSize:12,color:"#888",fontWeight:600,textTransform:"uppercase",marginTop:2}}>{s.l}</div></div>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h3 style={{margin:0,fontSize:14,fontWeight:700,color:"#E8C94A"}}>TODAY — {today?.label||"\u2014"}</h3><span style={{fontSize:12,color:"#888"}}>{today?.date}</span></div>
        {todayStrips.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid #222"}}><span style={{width:8,height:8,borderRadius:2,background:STRIP_COLORS[s.type],flexShrink:0}}/><span style={{fontSize:13,color:"#ddd",fontWeight:600}}>Sc.{s.scene}</span><span style={{fontSize:12,color:"#888",flex:1}}>{s.synopsis}</span><span style={{fontSize:11,color:"#666"}}>{s.pages}pg</span></div>)}
        <div style={{display:"flex",justifyContent:"space-between",marginTop:10,paddingTop:8,borderTop:"1px solid #333",fontSize:12,color:"#888"}}><span>{todayStrips.length} scenes · {totalPages} pages</span><span>{totalCast.length} cast</span></div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:16}}>
          <h3 style={{margin:"0 0 10px",fontSize:14,fontWeight:700,color:"#f0f0f0"}}>Quick Actions</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[{l:"Crew Roster",i:"\u{1F465}",t:"crew"},{l:"Stripboard",i:"\u{1F3AC}",t:"stripboard"},{l:"Call Sheet",i:"\u{1F4C4}",t:"callsheet"},{l:"Transport",i:"\u{1F690}",t:"transport"}].map(a=>
              <button key={a.t} onClick={()=>setTab(a.t)} style={{display:"flex",alignItems:"center",gap:8,background:"#12141a",border:"1px solid #2a2d35",borderRadius:8,padding:"10px 12px",color:"#ddd",fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}><span style={{fontSize:16}}>{a.i}</span>{a.l}</button>
            )}
          </div>
        </div>
        <div style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:16,flex:1}}>
          <h3 style={{margin:"0 0 10px",fontSize:14,fontWeight:700,color:"#f0f0f0"}}>Today's Transport</h3>
          {todayRoutes.length===0?<div style={{fontSize:12,color:"#555",padding:8}}>No routes</div>:todayRoutes.map(r=>{const v=vehicles.find(x=>x.id===r.vehicleId);return<div key={r.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #222",fontSize:12}}><span style={{width:8,height:8,borderRadius:"50%",background:v?.color||"#555"}}/><span style={{color:"#ddd",fontWeight:600,flex:1}}>{r.label}</span>{r.totalDrive&&<span style={{color:"#888",fontSize:11}}>{r.totalDrive}min · {r.totalDistance}mi</span>}<StatusBadge status={r.status}/></div>;})}
        </div>
      </div>
    </div>
  </div>;
};

// ═══════════════════════════════════════════════════════════════
// CREW ROSTER (compact)
// ═══════════════════════════════════════════════════════════════
const CrewModule = ({ crew, setCrew }) => {
  const [search,setSearch]=useState("");const [filterDept,setFilterDept]=useState("All");const [editModal,setEditModal]=useState(null);const [form,setForm]=useState({});
  const filtered = crew.filter(c=>(filterDept==="All"||c.dept===filterDept)&&(c.name.toLowerCase().includes(search.toLowerCase())||c.role.toLowerCase().includes(search.toLowerCase())));
  const openNew=()=>{setForm({name:"",dept:"Camera",role:"",phone:"",email:"",rate:"",union:false,status:"available",notes:"",address:""});setEditModal("new");};
  const save=()=>{if(editModal==="new")setCrew(p=>[...p,{...form,id:"c"+Date.now()}]);else setCrew(p=>p.map(c=>c.id===form.id?{...form}:c));setEditModal(null);};
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Crew Roster</h2><p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>{crew.length} crew</p></div>
      <button onClick={openNew} style={BP}><span style={{display:"flex",alignItems:"center",gap:6}}><I.Plus/> Add Crew</span></button>
    </div>
    <div style={{display:"flex",gap:10,marginBottom:16}}><div style={{position:"relative",flex:1}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#555"}}><I.Search/></span><input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{...IS,paddingLeft:34}}/></div><select value={filterDept} onChange={e=>setFilterDept(e.target.value)} style={{...IS,width:160,cursor:"pointer"}}><option value="All">All Depts</option>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
      {filtered.map(c=><div key={c.id} onClick={()=>{setForm({...c});setEditModal(c);}} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:16,cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}><div><div style={{fontSize:14,fontWeight:700,color:"#f0f0f0"}}>{c.name}</div><div style={{fontSize:12,color:"#E8C94A",fontWeight:600}}>{c.role}</div></div><StatusBadge status={c.status}/></div>
        <div style={{fontSize:11,color:"#888",fontWeight:600,marginBottom:6,textTransform:"uppercase"}}>{c.dept}{c.union&&" · UNION"}</div>
        <div style={{fontSize:12,color:"#aaa",display:"flex",alignItems:"center",gap:4}}><I.Phone/> {c.phone}</div>
        {c.address&&<div style={{marginTop:6,fontSize:11,color:"#555",display:"flex",alignItems:"center",gap:4}}><I.Map/> {c.address}</div>}
        {c.rate&&<div style={{marginTop:4,fontSize:12,color:"#666"}}>Rate: ${c.rate}/day</div>}
      </div>)}
    </div>
    {editModal&&<Modal title={editModal==="new"?"Add Crew":`Edit — ${form.name}`} onClose={()=>setEditModal(null)}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={LS}>Name</label><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Role</label><input value={form.role||""} onChange={e=>setForm({...form,role:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Department</label><select value={form.dept} onChange={e=>setForm({...form,dept:e.target.value})} style={IS}>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select></div>
        <div><label style={LS}>Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={IS}>{["confirmed","available","hold","unavailable"].map(s=><option key={s}>{s}</option>)}</select></div>
        <div><label style={LS}>Phone</label><input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Email</label><input value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Address (transport pickup)</label><input value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Day Rate ($)</label><input type="number" value={form.rate||""} onChange={e=>setForm({...form,rate:Number(e.target.value)})} style={IS}/></div>
        <div style={{display:"flex",alignItems:"flex-end",paddingBottom:2}}><label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#ccc",cursor:"pointer"}}><input type="checkbox" checked={form.union||false} onChange={e=>setForm({...form,union:e.target.checked})}/> Union</label></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Notes</label><textarea value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} style={{...IS,resize:"vertical"}}/></div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}><div>{editModal!=="new"&&<button onClick={()=>{setCrew(p=>p.filter(c=>c.id!==form.id));setEditModal(null);}} style={BD}>Delete</button>}</div><div style={{display:"flex",gap:8}}><button onClick={()=>setEditModal(null)} style={BS}>Cancel</button><button onClick={save} style={BP}>Save</button></div></div>
    </Modal>}
  </div>;
};

// ═══════════════════════════════════════════════════════════════
// STRIPBOARD (compact)
// ═══════════════════════════════════════════════════════════════
const StripboardModule = ({ strips, setStrips, days, setDays }) => {
  const [dragItem,setDragItem]=useState(null);const [dragOver,setDragOver]=useState(null);const [editStrip,setEditStrip]=useState(null);const [sf,setSf]=useState({});
  const unscheduled=strips.filter(s=>!days.some(d=>d.strips.includes(s.id)));
  const handleDrop=(tid,ti)=>{if(!dragItem)return;const{sid,did}=dragItem;setDays(p=>{let u=p.map(d=>({...d,strips:[...d.strips]}));if(did){const src=u.find(d=>d.id===did);if(src)src.strips=src.strips.filter(id=>id!==sid);}if(tid){const tgt=u.find(d=>d.id===tid);if(tgt){ti!==undefined?tgt.strips.splice(ti,0,sid):tgt.strips.push(sid);}}return u;});setDragItem(null);setDragOver(null);};
  const addDay=()=>{const n=days.length+1;const ld=days.length>0?new Date(days[days.length-1].date):new Date();ld.setDate(ld.getDate()+1);setDays(p=>[...p,{id:"d"+Date.now(),label:`Day ${n}`,date:ld.toISOString().split("T")[0],strips:[],callTime:"06:00"}]);};
  const saveStrip=()=>{if(editStrip==="new")setStrips(p=>[...p,{...sf,id:"s"+Date.now()}]);else setStrips(p=>p.map(s=>s.id===sf.id?{...sf}:s));setEditStrip(null);};
  const SC=({strip,dayId,index})=><div draggable onDragStart={()=>setDragItem({sid:strip.id,did:dayId})} onDragEnd={()=>{setDragItem(null);setDragOver(null);}} onDragOver={e=>{e.preventDefault();setDragOver(`${dayId}-${index}`);}} onDrop={e=>{e.preventDefault();handleDrop(dayId,index);}} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:dragOver===`${dayId}-${index}`?"#2a2d35":"#12141a",borderLeft:`4px solid ${STRIP_COLORS[strip.type]}`,borderRadius:6,cursor:"grab",fontSize:12,border:`1px solid ${dragOver===`${dayId}-${index}`?"#E8C94A55":"#1e2028"}`}}>
    <span style={{color:"#555",flexShrink:0}}><I.Drag/></span><span style={{fontWeight:800,color:"#f0f0f0",minWidth:32}}>Sc.{strip.scene}</span><span style={{color:STRIP_COLORS[strip.type],fontWeight:700,fontSize:10,minWidth:36,textAlign:"center",background:STRIP_COLORS[strip.type]+"18",borderRadius:3,padding:"2px 4px"}}>{strip.type}</span><span style={{color:"#aaa",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{strip.synopsis}</span><span style={{color:"#888",fontWeight:700,fontSize:11,minWidth:30,textAlign:"right"}}>{strip.pages}pg</span><button onClick={e=>{e.stopPropagation();setSf({...strip});setEditStrip(strip);}} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:2}}><I.Edit/></button>
  </div>;
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Stripboard</h2><p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>{strips.length} scenes · {days.length} days</p></div><div style={{display:"flex",gap:8}}><button onClick={()=>{setSf({scene:String(strips.length+1),type:"D/INT",location:"",cast:[],pages:1,synopsis:""});setEditStrip("new");}} style={BS}><span style={{display:"flex",alignItems:"center",gap:5}}><I.Plus/> Scene</span></button><button onClick={addDay} style={BP}><span style={{display:"flex",alignItems:"center",gap:5}}><I.Plus/> Day</span></button></div></div>
    <div style={{display:"flex",gap:16,marginBottom:16,padding:"8px 12px",background:"#1a1d23",borderRadius:8,border:"1px solid #2a2d35"}}>{Object.entries(STRIP_COLORS).map(([t,c])=><span key={t} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#aaa"}}><span style={{width:12,height:12,borderRadius:3,background:c}}/>{t}</span>)}</div>
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {days.map(day=>{const ds=day.strips.map(sid=>strips.find(s=>s.id===sid)).filter(Boolean);const tp=ds.reduce((s,x)=>s+x.pages,0);return<div key={day.id} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,overflow:"hidden"}} onDragOver={e=>{e.preventDefault();if(ds.length===0)setDragOver(`${day.id}-0`);}} onDrop={e=>{e.preventDefault();if(ds.length===0)handleDrop(day.id);}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#1e2128",borderBottom:"1px solid #2a2d35"}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontWeight:800,color:"#E8C94A",fontSize:14}}>{day.label}</span><span style={{fontSize:12,color:"#666"}}>{day.date}</span></div><div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:11,color:"#888"}}>{ds.length} sc · {tp.toFixed(1)} pg</span><button onClick={()=>setDays(p=>p.filter(d=>d.id!==day.id))} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:2}}><I.Trash/></button></div></div>
        <div style={{padding:8,display:"flex",flexDirection:"column",gap:4,minHeight:40}}>{ds.map((s,i)=><SC key={s.id} strip={s} dayId={day.id} index={i}/>)}{ds.length===0&&<div style={{textAlign:"center",padding:12,color:"#444",fontSize:12,fontStyle:"italic"}}>Drop scenes here</div>}</div>
      </div>;})}
      {unscheduled.length>0&&<div style={{background:"#16181e",border:"1px dashed #333",borderRadius:10,overflow:"hidden"}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(dragItem){setDays(p=>p.map(d=>({...d,strips:d.strips.filter(id=>id!==dragItem.sid)})));setDragItem(null);}}}><div style={{padding:"10px 14px",borderBottom:"1px solid #222"}}><span style={{fontWeight:700,color:"#888",fontSize:13}}>Unscheduled</span></div><div style={{padding:8,display:"flex",flexDirection:"column",gap:4}}>{unscheduled.map((s,i)=><SC key={s.id} strip={s} dayId={null} index={i}/>)}</div></div>}
    </div>
    {editStrip&&<Modal title={editStrip==="new"?"Add Scene":`Edit Sc.${sf.scene}`} onClose={()=>setEditStrip(null)}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><div><label style={LS}>Scene #</label><input value={sf.scene} onChange={e=>setSf({...sf,scene:e.target.value})} style={IS}/></div><div><label style={LS}>Type</label><select value={sf.type} onChange={e=>setSf({...sf,type:e.target.value})} style={IS}>{Object.keys(STRIP_COLORS).map(t=><option key={t}>{t}</option>)}</select></div><div><label style={LS}>Location</label><input value={sf.location} onChange={e=>setSf({...sf,location:e.target.value})} style={IS}/></div><div><label style={LS}>Pages</label><input type="number" step="0.125" value={sf.pages} onChange={e=>setSf({...sf,pages:Number(e.target.value)})} style={IS}/></div><div style={{gridColumn:"1/-1"}}><label style={LS}>Synopsis</label><input value={sf.synopsis} onChange={e=>setSf({...sf,synopsis:e.target.value})} style={IS}/></div><div style={{gridColumn:"1/-1"}}><label style={LS}>Cast</label><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{CAST.map(c=><label key={c.id} style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:(sf.cast||[]).includes(c.id)?"#E8C94A":"#888",cursor:"pointer",background:(sf.cast||[]).includes(c.id)?"#E8C94A18":"#12141a",padding:"4px 8px",borderRadius:4,border:`1px solid ${(sf.cast||[]).includes(c.id)?"#E8C94A44":"#2a2d35"}`}}><input type="checkbox" checked={(sf.cast||[]).includes(c.id)} onChange={e=>{const cast=sf.cast||[];setSf({...sf,cast:e.target.checked?[...cast,c.id]:cast.filter(id=>id!==c.id)});}} style={{display:"none"}}/><span style={{fontWeight:700}}>#{c.id}</span> {c.name}</label>)}</div></div></div><div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20}}><button onClick={()=>setEditStrip(null)} style={BS}>Cancel</button><button onClick={saveStrip} style={BP}>Save</button></div></Modal>}
  </div>;
};

// ═══════════════════════════════════════════════════════════════
// TRANSPORT MODULE — with Google Maps integration
// ═══════════════════════════════════════════════════════════════
const TransportModule = ({ vehicles, setVehicles, routes, setRoutes, days, strips, crew }) => {
  const [selectedDay,setSelectedDay]=useState(days[0]?.id||"");
  const [viewMode,setViewMode]=useState("routes");
  const [editRoute,setEditRoute]=useState(null);const [editVehicle,setEditVehicle]=useState(null);
  const [rf,setRf]=useState({});const [vf,setVf]=useState({});
  const [optimizing,setOptimizing]=useState(null); // route id being optimized
  const [optimizeError,setOptimizeError]=useState("");

  const day=days.find(d=>d.id===selectedDay);
  const dayRoutes=routes.filter(r=>r.dayId===selectedDay);
  const dayStrips=day?day.strips.map(sid=>strips.find(s=>s.id===sid)).filter(Boolean):[];
  const dayCastIds=[...new Set(dayStrips.flatMap(s=>s.cast))];
  const allPersons=[...CAST.map(c=>({id:c.id,type:"cast",name:c.name,role:c.role,address:c.address})),...crew.filter(c=>c.status==="confirmed").map(c=>({id:c.id,type:"crew",name:c.name,role:`${c.dept} — ${c.role}`,address:c.address}))];
  const assignedIds=new Set();dayRoutes.forEach(r=>r.stops.forEach(s=>{if(s.type==="pickup")assignedIds.add(`${s.personType}-${s.personId}`);}));
  const getPN=s=>{if(s.personType==="cast")return CAST.find(c=>String(c.id)===String(s.personId))?.name||"\u2014";return crew.find(c=>c.id===s.personId)?.name||"\u2014";};

  // ── OPTIMIZE ROUTE with Google Maps ──
  const optimizeRoute = async (route) => {
    const pickups = route.stops.filter(s => s.type === "pickup");
    if (pickups.length === 0) return;
    setOptimizing(route.id);
    setOptimizeError("");
    try {
      const result = await callRouteOptimize(route, vehicles, crew, day);
      if (result.error) { setOptimizeError(result.error); setOptimizing(null); return; }

      // Update route with optimized data
      setRoutes(prev => prev.map(r => {
        if (r.id !== route.id) return r;
        const newStops = result.schedule.stops.map(s => {
          const origStop = r.stops.find(st => st.type === "pickup" && String(st.personId) === String(s.id));
          return {
            type: "pickup",
            personType: s.personType || origStop?.personType || "crew",
            personId: s.id,
            address: s.address,
            pickupTime: s.pickup_time,
            estDrive: s.drive_to_next_minutes,
            distance: s.distance_to_next || "",
            trafficNote: s.traffic_note || "",
          };
        });
        const dest = r.stops.find(s => s.type === "destination");
        newStops.push({ ...dest, arrivalTime: result.schedule.arrival || dest.arrivalTime });

        return {
          ...r,
          stops: newStops,
          optimized: true,
          demo: result.demo || false,
          gmapsUrl: result.google_maps_url || "",
          totalDrive: result.total_drive_minutes,
          totalDistance: result.total_distance_miles,
          trafficSummary: result.traffic_summary || "",
          trafficDelay: result.traffic_delay_minutes || 0,
          driverDepart: result.schedule.driver_depart,
        };
      }));
      setOptimizing(null);
    } catch (err) {
      setOptimizeError(err.message);
      setOptimizing(null);
    }
  };

  // ── Vehicle CRUD ──
  const openNewVehicle=()=>{setVf({type:"van8",plate:"",label:"",driverId:null,color:"#3b82f6"});setEditVehicle("new");};
  const saveVehicle=()=>{if(editVehicle==="new")setVehicles(p=>[...p,{...vf,id:"v"+Date.now()}]);else setVehicles(p=>p.map(v=>v.id===vf.id?{...vf}:v));setEditVehicle(null);};
  // ── Route CRUD ──
  const openNewRoute=()=>{setRf({vehicleId:vehicles[0]?.id||"",dayId:selectedDay,label:`Route — ${day?.label||""}`,stops:[{type:"destination",locationId:"loc8",address:"3800 Barham Blvd, Burbank, CA",arrivalTime:day?.callTime||"06:00",estDrive:0}],notes:"",status:"draft"});setEditRoute("new");};
  const openEditRoute=r=>{setRf({...r,stops:r.stops.map(s=>({...s}))});setEditRoute(r);};
  const saveRoute=()=>{if(editRoute==="new")setRoutes(p=>[...p,{...rf,id:"r"+Date.now(),optimized:false,gmapsUrl:"",totalDrive:null,totalDistance:null,trafficSummary:""}]);else setRoutes(p=>p.map(r=>r.id===rf.id?{...rf}:r));setEditRoute(null);};

  const addStop=()=>{const stops=[...rf.stops];const di=stops.findIndex(s=>s.type==="destination");stops.splice(di,0,{type:"pickup",personType:"cast",personId:"",address:"",pickupTime:"",estDrive:15,distance:"",trafficNote:""});setRf({...rf,stops});};
  const updateStop=(idx,f,v)=>{const stops=rf.stops.map((s,i)=>i===idx?{...s,[f]:v}:s);if(f==="personId"&&v){const st=stops[idx];const p=allPersons.find(x=>String(x.id)===String(v)&&x.type===st.personType);if(p)stops[idx].address=p.address||"";}setRf({...rf,stops});};
  const removeStop=idx=>setRf({...rf,stops:rf.stops.filter((_,i)=>i!==idx)});
  const moveUp=idx=>{if(idx<=0)return;const s=[...rf.stops];[s[idx-1],s[idx]]=[s[idx],s[idx-1]];setRf({...rf,stops:s});};
  const autoCalc=()=>{const s=[...rf.stops.map(x=>({...x}))];const d=s[s.length-1];if(!d||!d.arrivalTime)return;let ct=d.arrivalTime;for(let i=s.length-2;i>=0;i--){ct=subMin(ct,s[i].estDrive||15);s[i].pickupTime=ct;}setRf({...rf,stops:s});};

  // ── ROUTES VIEW ──
  const RoutesView = () => <div style={{display:"flex",flexDirection:"column",gap:12}}>
    {dayRoutes.length===0&&<div style={{textAlign:"center",padding:50,color:"#555"}}><div style={{fontSize:36,marginBottom:12}}>{"\u{1F690}"}</div><div style={{fontSize:14,marginBottom:8}}>No routes for {day?.label||"this day"}</div><button onClick={openNewRoute} style={BP}>Create First Route</button></div>}
    {dayRoutes.map(route=>{
      const v=vehicles.find(x=>x.id===route.vehicleId);const vt=VEHICLE_TYPES.find(t=>t.id===v?.type);
      const driver=crew.find(c=>c.id===v?.driverId);const pickups=route.stops.filter(s=>s.type==="pickup");
      const dest=route.stops.find(s=>s.type==="destination");
      const isOptimizing=optimizing===route.id;

      return<div key={route.id} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,overflow:"hidden"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:"#1e2128",borderBottom:"1px solid #2a2d35"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{width:10,height:10,borderRadius:"50%",background:v?.color||"#555"}}/>
            <span style={{fontWeight:800,color:"#f0f0f0",fontSize:14}}>{route.label}</span>
            <StatusBadge status={route.status}/>
            {route.optimized&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:"#22c55e",background:"#22c55e18",padding:"2px 6px",borderRadius:3}}><I.CheckCircle/> Optimized</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
            <span style={{color:"#888"}}>{vt?.icon} {v?.label||"—"}</span>
            {route.totalDrive&&<span style={{color:"#ddd",fontWeight:700,background:"#12141a",padding:"2px 8px",borderRadius:4}}>{route.totalDrive}min · {route.totalDistance}mi</span>}
            <button onClick={()=>optimizeRoute(route)} disabled={isOptimizing} style={{...BP,padding:"5px 12px",fontSize:11,opacity:isOptimizing?0.6:1,display:"flex",alignItems:"center",gap:5}} title="Calculate optimal route with real drive times & traffic">
              {isOptimizing?<I.Loader/>:<I.Zap/>} {isOptimizing?"Routing...":"Optimize"}
            </button>
            <button onClick={()=>openEditRoute(route)} style={{background:"none",border:"none",color:"#888",cursor:"pointer"}}><I.Edit/></button>
          </div>
        </div>

        {/* Traffic summary bar */}
        {route.trafficSummary&&<div style={{padding:"8px 16px",background:route.trafficDelay>8?"#ef444412":route.trafficDelay>3?"#f59e0b12":"#22c55e12",borderBottom:"1px solid #2a2d35",fontSize:12,display:"flex",alignItems:"center",gap:8}}>
          {route.trafficDelay>8?<I.AlertTriangle/>:<I.CheckCircle/>}
          <span style={{color:route.trafficDelay>8?"#ef4444":route.trafficDelay>3?"#f59e0b":"#22c55e",fontWeight:600}}>{route.trafficSummary}</span>
          {route.driverDepart&&<span style={{color:"#888",marginLeft:"auto"}}>Driver departs: <strong style={{color:"#ddd"}}>{fmtTime(route.driverDepart)}</strong></span>}
        </div>}

        {/* Route timeline */}
        <div style={{padding:"12px 16px"}}>
          {driver&&<div style={{fontSize:12,color:"#888",marginBottom:10,display:"flex",alignItems:"center",gap:6}}><I.Users/> Driver: <span style={{color:"#ddd",fontWeight:600}}>{driver.name}</span> · {driver.phone}</div>}
          <div style={{position:"relative",paddingLeft:28}}>
            <div style={{position:"absolute",left:9,top:8,bottom:8,width:2,background:v?.color||"#333",opacity:0.4}}/>
            {route.stops.map((stop,idx)=>{const isLast=stop.type==="destination";const loc=LOCATIONS_DB.find(l=>l.id===stop.locationId);
            return<div key={idx} style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:isLast?0:14,position:"relative"}}>
              <div style={{position:"absolute",left:-24,top:3,width:isLast?14:10,height:isLast?14:10,borderRadius:"50%",background:isLast?(v?.color||"#E8C94A"):"#1a1d23",border:`2px solid ${v?.color||"#E8C94A"}`,marginLeft:isLast?-2:0}}/>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:13,fontWeight:700,color:isLast?"#E8C94A":"#f0f0f0"}}>{isLast?(loc?.name||"Destination"):getPN(stop)}</span>
                  {!isLast&&<span style={{fontSize:10,color:"#666",background:"#12141a",padding:"1px 6px",borderRadius:3}}>{stop.personType==="cast"?"CAST":"CREW"}</span>}
                  {!isLast&&stop.trafficNote&&<TrafficBadge note={stop.trafficNote}/>}
                </div>
                <div style={{fontSize:11,color:"#666",marginTop:2}}>{stop.address}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"#ddd"}}>{fmtTime(isLast?stop.arrivalTime:stop.pickupTime)}</div>
                {!isLast&&stop.estDrive>0&&<div style={{fontSize:10,color:"#555",marginTop:1}}>
                  +{stop.estDrive}min{stop.distance&&` · ${stop.distance}`}
                </div>}
              </div>
            </div>;})}
          </div>
          {/* Google Maps link */}
          {route.gmapsUrl&&<a href={route.gmapsUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:5,marginTop:12,padding:"6px 12px",background:"#12141a",border:"1px solid #2a2d35",borderRadius:6,color:"#3b82f6",fontSize:12,fontWeight:600,textDecoration:"none"}}><I.Map/> Open in Google Maps <I.ExternalLink/></a>}
          {route.notes&&<div style={{marginTop:10,padding:"8px 10px",background:"#12141a",borderRadius:6,fontSize:12,color:"#888",borderLeft:"3px solid #f59e0b"}}>{route.notes}</div>}
        </div>

        {/* Demo mode indicator */}
        {route.optimized&&route.demo&&<div style={{padding:"6px 16px",borderTop:"1px solid #2a2d35",fontSize:10,color:"#555",display:"flex",alignItems:"center",gap:6}}>
          Demo mode — simulated drive times. Add GOOGLE_MAPS_API_KEY to Vercel for live traffic data.
        </div>}
      </div>;
    })}
    {optimizeError&&<div style={{padding:10,background:"#ef444418",border:"1px solid #ef444433",borderRadius:8,fontSize:12,color:"#ef4444"}}>{optimizeError}</div>}
  </div>;

  // ── FLEET VIEW ──
  const VehiclesView=()=><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
    {vehicles.map(v=>{const vt=VEHICLE_TYPES.find(t=>t.id===v.type);const driver=crew.find(c=>c.id===v.driverId);const vr=routes.filter(r=>r.vehicleId===v.id);
    return<div key={v.id} onClick={()=>{setVf({...v});setEditVehicle(v);}} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:16,cursor:"pointer",borderTop:`3px solid ${v.color}`}}>
      <div style={{fontSize:24,marginBottom:6}}>{vt?.icon}</div><div style={{fontSize:15,fontWeight:700,color:"#f0f0f0"}}>{v.label}</div><div style={{fontSize:12,color:"#888",marginTop:2}}>{vt?.label} · Cap: {vt?.capacity}</div><div style={{fontSize:11,color:"#666",marginTop:4}}>Plate: {v.plate||"\u2014"}</div>{driver&&<div style={{fontSize:11,color:"#aaa",marginTop:4}}><I.Users/> {driver.name}</div>}<div style={{fontSize:11,color:"#555",marginTop:6}}>{vr.length} route(s)</div>
    </div>;})}
    <div onClick={openNewVehicle} style={{background:"#12141a",border:"2px dashed #2a2d35",borderRadius:10,padding:16,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:140,color:"#555"}}><I.Plus/><span style={{marginTop:8,fontSize:13,fontWeight:600}}>Add Vehicle</span></div>
  </div>;

  // ── DRIVERS VIEW ──
  const DriversView=()=>{const tc=crew.filter(c=>c.dept==="Transport"&&c.status==="confirmed");const dv=tc.map(d=>({...d,vehicle:vehicles.find(v=>v.driverId===d.id),todayRoutes:dayRoutes.filter(r=>{const v=vehicles.find(x=>x.id===r.vehicleId);return v?.driverId===d.id;})}));
  return<div>{dv.length===0&&<div style={{textAlign:"center",padding:40,color:"#555",fontSize:14}}>No transport crew.</div>}
    {dv.map(d=><div key={d.id} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:16,marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div><div style={{fontSize:15,fontWeight:700,color:"#f0f0f0"}}>{d.name}</div><div style={{fontSize:12,color:"#888"}}>{d.role} · {d.phone}</div></div>{d.vehicle&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",background:"#12141a",borderRadius:6,border:"1px solid #2a2d35"}}><span style={{width:8,height:8,borderRadius:"50%",background:d.vehicle.color}}/><span style={{fontSize:12,color:"#ddd",fontWeight:600}}>{d.vehicle.label}</span></div>}</div>
      {d.todayRoutes.length===0?<div style={{fontSize:12,color:"#555",fontStyle:"italic"}}>No routes for {day?.label}</div>:d.todayRoutes.map(r=><div key={r.id} style={{background:"#12141a",borderRadius:6,padding:10,marginTop:6}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}><span style={{color:"#ddd",fontWeight:600}}>{r.label}</span><span style={{color:"#888"}}>{r.stops.filter(s=>s.type==="pickup").length} pickups{r.totalDrive&&` · ${r.totalDrive}min`}</span></div>
        {r.driverDepart&&<div style={{fontSize:11,color:"#E8C94A",fontWeight:600,marginBottom:4}}>Depart: {fmtTime(r.driverDepart)}</div>}
        {r.stops.map((s,i)=><div key={i} style={{fontSize:11,color:s.type==="destination"?"#E8C94A":"#aaa",padding:"2px 0"}}><span style={{fontWeight:600}}>{fmtTime(s.type==="destination"?s.arrivalTime:s.pickupTime)}</span> — {s.type==="destination"?"ARRIVE":getPN(s)}{s.trafficNote&&<span style={{marginLeft:6,fontSize:10,color:"#666"}}>({s.trafficNote})</span>}</div>)}
        {r.gmapsUrl&&<a href={r.gmapsUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:6,fontSize:11,color:"#3b82f6",textDecoration:"none"}}><I.Map/> Google Maps <I.ExternalLink/></a>}
      </div>)}
    </div>)}
  </div>;};

  return <div>
    <style>{spinKeyframes}</style>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Transport & Routing</h2><p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>{vehicles.length} vehicles · {routes.length} routes</p></div>
      <div style={{display:"flex",gap:8}}>{viewMode==="vehicles"&&<button onClick={openNewVehicle} style={BS}><span style={{display:"flex",alignItems:"center",gap:5}}><I.Plus/> Vehicle</span></button>}{viewMode==="routes"&&<button onClick={openNewRoute} style={BP}><span style={{display:"flex",alignItems:"center",gap:5}}><I.Plus/> Route</span></button>}</div>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{display:"flex",gap:4}}>{[{id:"routes",l:"Routes",i:<I.Route/>},{id:"vehicles",l:"Fleet",i:<I.Transport/>},{id:"drivers",l:"Drivers",i:<I.Users/>}].map(t=><button key={t.id} onClick={()=>setViewMode(t.id)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:viewMode===t.id?"#E8C94A18":"transparent",border:`1px solid ${viewMode===t.id?"#E8C94A44":"#2a2d35"}`,color:viewMode===t.id?"#E8C94A":"#888"}}>{t.i} {t.l}</button>)}</div>
      <select value={selectedDay} onChange={e=>setSelectedDay(e.target.value)} style={{...IS,width:180}}>{days.map(d=><option key={d.id} value={d.id}>{d.label} — {d.date}</option>)}</select>
    </div>
    {viewMode==="routes"&&dayCastIds.length>0&&(()=>{const u=dayCastIds.filter(id=>!assignedIds.has(`cast-${id}`));if(u.length===0)return null;return<div style={{padding:"8px 12px",background:"#f59e0b18",border:"1px solid #f59e0b33",borderRadius:8,marginBottom:12,fontSize:12,color:"#f59e0b",display:"flex",alignItems:"center",gap:8}}><I.AlertTriangle/> <strong>{u.length} cast</strong> working {day?.label} without transport: {u.map(id=>CAST.find(c=>c.id===id)?.name).join(", ")}</div>;})()}
    {viewMode==="routes"&&<RoutesView/>}{viewMode==="vehicles"&&<VehiclesView/>}{viewMode==="drivers"&&<DriversView/>}

    {editVehicle&&<Modal title={editVehicle==="new"?"Add Vehicle":`Edit — ${vf.label}`} onClose={()=>setEditVehicle(null)} width={440}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><div><label style={LS}>Label</label><input value={vf.label||""} onChange={e=>setVf({...vf,label:e.target.value})} style={IS}/></div><div><label style={LS}>Plate</label><input value={vf.plate||""} onChange={e=>setVf({...vf,plate:e.target.value})} style={IS}/></div><div><label style={LS}>Type</label><select value={vf.type} onChange={e=>setVf({...vf,type:e.target.value})} style={IS}>{VEHICLE_TYPES.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label} ({t.capacity})</option>)}</select></div><div><label style={LS}>Driver</label><select value={vf.driverId||""} onChange={e=>setVf({...vf,driverId:e.target.value||null})} style={IS}><option value="">— None —</option>{crew.filter(c=>c.dept==="Transport").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label style={LS}>Color</label><input type="color" value={vf.color||"#3b82f6"} onChange={e=>setVf({...vf,color:e.target.value})} style={{...IS,height:36,padding:2}}/></div></div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}><div>{editVehicle!=="new"&&<button onClick={()=>{setVehicles(p=>p.filter(v=>v.id!==vf.id));setEditVehicle(null);}} style={BD}>Delete</button>}</div><div style={{display:"flex",gap:8}}><button onClick={()=>setEditVehicle(null)} style={BS}>Cancel</button><button onClick={saveVehicle} style={BP}>Save</button></div></div>
    </Modal>}

    {editRoute&&<Modal title={editRoute==="new"?"Create Route":"Edit Route"} onClose={()=>setEditRoute(null)} width={640}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}><div><label style={LS}>Route Name</label><input value={rf.label||""} onChange={e=>setRf({...rf,label:e.target.value})} style={IS}/></div><div><label style={LS}>Vehicle</label><select value={rf.vehicleId||""} onChange={e=>setRf({...rf,vehicleId:e.target.value})} style={IS}><option value="">— Select —</option>{vehicles.map(v=>{const vt=VEHICLE_TYPES.find(t=>t.id===v.type);return<option key={v.id} value={v.id}>{vt?.icon} {v.label}</option>;})}</select></div><div><label style={LS}>Status</label><select value={rf.status||"draft"} onChange={e=>setRf({...rf,status:e.target.value})} style={IS}>{["draft","confirmed","dispatched"].map(s=><option key={s}>{s}</option>)}</select></div><div style={{display:"flex",alignItems:"flex-end"}}><button onClick={autoCalc} style={{...BS,width:"100%"}}><span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><I.Clock/> Manual Calc Times</span></button></div></div>
      <div style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><label style={LS}>Stops</label><button onClick={addStop} style={{...BS,padding:"4px 10px",fontSize:11}}><span style={{display:"flex",alignItems:"center",gap:4}}><I.Plus/> Pickup</span></button></div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>{rf.stops?.map((stop,idx)=><div key={idx} style={{background:"#12141a",border:"1px solid #1e2028",borderRadius:8,padding:10}}>
          {stop.type==="pickup"?<div style={{display:"grid",gridTemplateColumns:"90px 1fr 70px 50px 24px 24px",gap:6,alignItems:"center"}}><select value={stop.personType||"cast"} onChange={e=>updateStop(idx,"personType",e.target.value)} style={{...IS,fontSize:11,padding:"6px 8px"}}><option value="cast">Cast</option><option value="crew">Crew</option></select><select value={stop.personId||""} onChange={e=>updateStop(idx,"personId",e.target.value)} style={{...IS,fontSize:11,padding:"6px 8px"}}><option value="">— Select —</option>{allPersons.filter(p=>p.type===stop.personType).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="time" value={stop.pickupTime||""} onChange={e=>updateStop(idx,"pickupTime",e.target.value)} style={{...IS,fontSize:11,padding:"6px 4px"}}/><input type="number" value={stop.estDrive||""} onChange={e=>updateStop(idx,"estDrive",Number(e.target.value))} style={{...IS,fontSize:11,padding:"6px 4px"}} placeholder="min"/><button onClick={()=>moveUp(idx)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:12}}>{"\u2191"}</button><button onClick={()=>removeStop(idx)} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer"}}><I.Trash/></button></div>
          :<div style={{display:"grid",gridTemplateColumns:"90px 1fr 70px",gap:6,alignItems:"center"}}><span style={{fontSize:11,fontWeight:700,color:"#E8C94A"}}>{"\u{1F3C1}"} Dest</span><select value={stop.locationId||""} onChange={e=>{const loc=LOCATIONS_DB.find(l=>l.id===e.target.value);updateStop(idx,"locationId",e.target.value);if(loc)updateStop(idx,"address",loc.address);}} style={{...IS,fontSize:11,padding:"6px 8px"}}>{LOCATIONS_DB.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select><input type="time" value={stop.arrivalTime||""} onChange={e=>updateStop(idx,"arrivalTime",e.target.value)} style={{...IS,fontSize:11,padding:"6px 4px"}}/></div>}
          {stop.address&&<div style={{fontSize:10,color:"#555",marginTop:4}}>{stop.address}</div>}
        </div>)}</div>
      </div>
      <div><label style={LS}>Notes</label><textarea value={rf.notes||""} onChange={e=>setRf({...rf,notes:e.target.value})} rows={2} style={{...IS,resize:"vertical"}}/></div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}><div>{editRoute!=="new"&&<button onClick={()=>{setRoutes(p=>p.filter(r=>r.id!==rf.id));setEditRoute(null);}} style={BD}>Delete</button>}</div><div style={{display:"flex",gap:8}}><button onClick={()=>setEditRoute(null)} style={BS}>Cancel</button><button onClick={saveRoute} style={BP}>Save Route</button></div></div>
    </Modal>}
  </div>;
};

// ═══════════════════════════════════════════════════════════════
// CALL SHEET
// ═══════════════════════════════════════════════════════════════
const CallSheetModule = ({ days, strips, crew, routes, vehicles }) => {
  const [selectedDay,setSelectedDay]=useState(days[0]?.id||"");
  const day=days.find(d=>d.id===selectedDay);
  const dayStrips=day?day.strips.map(sid=>strips.find(s=>s.id===sid)).filter(Boolean):[];
  const castIds=[...new Set(dayStrips.flatMap(s=>s.cast))];const castMembers=castIds.map(id=>CAST.find(c=>c.id===id)).filter(Boolean);
  const totalPages=dayStrips.reduce((s,x)=>s+x.pages,0);const dayRoutes=routes.filter(r=>r.dayId===selectedDay);
  const deptGroups={};crew.filter(c=>c.status==="confirmed").forEach(c=>{if(!deptGroups[c.dept])deptGroups[c.dept]=[];deptGroups[c.dept].push(c);});
  const getPickup=cid=>{for(const r of dayRoutes){const s=r.stops.find(s=>s.type==="pickup"&&s.personType==="cast"&&String(s.personId)===String(cid));if(s)return fmtTime(s.pickupTime);}return"Self";};
  const getPN=s=>{if(s.personType==="cast")return CAST.find(c=>String(c.id)===String(s.personId))?.name||"\u2014";return crew.find(c=>c.id===s.personId)?.name||"\u2014";};

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Call Sheet</h2><p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>Auto-generated from all modules</p></div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}><select value={selectedDay} onChange={e=>setSelectedDay(e.target.value)} style={{...IS,width:180}}>{days.map(d=><option key={d.id} value={d.id}>{d.label} — {d.date}</option>)}</select><button style={BP}><span style={{display:"flex",alignItems:"center",gap:5}}><I.Send/> Distribute</span></button></div>
    </div>
    {day?<div style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:12,overflow:"hidden"}}>
      <div style={{background:"#E8C94A",color:"#111",padding:"16px 20px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:20,fontWeight:900}}>THE LETTER</div><div style={{fontSize:12,fontWeight:600,opacity:0.7}}>Meridian Films · Producer: J. Hartwell</div></div><div style={{textAlign:"right"}}><div style={{fontSize:24,fontWeight:900}}>{day.label.toUpperCase()}</div><div style={{fontSize:12,fontWeight:600,opacity:0.7}}>{day.date}</div></div></div></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderBottom:"1px solid #2a2d35"}}>
        {[{l:"Crew Call",v:fmtTime(day.callTime||"06:00"),i:<I.Clock/>},{l:"Sunrise/Sunset",v:"06:47 / 17:32",i:<I.Sun/>},{l:"Location",v:dayStrips[0]?.location||"TBD",i:<I.Map/>},{l:"Pages",v:`${totalPages}pg / ${dayStrips.length}sc`,i:<I.Film/>}].map(x=><div key={x.l} style={{padding:"12px 16px",borderRight:"1px solid #2a2d35"}}><div style={{display:"flex",alignItems:"center",gap:6,color:"#888",fontSize:10,fontWeight:600,textTransform:"uppercase",marginBottom:4}}>{x.i} {x.l}</div><div style={{fontSize:14,fontWeight:700,color:"#f0f0f0"}}>{x.v}</div></div>)}
      </div>
      <div style={{padding:"16px 20px",borderBottom:"1px solid #2a2d35"}}><h4 style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#E8C94A",textTransform:"uppercase"}}>Scenes</h4>
        <div style={{display:"grid",gridTemplateColumns:"50px 60px 1fr 120px 60px",gap:4,fontSize:12}}>
          {["SC#","TYPE","DESCRIPTION","LOCATION","PAGES"].map(h=><div key={h} style={{color:"#555",fontWeight:700,paddingBottom:6,borderBottom:"1px solid #222",textAlign:h==="PAGES"?"right":"left"}}>{h}</div>)}
          {dayStrips.map(s=><React.Fragment key={s.id}><div style={{fontWeight:800,color:"#f0f0f0",padding:"6px 0"}}>{s.scene}</div><div style={{color:STRIP_COLORS[s.type],fontWeight:700,padding:"6px 0"}}>{s.type}</div><div style={{color:"#ccc",padding:"6px 0"}}>{s.synopsis}</div><div style={{color:"#aaa",padding:"6px 0"}}>{s.location}</div><div style={{color:"#888",fontWeight:700,textAlign:"right",padding:"6px 0"}}>{s.pages}</div></React.Fragment>)}
        </div>
      </div>
      <div style={{padding:"16px 20px",borderBottom:"1px solid #2a2d35"}}><h4 style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#E8C94A",textTransform:"uppercase"}}>Cast</h4>
        <div style={{display:"grid",gridTemplateColumns:"30px 1fr 1fr 80px 80px 80px",gap:4,fontSize:12}}>
          {["#","ARTIST","CHARACTER","PICKUP","MU/WARD","ON SET"].map(h=><div key={h} style={{color:"#555",fontWeight:700,paddingBottom:6,borderBottom:"1px solid #222"}}>{h}</div>)}
          {castMembers.map((c,i)=><React.Fragment key={c.id}><div style={{fontWeight:800,color:"#E8C94A",padding:"6px 0"}}>{c.id}</div><div style={{color:"#f0f0f0",fontWeight:600,padding:"6px 0"}}>{c.name}</div><div style={{color:"#aaa",padding:"6px 0"}}>{c.role.split(" - ")[1]||c.role}</div><div style={{color:"#888",padding:"6px 0"}}>{getPickup(c.id)}</div><div style={{color:"#888",padding:"6px 0"}}>{`${5+i}:${i%2===0?"45":"15"} AM`}</div><div style={{color:"#888",padding:"6px 0"}}>{fmtTime(day.callTime||"06:00")}</div></React.Fragment>)}
        </div>
      </div>
      {dayRoutes.length>0&&<div style={{padding:"16px 20px",borderBottom:"1px solid #2a2d35"}}><h4 style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#E8C94A",textTransform:"uppercase"}}>Transport</h4>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {dayRoutes.map(r=>{const v=vehicles.find(x=>x.id===r.vehicleId);const driver=crew.find(c=>c.id===v?.driverId);return<div key={r.id} style={{background:"#12141a",borderRadius:6,padding:10,borderLeft:`3px solid ${v?.color||"#555"}`}}>
            <div style={{fontSize:12,fontWeight:700,color:"#ddd",marginBottom:4}}>{r.label} <span style={{color:"#666",fontWeight:400}}>— {v?.label}</span>{r.totalDrive&&<span style={{color:"#888",fontWeight:400}}> · {r.totalDrive}min/{r.totalDistance}mi</span>}</div>
            {driver&&<div style={{fontSize:11,color:"#888",marginBottom:4}}>Driver: {driver.name} · {driver.phone}{r.driverDepart&&` · Departs ${fmtTime(r.driverDepart)}`}</div>}
            {r.stops.map((s,i)=><div key={i} style={{fontSize:11,color:s.type==="destination"?"#E8C94A":"#aaa",padding:"2px 0"}}><span style={{fontWeight:600}}>{fmtTime(s.type==="destination"?s.arrivalTime:s.pickupTime)}</span> — {s.type==="destination"?"ARRIVE":getPN(s)}{s.trafficNote&&<span style={{color:"#666"}}> ({s.trafficNote})</span>}</div>)}
          </div>;})}
        </div>
      </div>}
      <div style={{padding:"16px 20px",borderBottom:"1px solid #2a2d35"}}><h4 style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#E8C94A",textTransform:"uppercase"}}>Crew</h4>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{Object.entries(deptGroups).map(([dept,members])=><div key={dept} style={{background:"#12141a",borderRadius:6,padding:"8px 12px"}}><div style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:4}}>{dept}</div>{members.map(m=><div key={m.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"2px 0"}}><span style={{color:"#ccc"}}>{m.name} <span style={{color:"#666"}}>— {m.role}</span></span><span style={{color:"#555"}}>{m.phone}</span></div>)}</div>)}</div>
      </div>
      <div style={{padding:"16px 20px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}><div><h4 style={{margin:"0 0 6px",fontSize:10,fontWeight:700,color:"#ef4444",textTransform:"uppercase"}}>Emergency</h4><div style={{fontSize:12,color:"#aaa"}}>Hospital: City General — 2.3 mi · 911 · Medic: +1 555-9999</div></div><div><h4 style={{margin:"0 0 6px",fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Notes</h4><div style={{fontSize:12,color:"#aaa"}}>Weather: Clear, 68°F. Parking Lot B. Lunch 12:30 PM</div></div></div>
    </div>:<div style={{textAlign:"center",padding:60,color:"#555"}}>No days scheduled.</div>}
  </div>;
};

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function ProduceKit() {
  const [tab,setTab]=useState("dashboard");
  const [crew,setCrew]=useState(initialCrew);const [strips,setStrips]=useState(initialStrips);
  const [days,setDays]=useState(initialDays);const [vehicles,setVehicles]=useState(initialVehicles);
  const [routes,setRoutes]=useState(initialRoutes);
  const nav=[{id:"dashboard",l:"Dashboard",i:<I.Dashboard/>},{id:"crew",l:"Crew Roster",i:<I.Crew/>},{id:"stripboard",l:"Stripboard",i:<I.Strip/>},{id:"transport",l:"Transport",i:<I.Transport/>},{id:"callsheet",l:"Call Sheet",i:<I.CallSheet/>}];
  return <div style={{fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:"#0f1117",color:"#e0e0e0",minHeight:"100vh",display:"flex"}}>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
    <nav style={{width:220,background:"#12141a",borderRight:"1px solid #1e2028",padding:"16px 0",display:"flex",flexDirection:"column",flexShrink:0,position:"sticky",top:0,height:"100vh"}}>
      <div style={{padding:"8px 20px 24px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #1e2028",marginBottom:8}}><span style={{color:"#E8C94A"}}><I.Film/></span><span style={{fontSize:16,fontWeight:900,color:"#f0f0f0",letterSpacing:"-0.03em"}}>ProduceKit</span></div>
      <div style={{flex:1,padding:"8px 10px"}}>{nav.map(item=><button key={item.id} onClick={()=>setTab(item.id)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",marginBottom:2,borderRadius:8,background:tab===item.id?"#E8C94A15":"transparent",border:tab===item.id?"1px solid #E8C94A33":"1px solid transparent",color:tab===item.id?"#E8C94A":"#888",fontWeight:tab===item.id?700:500,fontSize:13,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>{item.i} {item.l}</button>)}</div>
      <div style={{padding:"12px 20px",borderTop:"1px solid #1e2028"}}>
        <div style={{fontSize:10,color:"#444"}}>ProduceKit v0.3</div>
      </div>
    </nav>
    <main style={{flex:1,padding:28,overflow:"auto",maxHeight:"100vh"}}>
      {tab==="dashboard"&&<DashboardModule crew={crew} days={days} strips={strips} routes={routes} vehicles={vehicles} setTab={setTab}/>}
      {tab==="crew"&&<CrewModule crew={crew} setCrew={setCrew}/>}
      {tab==="stripboard"&&<StripboardModule strips={strips} setStrips={setStrips} days={days} setDays={setDays}/>}
      {tab==="transport"&&<TransportModule vehicles={vehicles} setVehicles={setVehicles} routes={routes} setRoutes={setRoutes} days={days} strips={strips} crew={crew}/>}
      {tab==="callsheet"&&<CallSheetModule days={days} strips={strips} crew={crew} routes={routes} vehicles={vehicles}/>}
    </main>
  </div>;
}
