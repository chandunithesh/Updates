import { Fragment, useMemo, useState, useEffect } from "react";
import {
  Plus,
  Search,
  ArrowUpRight,
  Flag,
  Minus,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import StatsStrip from "./StatsStrip.js";
import CustomerFeedback from "./technician/CustomerFeedback.js";
import { STATUS_CLASS, PRIORITY_RANK, isHigh, fmtISO } from "./data.js";
import "./MyRequests.css";

const PAGE_SIZE = 5;

const REQUESTS_RAISED_API =
  "https://techtamminaapps.appiancloud.com/suite/webapi/iOdIEw";
const APPIAN_API_KEY = process.env.REACT_APP_APPIAN_API_KEY;

const SORTS = {
  "Request date": (a, b) => b.created.localeCompare(a.created),
  "Last updated": (a, b) => b.updated.localeCompare(a.updated),
  Priority: (a, b) =>
    (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0),
  Status: (a, b) => a.status.localeCompare(b.status),
};

const DEFAULTS = {
  query: "",
  status: "",
  category: "",
  from: "",
  to: "",
  sort: "Request date",
};

const dateOnly = (value) => (value ? String(value).slice(0, 10) : "");

const normalizeRequest = (request) => ({
  id: String(request.requestNumber ?? request.serviceRequestId ?? ""),
  title: request.issueTitle || "Untitled request",
  description: request.issueDescription || request.description || "",
  category: request.issueCategory || request.otherIssueCategory || "Other",
  location:
    [request.city, request.state, request.country].filter(Boolean).join(", ") ||
    "—",
  status: String(request.status || "UNKNOWN")
    .trim()
    .toUpperCase(),
  priority: request.priority || "Normal",
  created: dateOnly(request.RequestRaisedOn ?? request.createdOn),
  scheduled: request.scheduledOn ? dateOnly(request.scheduledOn) : null,
  updated: dateOnly(
    request.modifiedOn ?? request.createdOn ?? request.RequestRaisedOn,
  ),
});

export default function MyRequests({ onNavigate, localRequests = [], user }) {
  const [filters, setFilters] = useState(DEFAULTS);
  const [page, setPage] = useState(1);
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [feedbackRequest, setFeedbackRequest] = useState(null);
  const [data, setData] = useState(localRequests);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const customerId = localStorage.getItem("customerId");
        if (!customerId && user?.isDemo) {
          setLoadError("");
          return;
        }
        if (!APPIAN_API_KEY?.trim()) {
          throw new Error("Missing REACT_APP_APPIAN_API_KEY");
        }
        if (!customerId) {
          throw new Error(
            "Customer ID is not available. Please sign in again.",
          );
        }
        const url = new URL(REQUESTS_RAISED_API);
        url.searchParams.set("customerId", customerId);
        const response = await fetch(url, {
          headers: {
            "Appian-API-Key": APPIAN_API_KEY.trim(),
            Accept: "application/json",
          },
        });
        if (!response.ok) {
          throw new Error(`Could not load requests (${response.status}).`);
        }
        const result = await response.json();
        console.log("User requests are the following:", JSON.stringify(result));
        if (result?.Success !== true || !Array.isArray(result.response)) {
          throw new Error("Requests service returned an invalid response.");
        }
        if (!cancelled) {
          const apiRequests = result.response.map(normalizeRequest);
          setData(
            [...apiRequests, ...localRequests].filter(
              (request, index, list) =>
                list.findIndex((item) => item.id === request.id) === index,
            ),
          );
          setLoadError("");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.message || "Could not load service requests.");
          console.error("Error fetching requests:", error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [localRequests, user?.isDemo]);

  const categories = useMemo(
    () => [...new Set(data.map((r) => r.category))].sort(),
    [data],
  );
  const statuses = useMemo(
    () => [...new Set(data.map((r) => r.status))].sort(),
    [data],
  );

  const change = (name) => (e) => {
    setFilters((f) => ({ ...f, [name]: e.target.value }));
    setPage(1);
  };
  const clear = () => {
    setFilters(DEFAULTS);
    setPage(1);
  };
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(DEFAULTS);

  const results = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return data
      .filter(
        (r) =>
          !q ||
          r.id.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q),
      )
      .filter((r) => !filters.status || r.status === filters.status)
      .filter((r) => !filters.category || r.category === filters.category)
      .filter((r) => !filters.from || r.created >= filters.from)
      .filter((r) => !filters.to || r.created <= filters.to)
      .sort(SORTS[filters.sort]);
  }, [data, filters]);

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = results.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  if (feedbackRequest) {
    return (
      <CustomerFeedback
        request={feedbackRequest}
        user={user}
        onBack={() => setFeedbackRequest(null)}
      />
    );
  }

  return (
    <main className="sd-main">
      <div className="sd-page-head">
        <div>
          <div className="sd-eyebrow">EVERY REQUEST, IN ONE PLACE</div>
          <h1>My Service Requests</h1>
          <p className="sd-muted">
            Follow your service progress and revisit past requests.
          </p>
        </div>
        <button
          className="sd-btn sd-btn--primary"
          onClick={() => onNavigate("raise")}
        >
          <Plus size={14} /> New Request
        </button>
      </div>

      <StatsStrip requests={data} />

      <div className="sd-filters">
        <div className="sd-filters__row">
          <div className="sd-search">
            <Search size={15} />
            <input
              type="search"
              placeholder="Search by request ID or title…"
              aria-label="Search requests"
              value={filters.query}
              onChange={change("query")}
            />
          </div>
          <select
            className="sd-input sd-select--sm"
            aria-label="Filter by status"
            value={filters.status}
            onChange={change("status")}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            className="sd-input sd-select--sm"
            aria-label="Filter by category"
            value={filters.category}
            onChange={change("category")}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="sd-filters__row sd-filters__row--dates">
          <label className="sd-inline">
            From{" "}
            <input
              type="date"
              className="sd-input"
              value={filters.from}
              onChange={change("from")}
            />
          </label>
          <label className="sd-inline">
            To{" "}
            <input
              type="date"
              className="sd-input"
              value={filters.to}
              onChange={change("to")}
            />
          </label>
          <select
            className="sd-input sd-select--sm"
            aria-label="Sort by"
            value={filters.sort}
            onChange={change("sort")}
          >
            {Object.keys(SORTS).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            className="sd-clear"
            onClick={clear}
            disabled={!filtersActive}
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className="sd-card sd-table sd-table--requests">
        <div className="sd-table__row sd-table__head">
          <span>Request details</span>
          <span>Category / location</span>
          <span>Status</span>
          <span>Priority</span>
          <span>Schedule / updated</span>
          <span />
        </div>

        {loadError && (
          <div className="sd-empty" role="alert">
            <strong>Could not load your requests</strong>
            <span className="sd-muted">{loadError}</span>
          </div>
        )}

        {!loadError && !loading && visible.length === 0 && (
          <div className="sd-empty">
            <strong>No requests match your filters</strong>
            <span className="sd-muted">
              Try a different search or clear the filters to see everything.
            </span>
            <button
              className="sd-btn sd-btn--ghost sd-btn--auto"
              onClick={clear}
            >
              Clear filters
            </button>
          </div>
        )}

        {visible.map((r) => (
          <Fragment key={r.id}>
            <div
              className={`sd-table__row${expandedRequest === r.id ? " sd-table__row--expanded" : ""}`}
            >
              <span>
                <strong className="sd-req-title">{r.title}</strong>
                <span className="sd-req-id">
                  {r.id}
                </span>
                <small className="sd-req-date">{fmtISO(r.created)}</small>
              </span>
              <span>
                <span className="sd-cell-main">{r.category}</span>
                <small className="sd-cell-sub">{r.location}</small>
              </span>
              <span>
                <span
                  className={`sd-badge ${STATUS_CLASS[r.status] || "sd-badge--review"}`}
                >
                  <i />
                  {r.status}
                </span>
              </span>
              <span
                className={`sd-priority ${isHigh(r.priority) ? "is-high" : "is-normal"}`}
              >
                {isHigh(r.priority) ? <Flag size={12} /> : <Minus size={12} />}{" "}
                {r.priority}
              </span>
              <span>
                <span className="sd-cell-main">
                  {r.scheduled ? fmtISO(r.scheduled) : "Not scheduled"}
                </span>
                <small className="sd-cell-sub">
                  Updated {fmtISO(r.updated)}
                </small>
              </span>
              <span className="sd-open">
                <div className="sd-request-actions">
                  <button
                    type="button"
                    aria-label={`${expandedRequest === r.id ? "Hide" : "Show"} details for ${r.title}`}
                    aria-expanded={expandedRequest === r.id}
                    aria-controls={
                      expandedRequest === r.id
                        ? `request-details-${r.id}`
                        : undefined
                    }
                    onClick={() =>
                      setExpandedRequest(expandedRequest === r.id ? null : r.id)
                    }
                  >
                    {expandedRequest === r.id ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ArrowUpRight size={14} />
                    )}
                  </button>
                  {["COMPLETED", "CLOSED", "RESOLVED"].includes(
                    String(r.status).trim().toUpperCase(),
                  ) && (
                    <button
                      type="button"
                      className="sd-link sd-feedback-link"
                      onClick={() => setFeedbackRequest(r)}
                    >
                      Confirm &amp; leave feedback
                    </button>
                  )}
                </div>
              </span>
            </div>
            {expandedRequest === r.id && (
              <div
                className="sd-request-details"
                id={`request-details-${r.id}`}
              >
                <div>
                  <strong>Issue description</strong>
                  <p>{r.description || "No description provided."}</p>
                </div>
              </div>
            )}
          </Fragment>
        ))}

        <div className="sd-table__foot">
          <span>
            {loading
              ? "Loading your requests…"
              : `Showing ${visible.length} ${visible.length === 1 ? "request" : "requests"}`}
          </span>
          <span className="sd-chip">
            {user?.isDemo ? "Saved requests" : "Live requests"}
          </span>
        </div>
      </div>

      <div className="sd-pager">
        <button
          className="sd-pager__btn"
          aria-label="Previous page"
          disabled={current === 1}
          onClick={() => setPage(current - 1)}
        >
          <ChevronLeft size={14} />
        </button>
        <span className="sd-pager__label">
          Page {current} of {pages}
        </span>
        <button
          className="sd-pager__btn"
          aria-label="Next page"
          disabled={current === pages}
          onClick={() => setPage(current + 1)}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </main>
  );
}
