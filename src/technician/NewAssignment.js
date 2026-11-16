import React, { useState } from "react";
import { ClipboardPlus, CheckCircle2 } from "lucide-react";
import "./Technician.css";
const blank = {
  workOrder: "",
  ticket: "",
  customer: "",
  phone: "",
  location: "",
  category: "Repair",
  priority: "Medium",
  schedule: "",
  notes: "",
};
const ASSIGNMENT_KEY = "servicedesk-technician-assignment";
export default function NewAssignment() {
  const [form, Sf] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem(ASSIGNMENT_KEY)) || blank;
      } catch {
        return blank;
      }
    }),
    [saved, Ss] = useState(() => localStorage.getItem(`${ASSIGNMENT_KEY}:saved`) === "true");
  const change = (e) => Sf({ ...form, [e.target.name]: e.target.value });
  return (
    <div className="tech-page">
      <div className="tech-heading">
        <div>
          <h2>New Assignment</h2>
          <p>Register a service visit or work order assigned to you.</p>
        </div>
      </div>
      {saved && (
        <div
          className="tech-panel tech-note"
          style={{ color: "#167445", marginBottom: 12 }}
        >
          <CheckCircle2 size={15} style={{ verticalAlign: "middle" }} />{" "}
          Assignment saved in this demo. Connect the form to your API to persist
          it.
        </div>
      )}
      <form
        className="tech-panel"
        onSubmit={(e) => {
          e.preventDefault();
          localStorage.setItem(ASSIGNMENT_KEY, JSON.stringify(form));
          localStorage.setItem(`${ASSIGNMENT_KEY}:saved`, "true");
          Ss(true);
        }}
      >
        <div className="tech-panel-title">Assignment Details</div>
        <div className="tech-form-grid">
          {[
            ["Work Order Number", "workOrder", "e.g. WO-1024"],
            ["Ticket Number", "ticket", "e.g. TKT-20261023001"],
            ["Customer Name", "customer", "Enter customer name"],
            ["Contact Number", "phone", "Enter contact number"],
            ["Service Location", "location", "Address or city"],
          ].map(([label, name, ph]) => (
            <div className="tech-field" key={name}>
              <label>
                {label}
                {name !== "phone" ? " *" : ""}
              </label>
              <input
                name={name}
                value={form[name]}
                onChange={change}
                placeholder={ph}
                required={name !== "phone"}
              />
            </div>
          ))}
          <div className="tech-field">
            <label>Issue Category</label>
            <select name="category" value={form.category} onChange={change}>
              {[
                "Repair",
                "Installation",
                "Maintenance",
                "Technical Support",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <div className="tech-field">
            <label>Priority</label>
            <select name="priority" value={form.priority} onChange={change}>
              {["Low", "Medium", "High", "Urgent"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <div className="tech-field">
            <label>Scheduled Start</label>
            <input
              type="datetime-local"
              name="schedule"
              value={form.schedule}
              onChange={change}
            />
          </div>
          <div className="tech-field tech-full">
            <label>Problem Summary / Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={change}
              placeholder="Describe the issue and access instructions."
            />
          </div>
        </div>
        <div className="tech-form-actions">
          <button
            type="button"
            className="tech-btn tech-btn-alt"
            onClick={() => {
              Sf(blank);
              Ss(false);
              localStorage.removeItem(ASSIGNMENT_KEY);
              localStorage.removeItem(`${ASSIGNMENT_KEY}:saved`);
            }}
          >
            Reset
          </button>
          <button type="submit" className="tech-btn">
            <ClipboardPlus size={15} /> Save Assignment
          </button>
        </div>
      </form>
    </div>
  );
}
