import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Mail, MessageSquare } from "lucide-react";
import "../shared.css";
import "./Technician.css";

const feedbackKey = (requestId, email) =>
  `servicedesk-customer-feedback:${String(email || "customer").toLowerCase()}:${requestId}`;

export default function CustomerFeedback({ request, user, onBack }) {
  const [record, setRecord] = useState(null);
  const [rating, setRating] = useState("");
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const key = feedbackKey(request.id, user?.email);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        setRecord(parsed);
        setRating(parsed.rating || "");
        setComments(parsed.comments || "");
      }
    } catch (loadError) {
      setError(
        loadError.message ||
          "The saved confirmation and feedback could not be read.",
      );
    } finally {
      setLoading(false);
    }
  }, [key]);

  const confirmCompletion = () => {
    setError("");
    setNotice("");
    const updated = {
      ...record,
      requestId: request.id,
      confirmed: true,
      confirmedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(key, JSON.stringify(updated));
      setRecord(updated);
      setNotice("Completion confirmed in this browser.");
    } catch (saveError) {
      setError(saveError.message || "Your confirmation could not be saved.");
    }
  };

  const submitFeedback = (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!record?.confirmed) {
      setError("Confirm the service completion before leaving feedback.");
      return;
    }
    if (!rating) {
      setError("Choose a satisfaction rating.");
      return;
    }

    const updated = {
      ...record,
      requestId: request.id,
      confirmed: true,
      rating,
      comments: comments.trim(),
      submittedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(key, JSON.stringify(updated));
      setRecord(updated);
      setNotice("Your feedback has been saved in this browser.");
    } catch (saveError) {
      setError(saveError.message || "Your feedback could not be saved.");
    }
  };

  return (
    <main className="sd-main">
      <button type="button" className="sd-back" onClick={onBack}>
        <ArrowLeft size={14} /> Back to my requests
      </button>

      <section className="tech-customer-confirmation">
        <div className="tech-customer-confirmation__heading">
          <span className="tech-customer-confirmation__icon">
            <Mail size={20} />
          </span>
          <div>
            <div className="sd-eyebrow">SERVICE COMPLETION</div>
            <h1>Review your completed service</h1>
            <p className="sd-muted">
              Request {request.id}: {request.title}
            </p>
          </div>
        </div>

        <div className="tech-message tech-message--demo">
          This is the customer confirmation screen. The API workbook does not
          include a service-completion email or feedback endpoint, so no email
          will be sent and your response is saved only in this browser.
        </div>

        {error && (
          <div className="tech-message tech-message--error" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="tech-message" role="status">
            {notice}
          </div>
        )}

        <div className="tech-confirmation-card">
          <h2>Service summary</h2>
          <dl className="tech-ticket-summary">
            <div>
              <dt>Request</dt>
              <dd>{request.id}</dd>
            </div>
            <div>
              <dt>Service</dt>
              <dd>{request.title || "—"}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{request.category || "—"}</dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd>{request.updated || request.created || "—"}</dd>
            </div>
          </dl>

          {!record?.confirmed ? (
            <button
              type="button"
              className="tech-btn"
              onClick={confirmCompletion}
              disabled={loading}
            >
              <CheckCircle2 size={15} /> Confirm service completion
            </button>
          ) : (
            <div className="tech-status tech-status-green">
              Completion confirmed
            </div>
          )}
        </div>

        {record?.confirmed && (
          <form
            className="tech-confirmation-card"
            onSubmit={submitFeedback}
          >
            <h2>
              <MessageSquare size={17} /> How was the service?
            </h2>
            {record.submittedAt ? (
              <div className="tech-message" role="status">
                Thanks. Your feedback is saved in this browser.
              </div>
            ) : (
              <>
                <label className="tech-field">
                  <span>Overall satisfaction *</span>
                  <select
                    value={rating}
                    onChange={(event) => setRating(event.target.value)}
                    required
                  >
                    <option value="">Choose a rating</option>
                    <option value="5">Very satisfied</option>
                    <option value="4">Satisfied</option>
                    <option value="3">Neither satisfied nor dissatisfied</option>
                    <option value="2">Dissatisfied</option>
                    <option value="1">Very dissatisfied</option>
                  </select>
                </label>
                <label className="tech-field">
                  <span>Additional comments (optional)</span>
                  <textarea
                    value={comments}
                    onChange={(event) => setComments(event.target.value)}
                    rows={4}
                  />
                </label>
                <button type="submit" className="tech-btn">
                  Submit feedback
                </button>
              </>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
