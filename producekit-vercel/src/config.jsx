import { useState, useRef, useEffect } from "react";

// ─── THEME ──────────────────────────────────────────────────
export const T = {
  bg:"#0c0e12", bgPanel:"#13161c", bgCard:"#181b22", bgInput:"#0f1117",
  bgHover:"#1c1f28", bgModal:"#171a21",
  border:"#1f222b", borderLight:"#282c37", borderFocus:"#3a3f4d",
  text:"#e2e4e9", textMuted:"#8b8f9a", textDim:"#5a5e6a", textHeading:"#f0f1f4",
  accent:"#d4a843", accentSoft:"#d4a84318", accentBorder:"#d4a84340",
  green:"#34d399", blue:"#60a5fa", red:"#f87171", orange:"#fbbf24", purple:"#a78bfa",
  fontBody:"'Manrope',system-ui,-apple-system,sans-serif",
  fontMono:"'Roboto Mono',monospace",
  r4:4, r6:6, r8:8, r10:10, r12:12,
  shadow:"0 2px 8px rgba(0,0,0,0.3)", shadowLg:"0 12px 40px rgba(0,0,0,0.5)",
};

// ─── CONSTANTS ───────────────────────────────────────────────
export const DEPARTMENTS = ["Directing","Production","Camera","Sound","Grip","Electric","Art","Wardrobe","Hair/Makeup","Stunts","VFX","Transport","Driver","Catering"];
export const STRIP_COLORS = { "D/INT":"#d4a843","D/EXT":"#d49a3a","N/INT":"#60a5fa","N/EXT":"#a78bfa" };
export const VEHICLE_TYPES = [
  { id:"van15",label:"15-Seat Van",capacity:15,icon:"🚐" },{ id:"van8",label:"8-Seat Minivan",capacity:8,icon:"🚐" },
  { id:"car",label:"Sedan",capacity:4,icon:"🚗" },{ id:"suv",label:"SUV",capacity:6,icon:"🚙" },
  { id:"truck",label:"Truck / Grip",capacity:2,icon:"🚛" },{ id:"motorhome",label:"Cast Motorhome",capacity:2,icon:"🏠" },
];
export const LOCATION_TYPES = ["Set/Stage","Exterior","Interior","Practical","Basecamp","Office","Other"];
export const KEY_ROLES = ["Director","Producer","Exec Producer","Line Producer","UPM","DOP","1st AD","Sound"];

// ─── FORMAT HELPERS ─────────────────────────────────────────
export const fmtTime = t => t || "—";
export const fmtDate = d => { if (!d) return "—"; const [y,m,dd] = d.split("-"); return `${dd}.${m}.${y}`; };
export const toKm = mi => (parseFloat(mi) * 1.60934).toFixed(1);
export const subMin = (time,mins) => {if(!time)return"";const[h,m]=time.split(":").map(Number);const t=h*60+m-mins;const nh=Math.floor(((t%1440)+1440)%1440/60);const nm=((t%1440)+1440)%1440%60;return`${String(nh).padStart(2,"0")}:${String(nm).padStart(2,"0")}`;};
export const addMin = (time,mins) => {if(!time)return"";const[h,m]=time.split(":").map(Number);const t=h*60+m+mins;const nh=Math.floor(((t%1440)+1440)%1440/60);const nm=((t%1440)+1440)%1440%60;return`${String(nh).padStart(2,"0")}:${String(nm).padStart(2,"0")}`;};

// ─── ICONS ──────────────────────────────────────────────────
export const I = {
  Dashboard: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  People: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Strip: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
  CallSheet: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Transport: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  Location: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Settings: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Phone: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  X: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Film: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>,
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
  Calendar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  ChevLeft: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevRight: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  Scenes: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 8V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4"/><polyline points="10 9 15 12 10 15"/></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  ArrowRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  ArrowLeft: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Filter: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
};

// ─── SHARED UI ──────────────────────────────────────────────
export const StatusBadge = ({ status }) => {
  const c = { confirmed:T.green,available:T.blue,imported:T.purple,hold:T.orange,unavailable:T.red,draft:T.textMuted,dispatched:T.blue };
  const col = c[status]||T.textMuted;
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",color:col,background:col+"15",padding:"2px 8px",borderRadius:T.r4}}><span style={{width:5,height:5,borderRadius:"50%",background:col}}/>{status}</span>;
};
export const TrafficBadge = ({ note }) => { if(!note)return null; const c={"Clear roads":T.green,"Light traffic":T.green,"Moderate traffic":T.orange,"Heavy traffic":T.red}; const col=c[note]||T.textMuted; return <span style={{fontSize:10,fontWeight:600,color:col,background:col+"12",padding:"2px 6px",borderRadius:T.r4}}>{note}</span>; };
export const Modal = ({ title, onClose, children, width = 560 }) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(6px)"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.bgModal,border:`1px solid ${T.border}`,borderRadius:T.r12,width,maxWidth:"95vw",maxHeight:"85vh",overflow:"auto",boxShadow:T.shadowLg}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${T.border}`,position:"sticky",top:0,background:T.bgModal,zIndex:1}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700,color:T.textHeading,letterSpacing:"-0.01em"}}>{title}</h3>
        <button onClick={onClose} style={{background:"none",border:"none",color:T.textDim,cursor:"pointer",padding:4}}><I.X/></button>
      </div>
      <div style={{padding:20}}>{children}</div>
    </div>
  </div>
);

export const IS = {width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:T.r6,padding:"8px 12px",color:T.text,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:T.fontBody};
export const LS = {display:"block",fontSize:10,fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4};
export const BP = {background:T.accent,color:"#0c0e12",border:"none",borderRadius:T.r6,padding:"8px 20px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:T.fontBody};
export const BS = {background:T.bgCard,color:T.textMuted,border:`1px solid ${T.borderLight}`,borderRadius:T.r6,padding:"8px 16px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:T.fontBody};
export const BD = {...BS,color:T.red,borderColor:T.red+"33"};
export const spinKF = `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`;

// ─── ADDRESS AUTOCOMPLETE ────────────────────────────────────
let _mapsLoaded = false; let _mapsLoading = false; let _mapsCallbacks = [];
function loadGoogleMaps(cb) {
  if (_mapsLoaded && window.google?.maps?.places) { cb(); return; }
  _mapsCallbacks.push(cb);
  if (_mapsLoading) return; _mapsLoading = true;
  fetch("/api/maps-key").then(r=>r.json()).then(d=>{
    if(!d.key){_mapsLoading=false;return;}
    const s=document.createElement("script");s.src=`https://maps.googleapis.com/maps/api/js?key=${d.key}&libraries=places`;
    s.onload=()=>{_mapsLoaded=true;_mapsLoading=false;_mapsCallbacks.forEach(fn=>fn());_mapsCallbacks=[];};
    s.onerror=()=>{_mapsLoading=false;};document.head.appendChild(s);
  }).catch(()=>{_mapsLoading=false;});
}
export const AddressInput = ({ value, onChange, placeholder, style: extraStyle }) => {
  const inputRef = useRef(null); const acRef = useRef(null); const [ready,setReady] = useState(_mapsLoaded);
  useEffect(() => { if (!ready) loadGoogleMaps(() => setReady(true)); }, []);
  useEffect(() => {
    if (!ready || !inputRef.current || acRef.current) return;
    try { const ac = new window.google.maps.places.Autocomplete(inputRef.current, { types:["address"], fields:["formatted_address"] });
      ac.addListener("place_changed", () => { const place = ac.getPlace(); if (place?.formatted_address) onChange(place.formatted_address); });
      acRef.current = ac;
    } catch (e) {}
    return () => { if (acRef.current) { window.google.maps.event.clearInstanceListeners(acRef.current); acRef.current = null; } };
  }, [ready]);
  return <input ref={inputRef} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder||"Start typing address..."} style={{...IS,...extraStyle}} />;
};

// ─── API HELPER ──────────────────────────────────────────────
export async function callRouteOptimize(route, vehicles, crew, cast, day) {
  const vehicle = vehicles.find(v => v.id === route.vehicleId);
  const driver = crew.find(c => c.id === vehicle?.driverId);
  const driverStart = driver?.address || "Prague, CZ";
  const dest = route.stops.find(s => s.type === "destination");
  const pickups = route.stops.filter(s => s.type === "pickup").map(s => {
    const name = s.personType === "cast" ? cast.find(c => String(c.id) === String(s.personId))?.name || "?" : crew.find(c => c.id === s.personId)?.name || "?";
    return { id: String(s.personId), name, address: s.address, personType: s.personType };
  });
  try {
    const resp = await fetch("/api/route-optimize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ driver_start: driverStart, destination: dest?.address || "", pickups, call_time: dest?.arrivalTime || day?.callTime || "06:00", call_date: day?.date, buffer_minutes: 5, stop_duration: 2, traffic: true }) });
    if (resp.ok) { const data = await resp.json(); if (!data.error) return data; }
  } catch (e) {}
  await new Promise(r => setTimeout(r, 1200));
  const fd = pickups.map(() => 8 + Math.floor(Math.random() * 20));
  const fdi = pickups.map(() => (2 + Math.random() * 12).toFixed(1));
  const tn = ["Clear roads","Light traffic","Moderate traffic","Light traffic"];
  const [ch, cm] = (dest?.arrivalTime || day?.callTime || "06:00").split(":").map(Number);
  let cur = ch * 60 + cm - 5; const sched = [];
  for (let i = pickups.length - 1; i >= 0; i--) { cur -= fd[i]; if (i < pickups.length - 1) cur -= 2; const hh = Math.floor(((cur%1440)+1440)%1440/60); const mm = ((cur%1440)+1440)%1440%60; sched.unshift({ ...pickups[i], pickup_time: `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`, drive_to_next_minutes: fd[i], distance_to_next: `${fdi[i]} mi`, traffic_note: tn[i%tn.length] }); }
  cur -= (5 + Math.floor(Math.random() * 10));
  const dh = Math.floor(((cur%1440)+1440)%1440/60); const dm = ((cur%1440)+1440)%1440%60;
  const td = fd.reduce((a,b) => a+b, 0) + 5 + Math.floor(Math.random()*10);
  const tdi = fdi.reduce((a,b) => a+parseFloat(b), 0).toFixed(1);
  const tDel = Math.floor(Math.random()*12);
  return { demo:true, schedule:{ driver_depart:`${String(dh).padStart(2,"0")}:${String(dm).padStart(2,"0")}`, stops:sched, arrival:subMin(dest?.arrivalTime||"06:00",5), call_time:dest?.arrivalTime||day?.callTime||"06:00" }, total_drive_minutes:td, total_distance_miles:tdi, traffic_summary:tDel<=2?"Roads clear.":tDel<=8?`Light traffic. +${tDel} min.`:`Moderate traffic. +${tDel} min.`, traffic_delay_minutes:tDel, google_maps_url:`https://www.google.com/maps/dir/${encodeURIComponent(driverStart)}/${pickups.map(p=>encodeURIComponent(p.address)).join("/")}/${encodeURIComponent(dest?.address||"")}` };
}
