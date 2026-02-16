import { useState } from "react";
import { STRIP_COLORS, KEY_ROLES, fmtTime, fmtDate, I } from "./config.jsx";

const DashboardModule = ({ project, setTab }) => {
  const { crew, days, strips, routes, vehicles, locations, cast, schedule } = project;
  const [selDayId, setSelDayId] = useState(null);
  const sched = schedule || {};
  const schedCounts = {};
  Object.values(sched).forEach(t => { if (t) schedCounts[t] = (schedCounts[t] || 0) + 1; });
  const stats = [{l:"Crew",v:crew.length,c:"#3b82f6"},{l:"Shoot Days",v:`${schedCounts.shoot||0}/${project.shootingDays||"—"}`,c:"#E8C94A"},{l:"Scenes",v:strips.length,c:"#22c55e"},{l:"Locations",v:locations.length,c:"#f59e0b"}];
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
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h3 style={{margin:0,fontSize:16,fontWeight:800,color:"#E8C94A"}}>{sd.label} — {fmtDate(sd.date)}</h3><span style={{fontSize:12,color:"#888"}}>{fmtTime(sd.callTime)}–{fmtTime(sd.wrapTime || "18:00")}</span></div>
      <div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:8}}>Scenes</div>
        {ss.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #222"}}><span style={{width:8,height:8,borderRadius:2,background:STRIP_COLORS[s.type]}}/><span style={{fontSize:13,fontWeight:700,color:"#f0f0f0",minWidth:36}}>Sc.{s.scene}</span><span style={{fontSize:10,color:STRIP_COLORS[s.type],fontWeight:700}}>{s.type}</span><span style={{fontSize:12,color:"#aaa",flex:1}}>{s.synopsis}</span>{(s.startTime||s.endTime)&&<span style={{fontSize:11,color:"#888"}}>{s.startTime||"?"} – {s.endTime||"?"}</span>}<span style={{fontSize:11,color:"#666"}}>{s.pages}pg</span></div>)}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div><div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:8}}>Cast</div>{sc.map(id=>{const c=cast.find(x=>x.id===id);return c?<div key={id} style={{fontSize:12,color:"#ddd",padding:"3px 0"}}><span style={{color:"#E8C94A",fontWeight:700}}>{c.roleNum}</span> {c.name} <span style={{color:"#666"}}>— {c.roleName}</span></div>:null;})}</div>
        <div><div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:8}}>Transport</div>{sr.length===0?<div style={{fontSize:12,color:"#555"}}>No routes</div>:sr.map(r=>{const v=vehicles.find(x=>x.id===r.vehicleId);return<div key={r.id} style={{fontSize:12,color:"#ddd",padding:"3px 0"}}><span style={{width:6,height:6,borderRadius:"50%",background:v?.color||"#555",display:"inline-block",marginRight:6}}/>{r.label}{r.totalDrive&&<span style={{color:"#888"}}> · {r.totalDrive}min</span>}</div>;})}</div>
      </div>
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
      {[{l:"People",i:"\u{1F465}",t:"people"},{l:"Scenes",i:"\u{1F3AC}",t:"scenes"},{l:"Stripboard",i:"\u{1F4CB}",t:"stripboard"},{l:"Locations",i:"\u{1F4CD}",t:"locations"},{l:"Transport",i:"\u{1F690}",t:"transport"},{l:"Call Sheet",i:"\u{1F4C4}",t:"callsheet"},{l:"Calendar",i:"\u{1F4C5}",t:"calendar"},{l:"Project",i:"\u2699\uFE0F",t:"project"}].map(a=>
        <button key={a.t} onClick={()=>setTab(a.t)} style={{display:"flex",alignItems:"center",gap:8,background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:8,padding:"10px 12px",color:"#ddd",fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}><span style={{fontSize:16}}>{a.i}</span>{a.l}</button>)}
    </div>
  </div>;
};
export { DashboardModule };
