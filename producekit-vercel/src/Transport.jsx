import { useState } from "react";
import { VEHICLE_TYPES, fmtTime, fmtDate, toKm, addMin, I, StatusBadge, TrafficBadge, Modal, IS, LS, BP, BS, BD, callRouteOptimize, AddressInput } from "./config.jsx";

const TransportModule = ({ vehicles, setVehicles, routes, setRoutes, days, strips, crew, cast, locations }) => {
  const [selDay,setSelDay]=useState(days[0]?.id||"");const [viewMode,setViewMode]=useState("routes");
  const [editRoute,setEditRoute]=useState(null);const [editVeh,setEditVeh]=useState(null);
  const [rf,setRf]=useState({});const [vf,setVf]=useState({});
  const [calc,setCalc]=useState(null);const [calcErr,setCalcErr]=useState("");const [dispPrev,setDispPrev]=useState(null);
  const [editTpl,setEditTpl]=useState(false);
  const [travellerTpl,setTravellerTpl]=useState(()=>{try{const s=localStorage.getItem("pk_tpl_traveller");if(s)return s;}catch(e){}return"Hi {name}, your pickup is at {time} from {address}. Set call: {callTime}. Be ready 5 min early.";});
  const [driverTpl,setDriverTpl]=useState(()=>{try{const s=localStorage.getItem("pk_tpl_driver");if(s)return s;}catch(e){}return"Route: {routeLabel}\nDepart: {departTime}\n{stopsList}\n> {callTime} ARRIVE {destination}\n\nMaps: {mapsUrl}";});
  const saveTpl=()=>{try{localStorage.setItem("pk_tpl_traveller",travellerTpl);localStorage.setItem("pk_tpl_driver",driverTpl);}catch(e){}setEditTpl(false);};
  const day=days.find(d=>d.id===selDay);const dayR=routes.filter(r=>r.dayId===selDay);
  const allP=[...cast.map(c=>({id:c.id,type:"cast",name:c.name,role:c.roleName||"",roleNum:c.roleNum||"",address:c.hotel||c.address})),...crew.filter(c=>c.status==="confirmed"&&c.dept!=="Driver").map(c=>({id:c.id,type:"crew",name:c.name,role:`${c.dept} — ${c.role}`,roleNum:"",address:c.address}))];
  const gPN=s=>{if(s.personType==="cast"){const c=cast.find(x=>String(x.id)===String(s.personId));return c?`#${c.roleNum} ${c.name}`:"—";}return crew.find(c=>c.id===s.personId)?.name||"—";};
  const getCostumeTime=(personId,dayId)=>{const d=days.find(x=>x.id===dayId);const cs=d?.callSheet?.cast?.[String(personId)];return cs?.costume||"";};

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
      }));
      // Sync pickup times for stops at same address
      setRoutes(prev=>prev.map(r=>{
        if(r.id!==route.id)return r;
        const pk=r.stops.filter(s=>s.type==="pickup");
        const addrMap={};
        pk.forEach(s=>{const a=(s.address||"").trim().toLowerCase();if(!addrMap[a])addrMap[a]=s.pickupTime;});
        const synced=r.stops.map(s=>{if(s.type!=="pickup")return s;const a=(s.address||"").trim().toLowerCase();return{...s,pickupTime:addrMap[a]||s.pickupTime};});
        return{...r,stops:synced};
      }));
      setCalc(null);
    }catch(err){setCalcErr(err.message);setCalc(null);}
  };

  const showDispatch=(route)=>{
    const v=vehicles.find(x=>x.id===route.vehicleId);const drv=crew.find(c=>c.id===v?.driverId);
    const pk=route.stops.filter(s=>s.type==="pickup");const dest=route.stops.find(s=>s.type==="destination");const dLoc=locations.find(l=>l.id===dest?.locationId);
    const callTime=fmtTime(dest?.arrivalTime);
    const msgs=pk.map(s=>{
      const name=gPN(s);
      let msg=travellerTpl.replace(/\{name\}/g,name).replace(/\{time\}/g,fmtTime(s.pickupTime)).replace(/\{address\}/g,s.address||"").replace(/\{callTime\}/g,callTime);
      return{to:name,msg};
    });
    const stopsList=pk.map(s=>`> ${fmtTime(s.pickupTime)} ${gPN(s)} — ${s.address}`).join("\n");
    const dMsg=drv?{to:drv.name+" (Driver)",msg:driverTpl.replace(/\{routeLabel\}/g,route.label).replace(/\{departTime\}/g,fmtTime(route.driverDepart||"?")).replace(/\{stopsList\}/g,stopsList).replace(/\{callTime\}/g,callTime).replace(/\{destination\}/g,dLoc?.name||dest?.address||"").replace(/\{mapsUrl\}/g,route.gmapsUrl||"N/A")}:null;
    setDispPrev({route,msgs,dMsg});
  };

  const openNV=()=>{setVf({type:"van8",plate:"",label:"",driverId:null,color:"#3b82f6"});setEditVeh("new");};
  const saveV=()=>{if(editVeh==="new")setVehicles(p=>[...p,{...vf,id:"v"+Date.now()}]);else setVehicles(p=>p.map(v=>v.id===vf.id?vf:v));setEditVeh(null);};
  const openNR=()=>{
    const newRf = {vehicleId:vehicles[0]?.id||"",dayId:selDay,label:`Route — ${day?.label||""}`,stops:[{_id:"dest_"+Date.now(),type:"destination",locationId:locations[0]?.id||"",address:locations[0]?.address||"",arrivalTime:day?.callTime||"06:00",estDrive:0}],notes:"",status:"draft"};
    setRf(newRf);
    setEditRoute("new");
  };
  const saveR=()=>{if(editRoute==="new")setRoutes(p=>[...p,{...rf,id:"r"+Date.now(),optimized:false,demo:false,gmapsUrl:"",totalDrive:null,totalDistance:null,trafficSummary:""}]);else setRoutes(p=>p.map(r=>r.id===rf.id?rf:r));setEditRoute(null);};
  const addSt=()=>{
    setRf(prev => {
      const s = [...(prev.stops||[])];
      const di = s.findIndex(x => x.type === "destination");
      const newStop = {_id:"s"+Date.now()+"_"+Math.random().toString(36).slice(2,6),type:"pickup",personType:"cast",personId:"",address:"",pickupTime:"",estDrive:15,distance:"",trafficNote:""};
      if (di >= 0) s.splice(di, 0, newStop); else s.push(newStop);
      return {...prev, stops: s};
    });
  };
  const upSt=(id,f,v)=>{
    setRf(prev => {
      const s = (prev.stops||[]).map(x=>x._id===id?{...x,[f]:v}:x);
      if(f==="personId"&&v){const st=s.find(x=>x._id===id);if(st){const p=allP.find(x=>String(x.id)===String(v)&&x.type===st.personType);if(p)st.address=p.address||"";}}
      return {...prev, stops: s};
    });
  };
  const rmSt=(id)=>setRf(prev=>({...prev,stops:prev.stops.filter(x=>x._id!==id)}));

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Transport</h2><p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>{vehicles.length} vehicles · {drivers.length} drivers · {routes.length} routes</p></div>
      <div style={{display:"flex",gap:8}}>{viewMode==="routes"&&<><button onClick={()=>setEditTpl(true)} style={{...BS,fontSize:11}}><I.Edit/> Templates</button><button onClick={openNR} style={BP}><span style={{display:"flex",alignItems:"center",gap:5}}><I.Plus/> Route</span></button></>}{viewMode==="fleet"&&<button onClick={openNV} style={BP}><span style={{display:"flex",alignItems:"center",gap:5}}><I.Plus/> Vehicle</span></button>}</div>
    </div>
    <div style={{display:"flex",gap:4,marginBottom:16}}>
      {[{id:"routes",l:"Routes"},{id:"fleet",l:`Fleet (${vehicles.length})`},{id:"drivers",l:`Drivers (${drivers.length})`}].map(t=><button key={t.id} onClick={()=>setViewMode(t.id)} style={{padding:"7px 16px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:viewMode===t.id?"#E8C94A18":"transparent",border:`1px solid ${viewMode===t.id?"#E8C94A44":"#2a2d35"}`,color:viewMode===t.id?"#E8C94A":"#888"}}>{t.l}</button>)}
    </div>
    {viewMode==="routes"&&<div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>{days.map(d=><button key={d.id} onClick={()=>setSelDay(d.id)} style={{padding:"6px 14px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:selDay===d.id?"#3b82f618":"transparent",border:`1px solid ${selDay===d.id?"#3b82f644":"#2a2d35"}`,color:selDay===d.id?"#3b82f6":"#888"}}>{d.label} · {fmtDate(d.date)}</button>)}</div>
      {/* Cast call times for this day — clean table */}
      {day&&(()=>{const dayStrips=day.strips.map(sid=>strips.find(s=>s.id===sid)).filter(Boolean);const dayCastIds=[...new Set(dayStrips.flatMap(s=>s.cast))];const dayCastList=dayCastIds.map(id=>cast.find(c=>c.id===id)).filter(Boolean);if(dayCastList.length===0)return null;return<div style={{background:"#12141a",border:"1px solid #1e2028",borderRadius:8,marginBottom:16,overflow:"hidden"}}>
        <div style={{padding:"8px 12px",borderBottom:"1px solid #1e2028",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:10,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:"0.04em"}}>Cast Call Times — {day.label}</span>
          <span style={{fontSize:9,color:"#555"}}>Set times in Call Sheet</span>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["#","Name","Costume","Makeup","On Set"].map(h=><th key={h} style={{padding:"4px 10px",fontSize:9,fontWeight:700,color:"#555",textTransform:"uppercase",textAlign:"left",borderBottom:"1px solid #1a1d23"}}>{h}</th>)}</tr></thead>
          <tbody>
            {dayCastList.map(c=>{const d=day.callSheet?.cast?.[String(c.id)];return<tr key={c.id} style={{borderBottom:"1px solid #1a1d23"}}>
              <td style={{padding:"4px 10px",fontSize:11,fontWeight:800,color:"#E8C94A"}}>{c.roleNum}</td>
              <td style={{padding:"4px 10px",fontSize:11,fontWeight:600,color:"#ccc"}}>{c.name}</td>
              <td style={{padding:"4px 10px",fontSize:11,fontWeight:600,color:"#f59e0b",fontFamily:"monospace"}}>{d?.costume||"—"}</td>
              <td style={{padding:"4px 10px",fontSize:11,fontWeight:600,color:"#a855f7",fontFamily:"monospace"}}>{d?.makeup||"—"}</td>
              <td style={{padding:"4px 10px",fontSize:11,fontWeight:600,color:"#22c55e",fontFamily:"monospace"}}>{d?.onSet||"—"}</td>
            </tr>;})}
          </tbody>
        </table>
      </div>;})()}
      {calcErr&&<div style={{background:"#f59e0b18",border:"1px solid #f59e0b33",borderRadius:6,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#f59e0b"}}><I.AlertTriangle/> {calcErr}</div>}
      {dayR.length===0&&<div style={{textAlign:"center",padding:50,color:"#555"}}><div style={{fontSize:36,marginBottom:12}}>{"\u{1F690}"}</div><div style={{fontSize:14,marginBottom:8}}>No routes for {day?.label||"this day"}</div><button onClick={openNR} style={BP}>Create Route</button></div>}
      {dayR.map(route=>{const v=vehicles.find(x=>x.id===route.vehicleId);const vt=VEHICLE_TYPES.find(t=>t.id===v?.type);const drv=crew.find(c=>c.id===v?.driverId);const pk=route.stops.filter(s=>s.type==="pickup");const dest=route.stops.find(s=>s.type==="destination");const dLoc=locations.find(l=>l.id===dest?.locationId);
      return<div key={route.id} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,marginBottom:12,overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:"#1e2128",borderBottom:"1px solid #2a2d35"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{width:10,height:10,borderRadius:"50%",background:v?.color||"#555"}}/><span style={{fontWeight:700,color:"#f0f0f0",fontSize:14}}>{route.label}</span>{route.demo&&<span style={{fontSize:9,color:"#f59e0b",background:"#f59e0b18",padding:"2px 6px",borderRadius:3,fontWeight:700}}>DEMO</span>}<StatusBadge status={route.status}/></div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>calcRoute(route)} disabled={calc===route.id} style={{...BS,padding:"6px 12px",fontSize:11}}>{calc===route.id?<><I.Loader/> Calculating...</>:<><I.Route/> Calculate Route</>}</button>
            {route.optimized&&<button onClick={()=>showDispatch(route)} style={{...BS,padding:"6px 12px",fontSize:11,borderColor:"#3b82f633",color:"#3b82f6"}}><I.Send/> Dispatch</button>}
            <button onClick={()=>{const dest=route.stops.find(s=>s.type==="destination");const arrT=dest?.arrivalTime||day?.callTime||"06:00";const turnaround=route.totalDrive?route.totalDrive+15:45;const newRun={runLabel:`Trip ${(route.runs||[]).length+2}`,stops:[{type:"destination",locationId:dest?.locationId||"",address:dest?.address||"",arrivalTime:addMin(arrT,turnaround),estDrive:0}],optimized:false,totalDrive:null,totalDistance:null};setRoutes(p=>p.map(r=>r.id===route.id?{...r,runs:[...(r.runs||[]),newRun]}:r));}} style={{...BS,padding:"6px 12px",fontSize:11}} title="Add another trip with this vehicle"><I.Plus/> Run</button>
            <button onClick={()=>{setRf({...route,stops:route.stops.map((s,idx)=>({...s,_id:s._id||"s"+Date.now()+"_"+idx}))});setEditRoute(route);}} style={{...BS,padding:"6px 12px",fontSize:11}}><I.Edit/></button>
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
            {pk.map((s,i)=>{const sameAddr=pk.filter(x=>x.address&&s.address&&x.address.trim().toLowerCase()===s.address.trim().toLowerCase());const isFirst=sameAddr[0]===s;const groupNames=sameAddr.length>1&&isFirst?sameAddr.map(x=>gPN(x)).join(", "):null;
            return<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"#12141a",borderRadius:6,border:"1px solid #1e2028"}}>
              <span style={{width:22,height:22,borderRadius:"50%",background:"#E8C94A18",color:"#E8C94A",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#f0f0f0"}}>{gPN(s)}<span style={{fontSize:10,color:"#666",marginLeft:6}}>{s.personType}</span>{s.personType==="cast"&&getCostumeTime(s.personId,selDay)&&<span style={{fontSize:10,color:"#f59e0b",marginLeft:6}}>costume {getCostumeTime(s.personId,selDay)}</span>}{groupNames&&<span style={{fontSize:10,color:"#E8C94A",marginLeft:6}}>+{sameAddr.length-1} same location</span>}</div><div style={{fontSize:11,color:"#888"}}>{s.address}</div></div>
              {s.pickupTime&&<span style={{fontSize:14,fontWeight:800,color:"#E8C94A",flexShrink:0}}>{fmtTime(s.pickupTime)}</span>}
              {s.distance&&<span style={{fontSize:10,color:"#666"}}>{toKm(s.distance)} km</span>}
              <TrafficBadge note={s.trafficNote}/>
            </div>;})}
            {dest&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"#22c55e08",borderRadius:6,border:"1px solid #22c55e22"}}>
              <span style={{width:22,height:22,borderRadius:"50%",background:"#22c55e18",color:"#22c55e",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{"\u2713"}</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#22c55e"}}>ARRIVE — {dLoc?.name||dest.address}</div></div>
              <span style={{fontSize:14,fontWeight:800,color:"#22c55e"}}>{fmtTime(dest.arrivalTime)}</span>
            </div>}
          </div>
          {route.gmapsUrl&&<a href={route.gmapsUrl} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:10,fontSize:11,color:"#3b82f6",textDecoration:"none"}}>Open in Google Maps <I.ExternalLink/></a>}
          {/* Additional Runs */}
          {route.runs&&route.runs.length>0&&route.runs.map((run,ri)=>{const rDest=run.stops.find(s=>s.type==="destination");const rPk=run.stops.filter(s=>s.type==="pickup");const rDLoc=locations.find(l=>l.id===rDest?.locationId);
          return<div key={ri} style={{marginTop:14,paddingTop:14,borderTop:"1px dashed #333"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:13,fontWeight:700,color:"#f59e0b"}}>{run.runLabel||`Trip ${ri+2}`}</span>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>{const newRuns=[...(route.runs||[])];const r=newRuns[ri];const newStops=[...r.stops];const di=newStops.findIndex(x=>x.type==="destination");newStops.splice(di,0,{type:"pickup",personType:"cast",personId:"",address:"",pickupTime:"",estDrive:15});newRuns[ri]={...r,stops:newStops};setRoutes(p=>p.map(x=>x.id===route.id?{...x,runs:newRuns}:x));}} style={{...BS,padding:"4px 8px",fontSize:10}}><I.Plus/> Stop</button>
                <button onClick={()=>{const newRuns=(route.runs||[]).filter((_,j)=>j!==ri);setRoutes(p=>p.map(x=>x.id===route.id?{...x,runs:newRuns}:x));}} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:2}}><I.Trash/></button>
              </div>
            </div>
            {rPk.length===0&&<div style={{fontSize:11,color:"#555",fontStyle:"italic",marginBottom:6}}>No pickups yet — add stops above</div>}
            {rPk.map((s,si)=><div key={si} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",background:"#12141a",borderRadius:6,border:"1px solid #1e2028",marginBottom:4}}>
              <span style={{width:18,height:18,borderRadius:"50%",background:"#f59e0b18",color:"#f59e0b",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{si+1}</span>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:"#f0f0f0"}}>{gPN(s)}</div><div style={{fontSize:10,color:"#888"}}>{s.address}</div></div>
              {s.pickupTime&&<span style={{fontSize:13,fontWeight:800,color:"#f59e0b"}}>{fmtTime(s.pickupTime)}</span>}
            </div>)}
            {rDest&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",background:"#22c55e08",borderRadius:6,border:"1px solid #22c55e22"}}>
              <span style={{width:18,height:18,borderRadius:"50%",background:"#22c55e18",color:"#22c55e",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{"\u2713"}</span>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:"#22c55e"}}>ARRIVE — {rDLoc?.name||rDest.address}</div></div>
              <span style={{fontSize:13,fontWeight:800,color:"#22c55e"}}>{fmtTime(rDest.arrivalTime)}</span>
            </div>}
          </div>;})}
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
        {(rf.stops||[]).map(s=>s.type==="pickup"?<div key={s._id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
          <select value={s.personType} onChange={e=>upSt(s._id,"personType",e.target.value)} style={{...IS,width:80}}><option value="cast">Cast</option><option value="crew">Crew</option></select>
          <select value={s.personId||""} onChange={e=>upSt(s._id,"personId",e.target.value)} style={{...IS,flex:1}}><option value="">— Select —</option>{allP.filter(p=>p.type===s.personType).map(p=><option key={p.id} value={p.id}>{p.roleNum ? `#${p.roleNum} ` : ""}{p.name} ({p.role})</option>)}</select>
          <AddressInput value={s.address} onChange={v=>upSt(s._id,"address",v)} placeholder="Address" style={{flex:1}}/>
          <button onClick={()=>rmSt(s._id)} style={{background:"none",border:"none",color:"#555",cursor:"pointer"}}><I.Trash/></button>
        </div>:
        <div key={s._id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6,padding:8,background:"#22c55e08",borderRadius:6}}>
          <span style={{fontSize:11,fontWeight:700,color:"#22c55e",width:60,flexShrink:0}}>DEST</span>
          <button onClick={()=>setRf(prev=>{const newStops=prev.stops.map(x=>x._id===s._id?{...x,manualAddr:!x.manualAddr}:x);return{...prev,stops:newStops};})} style={{...BS,padding:"4px 8px",fontSize:10,flexShrink:0}}>{s.manualAddr?"📍 Location":"✏️ Manual"}</button>
          {!s.manualAddr?<select value={s.locationId||""} onChange={e=>{const locId=e.target.value;const loc=locations.find(l=>l.id===locId);setRf(prev=>({...prev,stops:prev.stops.map(x=>x._id===s._id?{...x,locationId:locId,address:loc?.address||x.address}:x)}));}} style={{...IS,flex:1}}><option value="">—</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>
          :<AddressInput value={s.address} onChange={v=>setRf(prev=>({...prev,stops:prev.stops.map(x=>x._id===s._id?{...x,address:v,locationId:""}:x)}))} placeholder="Type destination address..."/>}
          <input type="time" value={s.arrivalTime||""} onChange={e=>upSt(s._id,"arrivalTime",e.target.value)} style={{...IS,width:120}}/>
        </div>)}
        <button onClick={addSt} style={{...BS,width:"100%",marginTop:4}}><I.Plus/> Add Pickup Stop</button>
      </div>
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
    {/* Dispatch Preview Modal — editable messages */}
    {dispPrev&&<Modal title="Dispatch Preview (Test Mode)" onClose={()=>setDispPrev(null)} width={600}>
      <div style={{padding:10,background:"#f59e0b18",border:"1px solid #f59e0b33",borderRadius:6,marginBottom:16,fontSize:12,color:"#f59e0b"}}><I.AlertTriangle/> TEST MODE — No messages will be sent. Edit messages below before dispatching.</div>
      <h4 style={{margin:"0 0 10px",fontSize:13,fontWeight:700,color:"#f0f0f0"}}>Traveller Messages</h4>
      {dispPrev.msgs.map((m,i)=><div key={i} style={{background:"#12141a",border:"1px solid #2a2d35",borderRadius:6,padding:12,marginBottom:8}}>
        <div style={{fontSize:11,fontWeight:700,color:"#E8C94A",marginBottom:4}}>To: {m.to}</div>
        <textarea value={m.msg} onChange={e=>{const nm=[...dispPrev.msgs];nm[i]={...nm[i],msg:e.target.value};setDispPrev({...dispPrev,msgs:nm});}} rows={3} style={{...IS,resize:"vertical",fontSize:12}}/>
      </div>)}
      {dispPrev.dMsg&&<><h4 style={{margin:"16px 0 10px",fontSize:13,fontWeight:700,color:"#f0f0f0"}}>Driver Message</h4>
        <div style={{background:"#12141a",border:"1px solid #3b82f633",borderRadius:6,padding:12}}>
          <div style={{fontSize:11,fontWeight:700,color:"#3b82f6",marginBottom:4}}>To: {dispPrev.dMsg.to}</div>
          <textarea value={dispPrev.dMsg.msg} onChange={e=>setDispPrev({...dispPrev,dMsg:{...dispPrev.dMsg,msg:e.target.value}})} rows={8} style={{...IS,resize:"vertical",fontSize:12,fontFamily:"monospace"}}/>
        </div></>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20}}><button onClick={()=>{setRoutes(p=>p.map(r=>r.id===dispPrev.route.id?{...r,status:"dispatched"}:r));setDispPrev(null);}} style={{...BP,background:"#3b82f6",color:"#fff"}}><I.Send/> Mark as Dispatched</button><button onClick={()=>setDispPrev(null)} style={BS}>Close</button></div>
    </Modal>}
    {/* Template Editor Modal */}
    {editTpl&&<Modal title="Dispatch Message Templates" onClose={()=>setEditTpl(false)} width={600}>
      <p style={{fontSize:12,color:"#888",marginBottom:16}}>Customize the default messages. Variables: <span style={{color:"#E8C94A",fontFamily:"monospace"}}>{"{name}"} {"{time}"} {"{address}"} {"{callTime}"}</span> for travellers, <span style={{color:"#3b82f6",fontFamily:"monospace"}}>{"{routeLabel}"} {"{departTime}"} {"{stopsList}"} {"{callTime}"} {"{destination}"} {"{mapsUrl}"}</span> for driver.</p>
      <div style={{marginBottom:16}}><label style={LS}>Traveller Message Template</label><textarea value={travellerTpl} onChange={e=>setTravellerTpl(e.target.value)} rows={4} style={{...IS,resize:"vertical",fontSize:12}}/></div>
      <div style={{marginBottom:16}}><label style={LS}>Driver Message Template</label><textarea value={driverTpl} onChange={e=>setDriverTpl(e.target.value)} rows={6} style={{...IS,resize:"vertical",fontSize:12,fontFamily:"monospace"}}/></div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><button onClick={()=>setEditTpl(false)} style={BS}>Cancel</button><button onClick={saveTpl} style={BP}>Save Templates</button></div>
    </Modal>}
  </div>;
};
export { TransportModule };
