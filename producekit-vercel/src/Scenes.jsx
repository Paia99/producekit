import { useState } from "react";
import { STRIP_COLORS, I, Modal, IS, LS, BP, BS, BD } from "./config.jsx";

const TH = { padding:"8px 10px", textAlign:"left", fontSize:10, fontWeight:700, color:"#666", textTransform:"uppercase", letterSpacing:"0.04em", borderBottom:"1px solid #2a2d35", whiteSpace:"nowrap", cursor:"pointer", userSelect:"none" };
const TD = { padding:"7px 10px", fontSize:12, color:"#ddd", borderBottom:"1px solid #1a1d23", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:200 };

const ScenesModule = ({ strips, setStrips, days, setDays, locations, cast }) => {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterLoc, setFilterLoc] = useState("All");
  const [filterAssign, setFilterAssign] = useState("All");
  const [sortCol, setSortCol] = useState("scene");
  const [sortDir, setSortDir] = useState("asc");
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState({});
  const [castSearch, setCastSearch] = useState("");

  const doSort = (col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
  const SortIcon = ({ col }) => sortCol === col ? <span style={{marginLeft:3,fontSize:8}}>{sortDir === "asc" ? "▲" : "▼"}</span> : null;

  const gLoc = id => locations.find(x => x.id === id)?.name || "—";
  const getDay = (sid) => days.find(d => d.strips.includes(sid));
  const getCastNames = (ids) => (ids || []).map(id => cast.find(c => c.id === id)).filter(Boolean);

  const sortFn = (a, b) => {
    let va, vb;
    if (sortCol === "scene") { va = parseInt(a.scene) || 0; vb = parseInt(b.scene) || 0; return sortDir === "asc" ? va - vb : vb - va; }
    if (sortCol === "pages") { va = a.pages || 0; vb = b.pages || 0; return sortDir === "asc" ? va - vb : vb - va; }
    if (sortCol === "cast") { va = (a.cast || []).length; vb = (b.cast || []).length; return sortDir === "asc" ? va - vb : vb - va; }
    if (sortCol === "location") { va = gLoc(a.locationId).toLowerCase(); vb = gLoc(b.locationId).toLowerCase(); }
    else if (sortCol === "assigned") { va = getDay(a.id)?.label || "zzz"; vb = getDay(b.id)?.label || "zzz"; }
    else { va = (a[sortCol] || "").toString().toLowerCase(); vb = (b[sortCol] || "").toString().toLowerCase(); }
    return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  };

  const filtered = strips.filter(s => {
    const q = search.toLowerCase();
    if (q) {
      const sceneName = `sc ${s.scene} scene ${s.scene}`.toLowerCase();
      const locName = gLoc(s.locationId).toLowerCase();
      const castNames = getCastNames(s.cast).map(c => `${c.name} ${c.roleNum} ${c.roleName}`).join(" ").toLowerCase();
      const syn = (s.synopsis || "").toLowerCase();
      if (!sceneName.includes(q) && !locName.includes(q) && !castNames.includes(q) && !syn.includes(q)) return false;
    }
    if (filterType !== "All" && s.type !== filterType) return false;
    if (filterLoc !== "All" && s.locationId !== filterLoc) return false;
    if (filterAssign === "Assigned" && !getDay(s.id)) return false;
    if (filterAssign === "Unassigned" && getDay(s.id)) return false;
    return true;
  }).sort(sortFn);

  const openNew = () => {
    setForm({ scene: String(strips.length + 1), type: "D/INT", locationId: locations[0]?.id || "", cast: [], pages: 1, synopsis: "", startTime: "", endTime: "" });
    setCastSearch("");
    setEditModal("new");
  };

  const openEdit = (s) => {
    setForm({ ...s });
    setCastSearch("");
    setEditModal("edit");
  };

  const duplicate = (s) => {
    const newScene = { ...s, id: "s" + Date.now() + Math.random(), scene: String(parseInt(s.scene || "0") + 0.1), synopsis: s.synopsis + " (copy)", startTime: "", endTime: "" };
    setStrips(p => [...p, newScene]);
  };

  const save = () => {
    if (editModal === "new") setStrips(p => [...p, { ...form, id: "s" + Date.now() }]);
    else setStrips(p => p.map(s => s.id === form.id ? form : s));
    setEditModal(null);
  };

  const deleteScene = () => {
    setStrips(p => p.filter(s => s.id !== form.id));
    setDays(p => p.map(d => ({ ...d, strips: d.strips.filter(id => id !== form.id) })));
    setEditModal(null);
  };

  const toggleCast = (id) => {
    const cur = form.cast || [];
    setForm({ ...form, cast: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] });
  };

  const filteredCast = cast.filter(c => {
    if (!castSearch) return true;
    const q = castSearch.toLowerCase();
    return (c.name || "").toLowerCase().includes(q) || (c.roleNum || "").toLowerCase().includes(q) || (c.roleName || "").toLowerCase().includes(q);
  });

  const totalPages = filtered.reduce((s, x) => s + (x.pages || 0), 0);

  // Unique locations used in strips
  const usedLocIds = [...new Set(strips.map(s => s.locationId).filter(Boolean))];

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div>
        <h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Scenes</h2>
        <p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>
          {strips.length} scenes · {totalPages.toFixed(1)} pages · {strips.filter(s => !getDay(s.id)).length} unassigned
        </p>
      </div>
      <button onClick={openNew} style={BP}><span style={{display:"flex",alignItems:"center",gap:6}}><I.Plus/> Add Scene</span></button>
    </div>

    {/* Filters */}
    <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
      <div style={{position:"relative",flex:1,minWidth:200}}>
        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#555"}}><I.Search/></span>
        <input placeholder="Search scene #, location, cast, synopsis..." value={search} onChange={e=>setSearch(e.target.value)} style={{...IS,paddingLeft:34}}/>
      </div>
      <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{...IS,width:120,cursor:"pointer"}}>
        <option value="All">All Types</option>
        {Object.keys(STRIP_COLORS).map(t=><option key={t}>{t}</option>)}
      </select>
      <select value={filterLoc} onChange={e=>setFilterLoc(e.target.value)} style={{...IS,width:160,cursor:"pointer"}}>
        <option value="All">All Locations</option>
        {locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      <select value={filterAssign} onChange={e=>setFilterAssign(e.target.value)} style={{...IS,width:130,cursor:"pointer"}}>
        <option value="All">All Status</option>
        <option value="Assigned">Assigned</option>
        <option value="Unassigned">Unassigned</option>
      </select>
    </div>

    {/* Table */}
    <div style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,overflow:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
        <thead><tr>
          <th onClick={()=>doSort("scene")} style={{...TH,width:60}}>Sc #<SortIcon col="scene"/></th>
          <th onClick={()=>doSort("type")} style={{...TH,width:70}}>Type<SortIcon col="type"/></th>
          <th onClick={()=>doSort("location")} style={TH}>Location<SortIcon col="location"/></th>
          <th onClick={()=>doSort("cast")} style={TH}>Cast<SortIcon col="cast"/></th>
          <th onClick={()=>doSort("pages")} style={{...TH,width:60}}>Pages<SortIcon col="pages"/></th>
          <th onClick={()=>doSort("synopsis")} style={TH}>Synopsis<SortIcon col="synopsis"/></th>
          <th onClick={()=>doSort("assigned")} style={{...TH,width:80}}>Day<SortIcon col="assigned"/></th>
          <th style={{...TH,width:60,cursor:"default"}}>Actions</th>
        </tr></thead>
        <tbody>
          {filtered.map(s => {
            const day = getDay(s.id);
            const castList = getCastNames(s.cast);
            return <tr key={s.id} onClick={()=>openEdit(s)} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#1e2128"} onMouseLeave={e=>e.currentTarget.style.background=""}>
              <td style={{...TD,fontWeight:800,color:"#f0f0f0"}}>{s.scene}</td>
              <td style={TD}><span style={{color:STRIP_COLORS[s.type],fontWeight:700,fontSize:10,background:STRIP_COLORS[s.type]+"18",borderRadius:3,padding:"2px 6px"}}>{s.type}</span></td>
              <td style={{...TD,color:"#aaa"}}>{gLoc(s.locationId)}</td>
              <td style={{...TD,color:"#888",maxWidth:180}} title={castList.map(c=>`${c.roleNum} ${c.name}`).join(", ")}>
                {castList.length > 0 ? castList.map(c=>c.roleNum).join(", ") : "—"}
                {castList.length > 0 && <span style={{color:"#555",marginLeft:4}}>({castList.length})</span>}
              </td>
              <td style={{...TD,fontWeight:700,color:"#888"}}>{s.pages}</td>
              <td style={{...TD,color:"#666",maxWidth:200}} title={s.synopsis}>{s.synopsis || ""}</td>
              <td style={TD}>{day ? <span style={{fontSize:10,fontWeight:600,color:"#22c55e",background:"#22c55e18",padding:"2px 6px",borderRadius:3}}>{day.label}</span> : <span style={{fontSize:10,color:"#555"}}>Unassigned</span>}</td>
              <td style={{...TD,overflow:"visible"}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>duplicate(s)} title="Duplicate" style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:3}}><I.Copy/></button>
              </td>
            </tr>;
          })}
          {filtered.length === 0 && <tr><td colSpan={8} style={{...TD,textAlign:"center",color:"#555",padding:30}}>No scenes found</td></tr>}
        </tbody>
      </table>
    </div>

    {/* Edit/New Modal */}
    {editModal && <Modal title={editModal === "new" ? "Add Scene" : `Edit — Scene ${form.scene}`} onClose={()=>setEditModal(null)} width={620}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={LS}>Scene #</label><input value={form.scene||""} onChange={e=>setForm({...form,scene:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Type</label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={IS}>{Object.keys(STRIP_COLORS).map(t=><option key={t}>{t}</option>)}</select></div>
        <div><label style={LS}>Location</label><select value={form.locationId||""} onChange={e=>setForm({...form,locationId:e.target.value})} style={IS}><option value="">—</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
        <div><label style={LS}>Pages</label><input type="number" step="0.125" value={form.pages||""} onChange={e=>setForm({...form,pages:Number(e.target.value)})} style={IS}/></div>
        <div><label style={LS}>Start Time</label><input type="time" value={form.startTime||""} onChange={e=>setForm({...form,startTime:e.target.value})} style={IS}/></div>
        <div><label style={LS}>End Time</label><input type="time" value={form.endTime||""} onChange={e=>setForm({...form,endTime:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Synopsis</label><input value={form.synopsis||""} onChange={e=>setForm({...form,synopsis:e.target.value})} style={IS}/></div>

        {/* Cast multi-select with search */}
        <div style={{gridColumn:"1/-1"}}>
          <label style={LS}>Cast ({(form.cast||[]).length} selected)</label>
          {/* Selected cast chips */}
          {(form.cast||[]).length > 0 && <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
            {(form.cast||[]).map(id => {
              const c = cast.find(x => x.id === id);
              if (!c) return null;
              return <span key={id} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:600,color:"#E8C94A",background:"#E8C94A18",border:"1px solid #E8C94A44",padding:"3px 8px",borderRadius:4}}>
                <span style={{fontWeight:800}}>{c.roleNum}</span> {c.name}
                <span onClick={()=>toggleCast(id)} style={{cursor:"pointer",marginLeft:2,color:"#E8C94A88",fontSize:13,lineHeight:1}}>&times;</span>
              </span>;
            })}
          </div>}
          {/* Search input */}
          <div style={{position:"relative",marginBottom:6}}>
            <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"#555"}}><I.Search/></span>
            <input placeholder="Search cast by name, role #, character..." value={castSearch} onChange={e=>setCastSearch(e.target.value)} style={{...IS,paddingLeft:30,fontSize:12}}/>
          </div>
          {/* Cast list */}
          <div style={{maxHeight:180,overflow:"auto",background:"#12141a",borderRadius:6,border:"1px solid #2a2d35"}}>
            {filteredCast.length === 0 && <div style={{padding:12,textAlign:"center",color:"#555",fontSize:12}}>No cast found</div>}
            {filteredCast.map(c => {
              const sel = (form.cast||[]).includes(c.id);
              return <div key={c.id} onClick={()=>toggleCast(c.id)} style={{
                display:"flex",alignItems:"center",gap:8,padding:"6px 10px",cursor:"pointer",
                background:sel?"#E8C94A12":"transparent",borderBottom:"1px solid #1a1d23",
              }}
              onMouseEnter={e=>{if(!sel)e.currentTarget.style.background="#1e2128";}}
              onMouseLeave={e=>{if(!sel)e.currentTarget.style.background="transparent";}}>
                <span style={{width:16,height:16,borderRadius:3,border:`2px solid ${sel?"#E8C94A":"#444"}`,background:sel?"#E8C94A":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {sel && <span style={{color:"#111",fontSize:11,fontWeight:800}}>{"✓"}</span>}
                </span>
                <span style={{fontWeight:800,color:sel?"#E8C94A":"#888",fontSize:12,minWidth:28}}>{c.roleNum}</span>
                <span style={{color:sel?"#f0f0f0":"#aaa",fontSize:12}}>{c.name}</span>
                <span style={{color:"#555",fontSize:11,marginLeft:"auto"}}>{c.roleName}</span>
              </div>;
            })}
          </div>
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}>
        <div style={{display:"flex",gap:6}}>
          {editModal === "edit" && <button onClick={deleteScene} style={BD}>Delete</button>}
          {editModal === "edit" && <button onClick={()=>{duplicate(form);setEditModal(null);}} style={BS}><span style={{display:"flex",alignItems:"center",gap:4}}><I.Copy/> Duplicate</span></button>}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setEditModal(null)} style={BS}>Cancel</button>
          <button onClick={save} style={BP}>Save</button>
        </div>
      </div>
    </Modal>}
  </div>;
};

export { ScenesModule };
