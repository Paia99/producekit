import { useState } from "react";
import { STRIP_COLORS, fmtTime, fmtDate, addMin, I, Modal, IS, LS, BP, BS, BD } from "./config.js";

const StripboardModule = ({ strips, setStrips, days, setDays, locations, cast }) => {
  const [editStrip,setEditStrip]=useState(null);const [sf,setSf]=useState({});
  const unsch=strips.filter(s=>!days.some(d=>d.strips.includes(s.id)));
  const gLoc=id=>locations.find(x=>x.id===id)?.name||"—";
  const moveS=(sid,did,dir)=>{setDays(p=>{let u=p.map(d=>({...d,strips:[...d.strips]}));const day=u.find(d=>d.id===did);if(!day)return p;const i=day.strips.indexOf(sid);if(i<0)return p;const n=i+dir;if(n<0||n>=day.strips.length)return p;[day.strips[i],day.strips[n]]=[day.strips[n],day.strips[i]];return u;});};
  const addDay=()=>{const n=days.length+1;const ld=days.length>0?new Date(days[days.length-1].date):new Date();ld.setDate(ld.getDate()+1);setDays(p=>[...p,{id:"d"+Date.now(),label:`Day ${n}`,date:ld.toISOString().split("T")[0],strips:[],callTime:"06:00"}]);};
  const saveSt=()=>{if(editStrip==="new")setStrips(p=>[...p,{...sf,id:"s"+Date.now()}]);else setStrips(p=>p.map(s=>s.id===sf.id?sf:s));setEditStrip(null);};
  const estTimes=(did)=>{const day=days.find(d=>d.id===did);if(!day)return;let cur=day.callTime||"06:00";const ordered=day.strips;setStrips(prev=>{let up=[...prev];ordered.forEach((sid,idx)=>{const si=up.findIndex(s=>s.id===sid);if(si<0)return;let start=cur;for(let j=0;j<idx;j++){const ps=up.find(s=>s.id===ordered[j]);start=addMin(day.callTime||"06:00",0);let t=day.callTime||"06:00";for(let k=0;k<=j;k++){if(k>0){const pk=up.find(s=>s.id===ordered[k-1]);t=addMin(t,Math.round((pk?.pages||1)*60));}};start=t;}const dur=Math.round((up[si].pages||1)*60);up[si]={...up[si],startTime:start,endTime:addMin(start,dur)};cur=addMin(start,dur);});return up;});};
  const SC=({strip,dayId,index,total})=>(
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#12141a",borderLeft:`4px solid ${STRIP_COLORS[strip.type]}`,borderRadius:6,fontSize:12,border:"1px solid #1e2028",userSelect:"none"}}>
      <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
        {dayId&&index>0&&<button onClick={()=>moveS(strip.id,dayId,-1)} style={{background:"none",border:"none",color:"#666",cursor:"pointer",padding:0,fontSize:10,lineHeight:1}}>{"\u25B2"}</button>}
        {dayId&&index<total-1&&<button onClick={()=>moveS(strip.id,dayId,1)} style={{background:"none",border:"none",color:"#666",cursor:"pointer",padding:0,fontSize:10,lineHeight:1}}>{"\u25BC"}</button>}
      </div>
      <span style={{fontWeight:800,color:"#f0f0f0",minWidth:32}}>Sc.{strip.scene}</span>
      <span style={{color:STRIP_COLORS[strip.type],fontWeight:700,fontSize:10,minWidth:36,textAlign:"center",background:STRIP_COLORS[strip.type]+"18",borderRadius:3,padding:"2px 4px"}}>{strip.type}</span>
      <span style={{color:"#aaa",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{strip.synopsis}</span>
      {(strip.startTime||strip.endTime)&&<span style={{color:"#3b82f6",fontSize:10,fontWeight:600,flexShrink:0,background:"#3b82f618",padding:"2px 5px",borderRadius:3}}>{strip.startTime||"?"} – {strip.endTime||"?"}</span>}
      <span style={{color:"#666",fontSize:10,flexShrink:0}}>{gLoc(strip.locationId)}</span>
      <span style={{color:"#888",fontWeight:700,fontSize:11,minWidth:30,textAlign:"right"}}>{strip.pages}pg</span>
      <button onClick={e=>{e.stopPropagation();setSf({...strip});setEditStrip(strip);}} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:2}}><I.Edit/></button>
    </div>);
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div><h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Stripboard</h2><p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>{strips.length} scenes · {days.length} days</p></div><div style={{display:"flex",gap:8}}><button onClick={()=>{setSf({scene:String(strips.length+1),type:"D/INT",locationId:locations[0]?.id||"",cast:[],pages:1,synopsis:"",startTime:"",endTime:""});setEditStrip("new");}} style={BS}><span style={{display:"flex",alignItems:"center",gap:5}}><I.Plus/> Scene</span></button><button onClick={addDay} style={BP}><span style={{display:"flex",alignItems:"center",gap:5}}><I.Plus/> Day</span></button></div></div>
    <div style={{display:"flex",gap:16,marginBottom:16,padding:"8px 12px",background:"#1a1d23",borderRadius:8,border:"1px solid #2a2d35"}}>{Object.entries(STRIP_COLORS).map(([t,c])=><span key={t} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#aaa"}}><span style={{width:12,height:12,borderRadius:3,background:c}}/>{t}</span>)}</div>
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {days.map(day=>{const ds=day.strips.map(sid=>strips.find(s=>s.id===sid)).filter(Boolean);const tp=ds.reduce((s,x)=>s+x.pages,0);
      return<div key={day.id} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#1e2128",borderBottom:"1px solid #2a2d35"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontWeight:800,color:"#E8C94A",fontSize:14}}>{day.label}</span><span style={{fontSize:12,color:"#666"}}>{fmtDate(day.date)}</span><span style={{fontSize:11,color:"#888"}}>Call: {fmtTime(day.callTime)}</span></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={()=>estTimes(day.id)} style={{...BS,padding:"4px 10px",fontSize:10}}><I.Clock/> <span style={{marginLeft:3}}>Estimate Times</span></button>
            <span style={{fontSize:11,color:"#888"}}>{ds.length} sc · {tp.toFixed(1)} pg</span>
            <button onClick={()=>setDays(p=>p.filter(d=>d.id!==day.id))} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:2}}><I.Trash/></button>
          </div></div>
        <div style={{padding:8,display:"flex",flexDirection:"column",gap:4,minHeight:40}}>{ds.map((s,i)=><SC key={s.id} strip={s} dayId={day.id} index={i} total={ds.length}/>)}{ds.length===0&&<div style={{textAlign:"center",padding:12,color:"#444",fontSize:12,fontStyle:"italic"}}>No scenes</div>}</div>
      </div>;})}
      {unsch.length>0&&<div style={{background:"#16181e",border:"1px dashed #333",borderRadius:10}}><div style={{padding:"10px 14px",borderBottom:"1px solid #222"}}><span style={{fontWeight:700,color:"#888",fontSize:13}}>Unscheduled ({unsch.length})</span></div><div style={{padding:8,display:"flex",flexDirection:"column",gap:4}}>{unsch.map((s,i)=><SC key={s.id} strip={s} dayId={null} index={i} total={unsch.length}/>)}</div></div>}
    </div>
    {editStrip&&<Modal title={editStrip==="new"?"Add Scene":`Edit Sc.${sf.scene}`} onClose={()=>setEditStrip(null)}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={LS}>Scene #</label><input value={sf.scene} onChange={e=>setSf({...sf,scene:e.target.value})} style={IS}/></div>
        <div><label style={LS}>Type</label><select value={sf.type} onChange={e=>setSf({...sf,type:e.target.value})} style={IS}>{Object.keys(STRIP_COLORS).map(t=><option key={t}>{t}</option>)}</select></div>
        <div><label style={LS}>Location</label><select value={sf.locationId||""} onChange={e=>setSf({...sf,locationId:e.target.value})} style={IS}><option value="">—</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
        <div><label style={LS}>Pages</label><input type="number" step="0.125" value={sf.pages} onChange={e=>setSf({...sf,pages:Number(e.target.value)})} style={IS}/></div>
        <div><label style={LS}>Start Time</label><input type="time" value={sf.startTime||""} onChange={e=>setSf({...sf,startTime:e.target.value})} style={IS}/></div>
        <div><label style={LS}>End Time</label><input type="time" value={sf.endTime||""} onChange={e=>setSf({...sf,endTime:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Synopsis</label><input value={sf.synopsis} onChange={e=>setSf({...sf,synopsis:e.target.value})} style={IS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={LS}>Cast</label><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{cast.map(c=><label key={c.id} style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:(sf.cast||[]).includes(c.id)?"#E8C94A":"#888",cursor:"pointer",background:(sf.cast||[]).includes(c.id)?"#E8C94A18":"#12141a",padding:"4px 8px",borderRadius:4,border:`1px solid ${(sf.cast||[]).includes(c.id)?"#E8C94A44":"#2a2d35"}`}}><input type="checkbox" checked={(sf.cast||[]).includes(c.id)} onChange={e=>{const cs=sf.cast||[];setSf({...sf,cast:e.target.checked?[...cs,c.id]:cs.filter(id=>id!==c.id)});}} style={{display:"none"}}/><span style={{fontWeight:700}}>{c.roleNum}</span> {c.name}</label>)}</div></div>
        {editStrip!=="new"&&<div style={{gridColumn:"1/-1"}}><label style={LS}>Move to Day</label><select value={days.find(d=>d.strips.includes(sf.id))?.id||""} onChange={e=>{const fD=days.find(d=>d.strips.includes(sf.id));const tI=e.target.value;setDays(p=>p.map(d=>{let s=[...d.strips];if(fD&&d.id===fD.id)s=s.filter(id=>id!==sf.id);if(d.id===tI&&!s.includes(sf.id))s.push(sf.id);return{...d,strips:s};}));}} style={IS}><option value="">Unscheduled</option>{days.map(d=><option key={d.id} value={d.id}>{d.label} — {fmtDate(d.date)}</option>)}</select></div>}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}><div>{editStrip!=="new"&&<button onClick={()=>{setStrips(p=>p.filter(s=>s.id!==sf.id));setDays(p=>p.map(d=>({...d,strips:d.strips.filter(id=>id!==sf.id)})));setEditStrip(null);}} style={BD}>Delete</button>}</div><div style={{display:"flex",gap:8}}><button onClick={()=>setEditStrip(null)} style={BS}>Cancel</button><button onClick={saveSt} style={BP}>Save</button></div></div>
    </Modal>}
  </div>;
};
export { StripboardModule };
