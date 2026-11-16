import { useState } from "react";
import { Save } from "lucide-react";
import "./Technician.css";

const REPAIR_API =
  "https://techtamminaapps.appiancloud.com/suite/webapi/repair";

const EMPTY_FORM = {
  rootCause: "",
  inspectionNotes: "",
  diagnosisNotes: "",
  repairOutcome: "",
  outcomeReason: "",
  workPerformed: "",
  testingResult: "",
  testingNotes: "",
};

async function requestApi(url, { method = "GET", body } = {}) {
  const apiKey = process.env.REACT_APP_APPIAN_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("Missing REACT_APP_APPIAN_API_KEY");
  }

  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      "Appian-API-Key": apiKey.trim(),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let result = null;

  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new Error(text || `Repair details could not be saved (${response.status}).`);
      }
    }
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
        result?.Message ||
        `Repair details could not be saved (${response.status}).`,
    );
  }
  if (result?.success === false || result?.Success === false) {
    throw new Error(
      result.message || result.Message || "The repair service rejected the details.",
    );
  }
  return result;
}

async function saveRepair(payload) {
  return requestApi(REPAIR_API, { method: "POST", body: payload });
}

export default function RepairDetails({
  task,
  user,
  startedOn,
  onCancel,
  onSaved,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const serviceTicketId = Number(
      task.serviceTicketId ??
        task.ticket?.serviceTicketId ??
        task.ticketId ??
        task.ticket?.ticketId,
    );
    if (!Number.isSafeInteger(serviceTicketId) || serviceTicketId <= 0) {
      setError("This task is missing a valid service ticket ID.");
      return;
    }

    const repairId = task.repairId ?? task.repair?.repairId;
    const numericRepairId = repairId ? Number(repairId) : null;
    if (
      numericRepairId !== null &&
      (!Number.isSafeInteger(numericRepairId) || numericRepairId <= 0)
    ) {
      setError("This task has an invalid repair ID.");
      return;
    }

    setSaving(true);
    setError("");

    const submittedOn = new Date().toISOString();
    const payload = {
      serviceTicketId,
      issueCategory:
        task.serviceRequest?.issueCategory ||
        task.issueCategory ||
        "Other",
      rootCause: form.rootCause,
      inspectionNotes: form.inspectionNotes,
      diagnosisNotes: form.diagnosisNotes,
      repairOutcome: form.repairOutcome,
      outcomeReason: form.outcomeReason,
      workPerformed: form.workPerformed,
      testingResult: form.testingResult,
      testingNotes: form.testingNotes,
      repairStatus: "Completed",
      repairStartedOn:
        startedOn || task.startedOn || task.repairStartedOn || submittedOn,
      repairSubmittedOn: submittedOn,
      repairCompletedOn: submittedOn,
      createdBy: user?.email || "",
      createdOn: task.repair?.createdOn || submittedOn,
      modifiedBy: user?.email || "",
      modifiedOn: submittedOn,
    };
    if (numericRepairId !== null) {
      payload.repairId = numericRepairId;
    }

    try {
      await saveRepair(payload);
      onSaved();
    } catch (submitError) {
      setError(
        submitError.message || "Repair details could not be saved. Try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="tech-repair-form" onSubmit={handleSubmit}>
      <div>
        <h4>Repair details</h4>
        <p className="tech-muted">
          Record what you found, what you repaired, and how you tested it.
        </p>
      </div>

      {error && (
        <div className="tech-message tech-message--error" role="alert">
          {error}
        </div>
      )}

      <div className="tech-form-grid">
        <label className="tech-field">
          <span>Root cause *</span>
          <input
            value={form.rootCause}
            onChange={update("rootCause")}
            required
          />
        </label>
        <label className="tech-field">
          <span>Repair outcome *</span>
          <select
            value={form.repairOutcome}
            onChange={update("repairOutcome")}
            required
          >
            <option value="">Select an outcome</option>
            <option>Repair Completed</option>
            <option>Part Required</option>
            <option>Unable to Repair</option>
          </select>
        </label>
        <label className="tech-field tech-full">
          <span>Inspection notes *</span>
          <textarea
            value={form.inspectionNotes}
            onChange={update("inspectionNotes")}
            required
          />
        </label>
        <label className="tech-field tech-full">
          <span>Diagnosis notes *</span>
          <textarea
            value={form.diagnosisNotes}
            onChange={update("diagnosisNotes")}
            required
          />
        </label>
        <label className="tech-field">
          <span>Outcome reason *</span>
          <input
            value={form.outcomeReason}
            onChange={update("outcomeReason")}
            required
          />
        </label>
        <label className="tech-field">
          <span>Testing result *</span>
          <select
            value={form.testingResult}
            onChange={update("testingResult")}
            required
          >
            <option value="">Select a result</option>
            <option>Passed</option>
            <option>Failed</option>
            <option>Not applicable</option>
          </select>
        </label>
        <label className="tech-field tech-full">
          <span>Work performed *</span>
          <textarea
            value={form.workPerformed}
            onChange={update("workPerformed")}
            required
          />
        </label>
        <label className="tech-field tech-full">
          <span>Testing notes *</span>
          <textarea
            value={form.testingNotes}
            onChange={update("testingNotes")}
            required
          />
        </label>
      </div>

      <div className="tech-form-actions">
        <button
          type="button"
          className="tech-btn tech-btn-alt"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button type="submit" className="tech-btn" disabled={saving}>
          <Save size={14} /> {saving ? "Saving…" : "Save repair details"}
        </button>
      </div>
    </form>
  );
}
