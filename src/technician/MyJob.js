import { useEffect, useState } from "react";
import { Search,ShieldCheck,  ClipboardCheck,Clock3,
  CheckCircle2, } from "lucide-react";
import RepairDetails from "./RepairDetails";
import "./Technician.css";

const API_BASE = "https://techtamminaapps.appiancloud.com/suite/webapi";
const TECHNICIAN_MY_JOBS_API = `${API_BASE}/assignedTickets`;
const GET_DOCUMENTS_API = `${API_BASE}/getDocs`;
const DOCUMENT_DOWNLOAD_API = `${API_BASE}/documentDownload`;
const START_TASK_API = `${API_BASE}/TgktCg`;
const START_OTP_API = `${API_BASE}/startTaskOTP`;
const VERIFY_START_OTP_API = `${API_BASE}/startOTP-verify`;
const END_TASK_API = `${API_BASE}/3Oj3Gg`;
const END_OTP_API = `${API_BASE}/endtaskOTP`;
const VERIFY_END_OTP_API = `${API_BASE}/cerifyEndTask`;
const APPIAN_API_KEY = process.env.REACT_APP_APPIAN_API_KEY;

async function requestApi(url, { method = "GET", body } = {}) {
  if (!APPIAN_API_KEY?.trim()) {
    throw new Error("Missing REACT_APP_APPIAN_API_KEY");
  }

  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      "Appian-API-Key": APPIAN_API_KEY.trim(),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new Error(text || `The request failed (${response.status}).`);
      }
    }
  }

  if (!response.ok) {
    throw new Error(
      payload?.message || payload?.Message || `The request failed (${response.status}).`,
    );
  }
  if (
    payload === false ||
    payload?.success === false ||
    payload?.Success === false ||
    payload?.valid === false ||
    payload?.verified === false ||
    payload?.isValid === false ||
    payload?.isVerified === false
  ) {
    throw new Error(
      payload?.message || payload?.Message || "The service rejected the request.",
    );
  }

  return payload;
}

function positiveTicketId(job) {
  const value = getValue(job, [
    "serviceTicketId",
    "ticket.serviceTicketId",
    "ticketId",
    "ticket.ticketId",
    "id",
  ]);
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("This job is missing a valid service ticket ID.");
  }
  return id;
}

function hasSavedRepair(job) {
  const status = getValue(job, ["repair.repairStatus", "repairStatus"]);
  return (
    job.repairDetailsSaved === true ||
    String(status ?? "").trim().toUpperCase() === "COMPLETED"
  );
}

function getServiceRequestId(job) {
  const value = getValue(job, [
    "serviceReqId",
    "serviceReqID",
    "serviceRequestId",
    "serviceRequestID",
    "requestId",
    "reqId",
    "reqid",
    "request.id",
    "request.serviceRequestId",
    "serviceRequest.id",
    "serviceRequest.serviceReqId",
    "serviceRequest.serviceRequestId",
  ]);
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }
  return String(value);
}

function getDocuments(payload) {
  if (typeof payload === "string") {
    try {
      return getDocuments(JSON.parse(payload));
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("The documents service returned an unreadable response.");
      }
      throw error;
    }
  }
  if (Array.isArray(payload)) return payload;

  const documentValues = [
    payload?.documents,
    payload?.Documents,
    payload?.docs,
    payload?.files,
    payload?.attachments,
    payload?.documentList,
    payload?.records,
    payload?.response,
    payload?.data,
    payload?.results,
    payload?.items,
    payload?.content,
    payload?.response,
    payload?.data,
    payload?.result,
  ];
  for (const value of documentValues) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return getDocuments(value);
    if (typeof value === "string" && value.trim()) return getDocuments(value);
  }

  throw new Error("The documents service returned an invalid response.");
}

const jobKey = (job) => String(getValue(job, [
  "serviceTicketId",
  "ticket.serviceTicketId",
  "ticketId",
  "ticket.ticketId",
  "ticketNumber",
  "id",
]) ?? "");

const isInProgress = (status) =>
  ["IN PROGRESS", "IN_PROGRESS", "ON WORKING"].includes(
    String(status || "").trim().toUpperCase(),
  );

const isFinished = (status) =>
  ["COMPLETED", "CLOSED", "RESOLVED", "SOLVED"].includes(
    String(status || "").trim().toUpperCase(),
  );

function getJobStatus(job) {
  const status = getValue(job, ["status", "ticket.status"]);
  const repairStatus = getValue(job, ["repair.repairStatus", "repairStatus"]);
  return status || repairStatus;
}

function getCompletedJobsKey(user) {
  const technician = user?.userId ?? user?.technicianId ?? user?.technicianID ??
    user?.id ?? user?.email ?? "demo";
  return `servicedesk-technician-completed-jobs:${technician}`;
}

function readCompletedJobs(user) {
  try {
    const saved = localStorage.getItem(getCompletedJobsKey(user));
    if (!saved) return { jobs: [], error: "" };

    const jobs = JSON.parse(saved);
    if (!Array.isArray(jobs)) {
      return { jobs: [], error: "Saved completed jobs data is invalid." };
    }

    return {
      jobs: jobs
        .filter((job) => jobKey(job) && isFinished(getJobStatus(job)))
        .map((job) => ({ ...job, status: getJobStatus(job) })),
      error: "",
    };
  } catch {
    return { jobs: [], error: "Saved completed jobs could not be read." };
  }
}

function persistCompletedJobs(user, jobs) {
  const completedJobs = new Map();
  jobs.forEach((job) => {
    const key = jobKey(job);
    if (key && isFinished(getJobStatus(job))) {
      completedJobs.set(key, { ...job, status: getJobStatus(job) });
    }
  });
  localStorage.setItem(
    getCompletedJobsKey(user),
    JSON.stringify([...completedJobs.values()]),
  );
}

function mergeCompletedJobs(jobs, cachedJobs) {
  const completedJobs = new Map(cachedJobs.map((job) => [jobKey(job), job]));
  const visibleKeys = new Set();
  const mergedJobs = jobs.map((job) => {
    const key = jobKey(job);
    const status = getJobStatus(job);
    visibleKeys.add(key);

    if (isFinished(status)) {
      const completedJob = { ...job, status };
      completedJobs.set(key, completedJob);
      return completedJob;
    }

    completedJobs.delete(key);
    return job;
  });

  completedJobs.forEach((job, key) => {
    if (!visibleKeys.has(key)) mergedJobs.push(job);
  });

  return { jobs: mergedJobs, completedJobs: [...completedJobs.values()] };
}

function getJobRows(payload) {
  if (Array.isArray(payload)) return payload;

  const rows = [
    payload?.jobs,
    payload?.myJobs,
    payload?.response,
    payload?.data,
    payload?.results,
    payload?.items,
    payload?.content,
  ].find(Array.isArray);

  if (rows) return rows;

  const nestedPayload = [payload?.response, payload?.data, payload?.result].find(
    (value) => value && typeof value === "object" && !Array.isArray(value),
  );
  if (nestedPayload) return getJobRows(nestedPayload);

  throw new Error("The jobs service returned an invalid response.");
}

function getValue(job, paths) {
  for (const path of paths) {
    const value = path.split(".").reduce((current, key) => current?.[key], job);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function getDocumentId(document) {
  if (
    (typeof document === "number" || typeof document === "string") &&
    String(document).trim() !== ""
  ) {
    return document;
  }

  const explicitDocumentIdFields = new Set([
    "documentid",
    "docid",
    "documentidentifier",
  ]);
  const findId = (record, includeGenericId) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return undefined;
    }

    for (const [key, value] of Object.entries(record)) {
      const normalizedKey = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
      if (
        explicitDocumentIdFields.has(normalizedKey) &&
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        return value;
      }
    }

    for (const [key, value] of Object.entries(record)) {
      if (["document", "file", "attachment"].includes(key.toLowerCase())) {
        const nestedId = findId(value, includeGenericId);
        if (nestedId !== undefined) return nestedId;
      }
    }

    if (includeGenericId) {
      for (const [key, value] of Object.entries(record)) {
        if (
          key.replace(/[^a-z0-9]/gi, "").toLowerCase() === "id" &&
          value !== undefined &&
          value !== null &&
          String(value).trim() !== ""
        ) {
          return value;
        }
      }
    }

    return undefined;
  };

  return findId(document, false) ?? findId(document, true);
}

function displayValue(value) {
  if (value === undefined || value === null || value === "") return "Not yet started";
  if (Array.isArray(value)) return value.join(", ") || "Not yet started";
  if (typeof value === "object") {
    return value.name || value.fullName || value.value || "Not yet started";
  }
  return String(value);
}

function getCustomerName(job) {
  const customer = getValue(job, [
    "customer",
    "serviceRequest.customer",
    "customerName",
    "serviceRequest.customerName",
  ]);
  if (typeof customer === "string") return customer;
  if (customer && typeof customer === "object") {
    return (
      customer.name ||
      customer.fullName ||
      [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
      "Not yet started"
    );
  }
  return "Not yet started";
}

function getWorkOrderNumber(job) {
  return displayValue(
    getValue(job, [
      "ticketNumber",
      "workOrderNumber",
      "workOrder.workOrderId",
      "serviceTicketId",
      "ticketId",
      "id",
    ]),
  );
}

const jobDetailFields = (job) => [
  ["Work order", getWorkOrderNumber(job)],
  ["Customer", getCustomerName(job)],
  [
    "Problem summary",
    displayValue(
      getValue(job, [
        "serviceRequest.issueTitle",
        "issueTitle",
        "serviceRequest.issueDescription",
        "issueDescription",
        "description",
      ]),
    ),
  ],
  [
    "Category",
    displayValue(getValue(job, ["serviceRequest.issueCategory", "issueCategory"])),
  ],
  [
    "Service",
    displayValue(getValue(job, ["service.serviceName", "serviceName"])),
  ],
  [
    "Sub-service",
    displayValue(getValue(job, ["subService.subServiceName", "subServiceName"])),
  ],
  [
    "Product",
    displayValue(getValue(job, ["customerProduct.product.productName", "productName"])),
  ],
  ["Priority", displayValue(job.priority)],
  // [
  //   "Distance",
  //   displayValue(getValue(job, ["distance", "distanceKm", "distanceMiles", "travelDistance"])),
  // ],
  [
    "Schedule start",
    displayValue(
      getValue(job, [
        "scheduleStart",
        "scheduleStartDate",
        "scheduledStart",
        "scheduledStartDate",
        "startDateTime",
        "startTime",
        "appointment.start",
      ]),
    ),
  ],
  [
    "Schedule end",
    displayValue(
      getValue(job, [
        "scheduleEnd",
        "scheduleEndDate",
        "scheduledEnd",
        "scheduledEndDate",
        "endDateTime",
        "endTime",
        "appointment.end",
      ]),
    ),
  ],
  [
    "Location",
    displayValue(
      getValue(job, ["serviceRequest.address", "address", "location"]),
    ),
  ],
  ["Status", displayValue(job.status)],
];


async function inferDocumentMimeType(blobType, blob) {
  const normalizedBlobType = String(blobType || "").split(";")[0].trim().toLowerCase();

  if (normalizedBlobType && normalizedBlobType !== "application/octet-stream") {
    return normalizedBlobType;
  }

  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const startsWith = (...signature) =>
    signature.every((byte, index) => bytes[index] === byte);
  const startsWithAt = (offset, ...signature) =>
    signature.every((byte, index) => bytes[offset + index] === byte);

  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return "image/png";
  }
  if (startsWith(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (
    startsWith(0x47, 0x49, 0x46, 0x38, 0x37, 0x61) ||
    startsWith(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)
  ) {
    return "image/gif";
  }
  if (
    startsWith(0x52, 0x49, 0x46, 0x46) &&
    startsWithAt(8, 0x57, 0x45, 0x42, 0x50)
  ) {
    return "image/webp";
  }
  if (startsWith(0x42, 0x4d)) return "image/bmp";
  if (startsWith(0x25, 0x50, 0x44, 0x46)) return "application/pdf";

  return normalizedBlobType || "application/octet-stream";
}

function DocumentPreview({ documentId }) {
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";

    const fetchDocument = async () => {
      setLoading(true);
      setError("");
      setFileUrl("");
      setFileType("");

      try {
        if (!APPIAN_API_KEY?.trim()) {
          throw new Error("Missing REACT_APP_APPIAN_API_KEY");
        }

        const url = new URL(`${DOCUMENT_DOWNLOAD_API}/${encodeURIComponent(documentId)}`);
        url.searchParams.set("attachment", "true");

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            Accept: "*/*",
            "Appian-API-Key": APPIAN_API_KEY.trim(),
          },
        });

        if (!response.ok) {
          throw new Error(`The document request failed (${response.status}).`);
        }

        const blob = await response.blob();
        if (!blob.size) {
          throw new Error("The document returned by Appian is empty.");
        }

        const contentType =
          response.headers.get("Content-Type") || blob.type || "";
        const resolvedType = await inferDocumentMimeType(contentType, blob);

        if (!cancelled) {
          objectUrl = URL.createObjectURL(blob);
          setFileUrl(objectUrl);
          setFileType(resolvedType);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load this document.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (documentId !== undefined && documentId !== null && String(documentId).trim()) {
      fetchDocument();
    } else {
      setError("This attachment does not have a document ID.");
      setLoading(false);
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentId]);

  if (loading) {
    return <p className="document-preview-status" role="status">Loading image…</p>;
  }

  if (error) {
    return <p className="document-preview-error" role="alert">{error}</p>;
  }

  if (!fileUrl) return null;

  if (fileType.startsWith("image/")) {
    return (
      <a className="document-preview-image-link" href={fileUrl} target="_blank" rel="noreferrer">
        <img className="document-preview-image" src={fileUrl} alt="Attachment" />
      </a>
    );
  }

  if (fileType === "application/pdf") {
    return (
      <iframe
        className="document-preview-pdf"
        src={fileUrl}
        title="Attachment"
      />
    );
  }

  return (
    <a className="document-preview-download" href={fileUrl} download>
      Download attachment
    </a>
  );
}

export default function MyJob({ user }) {
  const [cachedJobs] = useState(() => readCompletedJobs(user));
  const [data, setData] = useState(cachedJobs.jobs);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [cacheError, setCacheError] = useState(cachedJobs.error);
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setLoadError("");
      try {
        if (!APPIAN_API_KEY) {
          throw new Error("Missing REACT_APP_APPIAN_API_KEY");
        }

        const url = new URL(TECHNICIAN_MY_JOBS_API);
        if (user?.userId) url.searchParams.set("technicianId", user.userId);
        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            "Appian-API-Key": APPIAN_API_KEY.trim(),
          },
        });
        if (!response.ok) {
          throw new Error(`The jobs request failed (${response.status}).`);
        }
        const jsonData = await response.json();
        const rows = getJobRows(jsonData);
        const savedJobs = readCompletedJobs(user);
        const merged = mergeCompletedJobs(rows, savedJobs.jobs);
        if (!cancelled) {
          setData(merged.jobs);
          try {
            persistCompletedJobs(user, merged.completedJobs);
            setCacheError("");
          } catch {
            setCacheError("Completed jobs could not be saved on this device.");
          }
        }
      } catch (error) {
        if (!cancelled) setLoadError(error.message || "Could not load your jobs.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [user]);
  const [q, Sq] = useState(""),
    [filter, Sf] = useState("All"),
    [selected, Sel] = useState(null);
  const [otpFlow, setOtpFlow] = useState(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState("");

  useEffect(() => {
    if (!selected) {
      setDocuments([]);
      setDocumentsError("");
      setDocumentsLoading(false);
      return undefined;
    }

    const serviceReqId = getServiceRequestId(selected);
    if (!serviceReqId) {
      setDocuments([]);
      setDocumentsError("This job does not include a service request ID.");
      setDocumentsLoading(false);
      return undefined;
    }

    let cancelled = false;
    const fetchDocuments = async () => {
      setDocuments([]);
      setDocumentsError("");
      setDocumentsLoading(true);
      try {
        const url = new URL(GET_DOCUMENTS_API);
        url.searchParams.set("serviceReqId", serviceReqId);
        const payload = await requestApi(url.toString());
        const rows = getDocuments(payload);
        if (!cancelled) setDocuments(rows);
      } catch (error) {
        if (!cancelled) {
          setDocumentsError(error.message || "Could not load the documents.");
        }
      } finally {
        if (!cancelled) setDocumentsLoading(false);
      }
    };

    fetchDocuments();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const rows = data.filter((job) => {
    const searchableText = [
      ...jobDetailFields(job).map(([, value]) => value),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      searchableText.includes(q.toLowerCase()) &&
      (filter === "All" ||
        (filter === "In progress"
          ? isInProgress(job.status)
          : String(job.status || "").toLowerCase() === filter.toLowerCase()))
    );
  });

  const closeDetails = () => {
    Sel(null);
    setOtpFlow(null);
    setOtp("");
    setActionError("");
    setNotice("");
  };


  const requestOtp = async (job, stage) => {
    setBusy(`${stage}-otp`);
    setActionError("");
    setNotice("");
    try {
      const serviceTicketId = positiveTicketId(job);
      await requestApi(stage === "start" ? START_OTP_API : END_OTP_API, {
        method: "POST",
        body: { serviceTicketId },
      });
      console.log(`Verification code requested for ${stage} task of job ${getWorkOrderNumber(job)} (ticket ID: ${serviceTicketId}).`);
      setOtp("");
      setOtpFlow({ jobKey: jobKey(job), stage });
      setNotice(
        stage === "start"
          ? "Start verification requested. Enter the code provided to the customer."
          : "Completion verification requested. Enter the code provided to the customer.",
      );
    } catch (error) {
      setActionError(error.message || "Could not request a verification code.");
    } finally {
      setBusy("");
    }
  };

  const verifyOtp = async (job) => {
    setBusy("verify-otp");
    setActionError("");
    setNotice("");
    try {
      const code = otp.trim();
      if (!/^\d{4,8}$/.test(code)) {
        throw new Error("Enter the numeric verification code.");
      }
      const serviceTicketId = positiveTicketId(job);
      const isStart = otpFlow?.stage === "start";
      const verifyUrl = new URL(
        isStart ? VERIFY_START_OTP_API : VERIFY_END_OTP_API,
      );
      verifyUrl.searchParams.set("OTP", code);
      verifyUrl.searchParams.set("ticketId", String(serviceTicketId));
      await requestApi(verifyUrl.toString());
      await requestApi(isStart ? START_TASK_API : END_TASK_API, {
        method: "POST",
        body: { serviceTicketId },
      });

      const updatedJob = {
        ...job,
        status: isStart ? "In progress" : "Completed",
        ...(isStart ? { startedOn: job.startedOn || new Date().toISOString() } : {}),
      };
      if (!isStart) {
        try {
          persistCompletedJobs(user, [
            ...readCompletedJobs(user).jobs,
            updatedJob,
          ]);
          setCacheError("");
        } catch {
          setCacheError("Completed jobs could not be saved on this device.");
        }
      }
      setData((current) =>
        current.map((item) =>
          jobKey(item) === jobKey(job) ? updatedJob : item,
        ),
      );
      Sel(updatedJob);
      setOtp("");
      setOtpFlow(null);
      setNotice(
        isStart
          ? "Code verified. The task is now in progress."
          : "Task completed successfully.",
      );
    } catch (error) {
      setActionError(error.message || "Could not verify the code.");
    } finally {
      setBusy("");
    }
  };
  const counts = {
    total: data.length,
    inProgress: data.filter((job) => isInProgress(job.status)).length,
    completed: data.filter((job) => isFinished(job.status)).length,
    open: data.filter(
      (job) => !isInProgress(job.status) && !isFinished(job.status),
    ).length,
  };
  return (
    <div className="tech-page">
       <div className="tech-heading">
        <div>
          <h2>My Jobs</h2>
          <p>Accept assigned work, record repairs, and close completed tasks.</p>
        </div>
        <span className="tech-status tech-status-blue">
           open tasks
        </span>
      </div>
      <div className="tech-stats">
        {[
          [<ClipboardCheck size={19} />, "Total tasks", counts.total || "0"],
          [<Clock3 size={19} />, "In progress", counts.inProgress || "0"],
          [<CheckCircle2 size={19} />, "Completed", counts.completed || "0"],
          [<Clock3 size={19} />, "Open", counts.open || "0"],
        ].map(([icon, label, value]) => (
          <div className="tech-stat" key={label}>
            <div className="tech-stat-icon">{icon}</div>
            <div>
              <div className="tech-muted">{label}</div>
              <div className="tech-value">{value}</div>
            </div>
          </div>
        ))}
      </div>
      {loadError && (
        <div className="tech-message tech-message--error" role="alert">
          Could not load your jobs: {loadError}
        </div>
      )}
      {cacheError && (
        <div className="tech-message tech-message--error" role="alert">
          {cacheError}
        </div>
      )}
      <section className="tech-panel">
        <div className="tech-toolbar">
          <label className="tech-search">
            <Search size={15} />
            <input
              value={q}
              onChange={(e) => Sq(e.target.value)}
              placeholder="Search work order, issue or customer"
            />
          </label>
          <select value={filter} onChange={(e) => Sf(e.target.value)}>
            <option>All</option>
            <option>Assigned</option>
            <option>In progress</option>
          </select>
        </div>
        <div className="tech-table-wrap">
          <table className="tech-table">
            <thead>
  <tr>
    {[

      "Work Order Number",
      "Problem Summary",
      "Customer Name",
      "Priority",
      "Schedule start",
      "Schedule End",
      "Status",
      "Action",
    ].map((x) => (
      <th key={x}>{x}</th>
    ))}
  </tr>
</thead>

<tbody>
  {rows.map((job) => (
    <tr key={getValue(job, ["serviceTicketId", "ticketId", "ticketNumber", "id"])}>

      <td className="tech-link">{getWorkOrderNumber(job)}</td>
      <td>{jobDetailFields(job)[2][1]}</td>
      <td>{getCustomerName(job)}</td>
      <td>
        {job.priority ? (
          <>
            <i className={`tech-dot tech-dot-${job.priority.toLowerCase()}`} />
            {job.priority}
          </>
        ) : (
          "Not provided"
        )}
      </td>
      <td>{jobDetailFields(job)[9][1]}</td>
      <td>{jobDetailFields(job)[10][1]}</td>
      <td>
        <span className="tech-status tech-status-blue">
          {displayValue(job.status)}
        </span>
      </td>
      <td>
        <button
          type="button"
          className="tech-btn tech-btn-alt"
          onClick={() => Sel(job)}
          aria-label={`View job ${getWorkOrderNumber(job)}`}
        >
          View
        </button>
      </td>
    </tr>
  ))}
</tbody>
          </table>
          {!loading && !loadError && !rows.length && (
            <div className="tech-empty">No jobs match your search.</div>
          )}
          {loading && <div className="tech-empty">Loading your jobs...</div>}
        </div>
        <div className="tech-note">
          Showing {rows.length} of {data.length} jobs
        </div>
      </section>
      {selected && (
        <div
          className="tech-job-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetails();
          }}
        >
          <section
            className="tech-panel tech-job-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-modal-title"
          >
            <div className="tech-task-detail__heading">
              <div>
                <div className="tech-muted">WORK ORDER DETAILS</div>
                <h3 id="job-modal-title">#{getWorkOrderNumber(selected)}</h3>
              </div>
              <button
                type="button"
                className="tech-btn tech-btn-alt"
                onClick={closeDetails}
              >
                Close
              </button>
            </div>
            {isInProgress(selected.status) && !hasSavedRepair(selected) ? (
              <RepairDetails
                task={selected}
                user={user}
                startedOn={selected.startedOn || selected.repairStartedOn}
                onCancel={closeDetails}
                onSaved={() => {
                  const updatedJob = { ...selected, repairDetailsSaved: true };
                  setData((current) =>
                    current.map((item) =>
                      jobKey(item) === jobKey(selected) ? updatedJob : item,
                    ),
                  );
                  Sel(updatedJob);
                  setNotice("Repair details saved. You can now end the task.");
                }}
              />
            ) : (
              <>
            <dl className="tech-ticket-summary">
              {jobDetailFields(selected).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              <div className="tech-ticket-summary__description">
                <dt>Issue description</dt>
                <dd>
                  {displayValue(
                    getValue(selected, [
                      "serviceRequest.issueDescription",
                      "issueDescription",
                      "description",
                    ]),
                  )}
                </dd>
              </div>
            </dl>

            <section className="tech-job-documents" aria-labelledby="job-documents-title">
              <h4 id="job-documents-title">Attachments</h4>

              {documentsLoading && <p role="status">Loading attachments…</p>}

              {documentsError && (
                <div className="tech-message tech-message--error" role="alert">
                  {documentsError}
                </div>
              )}

              {!documentsLoading && !documentsError && documents.length === 0 && (
                <p>No attachments available.</p>
              )}

              {!documentsLoading && !documentsError && documents.length > 0 && (
                <div className="document-preview-grid">
                  {documents.map((document, index) => {
                    const documentId = getDocumentId(document);

                    if (
                      documentId === undefined ||
                      documentId === null ||
                      String(documentId).trim() === ""
                    ) {
                      return (
                        <div className="document-preview-card" key={`document-${index}`}>
                          <p className="document-preview-error">Document ID is missing.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="document-preview-card" key={String(documentId)}>
                        <DocumentPreview documentId={documentId} />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {actionError && (
              <div className="tech-message tech-message--error" role="alert">
                {actionError}
              </div>
            )}
            {notice && (
              <div className="tech-message" role="status">
                {notice}
              </div>
            )}

            <div className="tech-workflow-actions">
              <button
                type="button"
                className="tech-btn"
                disabled={Boolean(busy) || isInProgress(selected.status) || isFinished(selected.status)}
                onClick={() => requestOtp(selected, "start")}
              >
                <ShieldCheck size={14} />
                {busy === "start-otp" ? "Requesting code…" : "Start task"}
              </button>
              <button
                type="button"
                className="tech-btn tech-btn-alt"
                disabled={Boolean(busy) || !isInProgress(selected.status) || isFinished(selected.status)}
                onClick={() => requestOtp(selected, "end")}
              >
                <ShieldCheck size={14} />
                {busy === "end-otp" ? "Requesting code…" : "End task"}
              </button>
              {isFinished(selected.status) && (
                <span className="tech-status tech-status-green">Task completed</span>
              )}
            </div>

            {otpFlow?.jobKey === jobKey(selected) && (
              <form
                className="tech-otp-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  verifyOtp(selected);
                }}
              >
                <label htmlFor="job-task-otp">
                  {otpFlow.stage === "start"
                    ? "Start-task verification code"
                    : "End-task verification code"}
                </label>
                <input
                  id="job-task-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                  required
                />
                <button
                  type="submit"
                  className="tech-btn"
                  disabled={Boolean(busy)}
                >
                  {busy === "verify-otp" ? "Verifying…" : "Verify code"}
                </button>
              </form>
            )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
