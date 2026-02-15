import { useState, useEffect } from "react";
import { I, spinKF } from "./config.jsx";
import { defaultProject } from "./data.jsx";
import { DashboardModule } from "./Dashboard.jsx";
import { PeopleModule } from "./People.jsx";
import { StripboardModule } from "./Stripboard.jsx";
import { LocationsModule } from "./Locations.jsx";
import { TransportModule } from "./Transport.jsx";
import { CallSheetModule } from "./CallSheet.jsx";
import { ProjectSetup } from "./ProjectSetup.jsx";
import { CalendarModule } from "./Calendar.jsx";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: I.Dashboard },
  { id: "people", label: "People", icon: I.People },
  { id: "stripboard", label: "Stripboard", icon: I.Strip },
  { id: "locations", label: "Locations", icon: I.Location },
  { id: "transport", label: "Transport", icon: I.Transport },
  { id: "callsheet", label: "Call Sheet", icon: I.CallSheet },
  { id: "calendar", label: "Calendar", icon: I.Calendar },
  { id: "project", label: "Project", icon: I.Settings },
];

export default function App() {
  const [projects, setProjects] = useState(() => {
    try { const s = localStorage.getItem("pk_projects_v5"); if (s) return JSON.parse(s); } catch (e) {}
    return [defaultProject()];
  });
  const [activeProjectId, setActiveProjectId] = useState(() => {
    try { const s = localStorage.getItem("pk_active_v5"); if (s) return JSON.parse(s); } catch (e) {}
    return projects[0]?.id;
  });
  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projSwitcher, setProjSwitcher] = useState(false);

  useEffect(() => { try { localStorage.setItem("pk_projects_v5", JSON.stringify(projects)); } catch (e) {} }, [projects]);
  useEffect(() => { try { localStorage.setItem("pk_active_v5", JSON.stringify(activeProjectId)); } catch (e) {} }, [activeProjectId]);

  const project = projects.find(p => p.id === activeProjectId) || projects[0];
  const up = (field, value) => setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, [field]: typeof value === "function" ? value(p[field]) : value } : p));

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0e1015", color: "#e0e0e0", fontFamily: "'Inter',system-ui,sans-serif", overflow: "hidden" }}>
      <style>{spinKF}</style>
      {/* SIDEBAR */}
      <div style={{ width: sidebarOpen ? 220 : 60, background: "#12141a", borderRight: "1px solid #1e2028", display: "flex", flexDirection: "column", transition: "width 0.2s", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: sidebarOpen ? "16px" : "16px 8px", borderBottom: "1px solid #1e2028", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <I.Film />{sidebarOpen && <span style={{ fontSize: 16, fontWeight: 800, color: "#E8C94A", whiteSpace: "nowrap" }}>ProduceKit</span>}
        </div>
        {sidebarOpen && <div style={{ padding: "8px 12px", borderBottom: "1px solid #1e2028" }}>
          <div onClick={() => setProjSwitcher(!projSwitcher)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: "#1a1d23", borderRadius: 6, cursor: "pointer", border: "1px solid #2a2d35" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#f0f0f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name}</span><I.ChevDown />
          </div>
          {projSwitcher && <div style={{ marginTop: 4, background: "#1a1d23", border: "1px solid #2a2d35", borderRadius: 6, overflow: "hidden" }}>
            {projects.map(p => <div key={p.id} onClick={() => { setActiveProjectId(p.id); setProjSwitcher(false); }} style={{ padding: "8px 10px", fontSize: 12, color: p.id === activeProjectId ? "#E8C94A" : "#aaa", cursor: "pointer", background: p.id === activeProjectId ? "#E8C94A10" : "transparent", fontWeight: p.id === activeProjectId ? 700 : 400 }}>{p.name}</div>)}
          </div>}
        </div>}
        <nav style={{ flex: 1, padding: "8px 0" }}>
          {NAV.map(n => {
            const Icon = n.icon;
            const active = tab === n.id;
            return <button key={n.id} onClick={() => setTab(n.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: sidebarOpen ? "10px 16px" : "10px 0", background: active ? "#E8C94A12" : "transparent", border: "none", borderRight: active ? "3px solid #E8C94A" : "3px solid transparent", color: active ? "#E8C94A" : "#888", cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: "inherit", justifyContent: sidebarOpen ? "flex-start" : "center" }}><Icon />{sidebarOpen && n.label}</button>;
          })}
        </nav>
        {sidebarOpen && <div style={{ padding: 12, borderTop: "1px solid #1e2028", fontSize: 10, color: "#444" }}>ProduceKit v0.5 · CET</div>}
      </div>
      {/* MAIN */}
      <main style={{ flex: 1, overflow: "auto", padding: 28 }}>
        {tab === "dashboard" && <DashboardModule project={project} setTab={setTab} />}
        {tab === "people" && <PeopleModule crew={project.crew} setCrew={v => up("crew", v)} cast={project.cast} setCast={v => up("cast", v)} />}
        {tab === "stripboard" && <StripboardModule strips={project.strips} setStrips={v => up("strips", v)} days={project.days} setDays={v => up("days", v)} locations={project.locations} cast={project.cast} />}
        {tab === "locations" && <LocationsModule locations={project.locations} setLocations={v => up("locations", v)} strips={project.strips} />}
        {tab === "transport" && <TransportModule vehicles={project.vehicles} setVehicles={v => up("vehicles", v)} routes={project.routes} setRoutes={v => up("routes", v)} days={project.days} strips={project.strips} crew={project.crew} cast={project.cast} locations={project.locations} />}
        {tab === "callsheet" && <CallSheetModule project={project} />}
        {tab === "calendar" && <CalendarModule schedule={project.schedule || {}} setSchedule={v => up("schedule", v)} shootingDays={project.shootingDays} />}
        {tab === "project" && <ProjectSetup projects={projects} setProjects={setProjects} activeId={activeProjectId} setActiveId={setActiveProjectId} />}
      </main>
    </div>
  );
}
