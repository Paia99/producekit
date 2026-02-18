import { useState, useEffect } from "react";
import { STRIP_COLORS, VEHICLE_TYPES, KEY_ROLES, DEPARTMENTS, fmtTime, fmtDate, subMin, addMin, I, IS, AddressInput } from "./config.jsx";

/* ── wider time input ────────────────────────────────────── */
const TI = ({ value, onChange, color, bold }) => (
  <input type="time" value={value || ""} onChange={e => onChange(e.target.value)}
    style={{ background:"#12141a", border:"1px solid #2a2d35", borderRadius:4,
      color: color || "#ccc", fontSize:12, fontWeight: bold ? 800 : 600, padding:"4px 8px",
      width: 88, fontFamily:"inherit", outline:"none", letterSpacing:"0.02em" }}
    onClick={e => e.stopPropagation()} />
);

const HInput = ({ value, onChange, placeholder, w }) => (
  <input value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder || ""}
    style={{ background:"transparent", border:"1px solid #2a2d35", borderRadius:3,
      color:"#ccc", fontSize:10, padding:"2px 6px",
      width: w || "100%", fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
    onClick={e => e.stopPropagation()} />
);

const SH = ({ children, right }) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"18px 0 8px",borderBottom:"1px solid #222",paddingBottom:6}}>
    <h4 style={{margin:0,fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.05em"}}>{children}</h4>
    {right}
  </div>
);

const thS = { padding:"5px 6px", textAlign:"left", color:"#666", fontWeight:700, fontSize:9, textTransform:"uppercase", letterSpacing:"0.03em" };
const tdS = { padding:"5px 6px", fontSize:11, borderBottom:"1px solid #1a1d23" };
const MAKEUP_OFFSET = 10;
const COSTUME_OFFSET = 20;

const HEADER_ROLES = [
  { key:"producer", label:"Producer", keyRole:"Producer" },
  { key:"execProducer", label:"Exec Producer", keyRole:"Exec Producer" },
  { key:"director", label:"Director", keyRole:"Director" },
  { key:"dop", label:"DOP", keyRole:"DOP" },
  { key:"ad1", label:"1st AD", keyRole:"1st AD" },
  { key:"ad2", label:"2nd AD", keyRole:null },
  { key:"lineProducer", label:"Line Producer", keyRole:"Line Producer" },
  { key:"locationManager", label:"Location Mgr", keyRole:null },
];

const BREAK_TYPES = [
  { id:"lunch", label:"Lunch Break", defaultDur:60, color:"#f59e0b" },
  { id:"custom", label:"Break", defaultDur:30, color:"#888" },
];

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

  const cs = day?.callSheet || {};
  const csCast = cs.cast || {};
  const csCrew = cs.crew || {};
  const csNotes = cs.notes || [];
  const csHeader = cs.header || {};
  const csBreaks = cs.breaks || [];

  /* ── persist ───────────────────────────────────────────── */
  const persistCS = (patch) => {
    if (!day || !setProject) return;
    const newCS = { ...cs, ...patch };
    setProject(prev => ({
      ...prev,
      days: prev.days.map(d => d.id === selDayId ? { ...d, callSheet: newCS } : d),
    }));
  };

  const setH = (patch) => persistCS({ header: { ...csHeader, ...patch } });
  const updateContact = (key, field, value) => {
    const contacts = csHeader.contacts || {};
    const current = contacts[key] || {};
    setH({ contacts: { ...contacts, [key]: { ...current, [field]: value } } });
  };

  /* ── auto-populate header once ─────────────────────────── */
  useEffect(() => {
    if (!day || csHeader._initialized) return;
    const contacts = {};
    HEADER_ROLES.forEach(({ key, keyRole }) => {
      let name = "", phone = "";
      if (keyRole && project.keyRoles?.[keyRole]) {
        name = project.keyRoles[keyRole];
        const match = crew.find(c => c.name === name);
        if (match) phone = match.phone || "";
      }
      contacts[key] = { name, phone };
    });
    setH({
      _initialized: true,
      transportMin: 0,
      // No callOnSet/firstTake/estWrap stored — always computed unless manually overridden
      _callOnSetOverride: "", _firstTakeOverride: "", _estWrapOverride: "",
      sunrise: "", sunset: "", weather: "",
      locationId: "", basecampId: "", basecampManual: "",
      muaCostumeAddr: "",
      contacts,
    });
  }, [selDayId]);

  const h = csHeader;
  const hContacts = h.contacts || {};

  /* ── ALWAYS-COMPUTED cascading values ──────────────────── */
  const shiftStart = day?.callTime || "06:00";
  const shiftEnd = day?.wrapTime || "18:00";
  const transportMin = h.transportMin || 0;

  // Computed defaults — these always recalculate when transport/shift changes
  const computedCallOnSet = transportMin > 0 ? addMin(shiftStart, transportMin) : shiftStart;
  const callOnSet = h._callOnSetOverride || computedCallOnSet;

  const computedFirstTake = callOnSet;
  const firstTake = h._firstTakeOverride || computedFirstTake;

  const computedEstWrap = transportMin > 0 ? subMin(shiftEnd, transportMin) : shiftEnd;
  const estWrap = h._estWrapOverride || computedEstWrap;

  // When user edits, store as override
  const setCallOnSet = (v) => setH({ _callOnSetOverride: v });
  const setFirstTake = (v) => setH({ _firstTakeOverride: v });
  const setEstWrap = (v) => setH({ _estWrapOverride: v });
  // When transport changes, clear overrides so computed values take effect
  const setTransport = (v) => setH({ transportMin: v, _callOnSetOverride: "", _firstTakeOverride: "", _estWrapOverride: "" });

  /* ── first scene start for cast ────────────────────────── */
  const getFirstSceneStart = (castId) => {
    for (const s of dayStrips) {
      if ((s.cast || []).includes(castId) && s.startTime) return s.startTime;
    }
    return "";
  };

  /* ── REFRESH ALL ───────────────────────────────────────── */
  const refreshAll = () => {
    if (!day || dayStrips.length === 0) return;
    const ordered = day.strips;
    const breakMap = {};
    csBreaks.forEach(b => { breakMap[b.afterScene] = b; });

    let cursor = firstTake;
    const updatedStrips = strips.map(s => ({...s}));
    const updatedBreaks = csBreaks.map(b => ({...b}));

    for (let idx = 0; idx < ordered.length; idx++) {
      const sid = ordered[idx];
      const si = updatedStrips.findIndex(s => s.id === sid);
      if (si < 0) continue;
      const dur = Math.round((updatedStrips[si].pages || 1) * 60);
      updatedStrips[si].startTime = cursor;
      updatedStrips[si].endTime = addMin(cursor, dur);
      cursor = updatedStrips[si].endTime;
      const brk = breakMap[sid];
      if (brk) {
        const bDur = brk.duration || 60;
        const bi = updatedBreaks.findIndex(b => b.id === brk.id);
        if (bi >= 0) { updatedBreaks[bi].startTime = cursor; updatedBreaks[bi].endTime = addMin(cursor, bDur); }
        cursor = addMin(cursor, bDur);
      }
    }

    // Reset crew to callOnSet
    const resetCrew = {};
    crew.forEach(c => { resetCrew[c.id] = { call: callOnSet }; });

    // Reset cast: onSet = first scene start
    const resetCast = {};
    dayCast.forEach(c => {
      let onSet = callOnSet;
      for (const sid of ordered) {
        const s = updatedStrips.find(x => x.id === sid);
        if (s && (s.cast || []).includes(c.id) && s.startTime) { onSet = s.startTime; break; }
      }
      resetCast[String(c.id)] = { costume: subMin(onSet, COSTUME_OFFSET), makeup: subMin(onSet, MAKEUP_OFFSET), onSet, notes: csCast[String(c.id)]?.notes || "" };
    });

    persistCS({ breaks: updatedBreaks, crew: resetCrew, cast: resetCast });
    setProject(prev => ({ ...prev, strips: updatedStrips }));
  };

  /* ── breaks ────────────────────────────────────────────── */
  const addBreak = (type) => {
    const bt = BREAK_TYPES.find(b => b.id === type) || BREAK_TYPES[0];
    const mid = dayStrips.length > 1 ? dayStrips[Math.floor(dayStrips.length/2)-1]?.id : dayStrips[0]?.id;
    persistCS({ breaks: [...csBreaks, { id:"brk"+Date.now(), type:bt.id, label:bt.label, duration:bt.defaultDur, afterScene:mid||"", startTime:"", endTime:"" }]});
  };
  const updateBreak = (brkId, field, value) => persistCS({ breaks: csBreaks.map(b => b.id === brkId ? { ...b, [field]: value } : b) });
  const removeBreak = (brkId) => persistCS({ breaks: csBreaks.filter(b => b.id !== brkId) });

  const buildSceneOrder = () => {
    const result = [];
    const breakMap = {};
    csBreaks.forEach(b => { if (!breakMap[b.afterScene]) breakMap[b.afterScene] = []; breakMap[b.afterScene].push(b); });
    dayStrips.forEach(s => { result.push({ type:"scene", data:s }); if (breakMap[s.id]) breakMap[s.id].forEach(b => result.push({ type:"break", data:b })); });
    return result;
  };

  /* ── cast ───────────────────────────────────────────────── */
  const castScenes = (castId) => dayStrips.filter(s => (s.cast || []).includes(castId));
  const getPickup = (castId) => {
    for (const r of dayRoutes) {
      const stop = (r.stops || []).find(s => s.type === "pickup" && s.personType === "cast" && String(s.personId) === String(castId));
      if (stop) return stop.pickupTime;
    }
    return "";
  };
  const getCastDefaults = (castId) => {
    const fs = getFirstSceneStart(castId);
    const onSet = fs || callOnSet;
    return { costume:subMin(onSet,COSTUME_OFFSET), makeup:subMin(onSet,MAKEUP_OFFSET), onSet, notes:"" };
  };
  const getCastCS = (castId) => csCast[String(castId)] || getCastDefaults(castId);
  const updateCastCS = (castId, field, value) => {
    const key = String(castId);
    const cur = getCastCS(castId);
    const up = { ...cur, [field]: value };
    if (field === "onSet") {
      if (cur.costume === subMin(cur.onSet, COSTUME_OFFSET)) up.costume = subMin(value, COSTUME_OFFSET);
      if (cur.makeup === subMin(cur.onSet, MAKEUP_OFFSET)) up.makeup = subMin(value, MAKEUP_OFFSET);
    }
    persistCS({ cast: { ...csCast, [key]: up } });
  };

  /* ── crew ───────────────────────────────────────────────── */
  const getCrewCall = (crewId) => csCrew[crewId]?.call || callOnSet;
  const isCrewEarly = (crewId) => { const s = csCrew[crewId]; return s?.call && s.call < callOnSet; };
  const updateCrewCS = (crewId, field, value) => {
    persistCS({ crew: { ...csCrew, [crewId]: { ...(csCrew[crewId]||{}), [field]: value } } });
  };
  const orderedCrew = [];
  DEPARTMENTS.forEach(dept => { crew.filter(c => c.dept === dept).forEach(c => orderedCrew.push(c)); });
  crew.forEach(c => { if (!orderedCrew.find(x => x.id === c.id)) orderedCrew.push(c); });

  /* ── notes ─────────────────────────────────────────────── */
  const addNote = () => persistCS({ notes: [...csNotes, { id:"n"+Date.now(), dept:DEPARTMENTS[0], text:"" }] });
  const updateNote = (nid, f, v) => persistCS({ notes: csNotes.map(n => n.id === nid ? { ...n, [f]: v } : n) });
  const removeNote = (nid) => persistCS({ notes: csNotes.filter(n => n.id !== nid) });

  const sortedCast = [...dayCast].sort((a, b) => (getCastCS(a.id).onSet||"99:99").localeCompare(getCastCS(b.id).onSet||"99:99"));
  const nextDayStrips = nextDay ? nextDay.strips.map(sid => strips.find(s => s.id === sid)).filter(Boolean) : [];
  const sceneOrder = buildSceneOrder();

  const HR = ({ label, children }) => (
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0"}}>
      <span style={{fontSize:9,fontWeight:700,color:"#666",textTransform:"uppercase",minWidth:80,flexShrink:0}}>{label}</span>
      {children}
    </div>
  );

  if (!day) return <div>
    <h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0",marginBottom:12}}>Call Sheet</h2>
    <div style={{background:"#1a1d23",border:"1px dashed #2a2d35",borderRadius:10,padding:30,textAlign:"center",color:"#555",fontSize:13}}>No shooting days.</div>
  </div>;

  return <div>
    <div style={{marginBottom:16}}><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Call Sheet</h2></div>
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {days.map(d => <button key={d.id} onClick={() => setSelDayId(d.id)} style={{
        padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
        background:selDayId===d.id?"#E8C94A18":"transparent",border:`1px solid ${selDayId===d.id?"#E8C94A44":"#2a2d35"}`,
        color:selDayId===d.id?"#E8C94A":"#888",
      }}>{d.label} · {fmtDate(d.date)}</button>)}
    </div>

    <div style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,overflow:"hidden"}}>

      {/* ════════════ HEADER ════════════════════════════ */}
      <div style={{background:"#1e2128",borderBottom:"1px solid #2a2d35"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px",borderBottom:"1px solid #2a2d35"}}>
          <div>
            <span style={{fontSize:16,fontWeight:800,color:"#E8C94A"}}>{project.name}</span>
            <span style={{fontSize:11,color:"#888",marginLeft:10}}>{project.production}{project.idec ? ` · IDEC: ${project.idec}` : ""}</span>
          </div>
          <div style={{textAlign:"right"}}>
            <span style={{fontSize:16,fontWeight:800,color:"#f0f0f0"}}>{day.label}</span>
            <span style={{fontSize:13,color:"#888",marginLeft:10}}>{fmtDate(day.date)}</span>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0}}>
          {/* LEFT: Schedule */}
          <div style={{padding:"10px 16px",borderRight:"1px solid #2a2d35"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#555",textTransform:"uppercase",marginBottom:6}}>Schedule</div>
            <HR label="Shift"><span style={{fontSize:14,fontWeight:800,color:"#ccc"}}>{fmtTime(shiftStart)}–{fmtTime(shiftEnd)}</span></HR>
            <HR label="Transport">
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <input type="number" min="0" step="5" value={transportMin} onChange={e => setTransport(Number(e.target.value))}
                  style={{background:"#12141a",border:"1px solid #2a2d35",borderRadius:4,color:"#ccc",fontSize:13,fontWeight:800,padding:"4px 8px",width:60,fontFamily:"inherit",outline:"none",textAlign:"center"}} />
                <span style={{fontSize:10,color:"#666"}}>min</span>
              </div>
            </HR>
            <HR label="Call on set"><TI value={callOnSet} onChange={setCallOnSet} color="#E8C94A" bold /></HR>
            <HR label="First take"><TI value={firstTake} onChange={setFirstTake} color="#22c55e" bold /></HR>
            <HR label="Est. wrap"><TI value={estWrap} onChange={setEstWrap} color="#ef4444" bold /></HR>
            <div style={{borderTop:"1px solid #2a2d35",marginTop:6,paddingTop:6}}>
              <HR label="Sunrise"><HInput value={h.sunrise||""} onChange={v=>setH({sunrise:v})} placeholder="5:48" w={68} /></HR>
              <HR label="Sunset"><HInput value={h.sunset||""} onChange={v=>setH({sunset:v})} placeholder="20:06" w={68} /></HR>
              <HR label="Weather"><HInput value={h.weather||""} onChange={v=>setH({weather:v})} placeholder="Clouds, 23°C" w={140} /></HR>
            </div>
          </div>

          {/* MIDDLE: Addresses */}
          <div style={{padding:"10px 16px",borderRight:"1px solid #2a2d35"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#555",textTransform:"uppercase",marginBottom:6}}>Addresses</div>
            <div style={{marginBottom:8}}>
              <div style={{fontSize:9,fontWeight:700,color:"#666",marginBottom:3}}>LOCATION</div>
              <select value={h.locationId||""} onChange={e=>setH({locationId:e.target.value})}
                style={{width:"100%",background:"#12141a",border:"1px solid #2a2d35",borderRadius:3,color:"#ccc",fontSize:10,padding:"4px 6px",fontFamily:"inherit",outline:"none",cursor:"pointer"}}>
                <option value="">— Select —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name} — {l.address}</option>)}
              </select>
            </div>
            <div style={{marginBottom:8}}>
              <div style={{fontSize:9,fontWeight:700,color:"#666",marginBottom:3}}>BASECAMP</div>
              <select value={h.basecampId||"manual"} onChange={e=>setH({basecampId:e.target.value==="manual"?"":e.target.value})}
                style={{width:"100%",background:"#12141a",border:"1px solid #2a2d35",borderRadius:3,color:"#ccc",fontSize:10,padding:"4px 6px",fontFamily:"inherit",outline:"none",cursor:"pointer",marginBottom:4}}>
                <option value="manual">— Manual —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name} — {l.address}</option>)}
              </select>
              {!h.basecampId && <AddressInput value={h.basecampManual||""} onChange={v=>setH({basecampManual:v})} placeholder="Type address..." style={{fontSize:10,padding:"4px 6px"}} />}
            </div>
            <div>
              <div style={{fontSize:9,fontWeight:700,color:"#666",marginBottom:3}}>MUA + COSTUMES</div>
              <AddressInput value={h.muaCostumeAddr||""} onChange={v=>setH({muaCostumeAddr:v})} placeholder="Makeup & costumes..." style={{fontSize:10,padding:"4px 6px"}} />
            </div>
          </div>

          {/* RIGHT: Contacts */}
          <div style={{padding:"10px 16px"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#555",textTransform:"uppercase",marginBottom:6}}>Key Contacts</div>
            {HEADER_ROLES.map(({ key, label }) => {
              const c = hContacts[key] || {};
              return <div key={key} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 0"}}>
                <span style={{fontSize:9,fontWeight:700,color:"#666",minWidth:70,flexShrink:0}}>{label}</span>
                <input value={c.name||""} onChange={e=>updateContact(key,"name",e.target.value)} placeholder="Name"
                  style={{background:"transparent",border:"1px solid #2a2d35",borderRadius:3,color:"#ccc",fontSize:10,fontWeight:600,padding:"2px 4px",flex:1,fontFamily:"inherit",outline:"none",minWidth:0}} />
                <input value={c.phone||""} onChange={e=>updateContact(key,"phone",e.target.value)} placeholder="Phone"
                  style={{background:"transparent",border:"1px solid #2a2d35",borderRadius:3,color:"#888",fontSize:9,padding:"2px 4px",width:90,fontFamily:"inherit",outline:"none",flexShrink:0}} />
              </div>;
            })}
          </div>
        </div>
      </div>

      {/* ════════════ BODY ═════════════════════════════ */}
      <div style={{padding:"10px 20px 20px"}}>
        <SH right={
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>addBreak("lunch")} style={{background:"#f59e0b18",border:"1px solid #f59e0b33",borderRadius:4,color:"#f59e0b",fontSize:9,fontWeight:600,padding:"3px 8px",cursor:"pointer",fontFamily:"inherit"}}>+ Lunch</button>
            <button onClick={()=>addBreak("custom")} style={{background:"#2a2d35",border:"1px solid #3a3d45",borderRadius:4,color:"#888",fontSize:9,fontWeight:600,padding:"3px 8px",cursor:"pointer",fontFamily:"inherit"}}>+ Break</button>
            <button onClick={refreshAll} style={{background:"#22c55e18",border:"1px solid #22c55e33",borderRadius:4,color:"#22c55e",fontSize:9,fontWeight:700,padding:"3px 10px",cursor:"pointer",fontFamily:"inherit"}}>↻ Refresh All</button>
          </div>
        }>Scenes ({dayStrips.length} · {dayStrips.reduce((s,x)=>s+(x.pages||0),0).toFixed(1)} pages)</SH>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
            <thead><tr style={{borderBottom:"1px solid #333"}}>
              {["Sc","From","To","Synopsis","Cast","Type","Pgs","Location"].map(hd=><th key={hd} style={thS}>{hd}</th>)}
            </tr></thead>
            <tbody>
              {sceneOrder.map(item => {
                if (item.type === "scene") {
                  const s = item.data; const loc = gLoc(s.locationId);
                  return <tr key={s.id} style={{borderBottom:"1px solid #1e2028"}}>
                    <td style={{...tdS,fontWeight:800,color:"#f0f0f0",width:40}}>{s.scene}</td>
                    <td style={{...tdS,width:94}}><TI value={s.startTime||""} onChange={v=>setProject(p=>({...p,strips:p.strips.map(x=>x.id===s.id?{...x,startTime:v}:x)}))} color="#3b82f6"/></td>
                    <td style={{...tdS,width:94}}><TI value={s.endTime||""} onChange={v=>setProject(p=>({...p,strips:p.strips.map(x=>x.id===s.id?{...x,endTime:v}:x)}))} color="#3b82f6"/></td>
                    <td style={{...tdS,color:"#aaa",maxWidth:200}}>{s.synopsis}</td>
                    <td style={{...tdS,color:"#E8C94A",fontWeight:600,fontSize:10}}>{(s.cast||[]).map(id=>{const c=cast.find(x=>x.id===id);return c?.roleNum||id;}).join(", ")}</td>
                    <td style={tdS}><span style={{color:STRIP_COLORS[s.type],fontWeight:700,fontSize:9,background:STRIP_COLORS[s.type]+"18",padding:"1px 5px",borderRadius:3}}>{s.type}</span></td>
                    <td style={{...tdS,color:"#888",width:36}}>{s.pages}</td>
                    <td style={{...tdS,color:"#888",fontSize:10}}>{loc?.name||"—"}</td>
                  </tr>;
                }
                const b = item.data; const bt = BREAK_TYPES.find(t=>t.id===b.type)||BREAK_TYPES[1];
                return <tr key={b.id} style={{borderBottom:"1px solid #1e2028",background:bt.color+"08"}}>
                  <td style={{...tdS,color:bt.color,fontSize:9}}>⏸</td>
                  <td style={{...tdS,width:94}}><TI value={b.startTime||""} onChange={v=>updateBreak(b.id,"startTime",v)} color={bt.color}/></td>
                  <td style={{...tdS,width:94}}><TI value={b.endTime||""} onChange={v=>updateBreak(b.id,"endTime",v)} color={bt.color}/></td>
                  <td style={tdS} colSpan={3}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <input value={b.label||""} onChange={e=>updateBreak(b.id,"label",e.target.value)}
                        style={{background:"transparent",border:"1px solid #2a2d35",borderRadius:3,color:bt.color,fontSize:11,fontWeight:700,padding:"2px 6px",width:130,fontFamily:"inherit",outline:"none"}} />
                      <span style={{fontSize:9,color:"#666"}}>after</span>
                      <select value={b.afterScene||""} onChange={e=>updateBreak(b.id,"afterScene",e.target.value)}
                        style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:3,color:"#ccc",fontSize:10,padding:"2px 4px",fontFamily:"inherit",outline:"none",cursor:"pointer"}}>
                        {dayStrips.map(s=><option key={s.id} value={s.id}>Sc.{s.scene}</option>)}
                      </select>
                    </div>
                  </td>
                  <td style={tdS}><div style={{display:"flex",alignItems:"center",gap:2}}><input type="number" value={b.duration||60} onChange={e=>updateBreak(b.id,"duration",Number(e.target.value))} style={{background:"transparent",border:"1px solid #2a2d35",borderRadius:3,color:"#888",fontSize:10,padding:"2px 4px",width:36,fontFamily:"inherit",outline:"none",textAlign:"center"}}/><span style={{fontSize:8,color:"#555"}}>m</span></div></td>
                  <td style={tdS}><button onClick={()=>removeBreak(b.id)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:2}}><I.X/></button></td>
                </tr>;
              })}
              {dayStrips.length===0&&<tr><td colSpan={8} style={{...tdS,textAlign:"center",color:"#555",padding:16}}>No scenes assigned</td></tr>}
            </tbody>
          </table>
        </div>

        {/* ── CAST ────────────────────────────────────── */}
        <SH>Cast ({dayCast.length})</SH>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:780}}>
            <thead><tr style={{borderBottom:"1px solid #333"}}>{["#","Character","Actor","Scenes","Costume","Makeup","On Set","Pickup","Notes"].map(hd=><th key={hd} style={thS}>{hd}</th>)}</tr></thead>
            <tbody>
              {sortedCast.map(c => {
                const d = getCastCS(c.id); const scenes = castScenes(c.id); const pickup = getPickup(c.id);
                return <tr key={c.id} style={{borderBottom:"1px solid #1e2028"}}>
                  <td style={{...tdS,fontWeight:800,color:"#E8C94A",width:30}}>{c.roleNum}</td>
                  <td style={{...tdS,color:"#aaa",fontWeight:600,fontSize:10}}>{c.roleName}</td>
                  <td style={{...tdS,color:"#f0f0f0",fontWeight:600}}>{c.name}</td>
                  <td style={{...tdS,color:"#888",fontSize:10,maxWidth:100}}>{scenes.map(s=>s.scene).join(", ")}</td>
                  <td style={{...tdS,width:94}}><TI value={d.costume} onChange={v=>updateCastCS(c.id,"costume",v)}/></td>
                  <td style={{...tdS,width:94}}><TI value={d.makeup} onChange={v=>updateCastCS(c.id,"makeup",v)}/></td>
                  <td style={{...tdS,width:94}}><TI value={d.onSet} onChange={v=>updateCastCS(c.id,"onSet",v)} color="#E8C94A"/></td>
                  <td style={{...tdS,width:90}}>{pickup?<span style={{fontSize:11,fontWeight:600,color:"#22c55e"}}>{fmtTime(pickup)}</span>:<span style={{color:"#555",fontSize:10}}>—</span>}</td>
                  <td style={{...tdS,width:110}}><input value={d.notes||""} onChange={e=>updateCastCS(c.id,"notes",e.target.value)} placeholder="..." style={{background:"transparent",border:"1px solid #2a2d35",borderRadius:3,color:"#888",fontSize:10,padding:"2px 6px",width:"100%",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/></td>
                </tr>;
              })}
              {dayCast.length===0&&<tr><td colSpan={9} style={{...tdS,textAlign:"center",color:"#555",padding:16}}>No cast</td></tr>}
            </tbody>
          </table>
        </div>

        {/* ── CREW — 4 col ────────────────────────────── */}
        <SH>Crew ({orderedCrew.length})</SH>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0 10px"}}>
          {orderedCrew.map((c, i) => {
            const cc = getCrewCall(c.id); const early = isCrewEarly(c.id);
            const div = i > 0 && c.dept !== orderedCrew[i-1].dept;
            return <div key={c.id} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 0",fontSize:10,borderTop:div?"1px solid #2a2d35":"none"}}>
              <span style={{color:"#666",fontWeight:600,minWidth:55,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.role}</span>
              <span style={{color:"#ccc",fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
              <TI value={cc} onChange={v=>updateCrewCS(c.id,"call",v)} color={early?"#ef4444":"#888"}/>
            </div>;
          })}
        </div>

        {/* ── NOTES — horizontal ─────────────────────── */}
        <SH>Requirements ({csNotes.length})</SH>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {csNotes.map(note => (
            <div key={note.id} style={{display:"flex",gap:6,alignItems:"center",background:"#12141a",border:"1px solid #1e2028",borderRadius:6,padding:"6px 8px"}}>
              <select value={note.dept||""} onChange={e=>updateNote(note.id,"dept",e.target.value)}
                style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:4,color:"#ccc",fontSize:10,fontWeight:600,padding:"4px 6px",fontFamily:"inherit",outline:"none",width:100,flexShrink:0,cursor:"pointer"}}>
                {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
                <option value="General">General</option>
              </select>
              <div style={{display:"flex",gap:3,flexShrink:0}}>
                {dayStrips.slice(0,6).map(s=>(
                  <button key={s.id} onClick={()=>{const cur=note.text||"";const sep=cur&&cur.length>0?", ":"";updateNote(note.id,"text",cur+sep+`Sc${s.scene}: `);}}
                    style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:3,color:"#888",fontSize:8,padding:"2px 4px",cursor:"pointer",fontFamily:"inherit",lineHeight:1}}>{s.scene}</button>
                ))}
              </div>
              <input value={note.text||""} onChange={e=>updateNote(note.id,"text",e.target.value)}
                placeholder={`Sc${dayStrips[0]?.scene||"1"}: props, Sc${dayStrips[1]?.scene||"2"}: dressing...`}
                style={{background:"transparent",border:"1px solid #2a2d35",borderRadius:4,color:"#ccc",fontSize:11,padding:"4px 8px",flex:1,fontFamily:"inherit",outline:"none"}} />
              <button onClick={()=>removeNote(note.id)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:2,flexShrink:0}}><I.X/></button>
            </div>
          ))}
          <button onClick={addNote} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 12px",background:"transparent",border:"1px dashed #2a2d35",borderRadius:6,color:"#666",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",width:"fit-content"}}><I.Plus/> Add Note</button>
        </div>

        {/* ── NEXT DAY ───────────────────────────────── */}
        {nextDay&&<div>
          <SH>Next Day — {nextDay.label} · {fmtDate(nextDay.date)} · {fmtTime(nextDay.callTime)}–{fmtTime(nextDay.wrapTime||"18:00")}</SH>
          {nextDayStrips.length>0?<div style={{display:"flex",flexDirection:"column",gap:4}}>
            {nextDayStrips.map(s=>{const loc=gLoc(s.locationId);return<div key={s.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:11,padding:"4px 0",borderBottom:"1px solid #1a1d23"}}>
              <span style={{fontWeight:800,color:"#888",minWidth:36}}>Sc.{s.scene}</span>
              <span style={{color:STRIP_COLORS[s.type],fontWeight:700,fontSize:9,background:STRIP_COLORS[s.type]+"18",padding:"1px 5px",borderRadius:3}}>{s.type}</span>
              <span style={{color:"#666",flex:1}}>{s.synopsis}</span>
              <span style={{color:"#E8C94A",fontSize:9}}>{(s.cast||[]).map(id=>{const c=cast.find(x=>x.id===id);return c?.roleNum||id;}).join(", ")}</span>
              <span style={{color:"#555",fontSize:10}}>{loc?.name||""}</span>
              <span style={{color:"#888",fontWeight:700,fontSize:10}}>{s.pages}pg</span>
            </div>;})}
          </div>:<div style={{fontSize:11,color:"#555",fontStyle:"italic"}}>No scenes assigned yet</div>}
        </div>}
      </div>
    </div>
  </div>;
};

export { CallSheetModule };
