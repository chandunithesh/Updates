import { useState } from "react";
import TechnicianHeader from "../components/TechnicianHeader";
import TechnicianDashboard from "./TechnicianDashboard";
import MyJob from "./MyJob";
import CalendarScreen from "./CalendarScreen";
// import NewAssignment from "./NewAssignment";
import {
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,

} from "lucide-react";
import "./Technician.css";
const SCREEN_KEY_PREFIX = "servicedesk-technician-screen:";

const screens = [
  { id: "dashboard", label: "Dashboard", icon: ClipboardList, component: TechnicianDashboard },
  { id: "jobs", label: "My Jobs", icon: BriefcaseBusiness, component: MyJob },
  { id: "calendar", label: "Calendar", icon: CalendarDays, component: CalendarScreen },
  // { id: "assignment", label: "New Assignment", icon: Wrench, component: NewAssignment },
];

const screenAliases = {
  "MY JOB": "jobs",
  "MY TASK": "tasks",
  CALENDAR: "calendar",
  "NEW ASSIGNMENT": "assignment",
};

export default function TechnicianPortal({ user, onLogout }) {
  const storageKey = `${SCREEN_KEY_PREFIX}${String(user?.email || "demo").toLowerCase()}`;
  const [activeScreen, setActiveScreen] = useState(() => {
    const savedScreen = localStorage.getItem(storageKey);
    return screens.some(({ id }) => id === savedScreen) ? savedScreen : "dashboard";
  });
  const screen = screens.find(({ id }) => id === activeScreen) || screens[0];
  const Screen = screen.component;

  const navigate = (destination) => {
    const normalizedDestination = String(destination).trim().toUpperCase();
    const nextScreen =
      screenAliases[normalizedDestination] ||
      (normalizedDestination === "DASHBOARD" ? "dashboard" : activeScreen);
    setActiveScreen(nextScreen);
    localStorage.setItem(storageKey, nextScreen);
  };

  return (
    <main className="tech-portal">
      <TechnicianHeader
        user={user}
        onLogout={onLogout}
        onClockIn={() => navigate("MY JOB")}
      />

      <nav className="tech-portal-nav" aria-label="Technician navigation">
        {screens.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`tech-portal-link ${activeScreen === id ? "is-active" : ""}`}
            aria-current={activeScreen === id ? "page" : undefined}
            onClick={() => {
              setActiveScreen(id);
              localStorage.setItem(storageKey, id);
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>

      <Screen navigate={navigate} user={user} />
    </main>
  );
}