import { useState } from "react";
import { LOCATION_TYPES, I, Modal, IS, LS, BP, BS, BD, AddressInput } from "./config.jsx";

const TH = { padding:"8px 10px", textAlign:"left", fontSize:10, fontWeight:700, color:"#666", textTransform:"uppercase", letterSpacing:"0.04em", borderBottom:"1px solid #2a2d35", whiteSpace:"nowrap", cursor:"pointer", userSelect:"none" };
const TD = { padding:"7px 10px", fontSize:12, color:"#ddd", borderBottom:"1px solid #1a1d23", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:200 };

const LocationsModule = ({ locations, setLocations, strips }) => {
  const [search,setSearch]=useState("");
  const [fT,setFT]=useState("All");
  const [editM,setEditM]=useState(null);
  const [form,setForm]=useState({});
  const [sortCol,setSortCol]=useState("name");
  const [sortDir,setSortDir]=useState("asc");

  const doSort = (col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
  const SortIcon = ({ col }) => sortCol === col ? <span style={{marginLeft:3,fontSize:8}}>{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span> : null;

  const sc = id => strips.filter(s => s.locationId === id).length;

  const sortFn = (a, b) => {
    let va, vb;
    if (sortCol === "scenes") { va = sc(a.id); vb = sc(b.id); return sortDir === "asc" ? va - vb : vb - va; }
    if (sortCol === "permit") { va = a.permit ? 1 : 0; vb = b.permit ? 1 : 0; return sortDir === "asc" ? va - vb : vb - va; }
    va = (a[sortCol] || "").toString().toLowerCase(); vb = (b[sortCol] || "").toString().toLowerCase();
    return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  };

  const fl = locations.filter(l => (fT === "All" || l.type === fT) && (l.name + l.address + (l.contact||"")).toLowerCase().includes(search.toLowerCase())).sort(sortFn);

  const save = () => {
    if (editM === "new") setLocations(p => [...p, { ...form, id:"loc"+Date.now() }]);
    else setLocations(p => p.map(l => l.id === form.id ? form : l));
    setEditM(null);
  };

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Locations</h2><p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>{locations.length} locations</p></div>
      <button onClick={()=>{setForm({name:"",address:"",type:"Practical",contact:"",phone:"",email:"",notes:"",permit:false});setEditM("new");}} style={BP}><span style={{display:"flex",alignItems:"center",gap:6}}><I.Plus/> Add Location</span></button>
    </div>

    <div style={{display:"flex",gap:10,marginBottom:16}}>
      <div style={{position:"relative",flex:1}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#555"}}><I.Search/></span><input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{...IS,paddingLeft:34}}/></div>
      <select value={fT} onChange={e=>setFT(e.target.value)} style={{...IS,width:160,cursor:"pointer"}}><option value="All">All Types</option>{LOCATION_TYPES.map(t=><option key={t}>{t}</option>)}</select>
    </div>

    <div style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,overflow:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
        <thead><tr>
          <th onClick={()=>doSort("name")} style={TH}>Name<SortIcon col="name"/></th>
          <th onClick={()=>doSort("address")} style={TH}>Address<SortIcon col="address"/></th>
          <th onClick={()=>doSort("type")} style={TH}>Type<SortIcon col="type"/></th>
          <th onClick={()=>doSort("contact")} style={TH}>Contact<SortIcon col="contact"/></th>
          <th onClick={()=>doSort("phone")} style={TH}>Phone<SortIcon col="phone"/></th>
          <th onClick={()=>doSort("email")} style={TH}>Email<SortIcon col="email"/></th>
          <th onClick={()=>doSort("permit")} style={TH}>Permit<SortIcon col="permit"/></th>
          <th onClick={()=>doSort("scenes")} style={TH}>Scenes<SortIcon col="scenes"/></th>
          <th onClick={()=>doSort("notes")} style={TH}>Notes<SortIcon col="notes"/></th>
        </tr></thead>
        <tbody>
          {fl.map(loc => <tr key={loc.id} onClick={()=>{setForm({...loc});setEditM(loc);}} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#1e2128"} onMouseLeave={e=>e.currentTarget.style.background=""}>
            <td style={{...TD,fontWeight:600,color:"#f0f0f0"}}>{loc.name}</td>
            <td style={{...TD,color:"#aaa",maxWidth:180}} title={loc.address}>{loc.address}</td>
            <td style={{...TD,color:"#888"}}>{loc.type}</td>
            <td style={{...TD,color:"#888"}}>{loc.contact||"\u2014"}</td>
            <td style={{...TD,color:"#888"}}>{loc.phone||"\u2014"}</td>
            <td style={{...TD,color:"#888"}}>{loc.email||"\u2014"}</td>
            <td style={TD}>{loc.permit ? <span style={{fontSize:10,fontWeight:600,color:"#22c55e",background:"#22c55e18",padding:"2px 6px",borderRadius:3}}>YES</span> : <span style={{fontSize:10,fontWeight:600,color:"#555",background:"#55555518",padding:"2px 6px",borderRadius:3}}>NO</span>}</td>
            <td style={TD}>{sc(loc.id) > 0 ? <span style={{fontSize:10,fontWeight:600,color:"#E8C94A",background:"#E8C94A18",padding:"2px 6px",borderRadius:3}}>{sc(loc.id)}</span> : <span style={{color:"#555"}}>0</span>}</td>
            <td style={{...TD,fontSize:11,color:"#555",fontStyle:"italic",maxWidth:160}} title={loc.notes||""}>{loc.notes||""}</td>
          </tr>)}
          {fl.length===0&&<tr><td colSpan={9} style={{...TD,textAlign:"center",color:"#555",padding:30}}>No locations found</td></tr>}
        </tbody>
      </table>
    </div>

    {editM&&<Modal title={editM==="new"?"Add Location":`Edit \u2014 ${form.name}`} onClose={()=>setEditM(null)}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Name</label><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Address</label><AddressInput value={form.address} onChange={v=>setForm({...form,address:v})}/></div>
        <div><label style={LS}>Type</label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={IS}>{LOCATION_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
        <div style={{display:"flex",alignItems:"flex-end",paddingBottom:2}}><label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#ccc",cursor:"pointer"}}><input type="checkbox" checked={form.permit||false} onChange={e=>setForm({...form,permit:e.target.checked})}/> Permit Secured</label></div>
        <div><label style={LS}>Contact</label><input value={form.contact||""} onChange={e=>setForm({...form,contact:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Phone</label><input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Email</label><input value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})} style={IS} placeholder="Contact email..."/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Notes</label><textarea value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} style={{...IS,resize:"vertical"}}/></div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}><div>{editM!=="new"&&<button onClick={()=>{setLocations(p=>p.filter(l=>l.id!==form.id));setEditM(null);}} style={BD}>Delete</button>}</div><div style={{display:"flex",gap:8}}><button onClick={()=>setEditM(null)} style={BS}>Cancel</button><button onClick={save} style={BP}>Save</button></div></div>
    </Modal>}
  </div>;
};
export { LocationsModule };
