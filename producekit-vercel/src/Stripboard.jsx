import { useState } from "react";
import { STRIP_COLORS, fmtTime, fmtDate, addMin, I, IS, BS, BP } from "./config.jsx";

const StripboardModule = ({ strips, setStrips, days, setDays, locations, cast }) => {
  const [selDayId, setSelDayId] = useState(null);
  const [rightSearch, setRightSearch] = useState("");
  const [rightFilter, setRightFilter] = useState("All");
  const [fLoc, setFLoc] = useState(""); // filter by location
  const [fCast, setFCast] = useState(""); // filter by cast member
  const [fPgMin, setFPgMin] = useState(""); // min pages
  const [fPgMax, setFPgMax] = useState(""); // max pages
  const [showFilters, setShowFilters] = useState(false);

  const gLoc = id => locations.find(x => x.id === id)?.name || "—";
  const getCastStr = (ids) => (ids || []).map(id => cast.find(c => c.id === id)?.roleNum).filter(Boolean).join(", ");

  // Universal filter function
  const matchesFilter = (s) => {
    if (rightFilter !== "All" && s.type !== rightFilter) return false;
    if (fLoc && s.locationId !== fLoc) return false;
    if (fCast && !(s.cast || []).includes(fCast)) return false;
    if (fPgMin && (s.pages || 0) < Number(fPgMin)) return false;
    if (fPgMax && (s.pages || 0) > Number(fPgMax)) return false;
    if (rightSearch) {
      const q = rightSearch.toLowerCase();
      const str = `sc ${s.scene} ${s.synopsis || ""} ${gLoc(s.locationId)} ${getCastStr(s.cast)}`.toLowerCase();
      if (!str.includes(q)) return false;
    }
    return true;
  };

  const hasActiveFilters = rightFilter !== "All" || fLoc || fCast || fPgMin || fPgMax || rightSearch;
  const clearFilters = () => { setRightFilter("All"); setFLoc(""); setFCast(""); setFPgMin(""); setFPgMax(""); setRightSearch(""); };

  const unassigned = strips.filter(s => !days.some(d => d.strips.includes(s.id)));
  const selDay = days.find(d => d.id === selDayId);
  const selDayStrips = selDay ? selDay.strips.map(sid => strips.find(s => s.id === sid)).filter(Boolean) : [];
  const selDayPages = selDayStrips.reduce((s, x) => s + (x.pages || 0), 0);

  const filteredUnassigned = unassigned.filter(matchesFilter).sort((a, b) => (parseInt(a.scene) || 0) - (parseInt(b.scene) || 0));

  // Unique values for filter dropdowns
  const usedLocIds = [...new Set(strips.map(s => s.locationId).filter(Boolean))];
  const usedCastIds = [...new Set(strips.flatMap(s => s.cast || []))];
  const fS = {background:"#12141a",border:"1px solid #2a2d35",borderRadius:4,color:"#ccc",fontSize:11,padding:"5px 8px",fontFamily:"inherit",outline:"none",cursor:"pointer"};

  // Assign scene to selected day
  const assignScene = (sid) => {
    if (!selDay) return;
    setDays(p => p.map(d => d.id === selDayId ? { ...d, strips: [...d.strips, sid] } : d));
  };

  // Unassign scene from day
  const unassignScene = (sid, dayId) => {
    setDays(p => p.map(d => d.id === dayId ? { ...d, strips: d.strips.filter(id => id !== sid) } : d));
  };

  // Move scene within day
  const moveScene = (sid, dir) => {
    if (!selDay) return;
    setDays(p => {
      return p.map(d => {
        if (d.id !== selDayId) return d;
        const s = [...d.strips];
        const i = s.indexOf(sid);
        if (i < 0) return d;
        const n = i + dir;
        if (n < 0 || n >= s.length) return d;
        [s[i], s[n]] = [s[n], s[i]];
        return { ...d, strips: s };
      });
    });
  };

  // Estimate times for selected day
  const estTimes = () => {
    if (!selDay) return;
    const ordered = selDay.strips;
    if (ordered.length === 0) return;
    setStrips(prev => {
      const up = prev.map(s => ({...s}));
      let cursor = selDay.callTime || "06:00";
      for (let idx = 0; idx < ordered.length; idx++) {
        const si = up.findIndex(s => s.id === ordered[idx]);
        if (si < 0) continue;
        const dur = Math.round((up[si].pages || 1) * 60);
        up[si].startTime = cursor;
        up[si].endTime = addMin(cursor, dur);
        cursor = up[si].endTime;
      }
      return up;
    });
  };

  // Scene strip component
  const SceneStrip = ({ strip, dayId, index, total, mode }) => (
    <div style={{
      display:"flex", alignItems:"center", gap:6, padding:"7px 10px",
      background:"#12141a", borderLeft:`4px solid ${STRIP_COLORS[strip.type]}`,
      borderRadius:6, fontSize:12, border:"1px solid #1e2028",
    }}>
      {mode === "day" && <div style={{display:"flex",flexDirection:"column",gap:1,flexShrink:0}}>
        {index > 0 && <button onClick={()=>moveScene(strip.id,-1)} style={{background:"none",border:"none",color:"#666",cursor:"pointer",padding:0,fontSize:9,lineHeight:1}}>{"▲"}</button>}
        {index < total - 1 && <button onClick={()=>moveScene(strip.id,1)} style={{background:"none",border:"none",color:"#666",cursor:"pointer",padding:0,fontSize:9,lineHeight:1}}>{"▼"}</button>}
      </div>}
      <span style={{fontWeight:800,color:"#f0f0f0",minWidth:32}}>Sc.{strip.scene}</span>
      <span style={{color:STRIP_COLORS[strip.type],fontWeight:700,fontSize:9,minWidth:34,textAlign:"center",background:STRIP_COLORS[strip.type]+"18",borderRadius:3,padding:"2px 4px"}}>{strip.type}</span>
      <span style={{color:"#aaa",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:11}}>{strip.synopsis}</span>
      {(strip.startTime || strip.endTime) && <span style={{color:"#3b82f6",fontSize:9,fontWeight:600,flexShrink:0,background:"#3b82f618",padding:"2px 5px",borderRadius:3}}>{strip.startTime || "?"}–{strip.endTime || "?"}</span>}
      <span style={{color:"#666",fontSize:10,flexShrink:0}}>{gLoc(strip.locationId)}</span>
      <span style={{color:"#888",fontWeight:700,fontSize:10,minWidth:26,textAlign:"right"}}>{strip.pages}pg</span>
      {mode === "day" && <button onClick={()=>unassignScene(strip.id,dayId)} title="Unassign" style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:2,flexShrink:0}}><I.ArrowRight/></button>}
      {mode === "pool" && selDay && <button onClick={()=>assignScene(strip.id)} title={`Assign to ${selDay.label}`} style={{background:"none",border:"none",color:"#22c55e",cursor:"pointer",padding:2,flexShrink:0}}><I.ArrowLeft/></button>}
    </div>
  );

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <div>
        <h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Stripboard</h2>
        <p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>
          {strips.length} scenes · {days.length} days · {unassigned.length} unassigned
          {days.length === 0 && <span style={{color:"#f59e0b",marginLeft:8}}>Add shoot days in Calendar</span>}
        </p>
      </div>
      <button onClick={()=>setShowFilters(!showFilters)} style={{...BS,padding:"6px 14px",fontSize:11,background:hasActiveFilters?"#3b82f618":"transparent",borderColor:hasActiveFilters?"#3b82f644":"#2a2d35",color:hasActiveFilters?"#3b82f6":"#888"}}>
        <I.Filter/> <span style={{marginLeft:4}}>Filters</span> {hasActiveFilters&&<span style={{background:"#3b82f6",color:"#fff",borderRadius:10,padding:"0 5px",fontSize:9,marginLeft:4}}>ON</span>}
      </button>
    </div>

    {/* Filter bar */}
    {showFilters && <div style={{display:"flex",gap:8,marginBottom:12,padding:"10px 14px",background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:8,flexWrap:"wrap",alignItems:"center"}}>
      <div style={{position:"relative",flex:"1 1 140px",minWidth:120}}>
        <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"#555",fontSize:12}}><I.Search/></span>
        <input placeholder="Search..." value={rightSearch} onChange={e=>setRightSearch(e.target.value)} style={{...fS,paddingLeft:28,width:"100%"}}/>
      </div>
      <select value={rightFilter} onChange={e=>setRightFilter(e.target.value)} style={{...fS,minWidth:80}}>
        <option value="All">All types</option>
        {Object.keys(STRIP_COLORS).map(t=><option key={t}>{t}</option>)}
      </select>
      <select value={fLoc} onChange={e=>setFLoc(e.target.value)} style={{...fS,minWidth:100}}>
        <option value="">All locations</option>
        {usedLocIds.map(id=><option key={id} value={id}>{locations.find(l=>l.id===id)?.name||id}</option>)}
      </select>
      <select value={fCast} onChange={e=>setFCast(e.target.value)} style={{...fS,minWidth:100}}>
        <option value="">All cast</option>
        {usedCastIds.map(id=>{const c=cast.find(x=>x.id===id);return<option key={id} value={id}>#{c?.roleNum} {c?.name||id}</option>;})}
      </select>
      <div style={{display:"flex",alignItems:"center",gap:4}}>
        <span style={{fontSize:10,color:"#666"}}>Pgs</span>
        <input type="number" value={fPgMin} onChange={e=>setFPgMin(e.target.value)} placeholder="min" style={{...fS,width:48,textAlign:"center"}}/>
        <span style={{color:"#555"}}>–</span>
        <input type="number" value={fPgMax} onChange={e=>setFPgMax(e.target.value)} placeholder="max" style={{...fS,width:48,textAlign:"center"}}/>
      </div>
      {hasActiveFilters&&<button onClick={clearFilters} style={{background:"none",border:"1px solid #ef444444",borderRadius:4,color:"#ef4444",cursor:"pointer",padding:"4px 10px",fontSize:10,fontFamily:"inherit"}}>Clear</button>}
    </div>}

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,alignItems:"start"}}>

      {/* LEFT PANEL — Shooting Days */}
      <div>
        <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>
          Shooting Days
        </div>

        {days.length === 0 && (
          <div style={{background:"#1a1d23",border:"1px dashed #2a2d35",borderRadius:10,padding:30,textAlign:"center",color:"#555",fontSize:13}}>
            No shoot days yet. Go to Calendar to add them.
          </div>
        )}

        {days.map(day => {
          const isSelected = selDayId === day.id;
          const ds = day.strips.map(sid => strips.find(s => s.id === sid)).filter(Boolean);
          const tp = ds.reduce((s, x) => s + (x.pages || 0), 0);

          return <div key={day.id} style={{marginBottom:8}}>
            {/* Day header — click to select/collapse */}
            <div onClick={() => setSelDayId(isSelected ? null : day.id)} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"10px 14px", background: isSelected ? "#1e2128" : "#1a1d23",
              border:`1px solid ${isSelected ? "#E8C94A55" : "#2a2d35"}`,
              borderRadius: isSelected ? "10px 10px 0 0" : 10,
              cursor:"pointer",
            }}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontWeight:800,color:isSelected?"#E8C94A":"#f0f0f0",fontSize:14}}>{day.label}</span>
                <span style={{fontSize:12,color:"#666"}}>{fmtDate(day.date)}</span>
                <span style={{fontSize:11,color:"#888"}}>{fmtTime(day.callTime)}–{fmtTime(day.wrapTime || addMin(day.callTime, 720))}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,color:"#888"}}>{ds.length} sc · {tp.toFixed(1)} pg</span>
                <span style={{fontSize:10,color:isSelected?"#E8C94A":"#555",transition:"transform 0.2s",transform:isSelected?"rotate(180deg)":"rotate(0)"}}>{"▼"}</span>
              </div>
            </div>

            {/* Expanded: scene list */}
            {isSelected && <div style={{
              background:"#1a1d23", border:"1px solid #E8C94A55", borderTop:"none",
              borderRadius:"0 0 10px 10px", padding:8,
              display:"flex", flexDirection:"column", gap:4, minHeight:50,
            }}>
              {selDay && <div style={{display:"flex",justifyContent:"flex-end",marginBottom:4}}>
                <button onClick={estTimes} style={{...BS,padding:"3px 10px",fontSize:10}}><I.Clock/> <span style={{marginLeft:3}}>Estimate Times</span></button>
              </div>}
              {ds.map((s, i) => {
                const match = matchesFilter(s);
                return <div key={s.id} style={{opacity:hasActiveFilters && !match ? 0.25 : 1}}>
                  <SceneStrip strip={s} dayId={day.id} index={i} total={ds.length} mode="day"/>
                </div>;
              })}
              {ds.length === 0 && <div style={{textAlign:"center",padding:16,color:"#444",fontSize:12,fontStyle:"italic"}}>
                No scenes assigned. Click a scene in the right panel to add it here.
              </div>}
            </div>}
          </div>;
        })}
      </div>

      {/* RIGHT PANEL — Unassigned Scene Pool */}
      <div>
        <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>
          Unassigned Scenes ({filteredUnassigned.length}{hasActiveFilters ? `/${unassigned.length}` : ""})
        </div>

        {!selDay && unassigned.length > 0 && (
          <div style={{background:"#f59e0b18",border:"1px solid #f59e0b33",borderRadius:6,padding:"8px 12px",marginBottom:10,fontSize:11,color:"#f59e0b"}}>
            Select a shooting day on the left to assign scenes.
          </div>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:"calc(100vh - 280px)",overflow:"auto"}}>
          {filteredUnassigned.map(s => <SceneStrip key={s.id} strip={s} dayId={null} index={0} total={0} mode="pool"/>)}
          {filteredUnassigned.length === 0 && unassigned.length > 0 && (
            <div style={{textAlign:"center",padding:20,color:"#555",fontSize:12}}>No scenes match your search.</div>
          )}
          {unassigned.length === 0 && (
            <div style={{background:"#1a1d23",border:"1px dashed #2a2d35",borderRadius:10,padding:30,textAlign:"center",color:"#555",fontSize:13}}>
              All scenes are assigned. {strips.length === 0 && "Create scenes in the Scenes module."}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>;
};

export { StripboardModule };
