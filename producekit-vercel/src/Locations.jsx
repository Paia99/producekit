import { useState } from "react";
import { LOCATION_TYPES, I, Modal, IS, LS, BP, BS, BD, AddressInput } from "./config.js";

const LocationsModule = ({ locations, setLocations, strips }) => {
  const [search,setSearch]=useState("");const [fT,setFT]=useState("All");const [editM,setEditM]=useState(null);const [form,setForm]=useState({});
  const fl = locations.filter(l=>(fT==="All"||l.type===fT)&&(l.name+l.address).toLowerCase().includes(search.toLowerCase()));
  const save=()=>{if(editM==="new")setLocations(p=>[...p,{...form,id:"loc"+Date.now()}]);else setLocations(p=>p.map(l=>l.id===form.id?form:l));setEditM(null);};
  const sc=id=>strips.filter(s=>s.locationId===id).length;
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Locations</h2><p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>{locations.length} locations</p></div><button onClick={()=>{setForm({name:"",address:"",type:"Practical",contact:"",phone:"",notes:"",permit:false});setEditM("new");}} style={BP}><span style={{display:"flex",alignItems:"center",gap:6}}><I.Plus/> Add Location</span></button></div>
    <div style={{display:"flex",gap:10,marginBottom:16}}><div style={{position:"relative",flex:1}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#555"}}><I.Search/></span><input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{...IS,paddingLeft:34}}/></div><select value={fT} onChange={e=>setFT(e.target.value)} style={{...IS,width:160,cursor:"pointer"}}><option value="All">All Types</option>{LOCATION_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:10}}>
      {fl.map(loc=><div key={loc.id} onClick={()=>{setForm({...loc});setEditM(loc);}} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:16,cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontSize:14,fontWeight:700,color:"#f0f0f0"}}>{loc.name}</div><div style={{fontSize:12,color:"#888",marginTop:2}}>{loc.type}</div></div><div style={{display:"flex",gap:6}}>{loc.permit&&<span style={{fontSize:10,fontWeight:600,color:"#22c55e",background:"#22c55e18",padding:"2px 6px",borderRadius:3}}>PERMIT</span>}{sc(loc.id)>0&&<span style={{fontSize:10,fontWeight:600,color:"#E8C94A",background:"#E8C94A18",padding:"2px 6px",borderRadius:3}}>{sc(loc.id)} sc</span>}</div></div>
        <div style={{fontSize:12,color:"#aaa"}}><I.Map/> {loc.address}</div>
        {loc.contact&&<div style={{fontSize:11,color:"#666",marginTop:4}}>{loc.contact}{loc.phone&&` · ${loc.phone}`}</div>}
        {loc.notes&&<div style={{fontSize:11,color:"#555",marginTop:4,fontStyle:"italic"}}>{loc.notes}</div>}
      </div>)}
    </div>
    {editM&&<Modal title={editM==="new"?"Add Location":`Edit — ${form.name}`} onClose={()=>setEditM(null)}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Name</label><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Address</label><AddressInput value={form.address} onChange={v=>setForm({...form,address:v})}/></div>
        <div><label style={LS}>Type</label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={IS}>{LOCATION_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
        <div style={{display:"flex",alignItems:"flex-end",paddingBottom:2}}><label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#ccc",cursor:"pointer"}}><input type="checkbox" checked={form.permit||false} onChange={e=>setForm({...form,permit:e.target.checked})}/> Permit Secured</label></div>
        <div><label style={LS}>Contact</label><input value={form.contact||""} onChange={e=>setForm({...form,contact:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Phone</label><input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Notes</label><textarea value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} style={{...IS,resize:"vertical"}}/></div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}><div>{editM!=="new"&&<button onClick={()=>{setLocations(p=>p.filter(l=>l.id!==form.id));setEditM(null);}} style={BD}>Delete</button>}</div><div style={{display:"flex",gap:8}}><button onClick={()=>setEditM(null)} style={BS}>Cancel</button><button onClick={save} style={BP}>Save</button></div></div>
    </Modal>}
  </div>;
};
export { LocationsModule };
