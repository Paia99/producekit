import { useState } from "react";
import { I, fmtDate } from "./config.jsx";

const DAY_TYPES = ["","shoot","prep","rehearsal","dayoff","travel","wrap"];
const DAY_LABELS = { shoot:"Shoot", prep:"Prep", rehearsal:"Rehearsal", dayoff:"Day Off", travel:"Travel", wrap:"Wrap" };
const DAY_COLORS = { shoot:"#22c55e", prep:"#3b82f6", rehearsal:"#a855f7", dayoff:"#555", travel:"#f59e0b", wrap:"#ef4444" };
const DAY_BG = { shoot:"#22c55e20", prep:"#3b82f620", rehearsal:"#a855f720", dayoff:"#55555520", travel:"#f59e0b20", wrap:"#ef444420" };
const WEEKDAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const pad = n => String(n).padStart(2,"0");
const toKey = (y,m,d) => `${y}-${pad(m+1)}-${pad(d)}`;

const CalendarModule = ({ schedule, setSchedule, shootingDays }) => {
  const [viewDate, setViewDate] = useState(() => {
    // Start on first scheduled date, or current month
    const dates = Object.keys(schedule || {}).sort();
    if (dates.length) { const [y,m] = dates[0].split("-"); return { year:parseInt(y), month:parseInt(m)-1 }; }
    const now = new Date(); return { year:now.getFullYear(), month:now.getMonth() };
  });

  const sched = schedule || {};

  // Compute shoot day numbers in chronological order
  const shootDates = Object.entries(sched).filter(([,t]) => t === "shoot").map(([d]) => d).sort();
  const shootDayNum = {};
  shootDates.forEach((d, i) => { shootDayNum[d] = i + 1; });

  // Summary counts
  const counts = {};
  Object.values(sched).forEach(t => { if (t) counts[t] = (counts[t] || 0) + 1; });

  const year = viewDate.year;
  const month = viewDate.month;
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday = 0, Sunday = 6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const prevMonth = () => setViewDate(v => v.month === 0 ? { year:v.year-1, month:11 } : { ...v, month:v.month-1 });
  const nextMonth = () => setViewDate(v => v.month === 11 ? { year:v.year+1, month:0 } : { ...v, month:v.month+1 });
  const monthName = new Date(year, month).toLocaleString("en", { month:"long", year:"numeric" });

  const cycleDay = (dateKey) => {
    const cur = sched[dateKey] || "";
    const idx = DAY_TYPES.indexOf(cur);
    const next = DAY_TYPES[(idx + 1) % DAY_TYPES.length];
    if (next === "") {
      const ns = { ...sched };
      delete ns[dateKey];
      setSchedule(ns);
    } else {
      setSchedule({ ...sched, [dateKey]: next });
    }
  };

  const today = new Date();
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

  // Build calendar grid cells
  const cells = [];
  // Empty cells before first day
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div>
        <h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#f0f0f0"}}>Calendar</h2>
        <p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>
          {counts.shoot || 0} / {shootingDays || "?"} shoot days
          {Object.keys(counts).length > 0 && " · "}
          {Object.entries(counts).filter(([t]) => t !== "shoot").map(([t,c]) => `${c} ${DAY_LABELS[t]?.toLowerCase() || t}`).join(" · ")}
        </p>
      </div>
    </div>

    {/* Legend */}
    <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
      {DAY_TYPES.filter(t => t).map(t => (
        <div key={t} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#888"}}>
          <span style={{width:10,height:10,borderRadius:3,background:DAY_COLORS[t]}}/>
          {DAY_LABELS[t]}
        </div>
      ))}
      <div style={{fontSize:11,color:"#555",marginLeft:8}}>Click a date to cycle type</div>
    </div>

    {/* Month navigation */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:16}}>
      <button onClick={prevMonth} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:6,padding:"6px 10px",cursor:"pointer",color:"#ccc",display:"flex",alignItems:"center"}}><I.ChevLeft/></button>
      <span style={{fontSize:16,fontWeight:700,color:"#f0f0f0",minWidth:180,textAlign:"center"}}>{monthName}</span>
      <button onClick={nextMonth} style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:6,padding:"6px 10px",cursor:"pointer",color:"#ccc",display:"flex",alignItems:"center"}}><I.ChevRight/></button>
    </div>

    {/* Calendar grid */}
    <div style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:10,overflow:"hidden"}}>
      {/* Weekday headers */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"1px solid #2a2d35"}}>
        {WEEKDAYS.map(w => (
          <div key={w} style={{padding:"8px 0",textAlign:"center",fontSize:10,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:"0.05em"}}>{w}</div>
        ))}
      </div>
      {/* Day cells */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} style={{minHeight:72,background:"#12141a",borderRight:i%7!==6?"1px solid #1e2028":"none",borderBottom:"1px solid #1e2028"}}/>;
          const dateKey = toKey(year, month, day);
          const type = sched[dateKey] || "";
          const isToday = dateKey === todayKey;
          const isWeekend = i % 7 >= 5;
          return (
            <div key={dateKey} onClick={() => cycleDay(dateKey)} style={{
              minHeight:72, padding:"6px 8px", cursor:"pointer",
              background: type ? DAY_BG[type] : (isWeekend ? "#0e1015" : "transparent"),
              borderRight: i%7!==6 ? "1px solid #1e2028" : "none",
              borderBottom: "1px solid #1e2028",
              transition: "background 0.15s",
              position: "relative",
            }}
            onMouseEnter={e => { if (!type) e.currentTarget.style.background="#1e2128"; }}
            onMouseLeave={e => { if (!type) e.currentTarget.style.background=isWeekend?"#0e1015":"transparent"; }}
            >
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{
                  fontSize:13, fontWeight:isToday?800:500,
                  color: isToday ? "#E8C94A" : (type ? DAY_COLORS[type] : "#888"),
                  ...(isToday ? {background:"#E8C94A20",padding:"1px 6px",borderRadius:4} : {}),
                }}>{day}</span>
                {type === "shoot" && shootDayNum[dateKey] && (
                  <span style={{fontSize:9,fontWeight:800,color:"#22c55e",background:"#22c55e25",padding:"1px 5px",borderRadius:3}}>
                    D{shootDayNum[dateKey]}
                  </span>
                )}
              </div>
              {type && (
                <div style={{fontSize:10,fontWeight:600,color:DAY_COLORS[type],marginTop:2}}>
                  {DAY_LABELS[type]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>

    {/* Shoot day list */}
    {shootDates.length > 0 && (
      <div style={{marginTop:20}}>
        <h4 style={{margin:"0 0 10px",fontSize:13,fontWeight:700,color:"#f0f0f0"}}>Shoot Days</h4>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {shootDates.map(d => (
            <span key={d} style={{fontSize:11,fontWeight:600,color:"#22c55e",background:"#22c55e15",border:"1px solid #22c55e33",padding:"4px 10px",borderRadius:5}}>
              Day {shootDayNum[d]} — {fmtDate(d)}
            </span>
          ))}
        </div>
      </div>
    )}

    {/* Other scheduled days list */}
    {Object.entries(sched).filter(([,t]) => t && t !== "shoot").sort(([a],[b]) => a.localeCompare(b)).length > 0 && (
      <div style={{marginTop:12}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {Object.entries(sched).filter(([,t]) => t && t !== "shoot").sort(([a],[b]) => a.localeCompare(b)).map(([d,t]) => (
            <span key={d} style={{fontSize:11,fontWeight:600,color:DAY_COLORS[t],background:DAY_BG[t],border:`1px solid ${DAY_COLORS[t]}33`,padding:"4px 10px",borderRadius:5}}>
              {DAY_LABELS[t]} — {fmtDate(d)}
            </span>
          ))}
        </div>
      </div>
    )}
  </div>;
};

export { CalendarModule };
