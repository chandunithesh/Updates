import { useState } from "react";
import { ArrowLeft, ArrowRight, MessageCircle, Star } from "lucide-react";
import useCustomerRequests from "./useCustomerRequests.js";
import "./Feedback.css";

const FEEDBACK_KEY_PREFIX = "servicedesk-customer-feedback-submissions:";
const FEEDBACK_API_URL =
  "https://techtamminaapps.appiancloud.com/suite/webapi/customerFeedback";

const RATINGS = [
  { value: "1", label: "Very poor" },
  { value: "2", label: "Poor" },
  { value: "3", label: "Okay" },
  { value: "4", label: "Good" },
  { value: "5", label: "Excellent" },
];

function toNumericId(value, label) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`${label} is unavailable or invalid.`);
  }
  return id;
}

export default function Feedback({ onNavigate, user }) {
  const [technicianRating, setTechnicianRating] = useState("");
  const [serviceRating, setServiceRating] = useState("");
  const [serviceRequestId, setServiceRequestId] = useState("");
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const {
    requests,
    loading: requestsLoading,
    error: requestsError,
  } = useCustomerRequests(user);
  const selectableRequests = requests.filter(
    (request) =>
      Number.isSafeInteger(Number(request.serviceRequestId)) &&
      Number(request.serviceRequestId) > 0,
  );
  const selectedRequest = selectableRequests.find(
    (request) => String(request.serviceRequestId) === serviceRequestId,
  );
  let requestPlaceholder = "Select a service request";
  if (requestsLoading) {
    requestPlaceholder = "Loading your service requests…";
  } else if (requestsError) {
    requestPlaceholder = "Could not load service requests";
  } else if (selectableRequests.length === 0) {
    requestPlaceholder =
      requests.length > 0
        ? "No requests include a valid service ID"
        : "No service requests found";
  }

  const submitFeedback = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!technicianRating || !serviceRating) {
      setError("Choose a rating for both the technician and the service.");
      return;
    }
    if (!selectedRequest) {
      setError("Select a service request before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const apiKey = process.env.REACT_APP_APPIAN_API_KEY;
      if (!apiKey?.trim()) {
        throw new Error(
          "Feedback is not configured. Add REACT_APP_APPIAN_API_KEY to .env and restart the app.",
        );
      }

      const email = String(
        user?.email ||
          localStorage.getItem("email") ||
          user?.customerId ||
          localStorage.getItem("customerId") ||
          "customer",
      )
        .trim()
        .toLowerCase();
      const key = `${FEEDBACK_KEY_PREFIX}${email}`;
      const feedback = {
        organizationId: toNumericId(
          selectedRequest.organizationId ||
            user?.organizationId ||
            user?.orgId ||
            localStorage.getItem("orgId"),
          "Organization ID",
        ),
        customerId: toNumericId(
          user?.customerId ||
            selectedRequest.customerId ||
            localStorage.getItem("customerId"),
          "Customer ID",
        ),
        technicianRating: Number(technicianRating),
        comments: comments.trim(),
        verificationStatus: "VERIFIED",
        submittedOn: new Date().toISOString(),
        serviceRating: Number(serviceRating),
        serviceRequestId: toNumericId(
          selectedRequest.serviceRequestId,
          "Service request ID",
        ),
      };

      const response = await fetch(FEEDBACK_API_URL, {
        method: "POST",
        headers: {
          "Appian-API-Key": apiKey.trim(),
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(feedback),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "The feedback API key was rejected. Check your .env configuration.",
          );
        }
        throw new Error(`Feedback submission failed (${response.status}).`);
      }

      let localSaveError = "";
      try {
        const saved = JSON.parse(localStorage.getItem(key) || "[]");
        if (!Array.isArray(saved)) {
          throw new Error("Saved feedback has an invalid format.");
        }
        localStorage.setItem(key, JSON.stringify([feedback, ...saved]));
      } catch (saveError) {
        localSaveError =
          saveError.message || "The local feedback copy could not be saved.";
      }

      setTechnicianRating("");
      setServiceRating("");
      setServiceRequestId("");
      setComments("");
      setNotice("Thank you. Your feedback was sent successfully.");
      if (localSaveError) {
        setError(`Your feedback was received, but ${localSaveError}`);
      }
    } catch (submitError) {
      setError(submitError.message || "Your feedback could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="sd-main sd-feedback-page">
      <button
        type="button"
        className="sd-back"
        onClick={() => onNavigate("home")}
      >
        <ArrowLeft size={14} /> Back to home
      </button>

      <section className="sd-feedback-card" aria-labelledby="feedback-title">
        <div className="sd-feedback-heading">
          <span className="sd-feedback-icon" aria-hidden="true">
            <MessageCircle size={21} />
          </span>
          <div>
            <div className="sd-eyebrow">YOUR EXPERIENCE MATTERS</div>
            <h1 id="feedback-title">How was your service?</h1>
            <p>Let us know how we did. Your feedback helps us do better.</p>
          </div>
        </div>

        {error && (
          <div className="sd-feedback-message is-error" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="sd-feedback-message" role="status">
            {notice}
          </div>
        )}

        <form className="sd-feedback-form" onSubmit={submitFeedback}>
          <label className="sd-feedback-field">
            <span>Service request</span>
            <select
              className="sd-input"
              value={serviceRequestId}
              onChange={(event) => setServiceRequestId(event.target.value)}
              disabled={requestsLoading || selectableRequests.length === 0}
              aria-required="true"
            >
              <option value="">{requestPlaceholder}</option>
              {selectableRequests.map((request) => (
                <option
                  key={request.serviceRequestId}
                  value={String(request.serviceRequestId)}
                >
                  {request.id || `Request ${request.serviceRequestId}`}
                  {request.title ? ` — ${request.title}` : ""}
                </option>
              ))}
            </select>
            {requestsError && (
              <span className="sd-feedback-field-error" role="alert">
                Could not load requests: {requestsError}
              </span>
            )}
          </label>

          {[
            {
              name: "technicianRating",
              title: "Rate the technician",
              value: technicianRating,
              onChange: setTechnicianRating,
            },
            {
              name: "serviceRating",
              title: "Rate the service",
              value: serviceRating,
              onChange: setServiceRating,
            },
          ].map(({ name, title, value, onChange }) => (
            <fieldset
              className="sd-feedback-rating"
              role="radiogroup"
              aria-required="true"
              key={name}
            >
              <legend>{title}</legend>
              <div className="sd-feedback-stars">
                {RATINGS.map(({ value: ratingValue, label }) => (
                  <label className="sd-feedback-star" key={ratingValue}>
                    <input
                      type="radio"
                      name={name}
                      value={ratingValue}
                      checked={value === ratingValue}
                      onChange={(event) => onChange(event.target.value)}
                      aria-label={`${ratingValue} ${
                        Number(ratingValue) === 1 ? "star" : "stars"
                      } — ${label}`}
                    />
                    <Star
                      size={36}
                      strokeWidth={1.7}
                      aria-hidden="true"
                      className={
                        Number(value) >= Number(ratingValue) ? "is-filled" : ""
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="sd-feedback-rating-copy" aria-live="polite">
                {value
                  ? `${value} out of 5 — ${RATINGS[Number(value) - 1].label}`
                  : "Select a star rating"}
              </div>
            </fieldset>
          ))}

          <label className="sd-feedback-field">
            <span>Comments <em>(optional)</em></span>
            <textarea
              className="sd-input"
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              rows={4}
              placeholder="What went well, or what could we improve?"
            />
          </label>

          <button
            type="submit"
            className="sd-btn sd-btn--primary"
            disabled={submitting}
          >
            {submitting ? "Sending…" : "Submit rating"} <ArrowRight size={14} />
          </button>
        </form>
        <p className="sd-feedback-note">
          Your rating is sent securely to our service team.
        </p>
      </section>
    </main>
  );
}