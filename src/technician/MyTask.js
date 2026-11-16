// import { useCallback, useEffect, useMemo, useState } from "react";
// import {
//   Search,
//   ClipboardCheck,
//   Clock3,
//   CheckCircle2,
//   Eye,
//   ShieldCheck,
//   Wrench,
// } from "lucide-react";
// import RepairDetails from "./RepairDetails";
// import "./Technician.css";

// const API_BASE = "https://techtamminaapps.appiancloud.com/suite/webapi";
// const MY_TASKS_API = `${API_BASE}/assignedTickets`;
// const ACCEPT_TASK_API = `${API_BASE}/acceptTask`;
// const START_TASK_API = `${API_BASE}/TgktCg`;
// const START_OTP_API = `${API_BASE}/startTaskOTP`;
// const VERIFY_START_OTP_API = `${API_BASE}/startOTP-verify`;
// const END_TASK_API = `${API_BASE}/3Oj3Gg`;
// const END_OTP_API = `${API_BASE}/endtaskOTP`;
// const VERIFY_END_OTP_API = `${API_BASE}/cerifyEndTask`;
// const responseMessage = (payload, fallback) =>
//   payload?.message || payload?.Message || fallback;

// async function requestApi(url, { method = "GET", body } = {}) {
//   const apiKey = process.env.REACT_APP_APPIAN_API_KEY;
//   if (!apiKey?.trim()) {
//     throw new Error("Missing REACT_APP_APPIAN_API_KEY");
//   }

//   const response = await fetch(url, {
//     method,
//     headers: {
//       Accept: "application/json",
//       "Appian-API-Key": apiKey.trim(),
//       ...(body ? { "Content-Type": "application/json" } : {}),
//     },
//     ...(body ? { body: JSON.stringify(body) } : {}),
//   });
//   const text = await response.text();
//   let payload = null;

//   if (text) {
//     try {
//       payload = JSON.parse(text);
//     } catch {
//       if (!response.ok) {
//         throw new Error(text || `The request failed (${response.status}).`);
//       }
//     }
//   }

//   if (!response.ok) {
//     throw new Error(
//       responseMessage(payload, `The request failed (${response.status}).`),
//     );
//   }
//   if (
//     payload === false ||
//     payload?.success === false ||
//     payload?.Success === false ||
//     payload?.valid === false ||
//     payload?.verified === false ||
//     payload?.isValid === false ||
//     payload?.isVerified === false
//   ) {
//     throw new Error(responseMessage(payload, "The service rejected the request."));
//   }

//   return payload;
// }

// function getTaskRows(payload) {
//   if (Array.isArray(payload)) return payload;
//   const rows = [
//     payload?.jobs,
//     payload?.myJobs,
//     payload?.response,
//     payload?.tasks,
//     payload?.data,
//     payload?.results,
//     payload?.items,
//     payload?.content,
//   ].find(Array.isArray);

//   if (rows) return rows;

//   const nestedPayload = [payload?.response, payload?.data, payload?.result].find(
//     (value) => value && typeof value === "object" && !Array.isArray(value),
//   );
//   if (nestedPayload) return getTaskRows(nestedPayload);

//   throw new Error("The tasks service returned an invalid response.");
// }

// const ticketIdFor = (task) =>
//   task?.serviceTicketId ??
//   task?.ticket?.serviceTicketId ??
//   task?.ticketId ??
//   task?.ticket?.ticketId;

// const taskKeyFor = (task) => String(ticketIdFor(task) ?? task?.id ?? "");

// function positiveId(value, label) {
//   const id = Number(value);
//   if (!Number.isSafeInteger(id) || id <= 0) {
//     throw new Error(`This task is missing a valid ${label} ID.`);
//   }
//   return id;
// }

// const serviceRequestIdFor = (task) =>
//   task?.serviceReqId ??
//   task?.serviceRequestId ??
//   task?.serviceRequest?.serviceRequestId ??
//   task?.serviceRequest?.requestId ??
//   task?.serviceRequest?.id;

// const isFinished = (status) =>
//   ["COMPLETED", "CLOSED", "RESOLVED"].includes(
//     String(status || "").trim().toUpperCase(),
//   );

// const isAccepted = (status) =>
//   [
//     "ACCEPTED",
//     "ON WORKING",
//     "IN PROGRESS",
//     "IN_PROGRESS",
//     "COMPLETED",
//     "CLOSED",
//     "RESOLVED",
//   ].includes(String(status || "").trim().toUpperCase());

// const displayStatus = (status) => {
//   const normalized = String(status || "OPEN").trim().toUpperCase();
//   if (normalized === "ON WORKING" || normalized === "IN_PROGRESS") {
//     return "In progress";
//   }
//   return normalized.charAt(0) + normalized.slice(1).toLowerCase();
// };

// function TicketSummary({ task }) {
//   const customer = task.customer;
//   const customerName =
//     typeof customer === "object"
//       ? [customer?.firstName, customer?.lastName].filter(Boolean).join(" ")
//       : customer;
//   const details = [
//     ["Ticket number", task.ticketNumber || ticketIdFor(task)],
//     ["Customer", customerName],
//     ["Issue", task.serviceRequest?.issueTitle || task.issueTitle],
//     ["Category", task.serviceRequest?.issueCategory || task.issueCategory],
//     ["Service", task.service?.serviceName || task.serviceName],
//     ["Sub-service", task.subService?.subServiceName || task.subServiceName],
//     ["Product", task.customerProduct?.product?.productName || task.productName],
//     ["Priority", task.priority],
//     ["Location", task.serviceRequest?.address || task.address || task.location],
//   ];

//   return (
//     <dl className="tech-ticket-summary">
//       {details.map(([label, value]) => (
//         <div key={label}>
//           <dt>{label}</dt>
//           <dd>{value || "—"}</dd>
//         </div>
//       ))}
//       <div className="tech-ticket-summary__description">
//         <dt>Issue description</dt>
//         <dd>
//           {task.serviceRequest?.issueDescription ||
//             task.issueDescription ||
//             task.description ||
//             "No description provided."}
//         </dd>
//       </div>
//     </dl>
//   );
// }

// export default function MyTask({ user }) {
//   const [tasks, setTasks] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [loadError, setLoadError] = useState("");
//   const [query, setQuery] = useState("");
//   const [filter, setFilter] = useState("All");
//   const [selected, setSelected] = useState(null);
//   const [workflow, setWorkflow] = useState({});
//   const [otpFlow, setOtpFlow] = useState(null);
//   const [otp, setOtp] = useState("");
//   const [busy, setBusy] = useState("");
//   const [actionError, setActionError] = useState("");
//   const [notice, setNotice] = useState("");
//   const [repairOpen, setRepairOpen] = useState(false);

//   useEffect(() => {
//     let cancelled = false;

//     async function loadTasks() {
//       setLoading(true);
//       setLoadError("");
//       try {
//         const url = new URL(MY_TASKS_API);
//         if (user?.userId) url.searchParams.set("technicianId", user.userId);
//         const payload = await requestApi(url.toString());
//         const rows = getTaskRows(payload);
//         if (!cancelled) setTasks(rows);
//       } catch (error) {
//         if (!cancelled) {
//           setLoadError(error.message || "Could not load your tasks.");
//         }
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     }

//     loadTasks();
//     return () => {
//       cancelled = true;
//     };
//   }, [user?.userId]);

//   const taskStatus = useCallback(
//     (task) => workflow[taskKeyFor(task)]?.status || task.status || "OPEN",
//     [workflow],
//   );

//   const filteredTasks = useMemo(() => {
//     const search = query.trim().toLowerCase();
//     return tasks.filter((task) => {
//       const text = [
//         task.ticketNumber,
//         ticketIdFor(task),
//         task.serviceRequest?.issueTitle,
//         task.serviceRequest?.issueCategory,
//         task.workOrder?.workOrderId,
//         task.priority,
//       ]
//         .filter(Boolean)
//         .join(" ")
//         .toLowerCase();
//       const status = String(taskStatus(task)).trim().toUpperCase();
//       const matchesStatus =
//         filter === "All" ||
//         (filter === "Open" && !isAccepted(status)) ||
//         (filter === "In progress" &&
//           ["ON WORKING", "IN PROGRESS", "IN_PROGRESS"].includes(status)) ||
//         (filter === "Completed" && isFinished(status));

//       return text.includes(search) && matchesStatus;
//     });
//   }, [filter, query, tasks, taskStatus]);

//   const updateWorkflow = (task, changes) => {
//     const key = taskKeyFor(task);
//     setWorkflow((current) => ({
//       ...current,
//       [key]: { ...current[key], ...changes },
//     }));
//   };

//   const withAction = async (label, action) => {
//     setBusy(label);
//     setActionError("");
//     setNotice("");
//     try {
//       await action();
//     } catch (error) {
//       setActionError(error.message || "The action could not be completed.");
//     } finally {
//       setBusy("");
//     }
//   };

//   const acceptTask = (task) =>
//     withAction("accept", async () => {
//       const userId = positiveId(user?.userId ?? user?.id, "technician");
//       const serviceReqId = positiveId(
//         serviceRequestIdFor(task),
//         "service request",
//       );
//       await requestApi(ACCEPT_TASK_API, {
//         method: "POST",
//         body: { serviceReqId, userId },
//       });
//       updateWorkflow(task, { status: "ACCEPTED" });
//       setNotice("Task accepted. Review the ticket summary before starting work.");
//     });

//   const requestOtp = (task, stage) =>
//     withAction(`${stage}-otp`, async () => {
//       const serviceTicketId = positiveId(ticketIdFor(task), "service ticket");
//       const url = stage === "start" ? START_OTP_API : END_OTP_API;
//       await requestApi(url, {
//         method: "POST",
//         body: { serviceTicketId },
//       });
//       setOtp("");
//       setOtpFlow({ taskKey: taskKeyFor(task), stage });
//       setNotice(
//         stage === "start"
//           ? "Start verification requested. Enter the code provided to the customer."
//           : "Completion verification requested. Enter the code provided to the customer.",
//       );
//     });

//   const verifyOtp = (task) =>
//     withAction("verify-otp", async () => {
//       const serviceTicketId = positiveId(ticketIdFor(task), "service ticket");
//       const code = otp.trim();
//       if (!/^\d{4,8}$/.test(code)) {
//         throw new Error("Enter the numeric verification code.");
//       }

//       const isStart = otpFlow?.stage === "start";
//       const url = new URL(isStart ? VERIFY_START_OTP_API : VERIFY_END_OTP_API);
//       url.searchParams.set("OTP", code);
//       url.searchParams.set("ticketId", String(serviceTicketId));
//       await requestApi(url.toString());

//       if (isStart) {
//         await requestApi(START_TASK_API, {
//           method: "POST",
//           body: { serviceTicketId },
//         });
//         updateWorkflow(task, {
//           status: "ON WORKING",
//           started: true,
//           startedOn: new Date().toISOString(),
//         });
//         setNotice("Code verified. The task is now in progress.");
//       } else {
//         await requestApi(END_TASK_API, {
//           method: "POST",
//           body: { serviceTicketId },
//         });
//         updateWorkflow(task, {
//           status: "COMPLETED",
//           completed: true,
//         });
//         setNotice(
//           "Task completed. The customer can confirm the service and leave feedback from My Service Requests.",
//         );
//       }
//       setOtp("");
//       setOtpFlow(null);
//     });

//   const selectedKey = selected ? taskKeyFor(selected) : "";
//   const selectedWorkflow = selectedKey ? workflow[selectedKey] || {} : {};
//   const selectedStatus = selected ? taskStatus(selected) : "";
//   const selectedOtpFlow =
//     otpFlow?.taskKey === selectedKey ? otpFlow : null;
//   const inProgress =
//     ["ON WORKING", "IN PROGRESS", "IN_PROGRESS"].includes(
//       String(selectedStatus).trim().toUpperCase(),
//     ) || selectedWorkflow.started;

//   const counts = {
//     total: tasks.length,
//     inProgress: tasks.filter((task) =>
//       ["ON WORKING", "IN PROGRESS", "IN_PROGRESS"].includes(
//         String(taskStatus(task)).trim().toUpperCase(),
//       ),
//     ).length,
//     completed: tasks.filter((task) => isFinished(taskStatus(task))).length,
//     open: tasks.filter((task) => !isAccepted(taskStatus(task))).length,
//   };

//   return (
//     <div className="tech-page">
//       <div className="tech-heading">
//         <div>
//           <h2>My Tasks</h2>
//           <p>Accept assigned work, record repairs, and close completed tasks.</p>
//         </div>
//         <span className="tech-status tech-status-blue">
//           {counts.open} open tasks
//         </span>
//       </div>

//       <div className="tech-stats">
//         {[
//           [<ClipboardCheck size={19} />, "Total tasks", counts.total],
//           [<Clock3 size={19} />, "In progress", counts.inProgress],
//           [<CheckCircle2 size={19} />, "Completed", counts.completed],
//           [<Clock3 size={19} />, "Open", counts.open],
//         ].map(([icon, label, value]) => (
//           <div className="tech-stat" key={label}>
//             <div className="tech-stat-icon">{icon}</div>
//             <div>
//               <div className="tech-muted">{label}</div>
//               <div className="tech-value">{value}</div>
//             </div>
//           </div>
//         ))}
//       </div>

//       {loadError && (
//         <div className="tech-message tech-message--error" role="alert">
//           Could not load your tasks: {loadError}
//         </div>
//       )}

//       <section className="tech-panel">
//         <div className="tech-toolbar">
//           <label className="tech-search">
//             <Search size={15} />
//             <input
//               aria-label="Search tasks"
//               placeholder="Search task or ticket number"
//               value={query}
//               onChange={(event) => setQuery(event.target.value)}
//             />
//           </label>
//           <select
//             aria-label="Filter tasks by status"
//             value={filter}
//             onChange={(event) => setFilter(event.target.value)}
//           >
//             <option>All</option>
//             <option>Open</option>
//             <option>In progress</option>
//             <option>Completed</option>
//           </select>
//         </div>

//         <div className="tech-table-wrap">
//           <table className="tech-table">
//             <thead>
//               <tr>
//                 {[
//                   "Task ID",
//                   "Ticket Number",
//                   "Task Description",
//                   "Work Order",
//                   "Priority",
//                   "Status",
//                   "Details",
//                 ].map((heading) => (
//                   <th key={heading}>{heading}</th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {filteredTasks.map((task) => (
//                 <tr key={taskKeyFor(task)}>
//                   <td>{task.taskId || task.taskNumber || taskKeyFor(task) || "—"}</td>
//                   <td>{task.ticketNumber || ticketIdFor(task) || "—"}</td>
//                   <td>
//                     {task.serviceRequest?.issueTitle ||
//                       task.issueTitle ||
//                       task.description ||
//                       "—"}
//                   </td>
//                   <td>{task.workOrder?.workOrderId || "—"}</td>
//                   <td>{task.priority || "—"}</td>
//                   <td>
//                     <span className="tech-status tech-status-blue">
//                       {displayStatus(taskStatus(task))}
//                     </span>
//                   </td>
//                   <td>
//                     <button
//                       type="button"
//                       className="tech-btn tech-btn-alt"
//                       onClick={() => {
//                         setSelected(task);
//                         setActionError("");
//                         setNotice("");
//                         setRepairOpen(false);
//                       }}
//                     >
//                       <Eye size={14} /> View
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//           {!loading && filteredTasks.length === 0 && (
//             <div className="tech-empty">No tasks match your search.</div>
//           )}
//           {loading && <div className="tech-empty">Loading your tasks…</div>}
//         </div>
//         <div className="tech-note">
//           Task status is updated through the service workflow APIs.
//         </div>
//       </section>

//       {selected && (
//         <section className="tech-panel tech-task-detail" aria-live="polite">
//           <div className="tech-task-detail__heading">
//             <div>
//               <div className="tech-muted">TICKET SUMMARY</div>
//               <h3>
//                 {selected.ticketNumber ||
//                   ticketIdFor(selected) ||
//                   "Service task"}
//               </h3>
//             </div>
//             <button
//               type="button"
//               className="tech-btn tech-btn-alt"
//               onClick={() => {
//                 setSelected(null);
//                 setRepairOpen(false);
//                 setActionError("");
//                 setNotice("");
//               }}
//             >
//               Close
//             </button>
//           </div>

//           {!repairOpen ? (
//             <>
//               <TicketSummary task={selected} />

//               {actionError && (
//                 <div className="tech-message tech-message--error" role="alert">
//                   {actionError}
//                 </div>
//               )}
//               {notice && (
//                 <div className="tech-message" role="status">
//                   {notice}
//                 </div>
//               )}

//               <div className="tech-workflow-actions">
//                 {!isAccepted(selectedStatus) && !isFinished(selectedStatus) && (
//                   <button
//                     type="button"
//                     className="tech-btn"
//                     disabled={Boolean(busy)}
//                     onClick={() => acceptTask(selected)}
//                   >
//                     {busy === "accept" ? "Accepting…" : "Accept task"}
//                   </button>
//                 )}

//                 {isAccepted(selectedStatus) &&
//                   !inProgress &&
//                   !isFinished(selectedStatus) && (
//                     <button
//                       type="button"
//                       className="tech-btn"
//                       disabled={Boolean(busy)}
//                       onClick={() => requestOtp(selected, "start")}
//                     >
//                       <ShieldCheck size={14} />
//                       {busy === "start-otp"
//                         ? "Requesting code…"
//                         : "Start task"}
//                     </button>
//                   )}

//                 {inProgress && !selectedWorkflow.repairSaved && (
//                   <button
//                     type="button"
//                     className="tech-btn"
//                     onClick={() => setRepairOpen(true)}
//                   >
//                     <Wrench size={14} /> Fill repair details
//                   </button>
//                 )}

//                 {inProgress && selectedWorkflow.repairSaved && (
//                   <button
//                     type="button"
//                     className="tech-btn"
//                     disabled={Boolean(busy)}
//                     onClick={() => requestOtp(selected, "end")}
//                   >
//                     <ShieldCheck size={14} />
//                     {busy === "end-otp"
//                       ? "Requesting code…"
//                       : "Complete task"}
//                   </button>
//                 )}

//                 {isFinished(selectedStatus) && (
//                   <span className="tech-status tech-status-green">
//                     Task completed
//                   </span>
//                 )}
//               </div>

//               {selectedOtpFlow && (
//                 <form
//                   className="tech-otp-form"
//                   onSubmit={(event) => {
//                     event.preventDefault();
//                     verifyOtp(selected);
//                   }}
//                 >
//                   <label htmlFor="task-otp">
//                     {selectedOtpFlow.stage === "start"
//                       ? "Start-task verification code"
//                       : "End-task verification code"}
//                   </label>
//                   <input
//                     id="task-otp"
//                     inputMode="numeric"
//                     autoComplete="one-time-code"
//                     maxLength={8}
//                     value={otp}
//                     onChange={(event) =>
//                       setOtp(event.target.value.replace(/\D/g, ""))
//                     }
//                     required
//                   />
//                   <button
//                     type="submit"
//                     className="tech-btn"
//                     disabled={Boolean(busy)}
//                   >
//                     {busy === "verify-otp" ? "Verifying…" : "Verify code"}
//                   </button>
//                 </form>
//               )}

//               {selectedWorkflow.repairSaved && (
//                 <div className="tech-message" role="status">
//                   Repair details have been saved. Request the end-task code to
//                   finish this ticket.
//                 </div>
//               )}
//             </>
//           ) : (
//             <RepairDetails
//               task={selected}
//               user={user}
//               startedOn={selectedWorkflow.startedOn}
//               onCancel={() => setRepairOpen(false)}
//               onSaved={() => {
//                 updateWorkflow(selected, { repairSaved: true });
//                 setRepairOpen(false);
//                 setNotice("Repair details saved. The task is ready to complete.");
//               }}
//             />
//           )}
//         </section>
//       )}
//     </div>
//   );
// }
