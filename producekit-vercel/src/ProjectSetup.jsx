import { useState } from "react";
import { KEY_ROLES, I, Modal, IS, LS, BP, BS, BD } from "./config.jsx";
import { defaultProject } from "./data.js";

const ProjectSetup = ({ projects, setProjects, activeId, setActiveId }) => {
  const [editModal,setEditModal]=useState(null);const [form,setForm]=useState({});
  const active=projects.find(p=>p.id===activeId);
  const openEdit=(p)=>{setForm({id:p.id,name:p.name,production:p.production,shootingDays:p.shootingDays||20,keyRoles:{...(p.keyRoles||{})}});setEditModal("edit");};
  const openNew=()=>{setForm({name:"New Production",production:"",shootingDays:20,keyRoles:{}});setEditModal("new");};
  const save=()=>{
    if(editModal==="new"){const np=defaultProject();np.name=form.name;np.production=form.production;np.shootingDays=form.shootingDays;np.keyRoles=form.keyRoles;np.crew=[];np.cast=[];np.strips=[];np.days=[];np.vehicles=[];np.routes=[];np.locations=[];setProjects(p=>[...p,np]);setActiveId(np.id);}
    else{setProjects(p=>p.map(pr=>pr.id===form.id?{...pr,name:form.name,production:form.production,shootingDays:form.shootingDays,keyRoles:form.keyRoles}:pr));}
    setEditModal(null);
  };
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Project Setup</h2>
      <button onClick={openNew} style={BP}><span style={{display:"flex",alignItems:"center",gap:5}}><I.Plus/> New Project</span></button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
      {projects.map(p=><div key={p.id} style={{background:"#1a1d23",border:`1px solid ${p.id===activeId?"#E8C94A55":"#2a2d35"}`,borderRadius:10,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <div><div style={{fontSize:16,fontWeight:800,color:p.id===activeId?"#E8C94A":"#f0f0f0"}}>{p.name}{p.id===activeId&&<span style={{fontSize:10,marginLeft:8,color:"#22c55e"}}>ACTIVE</span>}</div><div style={{fontSize:12,color:"#888"}}>{p.production}</div></div>
        </div>
        <div style={{fontSize:11,color:"#666",marginBottom:8}}>{p.crew?.length||0} crew · {p.cast?.length||0} cast · {p.days?.length||0}/{p.shootingDays||"?"} days · {p.strips?.length||0} scenes</div>
        {p.keyRoles&&<div style={{fontSize:10,color:"#555",marginBottom:10}}>{KEY_ROLES.filter(r=>p.keyRoles[r]).map(r=>`${r}: ${p.keyRoles[r]}`).join(" · ")}</div>}
        <div style={{display:"flex",gap:6}}>
          {p.id!==activeId&&<button onClick={()=>setActiveId(p.id)} style={{...BP,padding:"6px 12px",fontSize:11}}>Activate</button>}
          <button onClick={()=>openEdit(p)} style={{...BS,padding:"6px 12px",fontSize:11}}><I.Edit/> Edit</button>
          {projects.length>1&&<button onClick={()=>{if(p.id===activeId){const other=projects.find(x=>x.id!==p.id);if(other)setActiveId(other.id);}setProjects(pr=>pr.filter(x=>x.id!==p.id));}} style={{...BD,padding:"6px 12px",fontSize:11}}><I.Trash/></button>}
        </div>
      </div>)}
    </div>
    {editModal&&<Modal title={editModal==="new"?"New Project":"Edit Project"} onClose={()=>setEditModal(null)}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={LS}>Production Name</label><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Production Company</label><input value={form.production||""} onChange={e=>setForm({...form,production:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Shooting Days (Total)</label><input type="number" value={form.shootingDays||20} onChange={e=>setForm({...form,shootingDays:Number(e.target.value)})} style={IS}/></div>
      </div>
      <h4 style={{margin:"20px 0 10px",fontSize:13,fontWeight:700,color:"#f0f0f0"}}>Key Roles</h4>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {KEY_ROLES.map(r=><div key={r}><label style={LS}>{r}</label><input value={form.keyRoles?.[r]||""} onChange={e=>setForm({...form,keyRoles:{...form.keyRoles,[r]:e.target.value}})} style={IS} placeholder={`Enter ${r} name`}/></div>)}
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20}}><button onClick={()=>setEditModal(null)} style={BS}>Cancel</button><button onClick={save} style={BP}>Save</button></div>
    </Modal>}
  </div>;
};
export { ProjectSetup };
