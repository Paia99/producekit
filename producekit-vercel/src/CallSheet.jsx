import { useState } from "react";
import { STRIP_COLORS, VEHICLE_TYPES, KEY_ROLES, fmtTime, fmtDate } from "./config.jsx";

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
export { CallSheetModule };
