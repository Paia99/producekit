import { useState, useRef, useEffect } from "react";
import { VEHICLE_TYPES, fmtTime, fmtDate, toKm, addMin, I, StatusBadge, Modal, IS, LS, BP, BS, BD, callRouteOptimize, AddressInput } from "./config.jsx";

const JOB_TYPES = [
  { id:"am_pickup", label:"AM Pickup", icon:"🌅", color:"#E8C94A" },
  { id:"pm_pickup", label:"PM Pickup", icon:"☀️", color:"#f59e0b" },
  { id:"wrap_return", label:"Wrap Return", icon:"🌙", color:"#a855f7" },
  { id:"set_move", label:"Set Move", icon:"🔄", color:"#3b82f6" },
  { id:"errand", label:"Errand", icon:"📦", color:"#22c55e" },
  { id:"custom", label:"Custom", icon:"🚐", color:"#888" },
];

/* ── TimeInput — local state + blur sync + up/down controls ── */
const TimeInput = ({ value, onChange, placeholder, label }) => {
  const [local, setLocal] = useState(value || "");
  const cbRef = useRef(onChange);
  const localRef = useRef(local);
  cbRef.current = onChange;
  localRef.current = local;
  useEffect(() => { setLocal(value || ""); }, [value]);
  const commit = (v) => { const val = v !== undefined ? v : localRef.current; if (val !== (value||"")) cbRef.current(val); };
  const nudge = (mins) => {
    const t = localRef.current || placeholder || "06:00";
    const [h,m] = t.split(":").map(Number);
    if (isNaN(h)||isNaN(m)) return;
    const total = ((h*60+m+mins)%1440+1440)%1440;
    const nv = `${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;
    setLocal(nv);
    cbRef.current(nv);
  };
  return <div style={{display:"flex",alignItems:"center",gap:0}}>
    {label&&<span style={{fontSize:9,fontWeight:700,color:"#666",marginRight:6,textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>}
    <button onClick={()=>nudge(-15)} style={{background:"#1e2128",border:"1px solid #2a2d35",borderRadius:"6px 0 0 6px",color:"#888",cursor:"pointer",padding:"6px 5px",fontSize:11,lineHeight:1,fontWeight:700}} title="-15m">◀</button>
    <input
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => commit()}
      onKeyDown={e => { if (e.key === "Enter") { commit(); e.target.blur(); } if (e.key==="ArrowUp"){e.preventDefault();nudge(5);} if (e.key==="ArrowDown"){e.preventDefault();nudge(-5);} }}
      placeholder={placeholder || "HH:MM"}
      style={{width:58,background:"#0d0f13",border:"1px solid #2a2d35",borderLeft:"none",borderRight:"none",padding:"6px 4px",color:"#E8C94A",fontSize:14,fontWeight:800,fontFamily:"monospace",textAlign:"center",outline:"none",boxSizing:"border-box"}}
    />
    <button onClick={()=>nudge(15)} style={{background:"#1e2128",border:"1px solid #2a2d35",borderRadius:"0 6px 6px 0",color:"#888",cursor:"pointer",padding:"6px 5px",fontSize:11,lineHeight:1,fontWeight:700}} title="+15m">▶</button>
  </div>;
};

/* ── Job Form — self-contained, reused for create/edit ── */
const JobForm = ({ initial, allP, locations, day, strips, cast, onSave, onDelete, onCancel, isNew }) => {
  const [label, setLabel] = useState(initial.label || "");
  const [jobType, setJobType] = useState(initial.jobType || "am_pickup");
  const [notes, setNotes] = useState(initial.notes || "");
  const [stops, setStops] = useState(() =>
    (initial.stops || []).map((s, i) => ({ ...s, _id: s._id || "init_" + i + "_" + Date.now() }))
  );

  const isReturn = jobType === "wrap_return";
  const isMove = jobType === "set_move" || jobType === "errand" || jobType === "custom";

  const addStop = (pType) => {
    if (isMove) return;
    const newId = "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    setStops(prev => {
      if (isReturn) {
        const ns = { _id: newId, type: "dropoff", personType: pType||"cast", personId: "", address: "", dropoffTime: "", estDrive: 15, distance: "", trafficNote: "" };
        return [...prev, ns];
      }
      const di = prev.findIndex(x => x.type === "destination");
      const ns = { _id: newId, type: "pickup", personType: pType||"cast", personId: "", address: "", pickupTime: "", estDrive: 15, distance: "", trafficNote: "" };
      const copy = [...prev];
      if (di >= 0) copy.splice(di, 0, ns); else copy.push(ns);
      return copy;
    });
  };

  const updateStop = (id, field, value) => {
    setStops(prev => {
      const next = prev.map(s => s._id === id ? { ...s, [field]: value } : s);
      if (field === "personId" && value) {
        const stop = next.find(s => s._id === id);
        if (stop) {
          const p = allP.find(x => String(x.id) === String(value) && x.type === stop.personType);
          if (p && p.address) stop.address = p.address;
        }
      }
      return next;
    });
  };

  const removeStop = (id) => setStops(prev => prev.filter(s => s._id !== id));
  const jt = JOB_TYPES.find(t => t.id === jobType) || JOB_TYPES[0];

  const getMode = (type) => {
    if (type === "wrap_return") return "return";
    if (type === "set_move" || type === "errand" || type === "custom") return "move";
    return "pickup";
  };

  const switchJobType = (newType) => {
    const oldMode = getMode(jobType);
    const newMode = getMode(newType);
    setJobType(newType);
    if (!label || JOB_TYPES.some(t => t.label === label)) setLabel(JOB_TYPES.find(t => t.id === newType)?.label || "");
    if (oldMode === newMode) return;

    if (newMode === "move") {
      setStops([
        { _id: "from_" + Date.now(), type: "move_from", locationId: "", address: "", departTime: "" },
        { _id: "to_" + Date.now(), type: "move_to", locationId: "", address: "", arrivalTime: "" },
      ]);
    } else if (newMode === "return") {
      const origin = { _id: "origin_" + Date.now(), type: "origin", locationId: locations[0]?.id || "", address: locations[0]?.address || "", departTime: day?.wrapTime || "18:00" };
      setStops([origin]);
    } else {
      const dest = { _id: "dest_" + Date.now(), type: "destination", locationId: locations[0]?.id || "", address: locations[0]?.address || "", arrivalTime: day?.callTime || "06:00" };
      setStops([dest]);
    }
  };

  const handleSave = () => {
    onSave({ ...initial, label: label || jt.label, jobType, notes, stops, status: initial.status || "draft" });
  };

  return <>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
      <div><label style={LS}>Job Type</label>
        <select value={jobType} onChange={e=>switchJobType(e.target.value)} style={IS}>
          {JOB_TYPES.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
        </select>
      </div>
      <div><label style={LS}>Label</label><input value={label} onChange={e=>setLabel(e.target.value)} style={IS}/></div>
    </div>

    {isReturn ? (
      /* ── RETURN/WRAP: Origin (location) → Drop-off stops ── */
      <div style={{marginBottom:12}}>
        <label style={LS}>Route</label>
        {stops.filter(s=>s.type==="origin").map(s=>(
          <div key={s._id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8,padding:8,background:"#3b82f608",borderRadius:6,border:"1px solid #3b82f622"}}>
            <span style={{fontSize:11,fontWeight:700,color:"#3b82f6",width:70,flexShrink:0}}>PICKUP</span>
            <select value={s.locationId||""} onChange={e=>{const loc=locations.find(l=>l.id===e.target.value);updateStop(s._id,"locationId",e.target.value);if(loc)updateStop(s._id,"address",loc.address||"");}} style={{...IS,flex:1}}>
              <option value="">— Select location —</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <TimeInput value={s.departTime} onChange={v=>updateStop(s._id,"departTime",v)} placeholder="18:00" label="depart"/>
          </div>
        ))}
        {stops.filter(s=>s.type==="dropoff").map((s,i)=>(
          <div key={s._id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
            <span style={{width:22,height:22,borderRadius:"50%",background:"#a855f718",color:"#a855f7",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
            <select value={s.personType} onChange={e=>updateStop(s._id,"personType",e.target.value)} style={{...IS,width:80}}>
              <option value="cast">Cast</option><option value="crew">Crew</option>
            </select>
            <select value={s.personId||""} onChange={e=>updateStop(s._id,"personId",e.target.value)} style={{...IS,flex:1}}>
              <option value="">— Select —</option>
              {allP.filter(p=>p.type===s.personType).map(p=><option key={p.id} value={p.id}>{p.roleNum ? `#${p.roleNum} ` : ""}{p.name}</option>)}
            </select>
            <AddressInput value={s.address} onChange={v=>updateStop(s._id,"address",v)} placeholder="Drop-off address" style={{flex:1}}/>
            <button onClick={()=>removeStop(s._id)} style={{background:"none",border:"none",color:"#555",cursor:"pointer"}}><I.Trash/></button>
          </div>
        ))}
        <div style={{display:"flex",gap:6,marginTop:4}}>
          <button onClick={()=>addStop("cast")} style={{...BS,flex:1}}><I.Plus/> Cast</button>
          <button onClick={()=>addStop("crew")} style={{...BS,flex:1}}><I.Plus/> Crew</button>
        </div>
      </div>
    ) : isMove ? (
      /* ── SET MOVE / ERRAND: From → To (addresses only) ── */
      <div style={{marginBottom:12}}>
        <label style={LS}>Route</label>
        {stops.filter(s=>s.type==="move_from").map(s=>(
          <div key={s._id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8,padding:8,background:"#3b82f608",borderRadius:6,border:"1px solid #3b82f622"}}>
            <span style={{fontSize:11,fontWeight:700,color:"#3b82f6",width:50,flexShrink:0}}>FROM</span>
            <button onClick={()=>updateStop(s._id,"manualAddr",!s.manualAddr)} style={{...BS,padding:"4px 8px",fontSize:10,flexShrink:0}}>{s.manualAddr?"📍 Location":"✏️ Manual"}</button>
            {!s.manualAddr ? (
              <select value={s.locationId||""} onChange={e=>{const loc=locations.find(l=>l.id===e.target.value);updateStop(s._id,"locationId",e.target.value);if(loc)updateStop(s._id,"address",loc.address||"");}} style={{...IS,flex:1}}>
                <option value="">— Select location —</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            ) : (
              <AddressInput value={s.address} onChange={v=>{updateStop(s._id,"address",v);updateStop(s._id,"locationId","");}} placeholder="From address..." style={{flex:1}}/>
            )}
            <TimeInput value={s.departTime} onChange={v=>updateStop(s._id,"departTime",v)} placeholder="10:00" label="depart"/>
          </div>
        ))}
        {stops.filter(s=>s.type==="move_to").map(s=>(
          <div key={s._id} style={{display:"flex",gap:8,alignItems:"center",padding:8,background:"#22c55e08",borderRadius:6,border:"1px solid #22c55e22"}}>
            <span style={{fontSize:11,fontWeight:700,color:"#22c55e",width:50,flexShrink:0}}>TO</span>
            <button onClick={()=>updateStop(s._id,"manualAddr",!s.manualAddr)} style={{...BS,padding:"4px 8px",fontSize:10,flexShrink:0}}>{s.manualAddr?"📍 Location":"✏️ Manual"}</button>
            {!s.manualAddr ? (
              <select value={s.locationId||""} onChange={e=>{const loc=locations.find(l=>l.id===e.target.value);updateStop(s._id,"locationId",e.target.value);if(loc)updateStop(s._id,"address",loc.address||"");}} style={{...IS,flex:1}}>
                <option value="">— Select location —</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            ) : (
              <AddressInput value={s.address} onChange={v=>{updateStop(s._id,"address",v);updateStop(s._id,"locationId","");}} placeholder="To address..." style={{flex:1}}/>
            )}
            <TimeInput value={s.arrivalTime} onChange={v=>updateStop(s._id,"arrivalTime",v)} placeholder="10:30" label="arrive"/>
          </div>
        ))}
      </div>
    ) : (
      /* ── PICKUP: Pickup stops → Destination ── */
      <div style={{marginBottom:12}}>
        <label style={LS}>Stops ({stops.length})</label>
        {stops.map(s => s.type === "pickup" ? (
          <div key={s._id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
            <select value={s.personType} onChange={e=>updateStop(s._id,"personType",e.target.value)} style={{...IS,width:80}}>
              <option value="cast">Cast</option><option value="crew">Crew</option>
            </select>
            <select value={s.personId||""} onChange={e=>updateStop(s._id,"personId",e.target.value)} style={{...IS,flex:1}}>
              <option value="">— Select —</option>
              {allP.filter(p=>p.type===s.personType).map(p=><option key={p.id} value={p.id}>{p.roleNum ? `#${p.roleNum} ` : ""}{p.name} ({p.role})</option>)}
            </select>
            <AddressInput value={s.address} onChange={v=>updateStop(s._id,"address",v)} placeholder="Address" style={{flex:1}}/>
            <button onClick={()=>removeStop(s._id)} style={{background:"none",border:"none",color:"#555",cursor:"pointer"}}><I.Trash/></button>
          </div>
        ) : s.type === "destination" ? (
          <div key={s._id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6,padding:8,background:"#22c55e08",borderRadius:6}}>
            <span style={{fontSize:11,fontWeight:700,color:"#22c55e",width:60,flexShrink:0}}>DEST</span>
            <button onClick={()=>updateStop(s._id,"manualAddr",!s.manualAddr)} style={{...BS,padding:"4px 8px",fontSize:10,flexShrink:0}}>{s.manualAddr?"📍 Location":"✏️ Manual"}</button>
            {!s.manualAddr ? (
              <select value={s.locationId||""} onChange={e=>{const loc=locations.find(l=>l.id===e.target.value);updateStop(s._id,"locationId",e.target.value);if(loc)updateStop(s._id,"address",loc.address||"");}} style={{...IS,flex:1}}>
                <option value="">—</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            ) : (
              <AddressInput value={s.address} onChange={v=>{updateStop(s._id,"address",v);updateStop(s._id,"locationId","");}} placeholder="Type destination address..."/>
            )}
            <TimeInput value={s.arrivalTime} onChange={v=>updateStop(s._id,"arrivalTime",v)} placeholder="06:00" label="arrive"/>
          </div>
        ) : null)}
        <div style={{display:"flex",gap:6,marginTop:4}}>
          <button onClick={()=>addStop("cast")} style={{...BS,flex:1}}><I.Plus/> Cast</button>
          <button onClick={()=>addStop("crew")} style={{...BS,flex:1}}><I.Plus/> Crew</button>
        </div>
      </div>
    )}
    {/* Cast call times reference */}
    {day&&(()=>{const ds=day.strips.map(sid=>strips.find(s=>s.id===sid)).filter(Boolean);const ids=[...new Set(ds.flatMap(s=>s.cast))];const cl=ids.map(id=>cast.find(c=>c.id===id)).filter(Boolean);if(cl.length===0)return null;return<div style={{background:"#12141a",border:"1px solid #1e2028",borderRadius:6,marginBottom:12,overflow:"hidden"}}>
      <div style={{padding:"6px 10px",borderBottom:"1px solid #1a1d23",fontSize:9,fontWeight:700,color:"#666",textTransform:"uppercase"}}>Cast — {day.label} · earliest arrival needed</div>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr>{["#","Name","Costume","Makeup","On Set"].map(h=><th key={h} style={{padding:"3px 8px",fontSize:8,fontWeight:700,color:"#555",textTransform:"uppercase",textAlign:"left"}}>{h}</th>)}</tr></thead>
        <tbody>
          {cl.map(c=>{const d=day.callSheet?.cast?.[String(c.id)];return<tr key={c.id}>
            <td style={{padding:"3px 8px",fontSize:10,fontWeight:800,color:"#E8C94A"}}>{c.roleNum}</td>
            <td style={{padding:"3px 8px",fontSize:10,fontWeight:600,color:"#ccc"}}>{c.name}</td>
            <td style={{padding:"3px 8px",fontSize:10,fontWeight:600,color:"#f59e0b",fontFamily:"monospace"}}>{d?.costume||"—"}</td>
            <td style={{padding:"3px 8px",fontSize:10,fontWeight:600,color:"#a855f7",fontFamily:"monospace"}}>{d?.makeup||"—"}</td>
            <td style={{padding:"3px 8px",fontSize:10,fontWeight:600,color:"#22c55e",fontFamily:"monospace"}}>{d?.onSet||"—"}</td>
          </tr>;})}
        </tbody>
      </table>
    </div>;})()}
    <div><label style={LS}>Notes</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} style={{...IS,resize:"vertical"}}/></div>
    <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}>
      <div>{!isNew&&<button onClick={onDelete} style={BD}>Delete</button>}</div>
      <div style={{display:"flex",gap:8}}><button onClick={onCancel} style={BS}>Cancel</button><button onClick={handleSave} style={BP}>Save</button></div>
    </div>
  </>;
};

/* ── Main Module ── */
const TransportModule = ({ vehicles, setVehicles, routes, setRoutes, days, strips, crew, cast, locations }) => {
  const [selDay,setSelDay]=useState(days[0]?.id||"");
  const [viewMode,setViewMode]=useState("plan"); // plan | fleet | drivers
  const [showShuttle,setShowShuttle]=useState(false);
  const [editJob,setEditJob]=useState(null); // null | {vehicleId, job:"new"|jobObj}
  const [editVeh,setEditVeh]=useState(null);
  const [vf,setVf]=useState({});
  const [calc,setCalc]=useState(null);const [calcErr,setCalcErr]=useState("");
  const [dispPrev,setDispPrev]=useState(null);
  const [driverSheetVeh,setDriverSheetVeh]=useState(null); // vehicle for driver sheet modal
  const [calcAll,setCalcAll]=useState(null); // vehicleId being calc-all'd
  const [editTpl,setEditTpl]=useState(false);
  const [travellerTpl,setTravellerTpl]=useState(()=>{try{const s=localStorage.getItem("pk_tpl_traveller");if(s)return s;}catch(e){}return"Hi {name}, your pickup is at {time} from {address}. Set call: {callTime}. Be ready 5 min early.";});
  const [driverTpl,setDriverTpl]=useState(()=>{try{const s=localStorage.getItem("pk_tpl_driver");if(s)return s;}catch(e){}return"Route: {routeLabel}\nDepart: {departTime}\n{stopsList}\n> {callTime} ARRIVE {destination}\n\nMaps: {mapsUrl}";});
  const saveTpl=()=>{try{localStorage.setItem("pk_tpl_traveller",travellerTpl);localStorage.setItem("pk_tpl_driver",driverTpl);}catch(e){}setEditTpl(false);};
  const day=days.find(d=>d.id===selDay);
  const allP=[...cast.map(c=>({id:c.id,type:"cast",name:c.name,role:c.roleName||"",roleNum:c.roleNum||"",address:c.hotel||c.address})),...crew.filter(c=>c.status==="confirmed"&&c.dept!=="Driver").map(c=>({id:c.id,type:"crew",name:c.name,role:`${c.dept} — ${c.role}`,roleNum:"",address:c.address}))];
  const gPN=s=>{if(s.personType==="cast"){const c=cast.find(x=>String(x.id)===String(s.personId));return c?`#${c.roleNum} ${c.name}`:"—";}return crew.find(c=>c.id===s.personId)?.name||"—";};
  const getCostumeTime=(personId,dayId)=>{const d=days.find(x=>x.id===dayId);const cs=d?.callSheet?.cast?.[String(personId)];return cs?.costume||"";};
  const drivers=crew.filter(c=>c.dept==="Driver"&&c.status==="confirmed");

  // Routes are now "jobs" — grouped by vehicleId + dayId
  const dayJobs = routes.filter(r => r.dayId === selDay);
  const getJobTime = (j) => {
    const isRet = j.jobType === "wrap_return";
    const isMov = j.jobType === "set_move" || j.jobType === "errand" || j.jobType === "custom";
    if (isMov) return j.stops?.find(s=>s.type==="move_from")?.departTime || j.stops?.find(s=>s.type==="move_to")?.arrivalTime || "99:99";
    if (isRet) return j.stops?.find(s=>s.type==="origin")?.departTime || "99:99";
    return j.driverDepart || j.stops?.find(s=>s.type==="destination")?.arrivalTime || "99:99";
  };
  const vehiclesWithJobs = vehicles.map(v => {
    const jobs = dayJobs.filter(j => j.vehicleId === v.id).sort((a,b) => getJobTime(a).localeCompare(getJobTime(b)));
    return { ...v, jobs };
  });

  const calcRoute = async (job) => {
    const isReturnJob = job.jobType === "wrap_return";
    if (isReturnJob) {
      const dropoffs = job.stops.filter(s=>s.type==="dropoff");
      const origin = job.stops.find(s=>s.type==="origin");
      if(dropoffs.length===0)return;
      setCalc(job.id);setCalcErr("");
      try{
        const result = await callRouteOptimize(job, vehicles, crew, cast, day, { mode: "return", origin, dropoffs });
        if(result.error){setCalcErr(result.error);setCalc(null);return;}
        setRoutes(prev=>prev.map(r=>{
          if(r.id!==job.id)return r;
          const orig = r.stops.find(s=>s.type==="origin");
          const updatedDropoffs = result.schedule.stops.map(s=>{
            const o=r.stops.find(st=>st.type==="dropoff"&&String(st.personId)===String(s.id));
            return{type:"dropoff",personType:s.personType||o?.personType||"cast",personId:s.id,address:s.address,dropoffTime:s.dropoff_time,estDrive:s.drive_to_next_minutes,distance:s.distance_to_next||"",trafficNote:s.traffic_note||"",_id:o?._id||("d_"+Date.now()+"_"+Math.random().toString(36).slice(2,5))};
          });
          return{...r,stops:[{...orig},...updatedDropoffs],optimized:true,demo:!!result.demo,gmapsUrl:result.google_maps_url||"",totalDrive:result.total_drive_minutes,totalDistance:result.total_distance_miles,trafficSummary:result.traffic_summary||"",driverDepart:orig.departTime};
        }));
        setCalc(null);
      }catch(err){setCalcErr(err.message);setCalc(null);}
      return;
    }
    // Pickup mode
    const pk=job.stops.filter(s=>s.type==="pickup");if(pk.length===0)return;
    setCalc(job.id);setCalcErr("");
    try{
      const result=await callRouteOptimize(job,vehicles,crew,cast,day);
      if(result.error){setCalcErr(result.error);setCalc(null);return;}
      setRoutes(prev=>prev.map(r=>{
        if(r.id!==job.id)return r;
        const ns=result.schedule.stops.map(s=>{const o=r.stops.find(st=>st.type==="pickup"&&String(st.personId)===String(s.id));return{type:"pickup",personType:s.personType||o?.personType||"crew",personId:s.id,address:s.address,pickupTime:s.pickup_time,estDrive:s.drive_to_next_minutes,distance:s.distance_to_next||"",trafficNote:s.traffic_note||""};});
        const dest=r.stops.find(s=>s.type==="destination");ns.push({...dest});
        return{...r,stops:ns,optimized:true,demo:!!result.demo,gmapsUrl:result.google_maps_url||"",totalDrive:result.total_drive_minutes,totalDistance:result.total_distance_miles,trafficSummary:result.traffic_summary||"",driverDepart:result.schedule.driver_depart};
      }));
      setCalc(null);
    }catch(err){setCalcErr(err.message);setCalc(null);}
  };

  const showDispatch=(job)=>{
    const v=vehicles.find(x=>x.id===job.vehicleId);const drv=crew.find(c=>c.id===v?.driverId);
    const isReturnJob = job.jobType === "wrap_return";

    if (isReturnJob) {
      const origin = job.stops.find(s=>s.type==="origin");
      const oLoc = locations.find(l=>l.id===origin?.locationId);
      const dropoffs = job.stops.filter(s=>s.type==="dropoff");
      const departTime = fmtTime(origin?.departTime);
      const locName = oLoc?.name || origin?.address || "set";
      const driverName = drv?.name || "your driver";
      const vehicleLabel = v?.label || "transport";
      // One message to all travellers
      const msgs = dropoffs.map(s => {
        const name = gPN(s);
        return { to: name, msg: `Hi ${name}, wrap transport departs at ${departTime} from ${locName}. Vehicle: ${vehicleLabel}, Driver: ${driverName}. Please be ready at the vehicle.` };
      });
      // Driver message
      const stopsList = dropoffs.map((s,i) => `${i+1}. ${gPN(s)} → ${s.address}`).join("\n");
      const dMsg = drv ? { to: drv.name + " (Driver)", msg: `🌙 WRAP RETURN: ${job.label}\nDepart: ${departTime} from ${locName}\n\n${stopsList}\n\nMaps: ${job.gmapsUrl || "N/A"}` } : null;
      setDispPrev({ route: job, msgs, dMsg });
      return;
    }

    // Pickup mode
    const pk=job.stops.filter(s=>s.type==="pickup");const dest=job.stops.find(s=>s.type==="destination");const dLoc=locations.find(l=>l.id===dest?.locationId);
    const callTime=fmtTime(dest?.arrivalTime);
    const msgs=pk.map(s=>{const name=gPN(s);return{to:name,msg:travellerTpl.replace(/\{name\}/g,name).replace(/\{time\}/g,fmtTime(s.pickupTime)).replace(/\{address\}/g,s.address||"").replace(/\{callTime\}/g,callTime)};});
    const stopsList=pk.map(s=>`> ${fmtTime(s.pickupTime)} ${gPN(s)} — ${s.address}`).join("\n");
    const dMsg=drv?{to:drv.name+" (Driver)",msg:driverTpl.replace(/\{routeLabel\}/g,job.label).replace(/\{departTime\}/g,fmtTime(job.driverDepart||"?")).replace(/\{stopsList\}/g,stopsList).replace(/\{callTime\}/g,callTime).replace(/\{destination\}/g,dLoc?.name||dest?.address||"").replace(/\{mapsUrl\}/g,job.gmapsUrl||"N/A")}:null;
    setDispPrev({route:job,msgs,dMsg});
  };

  // Calculate all jobs for a vehicle sequentially
  const calcAllJobs = async (v) => {
    const jobs = dayJobs.filter(j => j.vehicleId === v.id);
    const calcable = jobs.filter(j => {
      const isRet = j.jobType === "wrap_return";
      const isMov = j.jobType === "set_move" || j.jobType === "errand" || j.jobType === "custom";
      if (isMov) return false;
      const ppl = isRet ? (j.stops||[]).filter(s=>s.type==="dropoff") : (j.stops||[]).filter(s=>s.type==="pickup");
      return ppl.length > 0;
    });
    if (calcable.length === 0) return;
    setCalcAll(v.id); setCalcErr("");
    for (const job of calcable) {
      try {
        await calcRoute(job);
      } catch (err) { setCalcErr(err.message); }
    }
    setCalc(null); setCalcAll(null);
  };

  // Dispatch all optimized jobs for a vehicle
  const dispatchAllJobs = (v) => {
    const jobs = dayJobs.filter(j => j.vehicleId === v.id && j.optimized);
    if (jobs.length === 0) return;
    const drv = crew.find(c => c.id === v.driverId);
    const allMsgs = []; let driverMsgs = "";
    jobs.forEach((job, ji) => {
      const jt = JOB_TYPES.find(t => t.id === job.jobType) || JOB_TYPES[5];
      const pk = job.stops.filter(s => s.type === "pickup");
      const dest = job.stops.find(s => s.type === "destination");
      const dLoc = locations.find(l => l.id === dest?.locationId);
      const callTime = fmtTime(dest?.arrivalTime);
      pk.forEach(s => {
        const name = gPN(s);
        allMsgs.push({ to: name, job: job.label, msg: travellerTpl.replace(/\{name\}/g, name).replace(/\{time\}/g, fmtTime(s.pickupTime)).replace(/\{address\}/g, s.address || "").replace(/\{callTime\}/g, callTime) });
      });
      const stopsList = pk.map(s => `> ${fmtTime(s.pickupTime)} ${gPN(s)} — ${s.address}`).join("\n");
      driverMsgs += `${jt.icon} JOB ${ji+1}: ${job.label}\n`;
      driverMsgs += `Depart: ${fmtTime(job.driverDepart || "?")}\n${stopsList}\n> ${callTime} ARRIVE ${dLoc?.name || dest?.address || ""}\n`;
      if (job.gmapsUrl) driverMsgs += `Maps: ${job.gmapsUrl}\n`;
      driverMsgs += "\n";
    });
    const dMsg = drv ? { to: drv.name + " (Driver)", msg: driverMsgs } : null;
    setDispPrev({ route: jobs[0], msgs: allMsgs, dMsg, isAll: true, vehicleId: v.id });
  };

  const openNV=()=>{setVf({type:"van8",plate:"",label:"",driverId:null,color:"#3b82f6"});setEditVeh("new");};
  const saveV=()=>{if(editVeh==="new")setVehicles(p=>[...p,{...vf,id:"v"+Date.now()}]);else setVehicles(p=>p.map(v=>v.id===vf.id?vf:v));setEditVeh(null);};

  const handleSaveJob = (formData) => {
    if (editJob.job === "new") {
      setRoutes(p => [...p, { ...formData, id: "j" + Date.now(), vehicleId: editJob.vehicleId, dayId: selDay, optimized: false, demo: false, gmapsUrl: "", totalDrive: null, totalDistance: null, trafficSummary: "" }]);
    } else {
      setRoutes(p => p.map(r => r.id === editJob.job.id ? { ...formData, id: editJob.job.id, vehicleId: editJob.vehicleId, dayId: editJob.job.dayId, optimized: editJob.job.optimized, demo: editJob.job.demo, gmapsUrl: editJob.job.gmapsUrl, totalDrive: editJob.job.totalDrive, totalDistance: editJob.job.totalDistance, trafficSummary: editJob.job.trafficSummary, driverDepart: editJob.job.driverDepart } : r));
    }
    setEditJob(null);
  };
  const handleDeleteJob = () => {
    if (editJob && editJob.job !== "new") setRoutes(p => p.filter(r => r.id !== editJob.job.id));
    setEditJob(null);
  };

  // Driver sheet — compile all jobs for a vehicle into text
  const getDriverSheet = (v) => {
    const vJobs = dayJobs.filter(j => j.vehicleId === v.id).sort((a,b) => getJobTime(a).localeCompare(getJobTime(b)));
    const drv = crew.find(c => c.id === v.driverId);
    let txt = `DRIVER SHEET — ${day?.label} · ${fmtDate(day?.date)}\n`;
    txt += `Driver: ${drv?.name || "TBD"} | Vehicle: ${v.label} (${v.plate})\n`;
    txt += "═".repeat(50) + "\n\n";
    vJobs.forEach((job, i) => {
      const jt = JOB_TYPES.find(t => t.id === job.jobType) || JOB_TYPES[5];
      const isReturnJob = job.jobType === "wrap_return";
      const isMoveJob = job.jobType === "set_move" || job.jobType === "errand" || job.jobType === "custom";
      txt += `${jt.icon} JOB ${i+1}: ${job.label}\n`;
      if (isMoveJob) {
        const mf = job.stops?.find(s => s.type === "move_from");
        const mt = job.stops?.find(s => s.type === "move_to");
        const fL = locations.find(l => l.id === mf?.locationId);
        const tL = locations.find(l => l.id === mt?.locationId);
        txt += `   Depart: ${fmtTime(mf?.departTime)} from ${fL?.name || mf?.address || ""}\n`;
        txt += `   → ${fmtTime(mt?.arrivalTime)} ARRIVE ${tL?.name || mt?.address || ""}\n`;
      } else if (isReturnJob) {
        const origin = job.stops?.find(s => s.type === "origin");
        const oLoc = locations.find(l => l.id === origin?.locationId);
        txt += `   Depart: ${fmtTime(origin?.departTime)} from ${oLoc?.name || origin?.address || ""}\n`;
        job.stops?.filter(s => s.type === "dropoff").forEach((s, si) => {
          txt += `   ${si+1}. ${gPN(s)} → ${s.address}\n`;
        });
      } else {
        const dest = job.stops?.find(s => s.type === "destination");
        const dLoc = locations.find(l => l.id === dest?.locationId);
        if (job.driverDepart) txt += `   Depart: ${fmtTime(job.driverDepart)}\n`;
        job.stops?.filter(s => s.type === "pickup").forEach((s, si) => {
          txt += `   ${si+1}. ${fmtTime(s.pickupTime)} — ${gPN(s)} · ${s.address}\n`;
        });
        txt += `   → ${fmtTime(dest?.arrivalTime)} ARRIVE ${dLoc?.name || dest?.address || ""}\n`;
      }
      if (job.gmapsUrl) txt += `   Maps: ${job.gmapsUrl}\n`;
      if (job.notes) txt += `   Note: ${job.notes}\n`;
      txt += "\n";
    });
    return txt;
  };

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Transport</h2>
        <p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>{vehicles.length} vehicles · {drivers.length} drivers · {dayJobs.length} jobs today</p></div>
      <div style={{display:"flex",gap:8}}>
        {viewMode==="plan"&&<button onClick={()=>setEditTpl(true)} style={{...BS,fontSize:11}}><I.Edit/> Templates</button>}
        {viewMode==="fleet"&&<button onClick={openNV} style={BP}><span style={{display:"flex",alignItems:"center",gap:5}}><I.Plus/> Vehicle</span></button>}
      </div>
    </div>

    {/* View mode tabs */}
    <div style={{display:"flex",gap:4,marginBottom:16}}>
      {[{id:"plan",l:"Day Plan"},{id:"dispatch",l:"Overview"},{id:"fleet",l:`Fleet (${vehicles.length})`},{id:"drivers",l:`Drivers (${drivers.length})`}].map(t=>
        <button key={t.id} onClick={()=>setViewMode(t.id)} style={{padding:"7px 16px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:viewMode===t.id?"#E8C94A18":"transparent",border:`1px solid ${viewMode===t.id?"#E8C94A44":"#2a2d35"}`,color:viewMode===t.id?"#E8C94A":"#888"}}>{t.l}</button>)}
    </div>

    {/* Day selector */}
    {viewMode==="plan"&&<>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>{days.map(d=>{
        const shift = d.callTime && d.wrapTime ? `${fmtTime(d.callTime)}–${fmtTime(d.wrapTime)}` : fmtTime(d.callTime||"06:00");
        const jCount = routes.filter(r=>r.dayId===d.id).length;
        return<button key={d.id} onClick={()=>setSelDay(d.id)} style={{padding:"6px 14px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:selDay===d.id?"#3b82f618":"transparent",border:`1px solid ${selDay===d.id?"#3b82f644":"#2a2d35"}`,color:selDay===d.id?"#3b82f6":"#888"}}>
          <div>{d.label} · {fmtDate(d.date)}</div>
          <div style={{fontSize:10,fontWeight:400,color:selDay===d.id?"#3b82f6aa":"#666",marginTop:1}}>{shift} · {jCount} jobs</div>
        </button>;
      })}</div>

      {calcErr&&<div style={{background:"#f59e0b18",border:"1px solid #f59e0b33",borderRadius:6,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#f59e0b"}}><I.AlertTriangle/> {calcErr}</div>}


      {/* Shuttle Planner */}
      {(()=>{
        const dayStrips = day ? day.strips.map(sid=>strips.find(s=>s.id===sid)).filter(Boolean) : [];
        const dayCastIds = [...new Set(dayStrips.flatMap(s=>s.cast))];
        const dayCast = dayCastIds.map(id=>cast.find(c=>c.id===id)).filter(Boolean);
        const dayCrew = crew.filter(c=>c.status==="confirmed"&&c.dept!=="Driver");
        const pickupJobs = dayJobs.filter(j=>j.jobType==="am_pickup"||j.jobType==="pm_pickup");
        const returnJobs = dayJobs.filter(j=>j.jobType==="wrap_return");
        const pickupMap = {};
        const returnMap = {};
        pickupJobs.forEach(j=>{const v=vehicles.find(x=>x.id===j.vehicleId);(j.stops||[]).filter(s=>s.type==="pickup"&&s.personId).forEach(s=>{pickupMap[String(s.personId)]={job:j,vehicle:v};});});
        returnJobs.forEach(j=>{const v=vehicles.find(x=>x.id===j.vehicleId);(j.stops||[]).filter(s=>s.type==="dropoff"&&s.personId).forEach(s=>{returnMap[String(s.personId)]={job:j,vehicle:v};});});
        const vehPickupCount = {};
        const vehReturnCount = {};
        pickupJobs.forEach(j=>{vehPickupCount[j.vehicleId]=(vehPickupCount[j.vehicleId]||0)+(j.stops||[]).filter(s=>s.type==="pickup"&&s.personId).length;});
        returnJobs.forEach(j=>{vehReturnCount[j.vehicleId]=(vehReturnCount[j.vehicleId]||0)+(j.stops||[]).filter(s=>s.type==="dropoff"&&s.personId).length;});
        const allPeople = [...dayCast.map(c=>({...c,isCast:true})),...dayCrew.map(c=>({...c,isCast:false}))];
        const pickupUnplanned = allPeople.filter(p=>!pickupMap[String(p.id)]);
        const returnUnplanned = allPeople.filter(p=>!returnMap[String(p.id)]);

        const assignTo = (person, vehicleId, mode) => {
          const pType = person.isCast ? "cast" : "crew";
          const p = allP.find(x=>String(x.id)===String(person.id)&&x.type===pType);
          if (mode==="pickup") {
            const ej = pickupJobs.find(j=>j.vehicleId===vehicleId);
            if (ej) {
              setRoutes(prev=>prev.map(r=>{
                if(r.id!==ej.id)return r;
                const dest=r.stops.find(s=>s.type==="destination");
                const others=r.stops.filter(s=>s.type!=="destination");
                return{...r,stops:[...others,{type:"pickup",personType:pType,personId:person.id,address:p?.address||"",pickupTime:"",estDrive:15,distance:"",trafficNote:""},dest].filter(Boolean),optimized:false};
              }));
            } else {
              const dest={type:"destination",locationId:locations[0]?.id||"",address:locations[0]?.address||"",arrivalTime:day?.callTime||"06:00",estDrive:0};
              setRoutes(prev=>[...prev,{id:"j"+Date.now(),vehicleId,dayId:selDay,label:"AM Pickup",jobType:"am_pickup",stops:[{type:"pickup",personType:pType,personId:person.id,address:p?.address||"",pickupTime:"",estDrive:15,distance:"",trafficNote:""},dest],notes:"",status:"draft",optimized:false,demo:false,gmapsUrl:"",totalDrive:null,totalDistance:null,trafficSummary:""}]);
            }
          } else {
            const ej = returnJobs.find(j=>j.vehicleId===vehicleId);
            if (ej) {
              setRoutes(prev=>prev.map(r=>{
                if(r.id!==ej.id)return r;
                return{...r,stops:[...r.stops,{type:"dropoff",personType:pType,personId:person.id,address:p?.address||"",dropoffTime:"",estDrive:15,distance:"",trafficNote:""}],optimized:false};
              }));
            } else {
              const origin={type:"origin",locationId:locations[0]?.id||"",address:locations[0]?.address||"",departTime:day?.wrapTime||"18:00"};
              setRoutes(prev=>[...prev,{id:"j"+Date.now()+"r",vehicleId,dayId:selDay,label:"Wrap Return",jobType:"wrap_return",stops:[origin,{type:"dropoff",personType:pType,personId:person.id,address:p?.address||"",dropoffTime:"",estDrive:15,distance:"",trafficNote:""}],notes:"",status:"draft",optimized:false,demo:false,gmapsUrl:"",totalDrive:null,totalDistance:null,trafficSummary:""}]);
            }
          }
        };
        const unassign = (personId, mode) => {
          const jobs = mode==="pickup"?pickupJobs:returnJobs;
          const sType = mode==="pickup"?"pickup":"dropoff";
          setRoutes(prev=>prev.map(r=>{
            if(!jobs.some(j=>j.id===r.id))return r;
            return{...r,stops:r.stops.filter(s=>!(s.type===sType&&String(s.personId)===String(personId))),optimized:false};
          }).filter(r=>{
            if(!jobs.some(j=>j.id===r.id))return true;
            return r.stops.filter(s=>s.type===sType).length>0;
          }));
        };
        const vOpts = (cMap) => vehicles.map(v=>{const vt=VEHICLE_TYPES.find(t=>t.id===v.type);const used=cMap[v.id]||0;const cap=vt?.capacity||8;const full=used>=cap;return{id:v.id,label:v.label,color:v.color||"#888",used,cap,full};});

        // Sort: cast by costume time (earliest first), crew by call time
        const getTime = (person, isCast) => {
          if (isCast) { const cs=day?.callSheet?.cast?.[String(person.id)]; return cs?.costume||cs?.makeup||cs?.onSet||"99:99"; }
          return day?.callSheet?.crew?.[String(person.id)]?.callTime||day?.callTime||"99:99";
        };
        const sortedCast = [...dayCast].sort((a,b)=>getTime(a,true).localeCompare(getTime(b,true)));
        const sortedCrew = [...dayCrew].sort((a,b)=>getTime(a,false).localeCompare(getTime(b,false)));

        const VehSelect = ({person, isCast, mode, cMap}) => (
          <select onChange={e=>{if(e.target.value)assignTo({...person,isCast},e.target.value,mode);e.target.value="";}} defaultValue="" style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:4,padding:"3px 4px",color:"#888",fontSize:10,width:"100%",cursor:"pointer"}}>
            <option value="">— assign —</option>
            {vOpts(cMap).map(v=><option key={v.id} value={v.id} disabled={v.full} style={{color:v.full?"#444":"#ccc"}}>{v.full?"⛔":"●"} {v.label} ({v.used}/{v.cap})</option>)}
          </select>
        );

        const VehBadge = ({info, personId, mode}) => (
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:info.vehicle?.color||"#22c55e",flexShrink:0}}/>
            <span style={{fontSize:10,fontWeight:700,color:info.vehicle?.color||"#22c55e"}}>{info.vehicle?.label}</span>
            <button onClick={()=>unassign(personId,mode)} style={{background:"none",border:"none",color:"#444",cursor:"pointer",padding:0,fontSize:9,marginLeft:2}} title="Remove">✕</button>
          </div>
        );

        return <div style={{marginBottom:12}}>
          <button onClick={()=>setShowShuttle(p=>!p)} style={{...BS,width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px"}}>
            <span style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14}}>🗓</span>
              <span style={{fontWeight:700,fontSize:13}}>Shuttle Planner</span>
              {pickupUnplanned.length>0&&<span style={{fontSize:10,fontWeight:700,color:"#ef4444",background:"#ef444418",padding:"2px 8px",borderRadius:10}}>🌅 {pickupUnplanned.length}</span>}
              {returnUnplanned.length>0&&<span style={{fontSize:10,fontWeight:700,color:"#a855f7",background:"#a855f718",padding:"2px 8px",borderRadius:10}}>🌙 {returnUnplanned.length}</span>}
              {pickupUnplanned.length===0&&returnUnplanned.length===0&&<span style={{fontSize:10,fontWeight:700,color:"#22c55e"}}>✓</span>}
            </span>
            <span style={{fontSize:10,color:"#666"}}>{showShuttle?"▲":"▼"}</span>
          </button>
          {showShuttle&&<div style={{background:"#12141a",border:"1px solid #2a2d35",borderTop:"none",borderRadius:"0 0 10px 10px",overflow:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}>
              <thead><tr style={{borderBottom:"2px solid #1e2028"}}>
                <th style={{padding:"6px 8px",fontSize:9,fontWeight:700,color:"#555",textAlign:"left",width:28}}>#</th>
                <th style={{padding:"6px 8px",fontSize:9,fontWeight:700,color:"#555",textAlign:"left"}}>Name</th>
                <th style={{padding:"6px 8px",fontSize:9,fontWeight:700,color:"#f59e0b",textAlign:"center",width:52}}>Call</th>
                <th style={{padding:"6px 8px",fontSize:9,fontWeight:700,color:"#E8C94A",textAlign:"left",width:140}}>🌅 AM Pickup</th>
                <th style={{padding:"6px 8px",fontSize:9,fontWeight:700,color:"#a855f7",textAlign:"left",width:140}}>🌙 Wrap Return</th>
              </tr></thead>
              <tbody>
                {sortedCast.map(c=>{const cs=day?.callSheet?.cast?.[String(c.id)];const t=cs?.costume||"—";const pi=pickupMap[String(c.id)];const ri=returnMap[String(c.id)];return <tr key={"c"+c.id} style={{borderBottom:"1px solid #1a1d23",background:(!pi||!ri)?"#ef444404":"transparent"}}>
                  <td style={{padding:"4px 8px",fontSize:11,fontWeight:800,color:"#E8C94A"}}>{c.roleNum}</td>
                  <td style={{padding:"4px 8px"}}><span style={{fontSize:12,fontWeight:600,color:"#f0f0f0"}}>{c.name}</span>{c.roleName&&<span style={{fontSize:9,color:"#555",marginLeft:5}}>({c.roleName})</span>}</td>
                  <td style={{padding:"4px 8px",textAlign:"center"}}><span style={{fontSize:14,fontWeight:800,color:"#f59e0b",fontFamily:"monospace"}}>{t}</span></td>
                  <td style={{padding:"4px 6px"}}>{pi?<VehBadge info={pi} personId={c.id} mode="pickup"/>:<VehSelect person={c} isCast={true} mode="pickup" cMap={vehPickupCount}/>}</td>
                  <td style={{padding:"4px 6px"}}>{ri?<VehBadge info={ri} personId={c.id} mode="return"/>:<VehSelect person={c} isCast={true} mode="return" cMap={vehReturnCount}/>}</td>
                </tr>;})}
                {sortedCrew.length>0&&<tr><td colSpan={5} style={{padding:"6px 8px",fontSize:9,fontWeight:700,color:"#3b82f6",textTransform:"uppercase",background:"#3b82f606",borderTop:"2px solid #1e2028",borderBottom:"1px solid #1e2028"}}>Crew ({sortedCrew.length})</td></tr>}
                {sortedCrew.map(c=>{const crewCall=day?.callSheet?.crew?.[String(c.id)]?.callTime||day?.callTime||"—";const pi=pickupMap[String(c.id)];const ri=returnMap[String(c.id)];return <tr key={"w"+c.id} style={{borderBottom:"1px solid #1a1d23",background:(!pi||!ri)?"#ef444404":"transparent"}}>
                  <td style={{padding:"4px 8px"}}></td>
                  <td style={{padding:"4px 8px"}}><span style={{fontSize:12,fontWeight:500,color:"#ccc"}}>{c.name}</span><span style={{fontSize:9,color:"#555",marginLeft:5}}>{c.dept}</span></td>
                  <td style={{padding:"4px 8px",textAlign:"center"}}><span style={{fontSize:14,fontWeight:800,color:"#888",fontFamily:"monospace"}}>{crewCall}</span></td>
                  <td style={{padding:"4px 6px"}}>{pi?<VehBadge info={pi} personId={c.id} mode="pickup"/>:<VehSelect person={c} isCast={false} mode="pickup" cMap={vehPickupCount}/>}</td>
                  <td style={{padding:"4px 6px"}}>{ri?<VehBadge info={ri} personId={c.id} mode="return"/>:<VehSelect person={c} isCast={false} mode="return" cMap={vehReturnCount}/>}</td>
                </tr>;})}
              </tbody>
            </table>
          </div>}
        </div>;
      })()}

                  {/* Vehicle Day Plans */}
      {vehicles.length===0&&<div style={{textAlign:"center",padding:40,color:"#555"}}><div style={{fontSize:36,marginBottom:12}}>🚐</div><div style={{fontSize:14,marginBottom:8}}>No vehicles. Add vehicles in Fleet tab.</div></div>}

      {vehiclesWithJobs.map(v => {
        const vt = VEHICLE_TYPES.find(t=>t.id===v.type);
        const drv = crew.find(c=>c.id===v.driverId);
        const hasJobs = v.jobs.length > 0;

        return <div key={v.id} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,marginBottom:12,overflow:"hidden"}}>
          {/* Vehicle header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",background:"#1e2128",borderBottom:"1px solid #2a2d35"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{width:10,height:10,borderRadius:"50%",background:v.color||"#555"}}/>
              <span style={{fontWeight:700,color:"#f0f0f0",fontSize:14}}>{v.label}</span>
              <span style={{fontSize:11,color:"#888"}}>{vt?.icon} {vt?.capacity} seats</span>
              {drv&&<span style={{fontSize:11,color:"#3b82f6"}}>👤 {drv.name}</span>}
              <span style={{fontSize:10,color:"#666"}}>{v.jobs.length} jobs</span>
            </div>
            <div style={{display:"flex",gap:6}}>
              {hasJobs&&<button onClick={()=>calcAllJobs(v)} disabled={calcAll===v.id} style={{...BS,padding:"5px 10px",fontSize:10}}>{calcAll===v.id?"⏳ Calculating...":"📍 Calculate All"}</button>}
              {v.jobs.some(j=>j.optimized)&&<button onClick={()=>dispatchAllJobs(v)} style={{...BS,padding:"5px 10px",fontSize:10,borderColor:"#3b82f633",color:"#3b82f6"}}><I.Send/> Dispatch All</button>}
              {hasJobs&&<button onClick={()=>setDriverSheetVeh(v)} style={{...BS,padding:"5px 10px",fontSize:10}}>📋 Driver Sheet</button>}
              <button onClick={()=>setEditJob({vehicleId:v.id,job:"new"})} style={{...BS,padding:"5px 10px",fontSize:10,borderColor:"#22c55e44",color:"#22c55e"}}><I.Plus/> Job</button>
            </div>
          </div>

          {/* Jobs list */}
          <div style={{padding:hasJobs?12:0}}>
            {!hasJobs&&<div style={{padding:20,textAlign:"center",color:"#555",fontSize:12}}>No jobs scheduled. Click + Job to add.</div>}

            {v.jobs.map((job,ji) => {
              const jt = JOB_TYPES.find(t=>t.id===job.jobType) || JOB_TYPES[5];
              const isReturnJob = job.jobType === "wrap_return";
              const isMoveJob = job.jobType === "set_move" || job.jobType === "errand" || job.jobType === "custom";
              const pk = job.stops?.filter(s=>s.type==="pickup") || [];
              const dropoffs = job.stops?.filter(s=>s.type==="dropoff") || [];
              const origin = job.stops?.find(s=>s.type==="origin");
              const dest = job.stops?.find(s=>s.type==="destination");
              const moveFrom = job.stops?.find(s=>s.type==="move_from");
              const moveTo = job.stops?.find(s=>s.type==="move_to");
              const dLoc = dest ? locations.find(l=>l.id===dest.locationId) : null;
              const oLoc = origin ? locations.find(l=>l.id===origin.locationId) : null;
              const fLoc = moveFrom ? locations.find(l=>l.id===moveFrom.locationId) : null;
              const tLoc = moveTo ? locations.find(l=>l.id===moveTo.locationId) : null;

              return <div key={job.id} style={{marginBottom:ji<v.jobs.length-1?10:0}}>
                {/* Job header */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:jt.color+"0a",border:`1px solid ${jt.color}22`,borderRadius:"8px 8px 0 0"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:14}}>{jt.icon}</span>
                    <span style={{fontWeight:700,color:jt.color,fontSize:13}}>{job.label}</span>
                    <StatusBadge status={job.status||"draft"}/>
                    {job.totalDrive&&<span style={{fontSize:10,color:"#888"}}>⏱ {job.totalDrive} min</span>}
                    {job.totalDistance&&<span style={{fontSize:10,color:"#888"}}>{toKm(job.totalDistance)} km</span>}
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    {!isMoveJob&&<button onClick={()=>calcRoute(job)} disabled={calc===job.id} style={{...BS,padding:"4px 8px",fontSize:10}}>{calc===job.id?"⏳":"📍"} Calc</button>}
                    {!isMoveJob&&(job.optimized||isReturnJob)&&<button onClick={()=>showDispatch(job)} style={{...BS,padding:"4px 8px",fontSize:10,borderColor:"#3b82f633",color:"#3b82f6"}}><I.Send/></button>}
                    <button onClick={()=>setEditJob({vehicleId:v.id,job})} style={{...BS,padding:"4px 8px",fontSize:10}}><I.Edit/></button>
                    <button onClick={()=>setRoutes(p=>p.filter(r=>r.id!==job.id))} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:2}}><I.Trash/></button>
                  </div>
                </div>

                {/* Job stops */}
                <div style={{padding:"8px 12px",border:`1px solid ${jt.color}15`,borderTop:"none",borderRadius:"0 0 8px 8px",background:"#12141a"}}>
                  {isMoveJob ? (<>
                    {/* Move: From → To */}
                    {moveFrom&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #1e2028"}}>
                      <span style={{width:18,height:18,borderRadius:"50%",background:"#3b82f618",color:"#3b82f6",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>A</span>
                      <span style={{flex:1,fontSize:12,fontWeight:600,color:"#3b82f6"}}>FROM — {fLoc?.name||moveFrom.address||"—"}</span>
                      {moveFrom.departTime&&<span style={{fontSize:15,fontWeight:800,color:"#3b82f6",fontFamily:"monospace"}}>{fmtTime(moveFrom.departTime)}</span>}
                    </div>}
                    {moveTo&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0"}}>
                      <span style={{width:18,height:18,borderRadius:"50%",background:"#22c55e18",color:"#22c55e",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>B</span>
                      <span style={{flex:1,fontSize:12,fontWeight:600,color:"#22c55e"}}>TO — {tLoc?.name||moveTo.address||"—"}</span>
                      {moveTo.arrivalTime&&<span style={{fontSize:15,fontWeight:800,color:"#22c55e",fontFamily:"monospace"}}>{fmtTime(moveTo.arrivalTime)}</span>}
                    </div>}
                    {job.notes&&<div style={{fontSize:10,color:"#888",marginTop:4,fontStyle:"italic"}}>{job.notes}</div>}
                  </>) : isReturnJob ? (<>
                    {/* Return: Origin (set) → Drop-offs */}
                    {origin&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #1e2028"}}>
                      <span style={{width:18,height:18,borderRadius:"50%",background:"#3b82f618",color:"#3b82f6",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>⬆</span>
                      <div style={{flex:1}}>
                        <span style={{fontSize:12,fontWeight:600,color:"#3b82f6"}}>DEPART — {oLoc?.name||origin.address}</span>
                        {oLoc?.name&&origin.address&&<div style={{fontSize:10,color:"#666"}}>{origin.address}</div>}
                      </div>
                      {origin.departTime&&<span style={{fontSize:15,fontWeight:800,color:"#3b82f6"}}>{fmtTime(origin.departTime)}</span>}
                    </div>}
                    {dropoffs.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderBottom:"1px solid #1e2028"}}>
                      <span style={{width:18,height:18,borderRadius:"50%",background:jt.color+"18",color:jt.color,fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                      <div style={{flex:1}}>
                        <span style={{fontSize:12,fontWeight:600,color:"#f0f0f0"}}>{gPN(s)}</span>
                        <span style={{fontSize:10,color:"#666",marginLeft:6}}>drop-off</span>
                        <div style={{fontSize:10,color:"#888"}}>{s.address}</div>
                      </div>
                      {s.dropoffTime&&<span style={{fontSize:15,fontWeight:800,color:jt.color,flexShrink:0}}>{fmtTime(s.dropoffTime)}</span>}
                    </div>)}
                  </>) : (<>
                    {/* Pickup: Stops → Destination */}
                    {job.driverDepart&&<div style={{fontSize:10,color:"#666",marginBottom:6}}>Driver departs: <span style={{fontWeight:700,color:"#ccc"}}>{fmtTime(job.driverDepart)}</span></div>}
                    {pk.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderBottom:"1px solid #1e2028"}}>
                      <span style={{width:18,height:18,borderRadius:"50%",background:jt.color+"18",color:jt.color,fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                      <div style={{flex:1}}>
                        <span style={{fontSize:12,fontWeight:600,color:"#f0f0f0"}}>{gPN(s)}</span>
                        <span style={{fontSize:10,color:"#666",marginLeft:6}}>{s.personType}</span>
                        {s.personType==="cast"&&getCostumeTime(s.personId,selDay)&&<span style={{fontSize:10,color:"#f59e0b",marginLeft:6}}>costume {getCostumeTime(s.personId,selDay)}</span>}
                        <div style={{fontSize:10,color:"#888"}}>{s.address}</div>
                      </div>
                      {s.pickupTime?<span style={{fontSize:15,fontWeight:800,color:jt.color,flexShrink:0,fontFamily:"monospace"}}>{fmtTime(s.pickupTime)}</span>:<span style={{fontSize:9,color:"#555",flexShrink:0}}>calc →</span>}
                    </div>)}
                    {dest&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0"}}>
                      <span style={{width:18,height:18,borderRadius:"50%",background:"#22c55e18",color:"#22c55e",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✓</span>
                      <span style={{flex:1,fontSize:12,fontWeight:600,color:"#22c55e"}}>ARRIVE — {dLoc?.name||dest.address}</span>
                      <span style={{fontSize:15,fontWeight:800,color:"#22c55e"}}>{fmtTime(dest.arrivalTime)}</span>
                    </div>}
                  </>)}
                  {job.gmapsUrl&&<a href={job.gmapsUrl} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:4,fontSize:10,color:"#3b82f6",textDecoration:"none"}}>Open in Google Maps <I.ExternalLink/></a>}
                </div>
              </div>;
            })}
          </div>
        </div>;
      })}
    </>}

    {/* Dispatch Overview */}
    {viewMode==="dispatch"&&<>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>{days.map(d=>{
        const jCount = routes.filter(r=>r.dayId===d.id).length;
        return<button key={d.id} onClick={()=>setSelDay(d.id)} style={{padding:"6px 14px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:selDay===d.id?"#3b82f618":"transparent",border:`1px solid ${selDay===d.id?"#3b82f644":"#2a2d35"}`,color:selDay===d.id?"#3b82f6":"#888"}}>{d.label} · {fmtDate(d.date)} · {jCount} jobs</button>;
      })}</div>

      {(()=>{
        // Build timeline: all jobs across all vehicles, sorted by time
        const allJobs = dayJobs.map(j => {
          const v = vehicles.find(x=>x.id===j.vehicleId);
          const vt = VEHICLE_TYPES.find(t=>t.id===v?.type);
          const drv = crew.find(c=>c.id===v?.driverId);
          const jt = JOB_TYPES.find(t=>t.id===j.jobType) || JOB_TYPES[5];
          const isRet = j.jobType === "wrap_return";
          const isMov = j.jobType === "set_move" || j.jobType === "errand" || j.jobType === "custom";
          const pk = j.stops?.filter(s=>s.type==="pickup") || [];
          const dropoffs = j.stops?.filter(s=>s.type==="dropoff") || [];
          const dest = j.stops?.find(s=>s.type==="destination");
          const origin = j.stops?.find(s=>s.type==="origin");
          const moveFrom = j.stops?.find(s=>s.type==="move_from");
          const moveTo = j.stops?.find(s=>s.type==="move_to");
          const dLoc = dest ? locations.find(l=>l.id===dest.locationId) : null;
          const oLoc = origin ? locations.find(l=>l.id===origin.locationId) : null;
          const fLoc = moveFrom ? locations.find(l=>l.id===moveFrom?.locationId) : null;
          const tLoc = moveTo ? locations.find(l=>l.id===moveTo?.locationId) : null;
          const time = isMov ? (moveFrom?.departTime||moveTo?.arrivalTime||"99:99") : isRet ? (origin?.departTime||"99:99") : (j.driverDepart || dest?.arrivalTime || "99:99");
          const passengers = isRet ? dropoffs.length : pk.length;
          return { ...j, v, vt, drv, jt, isRet, isMov, pk, dropoffs, dest, origin, moveFrom, moveTo, dLoc, oLoc, fLoc, tLoc, time, passengers };
        }).sort((a,b) => a.time.localeCompare(b.time));

        // Stats
        const totalPassengers = allJobs.reduce((s,j) => s + j.passengers, 0);
        const totalDrive = allJobs.reduce((s,j) => s + (j.totalDrive||0), 0);
        const dispatched = allJobs.filter(j=>j.status==="dispatched").length;
        const calculated = allJobs.filter(j=>j.optimized).length;

        return <>
          {/* Summary cards */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8,marginBottom:16}}>
            {[
              {label:"Total Jobs",val:allJobs.length,color:"#E8C94A"},
              {label:"Passengers",val:totalPassengers,color:"#3b82f6"},
              {label:"Vehicles Active",val:new Set(allJobs.map(j=>j.vehicleId)).size,color:"#22c55e"},
              {label:"Est. Drive Time",val:totalDrive?`${totalDrive} min`:"—",color:"#f59e0b"},
              {label:"Calculated",val:`${calculated}/${allJobs.length}`,color:calculated===allJobs.length?"#22c55e":"#888"},
              {label:"Dispatched",val:`${dispatched}/${allJobs.length}`,color:dispatched===allJobs.length?"#22c55e":"#888"},
            ].map(c=><div key={c.label} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:8,padding:"10px 14px"}}>
              <div style={{fontSize:9,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:"0.05em"}}>{c.label}</div>
              <div style={{fontSize:20,fontWeight:800,color:c.color,marginTop:2}}>{c.val}</div>
            </div>)}
          </div>

          {/* Transport Coverage — who's planned, who's not */}
          {(()=>{
            // Collect all people who need transport this day
            const dayStrips = day ? day.strips.map(sid=>strips.find(s=>s.id===sid)).filter(Boolean) : [];
            const dayCastIds = [...new Set(dayStrips.flatMap(s=>s.cast))];
            const dayCast = dayCastIds.map(id=>cast.find(c=>c.id===id)).filter(Boolean);
            const dayCrew = crew.filter(c=>c.status==="confirmed"&&c.dept!=="Driver");

            // Who has transport assigned (pickup or dropoff in any job)
            const plannedIds = new Set();
            allJobs.forEach(j => {
              (j.pk||[]).forEach(s => { if(s.personId) plannedIds.add(String(s.personId)); });
              (j.dropoffs||[]).forEach(s => { if(s.personId) plannedIds.add(String(s.personId)); });
            });

            const unplannedCast = dayCast.filter(c => !plannedIds.has(String(c.id)));
            const plannedCast = dayCast.filter(c => plannedIds.has(String(c.id)));
            const unplannedCrew = dayCrew.filter(c => !plannedIds.has(String(c.id)));
            const plannedCrew = dayCrew.filter(c => plannedIds.has(String(c.id)));
            const totalNeeded = dayCast.length + dayCrew.length;
            const totalPlanned = plannedCast.length + plannedCrew.length;
            const pct = totalNeeded > 0 ? Math.round((totalPlanned / totalNeeded) * 100) : 0;

            return <div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:10,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:"0.05em"}}>Transport Coverage</div>
                <div style={{fontSize:11,color:pct===100?"#22c55e":"#f59e0b",fontWeight:700}}>{totalPlanned}/{totalNeeded} covered ({pct}%)</div>
              </div>
              {/* Progress bar */}
              <div style={{height:4,background:"#2a2d35",borderRadius:2,marginBottom:10,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:pct===100?"#22c55e":"#E8C94A",borderRadius:2,transition:"width 0.3s"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {/* Cast */}
                <div style={{background:"#12141a",border:"1px solid #2a2d35",borderRadius:8,overflow:"hidden"}}>
                  <div style={{padding:"6px 10px",borderBottom:"1px solid #1e2028",display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:9,fontWeight:700,color:"#E8C94A",textTransform:"uppercase"}}>Cast ({dayCast.length})</span>
                    <span style={{fontSize:9,color:unplannedCast.length>0?"#ef4444":"#22c55e",fontWeight:700}}>{unplannedCast.length>0?`${unplannedCast.length} missing`:"All covered ✓"}</span>
                  </div>
                  <div style={{padding:6,maxHeight:160,overflow:"auto"}}>
                    {dayCast.map(c => {
                      const planned = plannedIds.has(String(c.id));
                      // Find which job they're in
                      const inJob = planned ? allJobs.find(j => 
                        (j.pk||[]).some(s=>String(s.personId)===String(c.id)) || 
                        (j.dropoffs||[]).some(s=>String(s.personId)===String(c.id))
                      ) : null;
                      return <div key={c.id} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 6px",borderRadius:4,background:planned?"transparent":"#ef444408"}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:planned?"#22c55e":"#ef4444",flexShrink:0}}/>
                        <span style={{fontSize:10,fontWeight:700,color:"#E8C94A",width:18}}>{c.roleNum}</span>
                        <span style={{fontSize:11,color:planned?"#aaa":"#f0f0f0",fontWeight:planned?400:600,flex:1}}>{c.name}</span>
                        {inJob&&<span style={{fontSize:9,color:inJob.v?.color||"#666"}}>{inJob.v?.label}</span>}
                      </div>;
                    })}
                  </div>
                </div>
                {/* Crew */}
                <div style={{background:"#12141a",border:"1px solid #2a2d35",borderRadius:8,overflow:"hidden"}}>
                  <div style={{padding:"6px 10px",borderBottom:"1px solid #1e2028",display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:9,fontWeight:700,color:"#3b82f6",textTransform:"uppercase"}}>Crew ({dayCrew.length})</span>
                    <span style={{fontSize:9,color:unplannedCrew.length>0?"#ef4444":"#22c55e",fontWeight:700}}>{unplannedCrew.length>0?`${unplannedCrew.length} missing`:"All covered ✓"}</span>
                  </div>
                  <div style={{padding:6,maxHeight:160,overflow:"auto"}}>
                    {dayCrew.map(c => {
                      const planned = plannedIds.has(String(c.id));
                      const inJob = planned ? allJobs.find(j => 
                        (j.pk||[]).some(s=>String(s.personId)===String(c.id)) || 
                        (j.dropoffs||[]).some(s=>String(s.personId)===String(c.id))
                      ) : null;
                      return <div key={c.id} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 6px",borderRadius:4,background:planned?"transparent":"#ef444408"}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:planned?"#22c55e":"#ef4444",flexShrink:0}}/>
                        <span style={{fontSize:11,color:planned?"#aaa":"#f0f0f0",fontWeight:planned?400:600,flex:1}}>{c.name}</span>
                        <span style={{fontSize:9,color:"#666"}}>{c.dept}</span>
                        {inJob&&<span style={{fontSize:9,color:inJob.v?.color||"#666"}}>{inJob.v?.label}</span>}
                      </div>;
                    })}
                  </div>
                </div>
              </div>
            </div>;
          })()}

          {/* Timeline */}
          <div style={{fontSize:10,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Timeline — {day?.label}</div>
          {allJobs.length===0&&<div style={{textAlign:"center",padding:30,color:"#555",fontSize:13}}>No jobs scheduled for this day.</div>}
          {allJobs.map(j=>(
            <div key={j.id} style={{display:"flex",gap:12,marginBottom:2,padding:"10px 14px",background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:8,borderLeft:`4px solid ${j.jt.color}`}}>
              {/* Time */}
              <div style={{width:50,flexShrink:0,textAlign:"center"}}>
                <div style={{fontSize:16,fontWeight:800,color:j.jt.color,fontFamily:"monospace"}}>{fmtTime(j.time)}</div>
                <div style={{fontSize:8,color:"#666",marginTop:1}}>{j.isMov?"DEPART":j.isRet?"DEPART":"ARRIVE"}</div>
              </div>
              {/* Job info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{fontSize:13}}>{j.jt.icon}</span>
                  <span style={{fontWeight:700,color:"#f0f0f0",fontSize:13}}>{j.label}</span>
                  <StatusBadge status={j.status||"draft"}/>
                </div>
                <div style={{fontSize:11,color:"#888"}}>
                  {j.isMov
                    ? <>{j.fLoc?.name||j.moveFrom?.address||"—"} → {j.tLoc?.name||j.moveTo?.address||"—"}</>
                    : j.isRet
                    ? <>From {j.oLoc?.name||j.origin?.address||"—"} → {j.dropoffs.map(s=>gPN(s)).join(", ")||"no drop-offs"}</>
                    : <>{j.pk.map(s=>gPN(s)).join(", ")||"no pickups"} → {j.dLoc?.name||j.dest?.address||"—"}</>
                  }
                </div>
              </div>
              {/* Vehicle + driver */}
              <div style={{flexShrink:0,textAlign:"right"}}>
                <div style={{display:"flex",alignItems:"center",gap:4,justifyContent:"flex-end"}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:j.v?.color||"#555"}}/>
                  <span style={{fontSize:11,fontWeight:600,color:"#ccc"}}>{j.v?.label||"—"}</span>
                </div>
                <div style={{fontSize:10,color:"#666"}}>{j.drv?.name||"No driver"} · {j.passengers} pax</div>
                {j.totalDrive&&<div style={{fontSize:9,color:"#555"}}>{j.totalDrive} min · {j.totalDistance?toKm(j.totalDistance)+" km":""}</div>}
              </div>
            </div>
          ))}
        </>;
      })()}
    </>}

    {/* Fleet view */}
    {viewMode==="fleet"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
      {vehicles.map(v=>{const vt=VEHICLE_TYPES.find(t=>t.id===v.type);const drv=crew.find(c=>c.id===v.driverId);return<div key={v.id} onClick={()=>{setVf({...v});setEditVeh(v);}} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:16,cursor:"pointer",borderTop:`3px solid ${v.color}`}}>
        <div style={{fontSize:20,marginBottom:4}}>{vt?.icon}</div><div style={{fontSize:14,fontWeight:700,color:"#f0f0f0"}}>{v.label}</div>
        <div style={{fontSize:12,color:"#888",marginTop:2}}>{vt?.label} · {vt?.capacity} seats · {v.plate}</div>
        <div style={{fontSize:11,color:drv?"#22c55e":"#f59e0b",marginTop:6}}>{drv?`Driver: ${drv.name}`:"No driver assigned"}</div>
      </div>;})}
    </div>}

    {/* Drivers view */}
    {viewMode==="drivers"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
      {drivers.length===0&&<div style={{color:"#555",fontSize:13,padding:20}}>No drivers. Add crew with "Driver" department in People.</div>}
      {drivers.map(d=>{const assignedV=vehicles.filter(v=>v.driverId===d.id);const dJobs=dayJobs.filter(j=>{const v=vehicles.find(x=>x.id===j.vehicleId);return v?.driverId===d.id;});return<div key={d.id} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:16,borderLeft:"3px solid #3b82f6"}}>
        <div style={{fontSize:14,fontWeight:700,color:"#f0f0f0"}}>{d.name}</div><div style={{fontSize:12,color:"#3b82f6",fontWeight:600}}>{d.role}</div>
        <div style={{fontSize:12,color:"#aaa",marginTop:4}}><I.Phone/> {d.phone}</div>
        {assignedV.length>0&&<div style={{marginTop:6,fontSize:11,color:"#888"}}>Vehicles: {assignedV.map(v=>v.label).join(", ")}</div>}
        {dJobs.length>0&&<div style={{marginTop:6,fontSize:11,color:"#E8C94A"}}>{dJobs.length} jobs today</div>}
      </div>;})}
    </div>}

    {/* Job Edit Modal */}
    {editJob&&<Modal title={editJob.job==="new"?"Add Job":"Edit Job"} onClose={()=>setEditJob(null)} width={640}>
      <JobForm
        key={editJob.job==="new"?"new_job":editJob.job.id}
        initial={editJob.job==="new" ? {
          label:"AM Pickup", jobType:"am_pickup",
          stops:[{type:"destination",locationId:locations[0]?.id||"",address:locations[0]?.address||"",arrivalTime:day?.callTime||"06:00",estDrive:0}],
          notes:"",status:"draft"
        } : editJob.job}
        allP={allP} locations={locations} day={day} strips={strips} cast={cast}
        isNew={editJob.job==="new"}
        onSave={handleSaveJob}
        onDelete={handleDeleteJob}
        onCancel={()=>setEditJob(null)}
      />
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
    {dispPrev&&<Modal title={dispPrev.isAll?"Dispatch All Jobs":"Dispatch Preview"} onClose={()=>setDispPrev(null)} width={600}>
      <div style={{padding:10,background:"#f59e0b18",border:"1px solid #f59e0b33",borderRadius:6,marginBottom:16,fontSize:12,color:"#f59e0b"}}><I.AlertTriangle/> TEST MODE — Edit messages below. No messages will be sent.</div>
      <h4 style={{margin:"0 0 10px",fontSize:13,fontWeight:700,color:"#f0f0f0"}}>Traveller Messages ({dispPrev.msgs.length})</h4>
      {dispPrev.msgs.map((m,i)=><div key={i} style={{background:"#12141a",border:"1px solid #2a2d35",borderRadius:6,padding:12,marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:11,fontWeight:700,color:"#E8C94A"}}>To: {m.to}</span>
          {m.job&&<span style={{fontSize:9,color:"#666"}}>{m.job}</span>}
        </div>
        <textarea value={m.msg} onChange={e=>{const nm=[...dispPrev.msgs];nm[i]={...nm[i],msg:e.target.value};setDispPrev({...dispPrev,msgs:nm});}} rows={3} style={{...IS,resize:"vertical",fontSize:12}}/>
      </div>)}
      {dispPrev.dMsg&&<><h4 style={{margin:"16px 0 10px",fontSize:13,fontWeight:700,color:"#f0f0f0"}}>Driver Message</h4>
        <div style={{background:"#12141a",border:"1px solid #3b82f633",borderRadius:6,padding:12}}>
          <div style={{fontSize:11,fontWeight:700,color:"#3b82f6",marginBottom:4}}>To: {dispPrev.dMsg.to}</div>
          <textarea value={dispPrev.dMsg.msg} onChange={e=>setDispPrev({...dispPrev,dMsg:{...dispPrev.dMsg,msg:e.target.value}})} rows={dispPrev.isAll?12:8} style={{...IS,resize:"vertical",fontSize:12,fontFamily:"monospace"}}/>
        </div></>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20}}>
        <button onClick={()=>{
          if(dispPrev.isAll){
            const vJobs=dayJobs.filter(j=>j.vehicleId===dispPrev.vehicleId&&j.optimized);
            setRoutes(p=>p.map(r=>vJobs.some(j=>j.id===r.id)?{...r,status:"dispatched"}:r));
          } else {
            setRoutes(p=>p.map(r=>r.id===dispPrev.route.id?{...r,status:"dispatched"}:r));
          }
          setDispPrev(null);
        }} style={{...BP,background:"#3b82f6",color:"#fff"}}><I.Send/> Mark as Dispatched</button>
        <button onClick={()=>setDispPrev(null)} style={BS}>Close</button>
      </div>
    </Modal>}

    {/* Driver Sheet Modal */}
    {driverSheetVeh&&<Modal title={`Driver Sheet — ${driverSheetVeh.label}`} onClose={()=>setDriverSheetVeh(null)} width={600}>
      <pre style={{background:"#12141a",border:"1px solid #2a2d35",borderRadius:6,padding:16,fontSize:12,color:"#ccc",fontFamily:"monospace",whiteSpace:"pre-wrap",lineHeight:1.6,maxHeight:500,overflow:"auto"}}>{getDriverSheet(driverSheetVeh)}</pre>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
        <button onClick={()=>{navigator.clipboard.writeText(getDriverSheet(driverSheetVeh));}} style={{...BS,fontSize:11}}>📋 Copy to Clipboard</button>
        <button onClick={()=>{
          const txt=getDriverSheet(driverSheetVeh);
          const w=window.open("","_blank","width=600,height=800");
          w.document.write(`<html><head><title>Driver Sheet</title><style>body{font-family:monospace;font-size:13px;padding:20px;white-space:pre-wrap;line-height:1.7}@media print{body{font-size:12px;padding:10px}}</style></head><body>${txt.replace(/\n/g,"<br>")}</body></html>`);
          w.document.close();w.print();
        }} style={BP}>🖨 Print</button>
        <button onClick={()=>setDriverSheetVeh(null)} style={BS}>Close</button>
      </div>
    </Modal>}

    {/* Template Editor */}
    {editTpl&&<Modal title="Dispatch Message Templates" onClose={()=>setEditTpl(false)} width={600}>
      <p style={{fontSize:12,color:"#888",marginBottom:16}}>Variables: <span style={{color:"#E8C94A",fontFamily:"monospace"}}>{"{name}"} {"{time}"} {"{address}"} {"{callTime}"}</span> for travellers, <span style={{color:"#3b82f6",fontFamily:"monospace"}}>{"{routeLabel}"} {"{departTime}"} {"{stopsList}"} {"{callTime}"} {"{destination}"} {"{mapsUrl}"}</span> for driver.</p>
      <div style={{marginBottom:16}}><label style={LS}>Traveller Message Template</label><textarea value={travellerTpl} onChange={e=>setTravellerTpl(e.target.value)} rows={4} style={{...IS,resize:"vertical",fontSize:12}}/></div>
      <div style={{marginBottom:16}}><label style={LS}>Driver Message Template</label><textarea value={driverTpl} onChange={e=>setDriverTpl(e.target.value)} rows={6} style={{...IS,resize:"vertical",fontSize:12,fontFamily:"monospace"}}/></div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><button onClick={()=>setEditTpl(false)} style={BS}>Cancel</button><button onClick={saveTpl} style={BP}>Save Templates</button></div>
    </Modal>}
  </div>;
};
export { TransportModule };
