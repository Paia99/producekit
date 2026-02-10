import { useState } from "react";
import { DEPARTMENTS, I, StatusBadge, Modal, IS, LS, BP, BS, BD, AddressInput } from "./config.js";

const PeopleModule = ({ crew, setCrew, cast, setCast }) => {
  const [tab,setTab]=useState("crew");const [search,setSearch]=useState("");const [filterDept,setFilterDept]=useState("All");const [editModal,setEditModal]=useState(null);const [form,setForm]=useState({});
  const fCrew = crew.filter(c=>(filterDept==="All"||c.dept===filterDept)&&(c.name+c.role).toLowerCase().includes(search.toLowerCase()));
  const fCast = cast.filter(c=>(c.name+c.roleName).toLowerCase().includes(search.toLowerCase()));
  const openNC=()=>{setForm({name:"",dept:"Camera",role:"",phone:"",email:"",union:false,status:"available",notes:"",address:""});setEditModal("nC");};
  const saveC=()=>{if(editModal==="nC")setCrew(p=>[...p,{...form,id:"c"+Date.now()}]);else setCrew(p=>p.map(c=>c.id===form.id?form:c));setEditModal(null);};
  const openNA=()=>{setForm({name:"",roleNum:`#${cast.length+1}`,roleName:"",address:"",hotel:"",dietary:"",notes:""});setEditModal("nA");};
  const saveA=()=>{if(editModal==="nA")setCast(p=>[...p,{...form,id:Date.now()}]);else setCast(p=>p.map(c=>c.id===form.id?form:c));setEditModal(null);};
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>People</h2><p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>{crew.length} crew · {crew.filter(c=>c.dept==="Driver").length} drivers · {cast.length} cast</p></div>
      <button onClick={tab==="crew"?openNC:openNA} style={BP}><span style={{display:"flex",alignItems:"center",gap:6}}><I.Plus/> Add {tab==="crew"?"Crew":"Cast"}</span></button>
    </div>
    <div style={{display:"flex",gap:4,marginBottom:16}}>{[{id:"crew",l:`Crew (${crew.length})`},{id:"cast",l:`Cast (${cast.length})`}].map(t=><button key={t.id} onClick={()=>{setTab(t.id);setSearch("");setFilterDept("All");}} style={{padding:"7px 16px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:tab===t.id?"#E8C94A18":"transparent",border:`1px solid ${tab===t.id?"#E8C94A44":"#2a2d35"}`,color:tab===t.id?"#E8C94A":"#888"}}>{t.l}</button>)}</div>
    <div style={{display:"flex",gap:10,marginBottom:16}}><div style={{position:"relative",flex:1}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#555"}}><I.Search/></span><input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{...IS,paddingLeft:34}}/></div>{tab==="crew"&&<select value={filterDept} onChange={e=>setFilterDept(e.target.value)} style={{...IS,width:160,cursor:"pointer"}}><option value="All">All Depts</option>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select>}</div>
    {tab==="crew"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
      {fCrew.map(c=><div key={c.id} onClick={()=>{setForm({...c});setEditModal("eC");}} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:16,cursor:"pointer",borderLeft:c.dept==="Driver"?"3px solid #3b82f6":"3px solid transparent"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><div><div style={{fontSize:14,fontWeight:700,color:"#f0f0f0"}}>{c.name}</div><div style={{fontSize:12,color:"#E8C94A",fontWeight:600}}>{c.role}</div></div><StatusBadge status={c.status}/></div>
        <div style={{fontSize:11,color:"#888",fontWeight:600,marginBottom:6,textTransform:"uppercase"}}>{c.dept}{c.union&&" · UNION"}</div>
        <div style={{fontSize:12,color:"#aaa"}}><I.Phone/> {c.phone}</div>
        {c.address&&<div style={{marginTop:4,fontSize:11,color:"#555"}}><I.Map/> {c.address}</div>}
      </div>)}</div>}
    {tab==="cast"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:10}}>
      {fCast.map(c=><div key={c.id} onClick={()=>{setForm({...c});setEditModal("eA");}} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,padding:16,cursor:"pointer"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><span style={{fontSize:13,fontWeight:800,color:"#E8C94A"}}>{c.roleNum}</span><span style={{fontSize:14,fontWeight:700,color:"#f0f0f0"}}>{c.name}</span></div>
        <div style={{fontSize:12,color:"#888"}}>as {c.roleName}</div>
        {c.hotel&&<div style={{fontSize:11,color:"#888",marginTop:4}}>{"\u{1F3E8}"} {c.hotel}</div>}
        {c.address&&<div style={{fontSize:11,color:"#555",marginTop:2}}><I.Map/> {c.address}</div>}
        {c.dietary&&<div style={{marginTop:4,fontSize:10,fontWeight:600,color:"#f59e0b",background:"#f59e0b18",padding:"2px 6px",borderRadius:3,display:"inline-block"}}>{c.dietary}</div>}
        {c.notes&&<div style={{marginTop:4,fontSize:11,color:"#666",fontStyle:"italic"}}>{c.notes}</div>}
      </div>)}</div>}
    {(editModal==="nC"||editModal==="eC")&&<Modal title={editModal==="nC"?"Add Crew":`Edit — ${form.name}`} onClose={()=>setEditModal(null)}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={LS}>Name</label><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Role</label><input value={form.role||""} onChange={e=>setForm({...form,role:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Department</label><select value={form.dept} onChange={e=>setForm({...form,dept:e.target.value})} style={IS}>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select></div>
        <div><label style={LS}>Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={IS}>{["confirmed","available","hold","unavailable"].map(s=><option key={s}>{s}</option>)}</select></div>
        <div><label style={LS}>Phone</label><input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Email</label><input value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Address</label><AddressInput value={form.address} onChange={v=>setForm({...form,address:v})}/></div>
        <div><label style={{...LS,marginBottom:8}}> </label><label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#ccc",cursor:"pointer"}}><input type="checkbox" checked={form.union||false} onChange={e=>setForm({...form,union:e.target.checked})}/> Union</label></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Notes</label><textarea value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} style={{...IS,resize:"vertical"}}/></div>
      </div>
      {form.dept==="Driver"&&<div style={{marginTop:12,padding:10,background:"#3b82f618",border:"1px solid #3b82f633",borderRadius:6,fontSize:12,color:"#3b82f6"}}>Driver — visible in Transport and assignable to vehicles.</div>}
      <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}><div>{editModal==="eC"&&<button onClick={()=>{setCrew(p=>p.filter(c=>c.id!==form.id));setEditModal(null);}} style={BD}>Delete</button>}</div><div style={{display:"flex",gap:8}}><button onClick={()=>setEditModal(null)} style={BS}>Cancel</button><button onClick={saveC} style={BP}>Save</button></div></div>
    </Modal>}
    {(editModal==="nA"||editModal==="eA")&&<Modal title={editModal==="nA"?"Add Cast":`Edit — ${form.name}`} onClose={()=>setEditModal(null)}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={LS}>Name</label><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} style={IS}/></div>
        <div style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:8}}><div><label style={LS}>Role #</label><input value={form.roleNum||""} onChange={e=>setForm({...form,roleNum:e.target.value})} style={IS}/></div><div><label style={LS}>Role Name</label><input value={form.roleName||""} onChange={e=>setForm({...form,roleName:e.target.value})} style={IS}/></div></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Address</label><AddressInput value={form.address} onChange={v=>setForm({...form,address:v})}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Hotel</label><AddressInput value={form.hotel} onChange={v=>setForm({...form,hotel:v})} placeholder="Hotel address..."/></div>
        <div><label style={LS}>Dietary Restrictions</label><input value={form.dietary||""} onChange={e=>setForm({...form,dietary:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Notes</label><textarea value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} style={{...IS,resize:"vertical"}}/></div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}><div>{editModal==="eA"&&<button onClick={()=>{setCast(p=>p.filter(c=>c.id!==form.id));setEditModal(null);}} style={BD}>Delete</button>}</div><div style={{display:"flex",gap:8}}><button onClick={()=>setEditModal(null)} style={BS}>Cancel</button><button onClick={saveA} style={BP}>Save</button></div></div>
    </Modal>}
  </div>;
};
export { PeopleModule };
