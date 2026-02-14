import { useState, useRef } from "react";
import { DEPARTMENTS, I, StatusBadge, Modal, IS, LS, BP, BS, BD, AddressInput } from "./config.jsx";

const STATUSES = ["confirmed","available","hold","unavailable"];
const fullName = (c) => c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : c.name || "";

// CSV parser
function parseCSV(text) {
  const lines = []; let cur = []; let field = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) { if (ch === '"' && text[i+1] === '"') { field += '"'; i++; } else if (ch === '"') { inQ = false; } else { field += ch; } }
    else { if (ch === '"') { inQ = true; } else if (ch === ',') { cur.push(field.trim()); field = ""; } else if (ch === '\n' || ch === '\r') { if (field || cur.length) { cur.push(field.trim()); lines.push(cur); } cur = []; field = ""; if (ch === '\r' && text[i+1] === '\n') i++; } else { field += ch; } }
  }
  if (field || cur.length) { cur.push(field.trim()); lines.push(cur); }
  return lines;
}

const COL_MAP_CREW = { firstname:["firstname","first_name","first name","vorname"], lastname:["lastname","last_name","last name","nachname","surname"], dept:["dept","department","abteilung"], role:["role","position","rolle"], phone:["phone","tel","telephone","telefon"], email:["email","e-mail","mail"], address:["address","adresse","addr"], hotel:["hotel","accommodation","unterkunft"], status:["status"], worker:["worker","type","intern","extern","typ"], dietary:["dietary","diet","food"], notes:["notes","note","bemerkungen"] };
const COL_MAP_CAST = { firstname:["firstname","first_name","first name","vorname"], lastname:["lastname","last_name","last name","nachname","surname"], rolenum:["rolenum","role_num","role #","#","number"], rolename:["rolename","role_name","role name","character","rolle"], phone:["phone","tel","telephone","telefon"], email:["email","e-mail","mail"], address:["address","adresse","addr"], hotel:["hotel","accommodation","unterkunft"], status:["status"], dietary:["dietary","diet","food"], notes:["notes","note","bemerkungen"] };

function autoMapColumns(headers, colMap) {
  const map = {};
  headers.forEach((h, i) => {
    const hl = h.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(colMap)) {
      if (aliases.some(a => hl === a || hl.includes(a))) { map[field] = i; break; }
    }
  });
  return map;
}

const TH = { padding:"8px 10px", textAlign:"left", fontSize:10, fontWeight:700, color:"#666", textTransform:"uppercase", letterSpacing:"0.04em", borderBottom:"1px solid #2a2d35", whiteSpace:"nowrap", cursor:"pointer", userSelect:"none" };
const TD = { padding:"7px 10px", fontSize:12, color:"#ddd", borderBottom:"1px solid #1a1d23", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:200 };

const PeopleModule = ({ crew, setCrew, cast, setCast }) => {
  const [tab, setTab] = useState("crew");
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterWorker, setFilterWorker] = useState("All");
  const [sortCol, setSortCol] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState({});
  const [importModal, setImportModal] = useState(false);
  const [csvData, setCsvData] = useState(null);
  const [colMapping, setColMapping] = useState({});
  const [importPreview, setImportPreview] = useState([]);
  const fileRef = useRef(null);

  const doSort = (col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
  const sortFn = (a, b) => {
    let va, vb;
    if (sortCol === "name") { va = fullName(a).toLowerCase(); vb = fullName(b).toLowerCase(); }
    else { va = (a[sortCol] || "").toString().toLowerCase(); vb = (b[sortCol] || "").toString().toLowerCase(); }
    return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  };
  const SortIcon = ({ col }) => sortCol === col ? <span style={{marginLeft:3,fontSize:8}}>{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span> : null;

  const fCrew = crew.filter(c => {
    const name = fullName(c).toLowerCase(); const q = search.toLowerCase();
    if (q && !name.includes(q) && !(c.role||"").toLowerCase().includes(q) && !(c.dept||"").toLowerCase().includes(q)) return false;
    if (filterDept !== "All" && c.dept !== filterDept) return false;
    if (filterStatus !== "All" && c.status !== filterStatus) return false;
    if (filterWorker !== "All" && (c.worker || "intern") !== filterWorker) return false;
    return true;
  }).sort(sortFn);

  const fCast = cast.filter(c => {
    const name = fullName(c).toLowerCase(); const q = search.toLowerCase();
    if (q && !name.includes(q) && !(c.roleName||"").toLowerCase().includes(q)) return false;
    if (filterStatus !== "All" && (c.status||"available") !== filterStatus) return false;
    return true;
  }).sort(sortFn);

  const openNC = () => { setForm({ firstName:"", lastName:"", dept:"Camera", role:"", phone:"", email:"", worker:"intern", status:"available", notes:"", address:"", hotel:"", dietary:"" }); setEditModal("nC"); };
  const saveC = () => {
    const obj = { ...form, name: `${form.firstName||""} ${form.lastName||""}`.trim() };
    if (editModal === "nC") setCrew(p => [...p, { ...obj, id:"c"+Date.now() }]);
    else setCrew(p => p.map(c => c.id === obj.id ? obj : c));
    setEditModal(null);
  };
  const openNA = () => { setForm({ firstName:"", lastName:"", roleNum:`#${cast.length+1}`, roleName:"", phone:"", email:"", address:"", hotel:"", dietary:"", status:"available", notes:"" }); setEditModal("nA"); };
  const saveA = () => {
    const obj = { ...form, name: `${form.firstName||""} ${form.lastName||""}`.trim() };
    if (editModal === "nA") setCast(p => [...p, { ...obj, id:Date.now() }]);
    else setCast(p => p.map(c => c.id === obj.id ? obj : c));
    setEditModal(null);
  };
  const openEdit = (c, type) => {
    let fn = c.firstName || "", ln = c.lastName || "";
    if (!fn && !ln && c.name) { const parts = c.name.split(" "); fn = parts[0] || ""; ln = parts.slice(1).join(" ") || ""; }
    setForm({ ...c, firstName:fn, lastName:ln });
    setEditModal(type);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = parseCSV(ev.target.result);
      if (lines.length < 2) return;
      const headers = lines[0];
      const rows = lines.slice(1).filter(r => r.some(c => c));
      const map = autoMapColumns(headers, tab === "crew" ? COL_MAP_CREW : COL_MAP_CAST);
      setCsvData({ headers, rows }); setColMapping(map);
      setImportPreview(rows.slice(0, 5).map(r => { const obj = {}; for (const [field, idx] of Object.entries(map)) { obj[field] = r[idx] || ""; } return obj; }));
    };
    reader.readAsText(file); e.target.value = "";
  };
  const doImport = () => {
    if (!csvData) return;
    const items = csvData.rows.map(r => {
      const obj = {}; for (const [field, idx] of Object.entries(colMapping)) { obj[field] = r[idx] || ""; }
      if (tab === "crew") return { id:"c"+Date.now()+Math.random(), firstName:obj.firstname||"", lastName:obj.lastname||"", name:`${obj.firstname||""} ${obj.lastname||""}`.trim(), dept:obj.dept||"Camera", role:obj.role||"", phone:obj.phone||"", email:obj.email||"", address:obj.address||"", hotel:obj.hotel||"", worker:obj.worker||"intern", status:obj.status||"available", dietary:obj.dietary||"", notes:obj.notes||"" };
      else return { id:Date.now()+Math.random(), firstName:obj.firstname||"", lastName:obj.lastname||"", name:`${obj.firstname||""} ${obj.lastname||""}`.trim(), roleNum:obj.rolenum||`#${cast.length+1}`, roleName:obj.rolename||"", phone:obj.phone||"", email:obj.email||"", address:obj.address||"", hotel:obj.hotel||"", status:obj.status||"available", dietary:obj.dietary||"", notes:obj.notes||"" };
    }).filter(x => x.firstName || x.lastName || x.name);
    if (tab === "crew") setCrew(p => [...p, ...items]); else setCast(p => [...p, ...items]);
    setImportModal(false); setCsvData(null); setColMapping({}); setImportPreview([]);
  };

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>People</h2><p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>{crew.length} crew · {crew.filter(c=>c.dept==="Driver").length} drivers · {cast.length} cast</p></div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>setImportModal(true)} style={BS}><span style={{display:"flex",alignItems:"center",gap:5}}>{"\u2B06"} Import CSV</span></button>
        <button onClick={tab==="crew"?openNC:openNA} style={BP}><span style={{display:"flex",alignItems:"center",gap:6}}><I.Plus/> Add {tab==="crew"?"Crew":"Cast"}</span></button>
      </div>
    </div>
    <div style={{display:"flex",gap:4,marginBottom:16}}>{[{id:"crew",l:`Crew (${crew.length})`},{id:"cast",l:`Cast (${cast.length})`}].map(t=><button key={t.id} onClick={()=>{setTab(t.id);setSearch("");setFilterDept("All");setFilterStatus("All");setFilterWorker("All");}} style={{padding:"7px 16px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:tab===t.id?"#E8C94A18":"transparent",border:`1px solid ${tab===t.id?"#E8C94A44":"#2a2d35"}`,color:tab===t.id?"#E8C94A":"#888"}}>{t.l}</button>)}</div>
    <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
      <div style={{position:"relative",flex:1,minWidth:180}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#555"}}><I.Search/></span><input placeholder="Search name, role..." value={search} onChange={e=>setSearch(e.target.value)} style={{...IS,paddingLeft:34}}/></div>
      {tab==="crew"&&<select value={filterDept} onChange={e=>setFilterDept(e.target.value)} style={{...IS,width:140,cursor:"pointer"}}><option value="All">All Depts</option>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select>}
      <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{...IS,width:130,cursor:"pointer"}}><option value="All">All Status</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
      {tab==="crew"&&<select value={filterWorker} onChange={e=>setFilterWorker(e.target.value)} style={{...IS,width:120,cursor:"pointer"}}><option value="All">All Types</option><option value="intern">Intern</option><option value="extern">Extern</option></select>}
    </div>

    {tab==="crew"&&<div style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,overflow:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
        <thead><tr>
          <th onClick={()=>doSort("name")} style={TH}>Name<SortIcon col="name"/></th>
          <th onClick={()=>doSort("dept")} style={TH}>Dept<SortIcon col="dept"/></th>
          <th onClick={()=>doSort("role")} style={TH}>Role<SortIcon col="role"/></th>
          <th style={TH}>Phone</th>
          <th onClick={()=>doSort("status")} style={TH}>Status<SortIcon col="status"/></th>
          <th onClick={()=>doSort("worker")} style={TH}>Type<SortIcon col="worker"/></th>
          <th style={TH}>Dietary</th>
        </tr></thead>
        <tbody>{fCrew.map(c=><tr key={c.id} onClick={()=>openEdit(c,"eC")} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#1e2128"} onMouseLeave={e=>e.currentTarget.style.background=""}>
          <td style={{...TD,fontWeight:600,color:"#f0f0f0"}}>{fullName(c)}</td>
          <td style={{...TD,color:c.dept==="Driver"?"#3b82f6":"#aaa"}}>{c.dept}</td>
          <td style={{...TD,color:"#E8C94A"}}>{c.role}</td>
          <td style={{...TD,color:"#888"}}>{c.phone}</td>
          <td style={TD}><StatusBadge status={c.status}/></td>
          <td style={TD}><span style={{fontSize:10,fontWeight:600,color:(c.worker||"intern")==="extern"?"#f59e0b":"#22c55e",background:(c.worker||"intern")==="extern"?"#f59e0b18":"#22c55e18",padding:"2px 6px",borderRadius:3,textTransform:"uppercase"}}>{c.worker||"intern"}</span></td>
          <td style={{...TD,fontSize:11,color:"#f59e0b"}}>{c.dietary||""}</td>
        </tr>)}{fCrew.length===0&&<tr><td colSpan={7} style={{...TD,textAlign:"center",color:"#555",padding:30}}>No crew found</td></tr>}</tbody>
      </table>
    </div>}

    {tab==="cast"&&<div style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,overflow:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:650}}>
        <thead><tr>
          <th onClick={()=>doSort("roleNum")} style={{...TH,width:50}}>#<SortIcon col="roleNum"/></th>
          <th onClick={()=>doSort("name")} style={TH}>Name<SortIcon col="name"/></th>
          <th onClick={()=>doSort("roleName")} style={TH}>Character<SortIcon col="roleName"/></th>
          <th style={TH}>Phone</th>
          <th onClick={()=>doSort("status")} style={TH}>Status<SortIcon col="status"/></th>
          <th style={TH}>Hotel</th>
          <th style={TH}>Dietary</th>
        </tr></thead>
        <tbody>{fCast.map(c=><tr key={c.id} onClick={()=>openEdit(c,"eA")} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#1e2128"} onMouseLeave={e=>e.currentTarget.style.background=""}>
          <td style={{...TD,fontWeight:800,color:"#E8C94A"}}>{c.roleNum}</td>
          <td style={{...TD,fontWeight:600,color:"#f0f0f0"}}>{fullName(c)}</td>
          <td style={{...TD,color:"#aaa"}}>{c.roleName}</td>
          <td style={{...TD,color:"#888"}}>{c.phone||"\u2014"}</td>
          <td style={TD}><StatusBadge status={c.status||"available"}/></td>
          <td style={{...TD,fontSize:11,color:"#888"}}>{c.hotel||"\u2014"}</td>
          <td style={{...TD,fontSize:11,color:"#f59e0b"}}>{c.dietary||""}</td>
        </tr>)}{fCast.length===0&&<tr><td colSpan={7} style={{...TD,textAlign:"center",color:"#555",padding:30}}>No cast found</td></tr>}</tbody>
      </table>
    </div>}

    {(editModal==="nC"||editModal==="eC")&&<Modal title={editModal==="nC"?"Add Crew":`Edit — ${form.firstName} ${form.lastName}`} onClose={()=>setEditModal(null)}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={LS}>First Name</label><input value={form.firstName||""} onChange={e=>setForm({...form,firstName:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Last Name</label><input value={form.lastName||""} onChange={e=>setForm({...form,lastName:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Department</label><select value={form.dept} onChange={e=>setForm({...form,dept:e.target.value})} style={IS}>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select></div>
        <div><label style={LS}>Role</label><input value={form.role||""} onChange={e=>setForm({...form,role:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Phone</label><input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Email</label><input value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={IS}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
        <div><label style={LS}>Worker Type</label><select value={form.worker||"intern"} onChange={e=>setForm({...form,worker:e.target.value})} style={IS}><option value="intern">Intern</option><option value="extern">Extern</option></select></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Address</label><AddressInput value={form.address} onChange={v=>setForm({...form,address:v})}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Hotel / 2nd Address</label><AddressInput value={form.hotel} onChange={v=>setForm({...form,hotel:v})} placeholder="Hotel or second address..."/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Dietary Restrictions</label><input value={form.dietary||""} onChange={e=>setForm({...form,dietary:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Notes</label><textarea value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} style={{...IS,resize:"vertical"}}/></div>
      </div>
      {form.dept==="Driver"&&<div style={{marginTop:12,padding:10,background:"#3b82f618",border:"1px solid #3b82f633",borderRadius:6,fontSize:12,color:"#3b82f6"}}>Driver — visible in Transport and assignable to vehicles.</div>}
      <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}><div>{editModal==="eC"&&<button onClick={()=>{setCrew(p=>p.filter(c=>c.id!==form.id));setEditModal(null);}} style={BD}>Delete</button>}</div><div style={{display:"flex",gap:8}}><button onClick={()=>setEditModal(null)} style={BS}>Cancel</button><button onClick={saveC} style={BP}>Save</button></div></div>
    </Modal>}

    {(editModal==="nA"||editModal==="eA")&&<Modal title={editModal==="nA"?"Add Cast":`Edit — ${form.firstName} ${form.lastName}`} onClose={()=>setEditModal(null)}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={LS}>First Name</label><input value={form.firstName||""} onChange={e=>setForm({...form,firstName:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Last Name</label><input value={form.lastName||""} onChange={e=>setForm({...form,lastName:e.target.value})} style={IS}/></div>
        <div style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:8}}><div><label style={LS}>Role #</label><input value={form.roleNum||""} onChange={e=>setForm({...form,roleNum:e.target.value})} style={IS}/></div><div><label style={LS}>Character Name</label><input value={form.roleName||""} onChange={e=>setForm({...form,roleName:e.target.value})} style={IS}/></div></div>
        <div><label style={LS}>Status</label><select value={form.status||"available"} onChange={e=>setForm({...form,status:e.target.value})} style={IS}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
        <div><label style={LS}>Phone</label><input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Email</label><input value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Address</label><AddressInput value={form.address} onChange={v=>setForm({...form,address:v})}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Hotel</label><AddressInput value={form.hotel} onChange={v=>setForm({...form,hotel:v})} placeholder="Hotel address..."/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Dietary Restrictions</label><input value={form.dietary||""} onChange={e=>setForm({...form,dietary:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Notes</label><textarea value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} style={{...IS,resize:"vertical"}}/></div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}><div>{editModal==="eA"&&<button onClick={()=>{setCast(p=>p.filter(c=>c.id!==form.id));setEditModal(null);}} style={BD}>Delete</button>}</div><div style={{display:"flex",gap:8}}><button onClick={()=>setEditModal(null)} style={BS}>Cancel</button><button onClick={saveA} style={BP}>Save</button></div></div>
    </Modal>}

    {importModal&&<Modal title={`Import ${tab==="crew"?"Crew":"Cast"} from CSV`} onClose={()=>{setImportModal(false);setCsvData(null);setColMapping({});setImportPreview([]);}} width={640}>
      <p style={{fontSize:12,color:"#888",marginBottom:16}}>Upload a CSV with headers. Columns auto-match. Expected: {tab==="crew"?"FirstName, LastName, Dept, Role, Phone, Email, Address, Hotel, Status, Worker, Dietary, Notes":"FirstName, LastName, RoleNum, RoleName, Phone, Email, Address, Hotel, Status, Dietary, Notes"}.</p>
      <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{display:"none"}}/>
      <button onClick={()=>fileRef.current?.click()} style={{...BS,width:"100%",padding:"14px",marginBottom:16,fontSize:13}}>{"\u{1F4C1}"} Choose CSV File</button>
      {csvData&&<div>
        <div style={{fontSize:12,color:"#22c55e",marginBottom:12}}><I.CheckCircle/> {csvData.rows.length} rows, {csvData.headers.length} columns. {Object.keys(colMapping).length} matched.</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>{Object.entries(colMapping).map(([field,idx])=><span key={field} style={{fontSize:10,background:"#E8C94A18",color:"#E8C94A",padding:"3px 8px",borderRadius:4,fontWeight:600}}>{field} {"\u2192"} {csvData.headers[idx]}</span>)}</div>
        {importPreview.length>0&&<div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:"#888",marginBottom:6}}>Preview (first {importPreview.length}):</div>
          <div style={{background:"#12141a",borderRadius:6,overflow:"auto",maxHeight:160}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{Object.keys(colMapping).map(f=><th key={f} style={{...TH,fontSize:9}}>{f}</th>)}</tr></thead><tbody>{importPreview.map((r,i)=><tr key={i}>{Object.keys(colMapping).map(f=><td key={f} style={{...TD,fontSize:11}}>{r[f]||"\u2014"}</td>)}</tr>)}</tbody></table>
          </div>
        </div>}
        <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><button onClick={()=>{setImportModal(false);setCsvData(null);}} style={BS}>Cancel</button><button onClick={doImport} style={BP}>Import {csvData.rows.length} {tab==="crew"?"Crew":"Cast"}</button></div>
      </div>}
      {!csvData&&<div style={{textAlign:"center",padding:20,color:"#555",fontSize:12}}>No file selected yet</div>}
    </Modal>}
  </div>;
};
export { PeopleModule };
