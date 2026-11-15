import { Fragment, useState } from "react";
import {
  Plus, ClipboardList, Building2, Calendar, ArrowRight, ArrowUpRight,
  Headphones, Info, ShieldCheck,
} from "lucide-react";
import StatsStrip from "./StatsStrip.js";
import { STATUS_CLASS, fmtISO } from "./data.js";
import useCustomerRequests from "./useCustomerRequests.js";
import "./Home.css";

function ActionCard({ featured, number, icon: Icon, title, text, cta, primary, onClick }) {
  return (
    <article className={`sd-card sd-action ${featured ? "sd-action--featured" : ""}`}>
      <span className="sd-action__num">{number}</span>
      <span className={`sd-action__icon ${featured ? "is-primary" : ""}`}><Icon size={18} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {primary ? (
        <button className="sd-btn sd-btn--primary" onClick={onClick}>
          <Plus size={14} /> {cta} <ArrowRight size={14} />
        </button>
      ) : (
        <button className="sd-link" onClick={onClick}>{cta} <ArrowRight size={14} /></button>
      )}
    </article>
  );
}

export default function Home({
  onNavigate,
  submittedRequests = [],
  user,
}) {
  const [expandedRequest, setExpandedRequest] = useState(null);
  const { requests, loading, error } = useCustomerRequests(user);
  const allRequests = [...submittedRequests, ...requests].filter(
    (request, index, list) => list.findIndex((item) => item.id === request.id) === index
  );
  const today = new Date()
    .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .replace(",", "");

  const recent = [...allRequests]
    .sort((a, b) => b.created.localeCompare(a.created))
    .slice(0, 4);

  return (
    <main className="sd-main">
      <div className="sd-welcome">
        <div>
          <div className="sd-eyebrow">YOUR SERVICE, SIMPLIFIED</div>
          <h1>Welcome back, Feild Flow FSM<span></span></h1>
          <p className="sd-muted">How can we help you today?</p>
        </div>
        <div className="sd-date"><Calendar size={13} /> {today}</div>
      </div>

      <div className="sd-actions">
        <ActionCard
          featured primary number="01" icon={Plus}
          title="Raise a Service Request"
          text="Something needs attention? Tell us what you need and we'll take it from here."
          cta="New Service Request"
          onClick={() => onNavigate("raise")}
        />
        <ActionCard
          number="02" icon={ClipboardList}
          title="My Service Requests"
          text="Stay in the loop. Track your requests and view your service history."
          cta="View My Requests"
          onClick={() => onNavigate("requests")}
        />
        <ActionCard
          number="03" icon={Building2}
          title="About & Contact"
          text="Get to know your service partner or connect with our support team."
          cta="Get in Touch"
          onClick={() => onNavigate("about")}
        />
      </div>

      <StatsStrip requests={allRequests} />

      <div className="sd-lower">
        <section>
          <div className="sd-section-head">
            <div>
              <h2>My Recent Requests</h2>
              <p>A quick look at your latest service activity.</p>
            </div>
            <button className="sd-link" onClick={() => onNavigate("requests")}>
              View all requests <ArrowRight size={14} />
            </button>
          </div>

          <div className="sd-card sd-table sd-table--home">
            <div className="sd-table__row sd-table__head">
              <span>Request details</span><span>Requested on</span><span>Status</span><span />
            </div>

            {error && (
              <div className="sd-empty" role="alert">
                <strong>Could not load your requests</strong>
                <span className="sd-muted">{error}</span>
              </div>
            )}

            {!error && !loading && recent.length === 0 && (
              <div className="sd-empty">
                <strong>No service requests yet</strong>
                <span className="sd-muted">Your submitted requests will appear here.</span>
              </div>
            )}

            {recent.map((r) => {
              return (
                <Fragment key={r.id}>
                  <div className="sd-table__row">
                    <span>
                      <strong className="sd-req-title">{r.title}</strong>
                      <button
                        type="button"
                        className="sd-req-id sd-req-id--button"
                        aria-label={`${expandedRequest === r.id ? "Hide" : "Show"} details for request ${r.id}`}
                        aria-expanded={expandedRequest === r.id}
                        aria-controls={
                          expandedRequest === r.id
                            ? `home-request-details-${r.id}`
                            : undefined
                        }
                        onClick={() =>
                          setExpandedRequest(
                            expandedRequest === r.id ? null : r.id,
                          )
                        }
                      >
                        {r.id}
                      </button>
                    </span>
                    <span className="sd-muted">{fmtISO(r.created)}</span>
                    <span>
                      <span className={`sd-badge ${STATUS_CLASS[r.status] || "sd-badge--review"}`}>
                        <i />
                        {r.status}
                      </span>
                    </span>
                    <span className="sd-open">
                      <button
                        type="button"
                        aria-label={`${expandedRequest === r.id ? "Hide" : "Show"} details for ${r.title}`}
                        aria-expanded={expandedRequest === r.id}
                        aria-controls={
                          expandedRequest === r.id
                            ? `home-request-details-${r.id}`
                            : undefined
                        }
                        onClick={() =>
                          setExpandedRequest(
                            expandedRequest === r.id ? null : r.id,
                          )
                        }
                      >
                        <ArrowUpRight size={14} />
                      </button>
                    </span>
                  </div>
                  {expandedRequest === r.id && (
                    <div
                      className="sd-request-details sd-home-request-details"
                      id={`home-request-details-${r.id}`}
                    >
                      <div>
                        <strong>Issue description</strong>
                        <p>{r.description || "No description provided."}</p>
                      </div>
                    </div>
                  )}
                </Fragment>
              );
            })}

            {/* <div className="sd-table__foot">
              <span>{loading ? "Loading your requests…" : `Showing ${recent.length} requests`}</span>
              <span className="sd-chip">Live requests</span>
            </div> */}
          </div>
        </section>

        <aside className="sd-card sd-help">
          <div className="sd-help__top">
            <span className="sd-help__photo" aria-hidden="true" />
            <span className="sd-help__badge"><Headphones size={16} /></span>
          </div>
          <h3>Customer support, whenever you need it.</h3>
          <p>Find customer support and contact options in About &amp; Contact.</p>
          <button className="sd-btn sd-btn--ghost" onClick={() => onNavigate("about")}>
            About &amp; Contact <ArrowRight size={14} />
          </button>
        </aside>
      </div>

      <div className="sd-notice">
        <Info size={13} />
        <span>
          Your preferred service date is a request, not a confirmed appointment.
          We'll keep you updated as your request progresses.
        </span>
      </div>

      <footer className="sd-footer">
        <ShieldCheck size={13} /> Your service requests. All in one place.
        <span className="sd-chip">Demo portal</span>
      </footer>
    </main>
  );
}
