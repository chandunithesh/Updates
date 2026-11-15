import React from "react";
import {
  BriefcaseBusiness,
  Ticket,
  CheckCircle2,
  Clock3,
  CalendarDays,
  ArrowRight,
  // Wrench,
  ClipboardList,
} from "lucide-react";
import "./Technician.css";
const jobs = [
  ["WO-001", "Power issue", "Rajesh", "Today, 11:00 AM", "Low", "Scheduled"],
  [
    "WO-002",
    "Engine manual repair",
    "Anita",
    "Today, 1:30 PM",
    "Medium",
    "Scheduled",
  ],
  [
    "WO-003",
    "Connectivity issue",
    "Meera",
    "Today, 3:00 PM",
    "High",
    "In progress",
  ],
];
export default function TechnicianDashboard({ navigate = () => {} }) {
  const stats = [
    [<BriefcaseBusiness size={19} />, "My active jobs", "8", "2 due today"],
    [<Ticket size={19} />, "Open tasks", "12", "Across assigned jobs"],
    [
      <CheckCircle2 size={19} />,
      "Completed this week",
      "16",
      "Weekly performance",
    ],
    [<Clock3 size={19} />, "SLA attention", "2", "Review due times"],
  ];
  const actions = [
    [
      <BriefcaseBusiness size={17} />,
      "View My Jobs",
      "Review assigned work orders",
      "MY JOB",
    ],
    [
      <ClipboardList size={17} />,
      "Review My Tasks",
      "Update task progress",
      "MY TASK",
    ],
    [
      <CalendarDays size={17} />,
      "Open Calendar",
      "Upcoming visits and deadlines",
      "CALENDAR",
    ],
  ];
  return (
    <div className="tech-page">
      <div className="tech-heading">
        <div>
          <h2>Technician Dashboard</h2>
          <p>Your daily service activity at a glance.</p>
        </div>
        {/* <button className="tech-btn" onClick={() => navigate("NEW ASSIGNMENT")}>
          <Wrench size={14} /> New assignment
        </button> */}
      </div>
      <div className="tech-stats">
        {stats.map((s, i) => (
          <div className="tech-stat" key={i}>
            <div className="tech-stat-icon">{s[0]}</div>
            <div>
              <div className="tech-muted">{s[1]}</div>
              <div className="tech-value">{s[2]}</div>
              <div className="tech-muted">{s[3]}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="tech-columns">
        <section className="tech-panel">
          <div className="tech-panel-title">Today's Work Schedule</div>
          <div className="tech-table-wrap">
            <table className="tech-table">
              <thead>
                <tr>
                  {[
                    "Work Order",
                    "Problem Summary",
                    "Customer",
                    "Schedule",
                    "Priority",
                    "Status",
                  ].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map((r) => (
                  <tr key={r[0]}>
                    <td className="tech-link">{r[0]}</td>
                    <td>{r[1]}</td>
                    <td>{r[2]}</td>
                    <td>{r[3]}</td>
                    <td>
                      <i
                        className={"tech-dot tech-dot-" + r[4].toLowerCase()}
                      />
                      {r[4]}
                    </td>
                    <td>
                      <span
                        className={
                          "tech-status " +
                          (r[5] === "In progress"
                            ? "tech-status-blue"
                            : "tech-status-amber")
                        }
                      >
                        {r[5]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tech-note">
            Sample data for the technician's daily schedule.
          </div>
        </section>
        <section className="tech-panel">
          <div className="tech-panel-title">Quick Actions</div>
          {actions.map((a) => (
            <div className="tech-list-row" key={a[1]}>
              <span style={{ color: "#194789" }}>{a[0]}</span>
              <div style={{ flex: 1 }}>
                <b>{a[1]}</b>
                <div className="tech-muted">{a[2]}</div>
              </div>
              <button
                className="tech-btn tech-btn-alt"
                onClick={() => navigate(a[3])}
              >
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
