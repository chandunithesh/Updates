import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  MapPin,
  Clock3,
} from "lucide-react";
import "./Technician.css";
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const events = [
  { day: 6, title: "Power issue", time: "11:00 AM", place: "Hyderabad" },
  { day: 6, title: "Engine repair", time: "1:30 PM", place: "Madhapur" },
  { day: 9, title: "Connectivity issue", time: "2:00 PM", place: "Gachibowli" },
  {
    day: 14,
    title: "Software inspection",
    time: "10:30 AM",
    place: "Hitech City",
  },
];
export default function CalendarScreen() {
  const [month, Sm] = useState(7),
    [year, Sy] = useState(2026);
  const shift = (d) => {
    const n = new Date(year, month + d, 1);
    Sm(n.getMonth());
    Sy(n.getFullYear());
  };
  const first = new Date(year, month, 1).getDay(),
    days = new Date(year, month + 1, 0).getDate(),
    prev = new Date(year, month, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const n = i - first + 1;
    return n < 1
      ? { d: prev + n, m: true }
      : n > days
        ? { d: n - days, m: true }
        : { d: n, m: false };
  });
  return (
    <div className="tech-page">
      <div className="tech-heading">
        <div>
          <h2>Calendar</h2>
          <p>View scheduled jobs, customer visits, and service deadlines.</p>
        </div>
        <span className="tech-status tech-status-blue">
          <CalendarDays size={12} /> Technician schedule
        </span>
      </div>
      <div className="tech-calendar-layout">
        <section className="tech-panel tech-calendar-card">
          <div className="tech-calendar-toolbar">
            <button className="tech-btn tech-btn-alt" onClick={() => shift(-1)}>
              <ChevronLeft size={14} /> Previous
            </button>
            <b>
              {months[month]} {year}
            </b>
            <button className="tech-btn tech-btn-alt" onClick={() => shift(1)}>
              Next <ChevronRight size={14} />
            </button>
          </div>
          <div className="tech-calendar-grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((x) => (
              <div className="tech-day-name" key={x}>
                {x}
              </div>
            ))}
            {cells.map((c, i) => (
              <div
                key={i}
                className={"tech-day " + (c.m ? "tech-day-muted" : "")}
              >
                {c.d}
                {!c.m &&
                  events
                    .filter((e) => e.day === c.d)
                    .map((e, k) => (
                      <span className="tech-event" key={k}>
                        {e.title}
                      </span>
                    ))}
              </div>
            ))}
          </div>
        </section>
        <section className="tech-panel">
          <div className="tech-panel-title">Scheduled Visits</div>
          {events.map((e, i) => (
            <div className="tech-list-row" key={i}>
              <div>
                <b>{e.title}</b>
                <div className="tech-muted">
                  <Clock3 size={11} style={{ verticalAlign: "middle" }} />{" "}
                  {months[month]} {e.day}, {e.time}
                  <br />
                  <MapPin size={11} style={{ verticalAlign: "middle" }} />{" "}
                  {e.place}
                </div>
              </div>
              <span className="tech-status tech-status-blue">{e.day}</span>
            </div>
          ))}
          <div className="tech-note">
            Sample schedule data for UI demonstration.
          </div>
        </section>
      </div>
    </div>
  );
}
