import { useState } from "react";
import { STRIP_COLORS, VEHICLE_TYPES, KEY_ROLES, DEPARTMENTS, fmtTime, fmtDate, subMin, I } from "./config.jsx";

/* ── tiny inline time input ──────────────────────────────── */
const TI = ({ value, onChange, color }) => (
  <input type="time" value={value || ""} onChange={e => onChange(e.target.value)}
    style={{ background:"transparent", border:"1px solid #2a2d35", borderRadius:3,
      color: color || "#ccc", fontSize:11, fontWeight:600, padding:"2px 4px", width:72,
      fontFamily:"inherit", outline:"none" }}
    onClick={e => e.stopPropagation()} />
);

/* ── section header ──────────────────────────────────────── */
const SH = ({ children }) => (
  <h4 style={{margin:"18px 0 8px",fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px solid #222",paddingBottom:6}}>{children}</h4>
);

/* ── table styles ────────────────────────────────────────── */
const thS = { padding:"5px 8px", textAlign:"left", color:"#666", fontWeight:700, fontSize:9, textTransform:"uppercase", letterSpacing:"0.03em" };
const tdS = { padding:"5px 8px", fontSize:11, borderBottom:"1px solid #1a1d23" };

/* ── default offsets (minutes before onSet) ──────────────── */
const MAKEUP_OFFSET = 10;
const COSTUME_OFFSET = 20;

const CallSheetModule = ({ project, setProject }) => {
  const { days, strips, crew, cast, vehicles, routes, locations } = project;
  const [selDayId, setSelDayId] = useState(days[0]?.id || "");

  const day = days.find(d => d.id === selDayId);
  const dayIdx = days.findIndex(d => d.id === selDayId);
  const nextDay = dayIdx >= 0 && dayIdx < days.length - 1 ? days[dayIdx + 1] : null;

  const dayStrips = day ? day.strips.map(sid => strips.find(s => s.id === sid)).filter(Boolean) : [];
  const dayCastIds = [...new Set(dayStrips.flatMap(s => s.cast))];
  const dayCast = dayCastIds.map(id => cast.find(c => c.id === id)).filter(Boolean);
  const dayRoutes = routes.filter(r => r.dayId === selDayId);

  const gLoc = id => locations.find(l => l.id === id);

  // CallSheet data on day: day.callSheet = { cast:{}, crew:{}, requirements:"" }
  const cs = day?.callSheet || {};
  const csCast = cs.cast || {};
  const csCrew = cs.crew || {};

  // Scenes a cast member appears in for this day
  const castScenes = (castId) => dayStrips.filter(s => (s.cast || []).includes(castId));

  // Pickup time from transport routes
  const getPickup = (castId) => {
    for (const r of dayRoutes) {
      const stop = (r.stops || []).find(s => s.type === "pickup" && s.personType === "cast" && String(s.personId) === String(castId));
      if (stop) return stop.pickupTime;
    }
    return "";
  };

  // Auto-calculate default times
  const defaultTimes = () => {
    const onSet = day?.callTime || "06:00";
    return { costume: subMin(onSet, COSTUME_OFFSET), makeup: subMin(onSet, MAKEUP_OFFSET), onSet, notes: "" };
  };

  // Get cast CS data with defaults
  const getCastCS = (castId) => {
    const key = String(castId);
    return csCast[key] || defaultTimes();
  };

  // Update cast call sheet data
  const updateCastCS = (castId, field, value) => {
    const key = String(castId);
    const current = getCastCS(castId);
    const updated = { ...current, [field]: value };

    // Recalc costume/makeup if onSet changed and they match old defaults
    if (field === "onSet") {
      const oldCostumeDefault = subMin(current.onSet, COSTUME_OFFSET);
      const oldMakeupDefault = subMin(current.onSet, MAKEUP_OFFSET);
      if (current.costume === oldCostumeDefault) updated.costume = subMin(value, COSTUME_OFFSET);
      if (current.makeup === oldMakeupDefault) updated.makeup = subMin(value, MAKEUP_OFFSET);
    }

    persistCS({ cast: { ...csCast, [key]: updated } });
  };

  // Get crew CS data
  const getCrewCS = (crewId) => csCrew[crewId] || { call: day?.callTime || "06:00", notes: "" };

  const updateCrewCS = (crewId, field, value) => {
    const current = getCrewCS(crewId);
    persistCS({ crew: { ...csCrew, [crewId]: { ...current, [field]: value } } });
  };

  // Persist to project state
  const persistCS = (patch) => {
    if (!day || !setProject) return;
    const newCS = { ...cs, ...patch };
    setProject(prev => ({
      ...prev,
      days: prev.days.map(d => d.id === selDayId ? { ...d, callSheet: newCS } : d),
    }));
  };

  // Group crew by department
  const crewByDept = {};
  crew.forEach(c => {
    const dept = c.dept || "Other";
    if (!crewByDept[dept]) crewByDept[dept] = [];
    crewByDept[dept].push(c);
  });

  // Next day scenes
  const nextDayStrips = nextDay ? nextDay.strips.map(sid => strips.find(s => s.id === sid)).filter(Boolean) : [];

  // Sort cast by onSet time
  const sortedCast = [...dayCast].sort((a, b) => {
    const ta = getCastCS(a.id).onSet || "99:99";
    const tb = getCastCS(b.id).onSet || "99:99";
    return ta.localeCompare(tb);
  });

  if (!day) return <div>
    <h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0",marginBottom:12}}>Call Sheet</h2>
    <div style={{background:"#1a1d23",border:"1px dashed #2a2d35",borderRadius:10,padding:30,textAlign:"center",color:"#555",fontSize:13}}>
      No shooting days. Add shoot days in Calendar.
    </div>
  </div>;

  return <div>
    {/* Day selector */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Call Sheet</h2>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {days.map(d => <button key={d.id} onClick={() => setSelDayId(d.id)} style={{
        padding:"5px 12px", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer",
        fontFamily:"inherit", background:selDayId===d.id?"#E8C94A18":"transparent",
        border:`1px solid ${selDayId===d.id?"#E8C94A44":"#2a2d35"}`,
        color:selDayId===d.id?"#E8C94A":"#888",
      }}>{d.label} · {fmtDate(d.date)}</button>)}
    </div>

    <div style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,overflow:"hidden"}}>

      {/* ── COMPACT HEADER ────────────────────────────── */}
      <div style={{padding:"14px 20px",background:"#1e2128",borderBottom:"1px solid #2a2d35",display:"grid",gridTemplateColumns:"1fr auto",gap:16}}>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:"#E8C94A"}}>{project.name}</div>
          <div style={{fontSize:11,color:"#888",marginTop:2}}>{project.production}{project.idec ? ` · IDEC: ${project.idec}` : ""}</div>
          {project.keyRoles && <div style={{fontSize:10,color:"#555",marginTop:3}}>
            {["Director","DOP","1st AD","Sound"].filter(r=>project.keyRoles[r]).map(r=>`${r}: ${project.keyRoles[r]}`).join(" · ")}
          </div>}
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:16,fontWeight:800,color:"#f0f0f0"}}>{day.label}</div>
          <div style={{fontSize:12,color:"#888"}}>{fmtDate(day.date)}</div>
          <div style={{fontSize:14,fontWeight:800,color:"#E8C94A",marginTop:2}}>
            {fmtTime(day.callTime)}–{fmtTime(day.wrapTime || "18:00")}
          </div>
        </div>
      </div>

      <div style={{padding:"10px 20px 20px"}}>

        {/* ── SCENES ──────────────────────────────────── */}
        <SH>Scenes ({dayStrips.length} · {dayStrips.reduce((s,x)=>s+(x.pages||0),0).toFixed(1)} pages)</SH>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
            <thead><tr style={{borderBottom:"1px solid #333"}}>
              {["Sc","Synopsis","Cast","Type","Pgs","Location","Time"].map(h =>
                <th key={h} style={thS}>{h}</th>
              )}
            </tr></thead>
            <tbody>
              {dayStrips.map(s => {
                const loc = gLoc(s.locationId);
                return <tr key={s.id} style={{borderBottom:"1px solid #1e2028"}}>
                  <td style={{...tdS,fontWeight:800,color:"#f0f0f0",width:40}}>{s.scene}</td>
                  <td style={{...tdS,color:"#aaa",maxWidth:240}}>{s.synopsis}</td>
                  <td style={{...tdS,color:"#E8C94A",fontWeight:600,fontSize:10}}>
                    {(s.cast||[]).map(id => { const c = cast.find(x=>x.id===id); return c?.roleNum || id; }).join(", ")}
                  </td>
                  <td style={tdS}><span style={{color:STRIP_COLORS[s.type],fontWeight:700,fontSize:9,background:STRIP_COLORS[s.type]+"18",padding:"1px 5px",borderRadius:3}}>{s.type}</span></td>
                  <td style={{...tdS,color:"#888",width:40}}>{s.pages}</td>
                  <td style={{...tdS,color:"#888",fontSize:10}}>{loc?.name || "—"}</td>
                  <td style={{...tdS,color:"#3b82f6",fontWeight:600,fontSize:10,width:80,whiteSpace:"nowrap"}}>
                    {s.startTime && s.endTime ? `${s.startTime}–${s.endTime}` : "—"}
                  </td>
                </tr>;
              })}
              {dayStrips.length === 0 && <tr><td colSpan={7} style={{...tdS,textAlign:"center",color:"#555",padding:16}}>No scenes assigned to this day</td></tr>}
            </tbody>
          </table>
        </div>

        {/* ── CAST ────────────────────────────────────── */}
        <SH>Cast ({dayCast.length})</SH>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:750}}>
            <thead><tr style={{borderBottom:"1px solid #333"}}>
              {["#","Character","Actor","Scenes","Costume","Makeup","On Set","Pickup","Notes"].map(h =>
                <th key={h} style={thS}>{h}</th>
              )}
            </tr></thead>
            <tbody>
              {sortedCast.map(c => {
                const csData = getCastCS(c.id);
                const scenes = castScenes(c.id);
                const pickup = getPickup(c.id);
                return <tr key={c.id} style={{borderBottom:"1px solid #1e2028"}}>
                  <td style={{...tdS,fontWeight:800,color:"#E8C94A",width:30}}>{c.roleNum}</td>
                  <td style={{...tdS,color:"#aaa",fontWeight:600,fontSize:10}}>{c.roleName}</td>
                  <td style={{...tdS,color:"#f0f0f0",fontWeight:600}}>{c.name}</td>
                  <td style={{...tdS,color:"#888",fontSize:10,maxWidth:120}}>{scenes.map(s=>s.scene).join(", ")}</td>
                  <td style={{...tdS,width:78}}><TI value={csData.costume} onChange={v=>updateCastCS(c.id,"costume",v)} /></td>
                  <td style={{...tdS,width:78}}><TI value={csData.makeup} onChange={v=>updateCastCS(c.id,"makeup",v)} /></td>
                  <td style={{...tdS,width:78}}><TI value={csData.onSet} onChange={v=>updateCastCS(c.id,"onSet",v)} color="#E8C94A" /></td>
                  <td style={{...tdS,width:78}}>{pickup ? <span style={{fontSize:11,fontWeight:600,color:"#22c55e"}}>{fmtTime(pickup)}</span> : <span style={{color:"#555",fontSize:10}}>—</span>}</td>
                  <td style={{...tdS,width:120}}>
                    <input value={csData.notes || ""} onChange={e=>updateCastCS(c.id,"notes",e.target.value)}
                      placeholder="..." style={{background:"transparent",border:"1px solid #2a2d35",borderRadius:3,color:"#888",fontSize:10,padding:"2px 6px",width:"100%",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}
                      onClick={e=>e.stopPropagation()} />
                  </td>
                </tr>;
              })}
              {dayCast.length === 0 && <tr><td colSpan={9} style={{...tdS,textAlign:"center",color:"#555",padding:16}}>No cast in this day's scenes</td></tr>}
            </tbody>
          </table>
        </div>

        {/* ── CREW CALLS ──────────────────────────────── */}
        <SH>Crew Calls ({crew.length})</SH>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:8}}>
          {DEPARTMENTS.filter(dept => crewByDept[dept]?.length > 0).map(dept => (
            <div key={dept} style={{background:"#12141a",borderRadius:6,border:"1px solid #1e2028",padding:"8px 10px"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#666",textTransform:"uppercase",marginBottom:6}}>{dept}</div>
              {crewByDept[dept].map(c => {
                const crewData = getCrewCS(c.id);
                return <div key={c.id} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0",fontSize:11}}>
                  <TI value={crewData.call} onChange={v=>updateCrewCS(c.id,"call",v)} />
                  <span style={{color:"#ccc",fontWeight:600,flex:1}}>{c.name}</span>
                  <span style={{color:"#555",fontSize:10}}>{c.role}</span>
                </div>;
              })}
            </div>
          ))}
        </div>

        {/* ── REQUIREMENTS ────────────────────────────── */}
        <SH>Requirements / Notes</SH>
        <textarea
          value={cs.requirements || ""}
          onChange={e => persistCS({ requirements: e.target.value })}
          placeholder="Props, set dressing, special instructions..."
          rows={3}
          style={{width:"100%",background:"#12141a",border:"1px solid #2a2d35",borderRadius:6,color:"#ccc",fontSize:12,padding:"10px 12px",fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box"}}
        />

        {/* ── NEXT DAY PREVIEW ────────────────────────── */}
        {nextDay && <div>
          <SH>Next Day — {nextDay.label} · {fmtDate(nextDay.date)} · {fmtTime(nextDay.callTime)}–{fmtTime(nextDay.wrapTime || "18:00")}</SH>
          {nextDayStrips.length > 0 ? (
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {nextDayStrips.map(s => {
                const loc = gLoc(s.locationId);
                return <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:11,padding:"4px 0",borderBottom:"1px solid #1a1d23"}}>
                  <span style={{fontWeight:800,color:"#888",minWidth:36}}>Sc.{s.scene}</span>
                  <span style={{color:STRIP_COLORS[s.type],fontWeight:700,fontSize:9,background:STRIP_COLORS[s.type]+"18",padding:"1px 5px",borderRadius:3}}>{s.type}</span>
                  <span style={{color:"#666",flex:1}}>{s.synopsis}</span>
                  <span style={{color:"#E8C94A",fontSize:9}}>{(s.cast||[]).map(id=>{const c=cast.find(x=>x.id===id);return c?.roleNum||id;}).join(", ")}</span>
                  <span style={{color:"#555",fontSize:10}}>{loc?.name || ""}</span>
                  <span style={{color:"#888",fontWeight:700,fontSize:10}}>{s.pages}pg</span>
                </div>;
              })}
            </div>
          ) : (
            <div style={{fontSize:11,color:"#555",fontStyle:"italic"}}>No scenes assigned yet</div>
          )}
        </div>}

      </div>
    </div>
  </div>;
};

export { CallSheetModule };
