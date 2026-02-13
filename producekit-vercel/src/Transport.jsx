import { useState } from "react";
import { VEHICLE_TYPES, fmtTime, fmtDate, toKm, I, StatusBadge, TrafficBadge, Modal, IS, LS, BP, BS, BD, callRouteOptimize } from "./config.jsx";

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
export { TransportModule };
