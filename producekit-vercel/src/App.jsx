import { useState, useCallback, useRef, useEffect } from "react";

// ─── CONFIG ──────────────────────────────────────────────────
const DEPARTMENTS = ["Camera","Grip","Electric","Art","Wardrobe","Hair/Makeup","Sound","Driver","Transport","Production","Directing","Stunts","VFX","Catering"];
const STRIP_COLORS = { "D/INT": "#E8C94A", "D/EXT": "#D4943A", "N/INT": "#4A7EE8", "N/EXT": "#7B4AE8" };
const VEHICLE_TYPES = [
  { id: "van15", label: "15-Seat Van", capacity: 15, icon: "\u{1F690}" },
  { id: "van8", label: "8-Seat Minivan", capacity: 8, icon: "\u{1F690}" },
  { id: "car", label: "Sedan", capacity: 4, icon: "\u{1F697}" },
  { id: "suv", label: "SUV", capacity: 6, icon: "\u{1F699}" },
  { id: "truck", label: "Truck / Grip", capacity: 2, icon: "\u{1F69B}" },
  { id: "motorhome", label: "Cast Motorhome", capacity: 2, icon: "\u{1F3E0}" },
];
const LOCATION_TYPES = ["Set/Stage","Exterior","Interior","Practical","Basecamp","Office","Other"];
const KEY_ROLES = ["Director","Producer","Exec Producer","Line Producer","UPM","DOP","1st AD"];

// EU FORMAT
const fmtTime = t => t || "—";
const fmtDate = d => { if (!d) return "—"; const [y,m,dd] = d.split("-"); return `${dd}.${m}.${y}`; };
const toKm = mi => (parseFloat(mi) * 1.60934).toFixed(1);
const subMin = (time,mins) => {if(!time)return"";const[h,m]=time.split(":").map(Number);const t=h*60+m-mins;const nh=Math.floor(((t%1440)+1440)%1440/60);const nm=((t%1440)+1440)%1440%60;return`${String(nh).padStart(2,"0")}:${String(nm).padStart(2,"0")}`;};
const addMin = (time,mins) => {if(!time)return"";const[h,m]=time.split(":").map(Number);const t=h*60+m+mins;const nh=Math.floor(((t%1440)+1440)%1440/60);const nm=((t%1440)+1440)%1440%60;return`${String(nh).padStart(2,"0")}:${String(nm).padStart(2,"0")}`;};

// DEFAULT PROJECT
const defaultProject = () => ({
  id: "p" + Date.now(), name: "The Letter", production: "Meridian Films", shootingDays: 20,
  keyRoles: { Director:"Anna Novak", Producer:"J. Hartwell", "Exec Producer":"M. Stone", "Line Producer":"K. Voss", UPM:"R. Tanaka", DOP:"Sarah Chen", "1st AD":"Ava Petrov" },
  crew: [
    { id:"c1", name:"Sarah Chen", dept:"Camera", role:"DOP", phone:"+420 555 0101", email:"sarah@prod.com", union:true, status:"confirmed", notes:"", address:"14 Oak Lane, Prague 5" },
    { id:"c2", name:"Mike Torres", dept:"Grip", role:"Key Grip", phone:"+420 555 0102", email:"mike@prod.com", union:true, status:"confirmed", notes:"", address:"88 Vine St, Prague 3" },
    { id:"c3", name:"Ava Petrov", dept:"Directing", role:"1st AD", phone:"+420 555 0103", email:"ava@prod.com", union:true, status:"confirmed", notes:"", address:"22 Elm Ave, Prague 6" },
    { id:"c4", name:"James Okafor", dept:"Sound", role:"Boom Op", phone:"+420 555 0104", email:"james@prod.com", union:false, status:"available", notes:"", address:"5 Cedar Blvd, Prague 4" },
    { id:"c5", name:"Lena Kraft", dept:"Wardrobe", role:"Costume Designer", phone:"+420 555 0105", email:"lena@prod.com", union:true, status:"confirmed", notes:"", address:"31 Magnolia Dr, Prague 2" },
    { id:"c6", name:"Danny Reeves", dept:"Electric", role:"Gaffer", phone:"+420 555 0106", email:"danny@prod.com", union:true, status:"confirmed", notes:"", address:"7 Birch Rd, Prague 8" },
    { id:"c7", name:"Rosa Vega", dept:"Hair/Makeup", role:"Key MUA", phone:"+420 555 0107", email:"rosa@prod.com", union:false, status:"hold", notes:"", address:"19 Palm Way, Prague 1" },
    { id:"c8", name:"Tom Blake", dept:"Driver", role:"Transport Captain", phone:"+420 555 0108", email:"tom@prod.com", union:true, status:"confirmed", notes:"", address:"42 Sunset Blvd, Prague 5" },
  ],
  cast: [
    { id:1, name:"Emily Frost", roleNum:"#1", roleName:"Diana", address:"66 Melrose Ave, Prague 1", hotel:"The Roosevelt Hotel, Prague", dietary:"Vegetarian", notes:"Lead — early MU call" },
    { id:2, name:"Marcus Webb", roleNum:"#2", roleName:"Jack", address:"221 Canon Dr, Prague 2", hotel:"Chateau Marmont, Prague", dietary:"", notes:"Lead" },
    { id:3, name:"Suki Tanaka", roleNum:"#3", roleName:"Rose", address:"112 Hillcrest Rd, Prague 6", hotel:"", dietary:"Gluten-free", notes:"Supporting" },
    { id:4, name:"Dev Patel", roleNum:"#4", roleName:"Omar", address:"8 Wilshire Pl, Prague 3", hotel:"", dietary:"", notes:"Supporting" },
    { id:5, name:"Claire Duval", roleNum:"#5", roleName:"Waitress", address:"66 Melrose Ave, Prague 1", hotel:"", dietary:"Vegan", notes:"Day player" },
  ],
  locations: [
    { id:"loc1", name:"Diana's Apartment", address:"Barrandov Studios, Prague 5", type:"Set/Stage", contact:"", phone:"", notes:"Main set — Stage 4", permit:true },
    { id:"loc2", name:"City Park", address:"Stromovka Park, Prague 7", type:"Exterior", contact:"Parks Dept", phone:"+420 555 8001", notes:"Permit required", permit:true },
    { id:"loc3", name:"Restaurant", address:"Kampa Park, Prague 1", type:"Practical", contact:"Manager: Luigi", phone:"+420 555 8002", notes:"Available after 14:00", permit:true },
    { id:"loc4", name:"Office (Downtown)", address:"Wenceslas Square 12, Prague 1", type:"Practical", contact:"Building Mgr", phone:"+420 555 8003", notes:"Loading dock side entrance", permit:true },
    { id:"loc5", name:"Rooftop", address:"Dancing House, Prague 2", type:"Practical", contact:"Events Coord", phone:"+420 555 8004", notes:"Night shoot only", permit:true },
    { id:"loc6", name:"Hospital", address:"Motol Hospital, Prague 5", type:"Practical", contact:"Film Office", phone:"+420 555 8005", notes:"Restricted hours", permit:false },
    { id:"loc7", name:"Beach / River", address:"Zbraslav, Prague-South", type:"Exterior", contact:"", phone:"", notes:"River location", permit:true },
    { id:"loc8", name:"Basecamp", address:"Barrandov Terraces, Prague 5", type:"Basecamp", contact:"Lot Security", phone:"+420 555 8007", notes:"Default crew call", permit:true },
  ],
  strips: [
    { id:"s1", scene:"1", type:"D/INT", locationId:"loc1", cast:[1,3], pages:2.5, synopsis:"Diana discovers the letter", startTime:"", endTime:"" },
    { id:"s2", scene:"2", type:"D/EXT", locationId:"loc2", cast:[1,2], pages:1.75, synopsis:"Diana and Jack meet", startTime:"", endTime:"" },
    { id:"s3", scene:"3", type:"N/INT", locationId:"loc3", cast:[1,2,5], pages:3, synopsis:"Dinner scene - the argument", startTime:"", endTime:"" },
    { id:"s4", scene:"4", type:"D/INT", locationId:"loc4", cast:[2,4], pages:1.25, synopsis:"Jack confronts Omar", startTime:"", endTime:"" },
    { id:"s5", scene:"5", type:"N/EXT", locationId:"loc5", cast:[1], pages:2, synopsis:"Diana's monologue", startTime:"", endTime:"" },
    { id:"s6", scene:"6", type:"D/EXT", locationId:"loc2", cast:[1,3,4], pages:1.5, synopsis:"Rose reveals the truth", startTime:"", endTime:"" },
    { id:"s7", scene:"7", type:"D/INT", locationId:"loc1", cast:[1,2], pages:3.25, synopsis:"Reconciliation", startTime:"", endTime:"" },
    { id:"s8", scene:"8", type:"N/INT", locationId:"loc6", cast:[1,2,3,4], pages:2.75, synopsis:"The accident aftermath", startTime:"", endTime:"" },
    { id:"s9", scene:"9", type:"D/EXT", locationId:"loc7", cast:[1,2], pages:1, synopsis:"Final scene - new beginning", startTime:"", endTime:"" },
  ],
  days: [
    { id:"d1", label:"Day 1", date:"2026-03-02", strips:["s1","s7"], callTime:"06:00" },
    { id:"d2", label:"Day 2", date:"2026-03-03", strips:["s2","s6","s9"], callTime:"07:00" },
    { id:"d3", label:"Day 3", date:"2026-03-04", strips:["s3","s5"], callTime:"14:00" },
    { id:"d4", label:"Day 4", date:"2026-03-05", strips:["s4","s8"], callTime:"06:00" },
  ],
  vehicles: [
    { id:"v1", type:"van15", plate:"CZ-PROD-01", label:"Unit Van A", driverId:"c8", color:"#3b82f6" },
    { id:"v2", type:"van8", plate:"CZ-PROD-02", label:"Cast Van", driverId:null, color:"#22c55e" },
    { id:"v3", type:"suv", plate:"CZ-PROD-03", label:"Producer Car", driverId:null, color:"#f59e0b" },
    { id:"v4", type:"motorhome", plate:"CZ-PROD-04", label:"Lead Motorhome", driverId:null, color:"#ef4444" },
    { id:"v5", type:"truck", plate:"CZ-PROD-05", label:"Grip Truck", driverId:null, color:"#8b5cf6" },
  ],
  routes: [
    { id:"r1", vehicleId:"v2", dayId:"d1", label:"Cast Pickup — Day 1",
      stops:[
        { type:"pickup", personType:"cast", personId:3, address:"112 Hillcrest Rd, Prague 6", pickupTime:"05:15", estDrive:22, distance:"", trafficNote:"" },
        { type:"pickup", personType:"cast", personId:1, address:"The Roosevelt Hotel, Prague", pickupTime:"05:40", estDrive:15, distance:"", trafficNote:"" },
        { type:"destination", locationId:"loc1", address:"Barrandov Studios, Prague 5", arrivalTime:"06:00", estDrive:0 },
      ], notes:"Emily has early MU call", status:"confirmed", optimized:false, demo:false, gmapsUrl:"", totalDrive:null, totalDistance:null, trafficSummary:"" },
    { id:"r2", vehicleId:"v1", dayId:"d1", label:"Crew Shuttle — Day 1",
      stops:[
        { type:"pickup", personType:"crew", personId:"c6", address:"7 Birch Rd, Prague 8", pickupTime:"05:00", estDrive:10, distance:"", trafficNote:"" },
        { type:"pickup", personType:"crew", personId:"c2", address:"88 Vine St, Prague 3", pickupTime:"05:15", estDrive:12, distance:"", trafficNote:"" },
        { type:"pickup", personType:"crew", personId:"c5", address:"31 Magnolia Dr, Prague 2", pickupTime:"05:30", estDrive:15, distance:"", trafficNote:"" },
        { type:"destination", locationId:"loc8", address:"Barrandov Terraces, Prague 5", arrivalTime:"05:50", estDrive:0 },
      ], notes:"", status:"confirmed", optimized:false, demo:false, gmapsUrl:"", totalDrive:null, totalDistance:null, trafficSummary:"" },
  ],
});

// ICONS
const I = {
  Dashboard: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  People: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Strip: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
  CallSheet: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Transport: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  Location: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Settings: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Phone: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  X: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Film: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>,
  Clock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Map: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Send: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Route: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M12 19h4.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H18"/></svg>,
  Users: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
  ExternalLink: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  Loader: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
  AlertTriangle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  CheckCircle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  ChevDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
};

// SHARED UI
const StatusBadge = ({ status }) => { const c = { confirmed:"#22c55e",available:"#3b82f6",hold:"#f59e0b",unavailable:"#ef4444",draft:"#888",dispatched:"#3b82f6" }; return <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",color:c[status]||"#888",background:(c[status]||"#888")+"18",padding:"2px 8px",borderRadius:4}}><span style={{width:6,height:6,borderRadius:"50%",background:c[status]||"#888"}}/>{status}</span>; };
const TrafficBadge = ({ note }) => { if(!note)return null; const c = {"Clear roads":"#22c55e","Light traffic":"#22c55e","Moderate traffic":"#f59e0b","Heavy traffic":"#ef4444"}; return <span style={{fontSize:10,fontWeight:600,color:c[note]||"#888",background:(c[note]||"#888")+"15",padding:"2px 6px",borderRadius:3}}>{note}</span>; };
const Modal = ({ title, onClose, children, width = 560 }) => (<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(4px)"}} onClick={onClose}><div onClick={e=>e.stopPropagation()} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:12,width,maxWidth:"95vw",maxHeight:"85vh",overflow:"auto",boxShadow:"0 25px 60px rgba(0,0,0,0.5)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:"1px solid #2a2d35",position:"sticky",top:0,background:"#1a1d23",zIndex:1}}><h3 style={{margin:0,fontSize:16,fontWeight:700,color:"#f0f0f0"}}>{title}</h3><button onClick={onClose} style={{background:"none",border:"none",color:"#888",cursor:"pointer",padding:4}}><I.X/></button></div><div style={{padding:20}}>{children}</div></div></div>);
const IS = {width:"100%",background:"#12141a",border:"1px solid #2a2d35",borderRadius:6,padding:"8px 12px",color:"#e0e0e0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
const LS = {display:"block",fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4};
const BP = {background:"#E8C94A",color:"#111",border:"none",borderRadius:6,padding:"8px 20px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"};
const BS = {background:"#2a2d35",color:"#ccc",border:"1px solid #3a3d45",borderRadius:6,padding:"8px 16px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"};
const BD = {...BS,color:"#ef4444",borderColor:"#ef444433"};
const spinKF = `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`;

// ─── ADDRESS AUTOCOMPLETE (Google Places) ────────────────────
let _mapsLoaded = false;
let _mapsLoading = false;
let _mapsCallbacks = [];
function loadGoogleMaps(cb) {
  if (_mapsLoaded && window.google?.maps?.places) { cb(); return; }
  _mapsCallbacks.push(cb);
  if (_mapsLoading) return;
  _mapsLoading = true;
  fetch("/api/maps-key").then(r => r.json()).then(d => {
    if (!d.key) { _mapsLoading = false; return; }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${d.key}&libraries=places`;
    s.onload = () => { _mapsLoaded = true; _mapsLoading = false; _mapsCallbacks.forEach(fn => fn()); _mapsCallbacks = []; };
    s.onerror = () => { _mapsLoading = false; };
    document.head.appendChild(s);
  }).catch(() => { _mapsLoading = false; });
}

const AddressInput = ({ value, onChange, placeholder, style: extraStyle }) => {
  const inputRef = useRef(null);
  const acRef = useRef(null);
  const [ready, setReady] = useState(_mapsLoaded);
  useEffect(() => {
    if (!ready) loadGoogleMaps(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!ready || !inputRef.current || acRef.current) return;
    try {
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, { types: ["address"], fields: ["formatted_address"] });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (place?.formatted_address) onChange(place.formatted_address);
      });
      acRef.current = ac;
    } catch (e) {}
    return () => { if (acRef.current) { window.google.maps.event.clearInstanceListeners(acRef.current); acRef.current = null; } };
  }, [ready]);
  return <input ref={inputRef} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder || "Start typing address..."} style={{ ...IS, ...extraStyle }} />;
};

// API HELPER
async function callRouteOptimize(route, vehicles, crew, cast, day) {
  const vehicle = vehicles.find(v => v.id === route.vehicleId);
  const driver = crew.find(c => c.id === vehicle?.driverId);
  const driverStart = driver?.address || "Prague, CZ";
  const dest = route.stops.find(s => s.type === "destination");
  const pickups = route.stops.filter(s => s.type === "pickup").map(s => {
    const name = s.personType === "cast" ? cast.find(c => String(c.id) === String(s.personId))?.name || "?" : crew.find(c => c.id === s.personId)?.name || "?";
    return { id: String(s.personId), name, address: s.address, personType: s.personType };
  });
  try {
    const resp = await fetch(`/api/route-optimize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ driver_start: driverStart, destination: dest?.address || "", pickups, call_time: dest?.arrivalTime || day?.callTime || "06:00", call_date: day?.date, buffer_minutes: 5, stop_duration: 2, traffic: true }) });
    if (resp.ok) { const data = await resp.json(); if (!data.error) return data; }
  } catch (e) {}
  // DEMO fallback
  await new Promise(r => setTimeout(r, 1200));
  const fd = pickups.map(() => 8 + Math.floor(Math.random() * 20));
  const fdi = pickups.map(() => (2 + Math.random() * 12).toFixed(1));
  const tn = ["Clear roads","Light traffic","Moderate traffic","Light traffic"];
  const [ch, cm] = (dest?.arrivalTime || day?.callTime || "06:00").split(":").map(Number);
  let cur = ch * 60 + cm - 5;
  const sched = [];
  for (let i = pickups.length - 1; i >= 0; i--) { cur -= fd[i]; if (i < pickups.length - 1) cur -= 2; const h = Math.floor(((cur%1440)+1440)%1440/60); const m = ((cur%1440)+1440)%1440%60; sched.unshift({ ...pickups[i], pickup_time: `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`, drive_to_next_minutes: fd[i], distance_to_next: `${fdi[i]} mi`, traffic_note: tn[i%tn.length] }); }
  cur -= (5 + Math.floor(Math.random() * 10));
  const dh = Math.floor(((cur%1440)+1440)%1440/60); const dm = ((cur%1440)+1440)%1440%60;
  const td = fd.reduce((a,b) => a+b, 0) + 5 + Math.floor(Math.random()*10);
  const tdi = fdi.reduce((a,b) => a+parseFloat(b), 0).toFixed(1);
  const tDel = Math.floor(Math.random()*12);
  return { demo:true, schedule:{ driver_depart:`${String(dh).padStart(2,"0")}:${String(dm).padStart(2,"0")}`, stops:sched, arrival:subMin(dest?.arrivalTime||"06:00",5), call_time:dest?.arrivalTime||day?.callTime||"06:00" }, total_drive_minutes:td, total_distance_miles:tdi, traffic_summary:tDel<=2?"Roads clear.":tDel<=8?`Light traffic. +${tDel} min.`:`Moderate traffic. +${tDel} min.`, traffic_delay_minutes:tDel, google_maps_url:`https://www.google.com/maps/dir/${encodeURIComponent(driverStart)}/${pickups.map(p=>encodeURIComponent(p.address)).join("/")}/${encodeURIComponent(dest?.address||"")}` };
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD — clickable day overview
// ═══════════════════════════════════════════════════════════════
const DashboardModule = ({ project, setTab }) => {
  const { crew, days, strips, routes, vehicles, locations, cast } = project;
  const [selDayId, setSelDayId] = useState(null);
  const stats = [{l:"Crew",v:crew.length,c:"#3b82f6"},{l:"Days",v:`${days.length}/${project.shootingDays||"—"}`,c:"#E8C94A"},{l:"Scenes",v:strips.length,c:"#22c55e"},{l:"Locations",v:locations.length,c:"#f59e0b"}];
  const gLoc = id => locations.find(l=>l.id===id)?.name||"—";
  const gPN = s => s.personType==="cast"?cast.find(c=>String(c.id)===String(s.personId))?.name||"—":crew.find(c=>c.id===s.personId)?.name||"—";
  const sd = days.find(d=>d.id===selDayId);
  const ss = sd?sd.strips.map(sid=>strips.find(s=>s.id===sid)).filter(Boolean):[];
  const sc = [...new Set(ss.flatMap(s=>s.cast))];
  const sr = routes.filter(r=>r.dayId===selDayId);
  return <div>
    <div style={{marginBottom:28}}><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Production Dashboard</h2><p style={{margin:"4px 0 0",color:"#888",fontSize:14}}>{project.name} — {project.production}</p>
      {project.keyRoles?.Director&&<p style={{margin:"2px 0 0",color:"#666",fontSize:12}}>Dir: {project.keyRoles.Director} · DOP: {project.keyRoles.DOP||"—"} · Prod: {project.keyRoles.Producer||"—"}</p>}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
      {stats.map(s=><div key={s.l} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:"18px 16px",borderTop:`3px solid ${s.c}`}}><div style={{fontSize:28,fontWeight:800,color:s.c}}>{s.v}</div><div style={{fontSize:12,color:"#888",fontWeight:600,textTransform:"uppercase",marginTop:2}}>{s.l}</div></div>)}
    </div>
    <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:700,color:"#f0f0f0"}}>Shooting Days</h3>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8,marginBottom:20}}>
      {days.map(day=>{const ds=day.strips.map(sid=>strips.find(s=>s.id===sid)).filter(Boolean);const tp=ds.reduce((s,x)=>s+x.pages,0);const isA=selDayId===day.id;
      return<div key={day.id} onClick={()=>setSelDayId(isA?null:day.id)} style={{background:isA?"#E8C94A15":"#1a1d23",border:`1px solid ${isA?"#E8C94A55":"#2a2d35"}`,borderRadius:8,padding:"10px 12px",cursor:"pointer"}}>
        <div style={{fontWeight:800,color:isA?"#E8C94A":"#f0f0f0",fontSize:13}}>{day.label}</div>
        <div style={{fontSize:11,color:"#888"}}>{fmtDate(day.date)}</div>
        <div style={{fontSize:11,color:"#666",marginTop:4}}>{ds.length} sc · {tp.toFixed(1)} pg</div>
      </div>;})}
    </div>
    {sd&&<div style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:20,marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h3 style={{margin:0,fontSize:16,fontWeight:800,color:"#E8C94A"}}>{sd.label} — {fmtDate(sd.date)}</h3><span style={{fontSize:12,color:"#888"}}>Call: {fmtTime(sd.callTime)}</span></div>
      <div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:8}}>Scenes</div>
        {ss.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #222"}}><span style={{width:8,height:8,borderRadius:2,background:STRIP_COLORS[s.type]}}/><span style={{fontSize:13,fontWeight:700,color:"#f0f0f0",minWidth:36}}>Sc.{s.scene}</span><span style={{fontSize:10,color:STRIP_COLORS[s.type],fontWeight:700}}>{s.type}</span><span style={{fontSize:12,color:"#aaa",flex:1}}>{s.synopsis}</span>{(s.startTime||s.endTime)&&<span style={{fontSize:11,color:"#888"}}>{s.startTime||"?"} – {s.endTime||"?"}</span>}<span style={{fontSize:11,color:"#666"}}>{s.pages}pg</span></div>)}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div><div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:8}}>Cast</div>{sc.map(id=>{const c=cast.find(x=>x.id===id);return c?<div key={id} style={{fontSize:12,color:"#ddd",padding:"3px 0"}}><span style={{color:"#E8C94A",fontWeight:700}}>{c.roleNum}</span> {c.name} <span style={{color:"#666"}}>— {c.roleName}</span></div>:null;})}</div>
        <div><div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:8}}>Transport</div>{sr.length===0?<div style={{fontSize:12,color:"#555"}}>No routes</div>:sr.map(r=>{const v=vehicles.find(x=>x.id===r.vehicleId);return<div key={r.id} style={{fontSize:12,color:"#ddd",padding:"3px 0"}}><span style={{width:6,height:6,borderRadius:"50%",background:v?.color||"#555",display:"inline-block",marginRight:6}}/>{r.label}{r.totalDrive&&<span style={{color:"#888"}}> · {r.totalDrive}min</span>}</div>;})}</div>
      </div>
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
      {[{l:"People",i:"\u{1F465}",t:"people"},{l:"Stripboard",i:"\u{1F3AC}",t:"stripboard"},{l:"Locations",i:"\u{1F4CD}",t:"locations"},{l:"Transport",i:"\u{1F690}",t:"transport"},{l:"Call Sheet",i:"\u{1F4C4}",t:"callsheet"},{l:"Project",i:"\u2699\uFE0F",t:"project"}].map(a=>
        <button key={a.t} onClick={()=>setTab(a.t)} style={{display:"flex",alignItems:"center",gap:8,background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:8,padding:"10px 12px",color:"#ddd",fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}><span style={{fontSize:16}}>{a.i}</span>{a.l}</button>)}
    </div>
  </div>;
};

// ═══════════════════════════════════════════════════════════════
// PEOPLE — Crew + Cast tabs (no rate field)
// ═══════════════════════════════════════════════════════════════
const PeopleModule = ({ crew, setCrew, cast, setCast }) => {
  const [tab,setTab]=useState("crew");const [search,setSearch]=useState("");const [filterDept,setFilterDept]=useState("All");const [editModal,setEditModal]=useState(null);const [form,setForm]=useState({});
  const fCrew = crew.filter(c=>(filterDept==="All"||c.dept===filterDept)&&(c.name+c.role).toLowerCase().includes(search.toLowerCase()));
  const fCast = cast.filter(c=>(c.name+c.roleName).toLowerCase().includes(search.toLowerCase()));
  const openNC=()=>{setForm({name:"",dept:"Camera",role:"",phone:"",email:"",union:false,status:"available",notes:"",address:""});setEditModal("nC");};
  const saveC=()=>{if(editModal==="nC")setCrew(p=>[...p,{...form,id:"c"+Date.now()}]);else setCrew(p=>p.map(c=>c.id===form.id?form:c));setEditModal(null);};
  const openNA=()=>{setForm({name:"",roleNum:`#${cast.length+1}`,roleName:"",address:"",hotel:"",dietary:"",notes:""});setEditModal("nA");};
  const saveA=()=>{if(editModal==="nA")setCast(p=>[...p,{...form,id:Date.now()}]);else setCast(p=>p.map(c=>c.id===form.id?form:c));setEditModal(null);};
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>People</h2><p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>{crew.length} crew · {crew.filter(c=>c.dept==="Driver").length} drivers · {cast.length} cast</p></div>
      <button onClick={tab==="crew"?openNC:openNA} style={BP}><span style={{display:"flex",alignItems:"center",gap:6}}><I.Plus/> Add {tab==="crew"?"Crew":"Cast"}</span></button>
    </div>
    <div style={{display:"flex",gap:4,marginBottom:16}}>{[{id:"crew",l:`Crew (${crew.length})`},{id:"cast",l:`Cast (${cast.length})`}].map(t=><button key={t.id} onClick={()=>{setTab(t.id);setSearch("");setFilterDept("All");}} style={{padding:"7px 16px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:tab===t.id?"#E8C94A18":"transparent",border:`1px solid ${tab===t.id?"#E8C94A44":"#2a2d35"}`,color:tab===t.id?"#E8C94A":"#888"}}>{t.l}</button>)}</div>
    <div style={{display:"flex",gap:10,marginBottom:16}}><div style={{position:"relative",flex:1}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#555"}}><I.Search/></span><input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{...IS,paddingLeft:34}}/></div>{tab==="crew"&&<select value={filterDept} onChange={e=>setFilterDept(e.target.value)} style={{...IS,width:160,cursor:"pointer"}}><option value="All">All Depts</option>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select>}</div>
    {tab==="crew"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
      {fCrew.map(c=><div key={c.id} onClick={()=>{setForm({...c});setEditModal("eC");}} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:16,cursor:"pointer",borderLeft:c.dept==="Driver"?"3px solid #3b82f6":"3px solid transparent"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><div><div style={{fontSize:14,fontWeight:700,color:"#f0f0f0"}}>{c.name}</div><div style={{fontSize:12,color:"#E8C94A",fontWeight:600}}>{c.role}</div></div><StatusBadge status={c.status}/></div>
        <div style={{fontSize:11,color:"#888",fontWeight:600,marginBottom:6,textTransform:"uppercase"}}>{c.dept}{c.union&&" · UNION"}</div>
        <div style={{fontSize:12,color:"#aaa"}}><I.Phone/> {c.phone}</div>
        {c.address&&<div style={{marginTop:4,fontSize:11,color:"#555"}}><I.Map/> {c.address}</div>}
      </div>)}</div>}
    {tab==="cast"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:10}}>
      {fCast.map(c=><div key={c.id} onClick={()=>{setForm({...c});setEditModal("eA");}} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:16,cursor:"pointer"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><span style={{fontSize:13,fontWeight:800,color:"#E8C94A"}}>{c.roleNum}</span><span style={{fontSize:14,fontWeight:700,color:"#f0f0f0"}}>{c.name}</span></div>
        <div style={{fontSize:12,color:"#888"}}>as {c.roleName}</div>
        {c.hotel&&<div style={{fontSize:11,color:"#888",marginTop:4}}>{"\u{1F3E8}"} {c.hotel}</div>}
        {c.address&&<div style={{fontSize:11,color:"#555",marginTop:2}}><I.Map/> {c.address}</div>}
        {c.dietary&&<div style={{marginTop:4,fontSize:10,fontWeight:600,color:"#f59e0b",background:"#f59e0b18",padding:"2px 6px",borderRadius:3,display:"inline-block"}}>{c.dietary}</div>}
        {c.notes&&<div style={{marginTop:4,fontSize:11,color:"#666",fontStyle:"italic"}}>{c.notes}</div>}
      </div>)}</div>}
    {(editModal==="nC"||editModal==="eC")&&<Modal title={editModal==="nC"?"Add Crew":`Edit — ${form.name}`} onClose={()=>setEditModal(null)}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={LS}>Name</label><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Role</label><input value={form.role||""} onChange={e=>setForm({...form,role:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Department</label><select value={form.dept} onChange={e=>setForm({...form,dept:e.target.value})} style={IS}>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select></div>
        <div><label style={LS}>Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={IS}>{["confirmed","available","hold","unavailable"].map(s=><option key={s}>{s}</option>)}</select></div>
        <div><label style={LS}>Phone</label><input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Email</label><input value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Address</label><AddressInput value={form.address} onChange={v=>setForm({...form,address:v})}/></div>
        <div><label style={{...LS,marginBottom:8}}> </label><label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#ccc",cursor:"pointer"}}><input type="checkbox" checked={form.union||false} onChange={e=>setForm({...form,union:e.target.checked})}/> Union</label></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Notes</label><textarea value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} style={{...IS,resize:"vertical"}}/></div>
      </div>
      {form.dept==="Driver"&&<div style={{marginTop:12,padding:10,background:"#3b82f618",border:"1px solid #3b82f633",borderRadius:6,fontSize:12,color:"#3b82f6"}}>Driver — visible in Transport and assignable to vehicles.</div>}
      <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}><div>{editModal==="eC"&&<button onClick={()=>{setCrew(p=>p.filter(c=>c.id!==form.id));setEditModal(null);}} style={BD}>Delete</button>}</div><div style={{display:"flex",gap:8}}><button onClick={()=>setEditModal(null)} style={BS}>Cancel</button><button onClick={saveC} style={BP}>Save</button></div></div>
    </Modal>}
    {(editModal==="nA"||editModal==="eA")&&<Modal title={editModal==="nA"?"Add Cast":`Edit — ${form.name}`} onClose={()=>setEditModal(null)}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={LS}>Name</label><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} style={IS}/></div>
        <div style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:8}}><div><label style={LS}>Role #</label><input value={form.roleNum||""} onChange={e=>setForm({...form,roleNum:e.target.value})} style={IS}/></div><div><label style={LS}>Role Name</label><input value={form.roleName||""} onChange={e=>setForm({...form,roleName:e.target.value})} style={IS}/></div></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Address</label><AddressInput value={form.address} onChange={v=>setForm({...form,address:v})}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Hotel</label><AddressInput value={form.hotel} onChange={v=>setForm({...form,hotel:v})} placeholder="Hotel address..."/></div>
        <div><label style={LS}>Dietary Restrictions</label><input value={form.dietary||""} onChange={e=>setForm({...form,dietary:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Notes</label><textarea value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} style={{...IS,resize:"vertical"}}/></div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}><div>{editModal==="eA"&&<button onClick={()=>{setCast(p=>p.filter(c=>c.id!==form.id));setEditModal(null);}} style={BD}>Delete</button>}</div><div style={{display:"flex",gap:8}}><button onClick={()=>setEditModal(null)} style={BS}>Cancel</button><button onClick={saveA} style={BP}>Save</button></div></div>
    </Modal>}
  </div>;
};

// ═══════════════════════════════════════════════════════════════
// STRIPBOARD — scene times + auto-estimate
// ═══════════════════════════════════════════════════════════════
const StripboardModule = ({ strips, setStrips, days, setDays, locations, cast }) => {
  const [editStrip,setEditStrip]=useState(null);const [sf,setSf]=useState({});
  const unsch=strips.filter(s=>!days.some(d=>d.strips.includes(s.id)));
  const gLoc=id=>locations.find(x=>x.id===id)?.name||"—";
  const moveS=(sid,did,dir)=>{setDays(p=>{let u=p.map(d=>({...d,strips:[...d.strips]}));const day=u.find(d=>d.id===did);if(!day)return p;const i=day.strips.indexOf(sid);if(i<0)return p;const n=i+dir;if(n<0||n>=day.strips.length)return p;[day.strips[i],day.strips[n]]=[day.strips[n],day.strips[i]];return u;});};
  const addDay=()=>{const n=days.length+1;const ld=days.length>0?new Date(days[days.length-1].date):new Date();ld.setDate(ld.getDate()+1);setDays(p=>[...p,{id:"d"+Date.now(),label:`Day ${n}`,date:ld.toISOString().split("T")[0],strips:[],callTime:"06:00"}]);};
  const saveSt=()=>{if(editStrip==="new")setStrips(p=>[...p,{...sf,id:"s"+Date.now()}]);else setStrips(p=>p.map(s=>s.id===sf.id?sf:s));setEditStrip(null);};
  const estTimes=(did)=>{const day=days.find(d=>d.id===did);if(!day)return;let cur=day.callTime||"06:00";const ordered=day.strips;setStrips(prev=>{let up=[...prev];ordered.forEach((sid,idx)=>{const si=up.findIndex(s=>s.id===sid);if(si<0)return;let start=cur;for(let j=0;j<idx;j++){const ps=up.find(s=>s.id===ordered[j]);start=addMin(day.callTime||"06:00",0);let t=day.callTime||"06:00";for(let k=0;k<=j;k++){if(k>0){const pk=up.find(s=>s.id===ordered[k-1]);t=addMin(t,Math.round((pk?.pages||1)*60));}};start=t;}const dur=Math.round((up[si].pages||1)*60);up[si]={...up[si],startTime:start,endTime:addMin(start,dur)};cur=addMin(start,dur);});return up;});};
  const SC=({strip,dayId,index,total})=>(
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#12141a",borderLeft:`4px solid ${STRIP_COLORS[strip.type]}`,borderRadius:6,fontSize:12,border:"1px solid #1e2028",userSelect:"none"}}>
      <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
        {dayId&&index>0&&<button onClick={()=>moveS(strip.id,dayId,-1)} style={{background:"none",border:"none",color:"#666",cursor:"pointer",padding:0,fontSize:10,lineHeight:1}}>{"\u25B2"}</button>}
        {dayId&&index<total-1&&<button onClick={()=>moveS(strip.id,dayId,1)} style={{background:"none",border:"none",color:"#666",cursor:"pointer",padding:0,fontSize:10,lineHeight:1}}>{"\u25BC"}</button>}
      </div>
      <span style={{fontWeight:800,color:"#f0f0f0",minWidth:32}}>Sc.{strip.scene}</span>
      <span style={{color:STRIP_COLORS[strip.type],fontWeight:700,fontSize:10,minWidth:36,textAlign:"center",background:STRIP_COLORS[strip.type]+"18",borderRadius:3,padding:"2px 4px"}}>{strip.type}</span>
      <span style={{color:"#aaa",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{strip.synopsis}</span>
      {(strip.startTime||strip.endTime)&&<span style={{color:"#3b82f6",fontSize:10,fontWeight:600,flexShrink:0,background:"#3b82f618",padding:"2px 5px",borderRadius:3}}>{strip.startTime||"?"} – {strip.endTime||"?"}</span>}
      <span style={{color:"#666",fontSize:10,flexShrink:0}}>{gLoc(strip.locationId)}</span>
      <span style={{color:"#888",fontWeight:700,fontSize:11,minWidth:30,textAlign:"right"}}>{strip.pages}pg</span>
      <button onClick={e=>{e.stopPropagation();setSf({...strip});setEditStrip(strip);}} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:2}}><I.Edit/></button>
    </div>);
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Stripboard</h2><p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>{strips.length} scenes · {days.length} days</p></div><div style={{display:"flex",gap:8}}><button onClick={()=>{setSf({scene:String(strips.length+1),type:"D/INT",locationId:locations[0]?.id||"",cast:[],pages:1,synopsis:"",startTime:"",endTime:""});setEditStrip("new");}} style={BS}><span style={{display:"flex",alignItems:"center",gap:5}}><I.Plus/> Scene</span></button><button onClick={addDay} style={BP}><span style={{display:"flex",alignItems:"center",gap:5}}><I.Plus/> Day</span></button></div></div>
    <div style={{display:"flex",gap:16,marginBottom:16,padding:"8px 12px",background:"#1a1d23",borderRadius:8,border:"1px solid #2a2d35"}}>{Object.entries(STRIP_COLORS).map(([t,c])=><span key={t} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#aaa"}}><span style={{width:12,height:12,borderRadius:3,background:c}}/>{t}</span>)}</div>
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {days.map(day=>{const ds=day.strips.map(sid=>strips.find(s=>s.id===sid)).filter(Boolean);const tp=ds.reduce((s,x)=>s+x.pages,0);
      return<div key={day.id} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#1e2128",borderBottom:"1px solid #2a2d35"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontWeight:800,color:"#E8C94A",fontSize:14}}>{day.label}</span><span style={{fontSize:12,color:"#666"}}>{fmtDate(day.date)}</span><span style={{fontSize:11,color:"#888"}}>Call: {fmtTime(day.callTime)}</span></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={()=>estTimes(day.id)} style={{...BS,padding:"4px 10px",fontSize:10}}><I.Clock/> <span style={{marginLeft:3}}>Estimate Times</span></button>
            <span style={{fontSize:11,color:"#888"}}>{ds.length} sc · {tp.toFixed(1)} pg</span>
            <button onClick={()=>setDays(p=>p.filter(d=>d.id!==day.id))} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:2}}><I.Trash/></button>
          </div></div>
        <div style={{padding:8,display:"flex",flexDirection:"column",gap:4,minHeight:40}}>{ds.map((s,i)=><SC key={s.id} strip={s} dayId={day.id} index={i} total={ds.length}/>)}{ds.length===0&&<div style={{textAlign:"center",padding:12,color:"#444",fontSize:12,fontStyle:"italic"}}>No scenes</div>}</div>
      </div>;})}
      {unsch.length>0&&<div style={{background:"#16181e",border:"1px dashed #333",borderRadius:10}}><div style={{padding:"10px 14px",borderBottom:"1px solid #222"}}><span style={{fontWeight:700,color:"#888",fontSize:13}}>Unscheduled ({unsch.length})</span></div><div style={{padding:8,display:"flex",flexDirection:"column",gap:4}}>{unsch.map((s,i)=><SC key={s.id} strip={s} dayId={null} index={i} total={unsch.length}/>)}</div></div>}
    </div>
    {editStrip&&<Modal title={editStrip==="new"?"Add Scene":`Edit Sc.${sf.scene}`} onClose={()=>setEditStrip(null)}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={LS}>Scene #</label><input value={sf.scene} onChange={e=>setSf({...sf,scene:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Type</label><select value={sf.type} onChange={e=>setSf({...sf,type:e.target.value})} style={IS}>{Object.keys(STRIP_COLORS).map(t=><option key={t}>{t}</option>)}</select></div>
        <div><label style={LS}>Location</label><select value={sf.locationId||""} onChange={e=>setSf({...sf,locationId:e.target.value})} style={IS}><option value="">—</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
        <div><label style={LS}>Pages</label><input type="number" step="0.125" value={sf.pages} onChange={e=>setSf({...sf,pages:Number(e.target.value)})} style={IS}/></div>
        <div><label style={LS}>Start Time</label><input type="time" value={sf.startTime||""} onChange={e=>setSf({...sf,startTime:e.target.value})} style={IS}/></div>
        <div><label style={LS}>End Time</label><input type="time" value={sf.endTime||""} onChange={e=>setSf({...sf,endTime:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Synopsis</label><input value={sf.synopsis} onChange={e=>setSf({...sf,synopsis:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Cast</label><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{cast.map(c=><label key={c.id} style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:(sf.cast||[]).includes(c.id)?"#E8C94A":"#888",cursor:"pointer",background:(sf.cast||[]).includes(c.id)?"#E8C94A18":"#12141a",padding:"4px 8px",borderRadius:4,border:`1px solid ${(sf.cast||[]).includes(c.id)?"#E8C94A44":"#2a2d35"}`}}><input type="checkbox" checked={(sf.cast||[]).includes(c.id)} onChange={e=>{const cs=sf.cast||[];setSf({...sf,cast:e.target.checked?[...cs,c.id]:cs.filter(id=>id!==c.id)});}} style={{display:"none"}}/><span style={{fontWeight:700}}>{c.roleNum}</span> {c.name}</label>)}</div></div>
        {editStrip!=="new"&&<div style={{gridColumn:"1/-1"}}><label style={LS}>Move to Day</label><select value={days.find(d=>d.strips.includes(sf.id))?.id||""} onChange={e=>{const fD=days.find(d=>d.strips.includes(sf.id));const tI=e.target.value;setDays(p=>p.map(d=>{let s=[...d.strips];if(fD&&d.id===fD.id)s=s.filter(id=>id!==sf.id);if(d.id===tI&&!s.includes(sf.id))s.push(sf.id);return{...d,strips:s};}));}} style={IS}><option value="">Unscheduled</option>{days.map(d=><option key={d.id} value={d.id}>{d.label} — {fmtDate(d.date)}</option>)}</select></div>}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}><div>{editStrip!=="new"&&<button onClick={()=>{setStrips(p=>p.filter(s=>s.id!==sf.id));setDays(p=>p.map(d=>({...d,strips:d.strips.filter(id=>id!==sf.id)})));setEditStrip(null);}} style={BD}>Delete</button>}</div><div style={{display:"flex",gap:8}}><button onClick={()=>setEditStrip(null)} style={BS}>Cancel</button><button onClick={saveSt} style={BP}>Save</button></div></div>
    </Modal>}
  </div>;
};

// ═══════════════════════════════════════════════════════════════
// LOCATIONS
// ═══════════════════════════════════════════════════════════════
const LocationsModule = ({ locations, setLocations, strips }) => {
  const [search,setSearch]=useState("");const [fT,setFT]=useState("All");const [editM,setEditM]=useState(null);const [form,setForm]=useState({});
  const fl = locations.filter(l=>(fT==="All"||l.type===fT)&&(l.name+l.address).toLowerCase().includes(search.toLowerCase()));
  const save=()=>{if(editM==="new")setLocations(p=>[...p,{...form,id:"loc"+Date.now()}]);else setLocations(p=>p.map(l=>l.id===form.id?form:l));setEditM(null);};
  const sc=id=>strips.filter(s=>s.locationId===id).length;
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Locations</h2><p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>{locations.length} locations</p></div><button onClick={()=>{setForm({name:"",address:"",type:"Practical",contact:"",phone:"",notes:"",permit:false});setEditM("new");}} style={BP}><span style={{display:"flex",alignItems:"center",gap:6}}><I.Plus/> Add Location</span></button></div>
    <div style={{display:"flex",gap:10,marginBottom:16}}><div style={{position:"relative",flex:1}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#555"}}><I.Search/></span><input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{...IS,paddingLeft:34}}/></div><select value={fT} onChange={e=>setFT(e.target.value)} style={{...IS,width:160,cursor:"pointer"}}><option value="All">All Types</option>{LOCATION_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:10}}>
      {fl.map(loc=><div key={loc.id} onClick={()=>{setForm({...loc});setEditM(loc);}} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:16,cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontSize:14,fontWeight:700,color:"#f0f0f0"}}>{loc.name}</div><div style={{fontSize:12,color:"#888",marginTop:2}}>{loc.type}</div></div><div style={{display:"flex",gap:6}}>{loc.permit&&<span style={{fontSize:10,fontWeight:600,color:"#22c55e",background:"#22c55e18",padding:"2px 6px",borderRadius:3}}>PERMIT</span>}{sc(loc.id)>0&&<span style={{fontSize:10,fontWeight:600,color:"#E8C94A",background:"#E8C94A18",padding:"2px 6px",borderRadius:3}}>{sc(loc.id)} sc</span>}</div></div>
        <div style={{fontSize:12,color:"#aaa"}}><I.Map/> {loc.address}</div>
        {loc.contact&&<div style={{fontSize:11,color:"#666",marginTop:4}}>{loc.contact}{loc.phone&&` · ${loc.phone}`}</div>}
        {loc.notes&&<div style={{fontSize:11,color:"#555",marginTop:4,fontStyle:"italic"}}>{loc.notes}</div>}
      </div>)}
    </div>
    {editM&&<Modal title={editM==="new"?"Add Location":`Edit — ${form.name}`} onClose={()=>setEditM(null)}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Name</label><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Address</label><AddressInput value={form.address} onChange={v=>setForm({...form,address:v})}/></div>
        <div><label style={LS}>Type</label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={IS}>{LOCATION_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
        <div style={{display:"flex",alignItems:"flex-end",paddingBottom:2}}><label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#ccc",cursor:"pointer"}}><input type="checkbox" checked={form.permit||false} onChange={e=>setForm({...form,permit:e.target.checked})}/> Permit Secured</label></div>
        <div><label style={LS}>Contact</label><input value={form.contact||""} onChange={e=>setForm({...form,contact:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Phone</label><input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Notes</label><textarea value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} style={{...IS,resize:"vertical"}}/></div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}><div>{editM!=="new"&&<button onClick={()=>{setLocations(p=>p.filter(l=>l.id!==form.id));setEditM(null);}} style={BD}>Delete</button>}</div><div style={{display:"flex",gap:8}}><button onClick={()=>setEditM(null)} style={BS}>Cancel</button><button onClick={save} style={BP}>Save</button></div></div>
    </Modal>}
  </div>;
};

// ═══════════════════════════════════════════════════════════════
// TRANSPORT — Route Calc + Auto-Split + Dispatch
// ═══════════════════════════════════════════════════════════════
const TransportModule = ({ vehicles, setVehicles, routes, setRoutes, days, strips, crew, cast, locations }) => {
  const [selDay,setSelDay]=useState(days[0]?.id||"");const [viewMode,setViewMode]=useState("routes");
  const [editRoute,setEditRoute]=useState(null);const [editVeh,setEditVeh]=useState(null);
  const [rf,setRf]=useState({});const [vf,setVf]=useState({});
  const [calc,setCalc]=useState(null);const [calcErr,setCalcErr]=useState("");const [dispPrev,setDispPrev]=useState(null);
  const day=days.find(d=>d.id===selDay);const dayR=routes.filter(r=>r.dayId===selDay);
  const allP=[...cast.map(c=>({id:c.id,type:"cast",name:c.name,role:c.roleName||"",address:c.hotel||c.address})),...crew.filter(c=>c.status==="confirmed"&&c.dept!=="Driver").map(c=>({id:c.id,type:"crew",name:c.name,role:`${c.dept} — ${c.role}`,address:c.address}))];
  const gPN=s=>s.personType==="cast"?cast.find(c=>String(c.id)===String(s.personId))?.name||"—":crew.find(c=>c.id===s.personId)?.name||"—";
  const drivers=crew.filter(c=>c.dept==="Driver"&&c.status==="confirmed");

  const calcRoute = async (route) => {
    const pk=route.stops.filter(s=>s.type==="pickup");if(pk.length===0)return;
    const v=vehicles.find(x=>x.id===route.vehicleId);const vt=VEHICLE_TYPES.find(t=>t.id===v?.type);
    if(vt&&pk.length>vt.capacity){
      const keep=pk.slice(0,vt.capacity);const overflow=pk.slice(vt.capacity);const dest=route.stops.find(s=>s.type==="destination");
      setRoutes(prev=>prev.map(r=>r.id===route.id?{...r,stops:[...keep,dest],optimized:false}:r));
      const otherV=vehicles.find(x=>x.id!==route.vehicleId);
      setRoutes(prev=>[...prev,{id:"r"+Date.now(),vehicleId:otherV?.id||route.vehicleId,dayId:route.dayId,label:`${route.label} (overflow)`,stops:[...overflow,{...dest}],notes:`Auto-split: ${overflow.length} pickups exceeded ${vt.label} (${vt.capacity})`,status:"draft",optimized:false,demo:false,gmapsUrl:"",totalDrive:null,totalDistance:null,trafficSummary:""}]);
      setCalcErr(`Route split! ${keep.length} kept, ${overflow.length} moved to new route. Calculate both.`);return;
    }
    setCalc(route.id);setCalcErr("");
    try{
      const result=await callRouteOptimize(route,vehicles,crew,cast,day);
      if(result.error){setCalcErr(result.error);setCalc(null);return;}
      setRoutes(prev=>prev.map(r=>{
        if(r.id!==route.id)return r;
        const ns=result.schedule.stops.map(s=>{const o=r.stops.find(st=>st.type==="pickup"&&String(st.personId)===String(s.id));return{type:"pickup",personType:s.personType||o?.personType||"crew",personId:s.id,address:s.address,pickupTime:s.pickup_time,estDrive:s.drive_to_next_minutes,distance:s.distance_to_next||"",trafficNote:s.traffic_note||""};});
        const dest=r.stops.find(s=>s.type==="destination");ns.push({...dest,arrivalTime:result.schedule.arrival||dest.arrivalTime});
        return{...r,stops:ns,optimized:true,demo:!!result.demo,gmapsUrl:result.google_maps_url||"",totalDrive:result.total_drive_minutes,totalDistance:result.total_distance_miles,trafficSummary:result.traffic_summary||"",driverDepart:result.schedule.driver_depart};
      }));setCalc(null);
    }catch(err){setCalcErr(err.message);setCalc(null);}
  };

  const showDispatch=(route)=>{
    const v=vehicles.find(x=>x.id===route.vehicleId);const drv=crew.find(c=>c.id===v?.driverId);
    const pk=route.stops.filter(s=>s.type==="pickup");const dest=route.stops.find(s=>s.type==="destination");const dLoc=locations.find(l=>l.id===dest?.locationId);
    const msgs=pk.map(s=>({to:gPN(s),msg:`Hi ${gPN(s)}, pickup at ${fmtTime(s.pickupTime)} from ${s.address}. Call: ${fmtTime(dest?.arrivalTime)}. Be ready 5 min early.`}));
    const dMsg=drv?{to:drv.name+" (Driver)",msg:`Route: ${route.label}\nDepart: ${fmtTime(route.driverDepart||"?")}\n${pk.map(s=>`> ${fmtTime(s.pickupTime)} ${gPN(s)} — ${s.address}`).join("\n")}\n> ${fmtTime(dest?.arrivalTime)} ARRIVE ${dLoc?.name||dest?.address}\n\nMaps: ${route.gmapsUrl||"N/A"}`}:null;
    setDispPrev({route,msgs,dMsg});
  };

  const openNV=()=>{setVf({type:"van8",plate:"",label:"",driverId:null,color:"#3b82f6"});setEditVeh("new");};
  const saveV=()=>{if(editVeh==="new")setVehicles(p=>[...p,{...vf,id:"v"+Date.now()}]);else setVehicles(p=>p.map(v=>v.id===vf.id?vf:v));setEditVeh(null);};
  const openNR=()=>{setRf({vehicleId:vehicles[0]?.id||"",dayId:selDay,label:`Route — ${day?.label||""}`,stops:[{type:"destination",locationId:locations[0]?.id||"",address:locations[0]?.address||"",arrivalTime:day?.callTime||"06:00",estDrive:0}],notes:"",status:"draft"});setEditRoute("new");};
  const saveR=()=>{if(editRoute==="new")setRoutes(p=>[...p,{...rf,id:"r"+Date.now(),optimized:false,demo:false,gmapsUrl:"",totalDrive:null,totalDistance:null,trafficSummary:""}]);else setRoutes(p=>p.map(r=>r.id===rf.id?rf:r));setEditRoute(null);};
  const addSt=()=>{const s=[...rf.stops];const di=s.findIndex(x=>x.type==="destination");s.splice(di,0,{type:"pickup",personType:"cast",personId:"",address:"",pickupTime:"",estDrive:15,distance:"",trafficNote:""});setRf({...rf,stops:s});};
  const upSt=(i,f,v)=>{const s=rf.stops.map((x,j)=>j===i?{...x,[f]:v}:x);if(f==="personId"&&v){const st=s[i];const p=allP.find(x=>String(x.id)===String(v)&&x.type===st.personType);if(p)s[i].address=p.address||"";}setRf({...rf,stops:s});};

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Transport</h2><p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>{vehicles.length} vehicles · {drivers.length} drivers · {routes.length} routes</p></div>
      <div style={{display:"flex",gap:8}}>{viewMode==="routes"&&<button onClick={openNR} style={BP}><span style={{display:"flex",alignItems:"center",gap:5}}><I.Plus/> Route</span></button>}{viewMode==="fleet"&&<button onClick={openNV} style={BP}><span style={{display:"flex",alignItems:"center",gap:5}}><I.Plus/> Vehicle</span></button>}</div>
    </div>
    <div style={{display:"flex",gap:4,marginBottom:16}}>
      {[{id:"routes",l:"Routes"},{id:"fleet",l:`Fleet (${vehicles.length})`},{id:"drivers",l:`Drivers (${drivers.length})`}].map(t=><button key={t.id} onClick={()=>setViewMode(t.id)} style={{padding:"7px 16px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:viewMode===t.id?"#E8C94A18":"transparent",border:`1px solid ${viewMode===t.id?"#E8C94A44":"#2a2d35"}`,color:viewMode===t.id?"#E8C94A":"#888"}}>{t.l}</button>)}
    </div>
    {viewMode==="routes"&&<div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>{days.map(d=><button key={d.id} onClick={()=>setSelDay(d.id)} style={{padding:"6px 14px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:selDay===d.id?"#3b82f618":"transparent",border:`1px solid ${selDay===d.id?"#3b82f644":"#2a2d35"}`,color:selDay===d.id?"#3b82f6":"#888"}}>{d.label} · {fmtDate(d.date)}</button>)}</div>
      {calcErr&&<div style={{background:"#f59e0b18",border:"1px solid #f59e0b33",borderRadius:6,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#f59e0b"}}><I.AlertTriangle/> {calcErr}</div>}
      {dayR.length===0&&<div style={{textAlign:"center",padding:50,color:"#555"}}><div style={{fontSize:36,marginBottom:12}}>{"\u{1F690}"}</div><div style={{fontSize:14,marginBottom:8}}>No routes for {day?.label||"this day"}</div><button onClick={openNR} style={BP}>Create Route</button></div>}
      {dayR.map(route=>{const v=vehicles.find(x=>x.id===route.vehicleId);const vt=VEHICLE_TYPES.find(t=>t.id===v?.type);const drv=crew.find(c=>c.id===v?.driverId);const pk=route.stops.filter(s=>s.type==="pickup");const dest=route.stops.find(s=>s.type==="destination");const dLoc=locations.find(l=>l.id===dest?.locationId);
      return<div key={route.id} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,marginBottom:12,overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:"#1e2128",borderBottom:"1px solid #2a2d35"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{width:10,height:10,borderRadius:"50%",background:v?.color||"#555"}}/><span style={{fontWeight:700,color:"#f0f0f0",fontSize:14}}>{route.label}</span>{route.demo&&<span style={{fontSize:9,color:"#f59e0b",background:"#f59e0b18",padding:"2px 6px",borderRadius:3,fontWeight:700}}>DEMO</span>}<StatusBadge status={route.status}/></div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>calcRoute(route)} disabled={calc===route.id} style={{...BS,padding:"6px 12px",fontSize:11}}>{calc===route.id?<><I.Loader/> Calculating...</>:<><I.Route/> Calculate Route</>}</button>
            {route.optimized&&<button onClick={()=>showDispatch(route)} style={{...BS,padding:"6px 12px",fontSize:11,borderColor:"#3b82f633",color:"#3b82f6"}}><I.Send/> Dispatch</button>}
            <button onClick={()=>{setRf({...route,stops:route.stops.map(s=>({...s}))});setEditRoute(route);}} style={{...BS,padding:"6px 12px",fontSize:11}}><I.Edit/></button>
            <button onClick={()=>setRoutes(p=>p.filter(r=>r.id!==route.id))} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:4}}><I.Trash/></button>
          </div>
        </div>
        <div style={{padding:16}}>
          <div style={{display:"flex",gap:16,marginBottom:12,fontSize:12,color:"#888"}}>
            <span>{vt?.icon} {v?.label||"—"} ({vt?.capacity||"?"} seats)</span>
            <span>{"\u{1F468}\u200D\u2708\uFE0F"} {drv?.name||"No driver"}</span>
            {route.totalDrive&&<span>{"\u23F1"} {route.totalDrive} min</span>}
            {route.totalDistance&&<span>{"\u{1F4CF}"} {toKm(route.totalDistance)} km</span>}
            {route.trafficSummary&&<span>{route.trafficSummary}</span>}
          </div>
          {route.driverDepart&&<div style={{fontSize:11,color:"#666",marginBottom:8}}>Driver departs: {fmtTime(route.driverDepart)}</div>}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {pk.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"#12141a",borderRadius:6,border:"1px solid #1e2028"}}>
              <span style={{width:22,height:22,borderRadius:"50%",background:"#E8C94A18",color:"#E8C94A",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#f0f0f0"}}>{gPN(s)}<span style={{fontSize:10,color:"#666",marginLeft:6}}>{s.personType}</span></div><div style={{fontSize:11,color:"#888"}}>{s.address}</div></div>
              {s.pickupTime&&<span style={{fontSize:14,fontWeight:800,color:"#E8C94A",flexShrink:0}}>{fmtTime(s.pickupTime)}</span>}
              {s.distance&&<span style={{fontSize:10,color:"#666"}}>{toKm(s.distance)} km</span>}
              <TrafficBadge note={s.trafficNote}/>
            </div>)}
            {dest&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"#22c55e08",borderRadius:6,border:"1px solid #22c55e22"}}>
              <span style={{width:22,height:22,borderRadius:"50%",background:"#22c55e18",color:"#22c55e",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{"\u2713"}</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#22c55e"}}>ARRIVE — {dLoc?.name||dest.address}</div></div>
              <span style={{fontSize:14,fontWeight:800,color:"#22c55e"}}>{fmtTime(dest.arrivalTime)}</span>
            </div>}
          </div>
          {route.gmapsUrl&&<a href={route.gmapsUrl} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:10,fontSize:11,color:"#3b82f6",textDecoration:"none"}}>Open in Google Maps <I.ExternalLink/></a>}
        </div>
      </div>;})}
    </div>}
    {viewMode==="fleet"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
      {vehicles.map(v=>{const vt=VEHICLE_TYPES.find(t=>t.id===v.type);const drv=crew.find(c=>c.id===v.driverId);return<div key={v.id} onClick={()=>{setVf({...v});setEditVeh(v);}} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:16,cursor:"pointer",borderTop:`3px solid ${v.color}`}}>
        <div style={{fontSize:20,marginBottom:4}}>{vt?.icon}</div><div style={{fontSize:14,fontWeight:700,color:"#f0f0f0"}}>{v.label}</div>
        <div style={{fontSize:12,color:"#888",marginTop:2}}>{vt?.label} · {vt?.capacity} seats · {v.plate}</div>
        <div style={{fontSize:11,color:drv?"#22c55e":"#f59e0b",marginTop:6}}>{drv?`Driver: ${drv.name}`:"No driver assigned"}</div>
      </div>;})}
    </div>}
    {viewMode==="drivers"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
      {drivers.length===0&&<div style={{color:"#555",fontSize:13,padding:20}}>No drivers. Add crew with "Driver" department in People.</div>}
      {drivers.map(d=>{const assignedV=vehicles.filter(v=>v.driverId===d.id);return<div key={d.id} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:16,borderLeft:"3px solid #3b82f6"}}>
        <div style={{fontSize:14,fontWeight:700,color:"#f0f0f0"}}>{d.name}</div><div style={{fontSize:12,color:"#3b82f6",fontWeight:600}}>{d.role}</div>
        <div style={{fontSize:12,color:"#aaa",marginTop:4}}><I.Phone/> {d.phone}</div>
        {assignedV.length>0&&<div style={{marginTop:6,fontSize:11,color:"#888"}}>{assignedV.map(v=>v.label).join(", ")}</div>}
      </div>;})}
    </div>}
    {/* Edit Route Modal */}
    {editRoute&&<Modal title={editRoute==="new"?"Create Route":"Edit Route"} onClose={()=>setEditRoute(null)} width={640}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div><label style={LS}>Label</label><input value={rf.label||""} onChange={e=>setRf({...rf,label:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Vehicle</label><select value={rf.vehicleId} onChange={e=>setRf({...rf,vehicleId:e.target.value})} style={IS}>{vehicles.map(v=>{const vt=VEHICLE_TYPES.find(t=>t.id===v.type);return<option key={v.id} value={v.id}>{v.label} ({vt?.capacity} seats)</option>;})}</select></div>
      </div>
      <div style={{marginBottom:12}}><label style={LS}>Stops</label>
        {rf.stops?.map((s,i)=>s.type==="pickup"?<div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
          <select value={s.personType} onChange={e=>upSt(i,"personType",e.target.value)} style={{...IS,width:80}}><option value="cast">Cast</option><option value="crew">Crew</option></select>
          <select value={s.personId} onChange={e=>upSt(i,"personId",e.target.value)} style={{...IS,flex:1}}><option value="">— Select —</option>{allP.filter(p=>p.type===s.personType).map(p=><option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}</select>
          <input value={s.address||""} onChange={e=>upSt(i,"address",e.target.value)} placeholder="Address" style={{...IS,flex:1}}/>
          <button onClick={()=>setRf({...rf,stops:rf.stops.filter((_,j)=>j!==i)})} style={{background:"none",border:"none",color:"#555",cursor:"pointer"}}><I.Trash/></button>
        </div>:
        <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6,padding:8,background:"#22c55e08",borderRadius:6}}>
          <span style={{fontSize:11,fontWeight:700,color:"#22c55e",width:80}}>DEST</span>
          <select value={s.locationId||""} onChange={e=>{const loc=locations.find(l=>l.id===e.target.value);const newStops=rf.stops.map((x,j)=>j===i?{...x,locationId:e.target.value,address:loc?.address||x.address}:x);setRf({...rf,stops:newStops});}} style={{...IS,flex:1}}><option value="">—</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>
          <input type="time" value={s.arrivalTime||""} onChange={e=>upSt(i,"arrivalTime",e.target.value)} style={{...IS,width:120}}/>
        </div>)}
        <button onClick={addSt} style={{...BS,width:"100%",marginTop:4}}><I.Plus/> Add Pickup Stop</button>
      </div>
      <div><label style={LS}>Notes</label><textarea value={rf.notes||""} onChange={e=>setRf({...rf,notes:e.target.value})} rows={2} style={{...IS,resize:"vertical"}}/></div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}><div>{editRoute!=="new"&&<button onClick={()=>{setRoutes(p=>p.filter(r=>r.id!==rf.id));setEditRoute(null);}} style={BD}>Delete</button>}</div><div style={{display:"flex",gap:8}}><button onClick={()=>setEditRoute(null)} style={BS}>Cancel</button><button onClick={saveR} style={BP}>Save</button></div></div>
    </Modal>}
    {/* Vehicle Modal */}
    {editVeh&&<Modal title={editVeh==="new"?"Add Vehicle":"Edit Vehicle"} onClose={()=>setEditVeh(null)}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={LS}>Label</label><input value={vf.label||""} onChange={e=>setVf({...vf,label:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Type</label><select value={vf.type} onChange={e=>setVf({...vf,type:e.target.value})} style={IS}>{VEHICLE_TYPES.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label} ({t.capacity})</option>)}</select></div>
        <div><label style={LS}>Plate</label><input value={vf.plate||""} onChange={e=>setVf({...vf,plate:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Driver</label><select value={vf.driverId||""} onChange={e=>setVf({...vf,driverId:e.target.value||null})} style={IS}><option value="">None</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
        <div><label style={LS}>Color</label><input type="color" value={vf.color||"#3b82f6"} onChange={e=>setVf({...vf,color:e.target.value})} style={{...IS,height:38,padding:2}}/></div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}><div>{editVeh!=="new"&&<button onClick={()=>{setVehicles(p=>p.filter(v=>v.id!==vf.id));setEditVeh(null);}} style={BD}>Delete</button>}</div><div style={{display:"flex",gap:8}}><button onClick={()=>setEditVeh(null)} style={BS}>Cancel</button><button onClick={saveV} style={BP}>Save</button></div></div>
    </Modal>}
    {/* Dispatch Preview Modal */}
    {dispPrev&&<Modal title="Dispatch Preview (Test Mode)" onClose={()=>setDispPrev(null)} width={600}>
      <div style={{padding:10,background:"#f59e0b18",border:"1px solid #f59e0b33",borderRadius:6,marginBottom:16,fontSize:12,color:"#f59e0b"}}><I.AlertTriangle/> TEST MODE — No messages will be sent. This shows what would be dispatched.</div>
      <h4 style={{margin:"0 0 10px",fontSize:13,fontWeight:700,color:"#f0f0f0"}}>Traveller Messages</h4>
      {dispPrev.msgs.map((m,i)=><div key={i} style={{background:"#12141a",border:"1px solid #2a2d35",borderRadius:6,padding:12,marginBottom:8}}>
        <div style={{fontSize:11,fontWeight:700,color:"#E8C94A",marginBottom:4}}>To: {m.to}</div>
        <div style={{fontSize:12,color:"#ddd",whiteSpace:"pre-wrap"}}>{m.msg}</div>
      </div>)}
      {dispPrev.dMsg&&<><h4 style={{margin:"16px 0 10px",fontSize:13,fontWeight:700,color:"#f0f0f0"}}>Driver Message</h4>
        <div style={{background:"#12141a",border:"1px solid #3b82f633",borderRadius:6,padding:12}}>
          <div style={{fontSize:11,fontWeight:700,color:"#3b82f6",marginBottom:4}}>To: {dispPrev.dMsg.to}</div>
          <div style={{fontSize:12,color:"#ddd",whiteSpace:"pre-wrap",fontFamily:"monospace"}}>{dispPrev.dMsg.msg}</div>
        </div></>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20}}><button onClick={()=>{setRoutes(p=>p.map(r=>r.id===dispPrev.route.id?{...r,status:"dispatched"}:r));setDispPrev(null);}} style={{...BP,background:"#3b82f6",color:"#fff"}}><I.Send/> Mark as Dispatched</button><button onClick={()=>setDispPrev(null)} style={BS}>Close</button></div>
    </Modal>}
  </div>;
};

// ═══════════════════════════════════════════════════════════════
// CALL SHEET — EU format
// ═══════════════════════════════════════════════════════════════
const CallSheetModule = ({ project }) => {
  const { days, strips, crew, cast, vehicles, routes, locations } = project;
  const [selDay, setSelDay] = useState(days[0]?.id || "");
  const day = days.find(d => d.id === selDay);
  const dayStrips = day ? day.strips.map(sid => strips.find(s => s.id === sid)).filter(Boolean) : [];
  const dayCast = [...new Set(dayStrips.flatMap(s => s.cast))].map(id => cast.find(c => c.id === id)).filter(Boolean);
  const dayRoutes = routes.filter(r => r.dayId === selDay);
  const gLoc = id => locations.find(l => l.id === id);
  return <div>
    <div style={{marginBottom:20}}><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Call Sheet</h2></div>
    <div style={{display:"flex",gap:8,marginBottom:16}}>{days.map(d=><button key={d.id} onClick={()=>setSelDay(d.id)} style={{padding:"6px 14px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:selDay===d.id?"#E8C94A18":"transparent",border:`1px solid ${selDay===d.id?"#E8C94A44":"#2a2d35"}`,color:selDay===d.id?"#E8C94A":"#888"}}>{d.label}</button>)}</div>
    {day&&<div style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,overflow:"hidden"}}>
      <div style={{padding:20,borderBottom:"1px solid #2a2d35",background:"#1e2128"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div><div style={{fontSize:20,fontWeight:800,color:"#E8C94A"}}>{project.name}</div><div style={{fontSize:13,color:"#888"}}>{project.production}</div>
            {project.keyRoles&&<div style={{fontSize:11,color:"#666",marginTop:4}}>{KEY_ROLES.filter(r=>project.keyRoles[r]).map(r=>`${r}: ${project.keyRoles[r]}`).join(" · ")}</div>}
          </div>
          <div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:800,color:"#f0f0f0"}}>{day.label}</div><div style={{fontSize:13,color:"#888"}}>{fmtDate(day.date)}</div><div style={{fontSize:16,fontWeight:800,color:"#E8C94A",marginTop:4}}>CALL: {fmtTime(day.callTime)}</div></div>
        </div>
      </div>
      <div style={{padding:20}}>
        <h4 style={{margin:"0 0 10px",fontSize:13,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Scenes</h4>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:24}}>
          <thead><tr style={{borderBottom:"1px solid #333"}}>{["Sc","Type","Location","Cast","Pages","Time","Synopsis"].map(h=><th key={h} style={{padding:"6px 8px",textAlign:"left",color:"#666",fontWeight:700,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
          <tbody>{dayStrips.map(s=>{const loc=gLoc(s.locationId);return<tr key={s.id} style={{borderBottom:"1px solid #222"}}><td style={{padding:"6px 8px",fontWeight:700,color:"#f0f0f0"}}>{s.scene}</td><td><span style={{color:STRIP_COLORS[s.type],fontWeight:700,fontSize:10}}>{s.type}</span></td><td style={{color:"#aaa"}}>{loc?.name||"—"}</td><td style={{color:"#aaa"}}>{s.cast.map(id=>{const c=cast.find(x=>x.id===id);return c?c.roleNum:id;}).join(", ")}</td><td style={{color:"#888"}}>{s.pages}</td><td style={{color:"#3b82f6",fontSize:11}}>{s.startTime&&s.endTime?`${s.startTime}–${s.endTime}`:"—"}</td><td style={{color:"#666"}}>{s.synopsis}</td></tr>;})}</tbody>
        </table>
        <h4 style={{margin:"0 0 10px",fontSize:13,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Cast</h4>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:24}}>
          <thead><tr style={{borderBottom:"1px solid #333"}}>{["#","Name","Role","Pickup","Hotel","Dietary"].map(h=><th key={h} style={{padding:"6px 8px",textAlign:"left",color:"#666",fontWeight:700,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
          <tbody>{dayCast.map(c=>{const pickup=dayRoutes.flatMap(r=>r.stops).find(s=>s.type==="pickup"&&s.personType==="cast"&&String(s.personId)===String(c.id));return<tr key={c.id} style={{borderBottom:"1px solid #222"}}><td style={{padding:"6px 8px",fontWeight:800,color:"#E8C94A"}}>{c.roleNum}</td><td style={{color:"#f0f0f0",fontWeight:600}}>{c.name}</td><td style={{color:"#aaa"}}>{c.roleName}</td><td style={{color:"#E8C94A",fontWeight:600}}>{pickup?fmtTime(pickup.pickupTime):"—"}</td><td style={{color:"#888",fontSize:11}}>{c.hotel||"—"}</td><td style={{color:"#f59e0b",fontSize:11}}>{c.dietary||"—"}</td></tr>;})}</tbody>
        </table>
        {dayRoutes.length>0&&<><h4 style={{margin:"0 0 10px",fontSize:13,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Transport</h4>
          {dayRoutes.map(r=>{const v=vehicles.find(x=>x.id===r.vehicleId);const vt=VEHICLE_TYPES.find(t=>t.id===v?.type);const drv=crew.find(c=>c.id===v?.driverId);const pk=r.stops.filter(s=>s.type==="pickup");
          return<div key={r.id} style={{background:"#12141a",borderRadius:6,padding:12,marginBottom:8,border:"1px solid #1e2028"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontWeight:700,color:"#f0f0f0",fontSize:13}}>{r.label}</span><span style={{fontSize:11,color:"#888"}}>{vt?.icon} {v?.label} · {drv?.name||"No driver"}</span></div>
            {pk.map((s,i)=><div key={i} style={{fontSize:12,color:"#aaa",padding:"2px 0"}}><span style={{color:"#E8C94A",fontWeight:700,marginRight:8}}>{fmtTime(s.pickupTime)}</span>{s.personType==="cast"?cast.find(c=>String(c.id)===String(s.personId))?.name:crew.find(c=>c.id===s.personId)?.name} — {s.address}</div>)}
          </div>;})}
        </>}
      </div>
    </div>}
  </div>;
};

// ═══════════════════════════════════════════════════════════════
// PROJECT SETUP — key roles, shooting days, multi-project
// ═══════════════════════════════════════════════════════════════
const ProjectSetup = ({ projects, setProjects, activeId, setActiveId }) => {
  const [editModal,setEditModal]=useState(null);const [form,setForm]=useState({});
  const active=projects.find(p=>p.id===activeId);
  const openEdit=(p)=>{setForm({id:p.id,name:p.name,production:p.production,shootingDays:p.shootingDays||20,keyRoles:{...(p.keyRoles||{})}});setEditModal("edit");};
  const openNew=()=>{setForm({name:"New Production",production:"",shootingDays:20,keyRoles:{}});setEditModal("new");};
  const save=()=>{
    if(editModal==="new"){const np=defaultProject();np.name=form.name;np.production=form.production;np.shootingDays=form.shootingDays;np.keyRoles=form.keyRoles;np.crew=[];np.cast=[];np.strips=[];np.days=[];np.vehicles=[];np.routes=[];np.locations=[];setProjects(p=>[...p,np]);setActiveId(np.id);}
    else{setProjects(p=>p.map(pr=>pr.id===form.id?{...pr,name:form.name,production:form.production,shootingDays:form.shootingDays,keyRoles:form.keyRoles}:pr));}
    setEditModal(null);
  };
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Project Setup</h2>
      <button onClick={openNew} style={BP}><span style={{display:"flex",alignItems:"center",gap:5}}><I.Plus/> New Project</span></button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
      {projects.map(p=><div key={p.id} style={{background:"#1a1d23",border:`1px solid ${p.id===activeId?"#E8C94A55":"#2a2d35"}`,borderRadius:10,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <div><div style={{fontSize:16,fontWeight:800,color:p.id===activeId?"#E8C94A":"#f0f0f0"}}>{p.name}{p.id===activeId&&<span style={{fontSize:10,marginLeft:8,color:"#22c55e"}}>ACTIVE</span>}</div><div style={{fontSize:12,color:"#888"}}>{p.production}</div></div>
        </div>
        <div style={{fontSize:11,color:"#666",marginBottom:8}}>{p.crew?.length||0} crew · {p.cast?.length||0} cast · {p.days?.length||0}/{p.shootingDays||"?"} days · {p.strips?.length||0} scenes</div>
        {p.keyRoles&&<div style={{fontSize:10,color:"#555",marginBottom:10}}>{KEY_ROLES.filter(r=>p.keyRoles[r]).map(r=>`${r}: ${p.keyRoles[r]}`).join(" · ")}</div>}
        <div style={{display:"flex",gap:6}}>
          {p.id!==activeId&&<button onClick={()=>setActiveId(p.id)} style={{...BP,padding:"6px 12px",fontSize:11}}>Activate</button>}
          <button onClick={()=>openEdit(p)} style={{...BS,padding:"6px 12px",fontSize:11}}><I.Edit/> Edit</button>
          {projects.length>1&&<button onClick={()=>{if(p.id===activeId){const other=projects.find(x=>x.id!==p.id);if(other)setActiveId(other.id);}setProjects(pr=>pr.filter(x=>x.id!==p.id));}} style={{...BD,padding:"6px 12px",fontSize:11}}><I.Trash/></button>}
        </div>
      </div>)}
    </div>
    {editModal&&<Modal title={editModal==="new"?"New Project":"Edit Project"} onClose={()=>setEditModal(null)}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={LS}>Production Name</label><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Production Company</label><input value={form.production||""} onChange={e=>setForm({...form,production:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Shooting Days (Total)</label><input type="number" value={form.shootingDays||20} onChange={e=>setForm({...form,shootingDays:Number(e.target.value)})} style={IS}/></div>
      </div>
      <h4 style={{margin:"20px 0 10px",fontSize:13,fontWeight:700,color:"#f0f0f0"}}>Key Roles</h4>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {KEY_ROLES.map(r=><div key={r}><label style={LS}>{r}</label><input value={form.keyRoles?.[r]||""} onChange={e=>setForm({...form,keyRoles:{...form.keyRoles,[r]:e.target.value}})} style={IS} placeholder={`Enter ${r} name`}/></div>)}
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20}}><button onClick={()=>setEditModal(null)} style={BS}>Cancel</button><button onClick={save} style={BP}>Save</button></div>
    </Modal>}
  </div>;
};

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [projects, setProjects] = useState(() => {
    try { const s = localStorage.getItem("pk_projects_v5"); if (s) return JSON.parse(s); } catch (e) {}
    return [defaultProject()];
  });
  const [activeProjectId, setActiveProjectId] = useState(() => {
    try { const s = localStorage.getItem("pk_active_v5"); if (s) return JSON.parse(s); } catch (e) {}
    return projects[0]?.id;
  });
  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projSwitcher, setProjSwitcher] = useState(false);

  useEffect(() => { try { localStorage.setItem("pk_projects_v5", JSON.stringify(projects)); } catch (e) {} }, [projects]);
  useEffect(() => { try { localStorage.setItem("pk_active_v5", JSON.stringify(activeProjectId)); } catch (e) {} }, [activeProjectId]);

  const project = projects.find(p => p.id === activeProjectId) || projects[0];
  const up = (field, value) => setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, [field]: typeof value === "function" ? value(p[field]) : value } : p));

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: I.Dashboard },
    { id: "people", label: "People", icon: I.People },
    { id: "stripboard", label: "Stripboard", icon: I.Strip },
    { id: "locations", label: "Locations", icon: I.Location },
    { id: "transport", label: "Transport", icon: I.Transport },
    { id: "callsheet", label: "Call Sheet", icon: I.CallSheet },
    { id: "project", label: "Project", icon: I.Settings },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0e1015", color: "#e0e0e0", fontFamily: "'Inter',system-ui,sans-serif", overflow: "hidden" }}>
      <style>{spinKF}</style>
      {/* SIDEBAR */}
      <div style={{ width: sidebarOpen ? 220 : 60, background: "#12141a", borderRight: "1px solid #1e2028", display: "flex", flexDirection: "column", transition: "width 0.2s", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: sidebarOpen ? "16px" : "16px 8px", borderBottom: "1px solid #1e2028", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <I.Film />{sidebarOpen && <span style={{ fontSize: 16, fontWeight: 800, color: "#E8C94A", whiteSpace: "nowrap" }}>ProduceKit</span>}
        </div>
        {sidebarOpen && <div style={{ padding: "8px 12px", borderBottom: "1px solid #1e2028" }}>
          <div onClick={() => setProjSwitcher(!projSwitcher)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: "#1a1d23", borderRadius: 6, cursor: "pointer", border: "1px solid #2a2d35" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#f0f0f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name}</span><I.ChevDown />
          </div>
          {projSwitcher && <div style={{ marginTop: 4, background: "#1a1d23", border: "1px solid #2a2d35", borderRadius: 6, overflow: "hidden" }}>
            {projects.map(p => <div key={p.id} onClick={() => { setActiveProjectId(p.id); setProjSwitcher(false); }} style={{ padding: "8px 10px", fontSize: 12, color: p.id === activeProjectId ? "#E8C94A" : "#aaa", cursor: "pointer", background: p.id === activeProjectId ? "#E8C94A10" : "transparent", fontWeight: p.id === activeProjectId ? 700 : 400 }}>{p.name}</div>)}
          </div>}
        </div>}
        <nav style={{ flex: 1, padding: "8px 0" }}>
          {NAV.map(n => {
            const Icon = n.icon;
            const active = tab === n.id;
            return <button key={n.id} onClick={() => setTab(n.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: sidebarOpen ? "10px 16px" : "10px 0", background: active ? "#E8C94A12" : "transparent", border: "none", borderRight: active ? "3px solid #E8C94A" : "3px solid transparent", color: active ? "#E8C94A" : "#888", cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: "inherit", justifyContent: sidebarOpen ? "flex-start" : "center" }}><Icon />{sidebarOpen && n.label}</button>;
          })}
        </nav>
        {sidebarOpen && <div style={{ padding: 12, borderTop: "1px solid #1e2028", fontSize: 10, color: "#444" }}>ProduceKit v0.5 · CET</div>}
      </div>
      {/* MAIN */}
      <main style={{ flex: 1, overflow: "auto", padding: 28 }}>
        {tab === "dashboard" && <DashboardModule project={project} setTab={setTab} />}
        {tab === "people" && <PeopleModule crew={project.crew} setCrew={v => up("crew", v)} cast={project.cast} setCast={v => up("cast", v)} />}
        {tab === "stripboard" && <StripboardModule strips={project.strips} setStrips={v => up("strips", v)} days={project.days} setDays={v => up("days", v)} locations={project.locations} cast={project.cast} />}
        {tab === "locations" && <LocationsModule locations={project.locations} setLocations={v => up("locations", v)} strips={project.strips} />}
        {tab === "transport" && <TransportModule vehicles={project.vehicles} setVehicles={v => up("vehicles", v)} routes={project.routes} setRoutes={v => up("routes", v)} days={project.days} strips={project.strips} crew={project.crew} cast={project.cast} locations={project.locations} />}
        {tab === "callsheet" && <CallSheetModule project={project} />}
        {tab === "project" && <ProjectSetup projects={projects} setProjects={setProjects} activeId={activeProjectId} setActiveId={setActiveProjectId} />}
      </main>
    </div>
  );
}
