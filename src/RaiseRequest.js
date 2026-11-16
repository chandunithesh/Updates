import { useRef, useState, useEffect } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  MapPin,
  Tag,
  Upload,
  Wrench,
} from "lucide-react";
import "./RaiseRequest.css";
import AddressForm from "./location";

const CATEGORIES = ["Maintenance", "Electrical", "HVAC", "Plumbing", "Equipment repair", "Other"];
// const PRIORITIES = ["Low", "Normal", "High", "Urgent"];

const MAX_FILES = 5;
const MAX_MB = 10;
const SUCCESS_DISPLAY_DURATION = 5 * 60 * 1000;

const BASE_URL = "https://techtamminaapps.appiancloud.com/suite/webapi";
const ORGANIZATIONS_API = `${BASE_URL}/2BoXHg`;
const CUSTOMER_PRODUCTS_API = `${BASE_URL}/customerProducts`;
const SERVICE_REQUEST_API = `${BASE_URL}/serviceTicket`;
const ATTACHMENTS_API = `${BASE_URL}/attachments`;

const API_KEY = process.env.REACT_APP_APPIAN_API_KEY;

const EMPTY_FORM = {
  phone: "",
  organization: "",
  title: "",
  category: "Maintenance",
  priority: "Normal",
  description: "",
  productName: "",
  productModel: "",
  warrentyEndDate: "",
  location: "",
  country: "",
  state: "",
  city: "",
  pincode: "",
  address: "",
  customerProductId: "",
};

// ---------- helpers ----------

function getHeaders(extra = {}) {
  if (!API_KEY || !API_KEY.trim()) {
    throw new Error("Missing REACT_APP_APPIAN_API_KEY. Add it to .env and restart the app.");
  }
  return { "Appian-API-Key": API_KEY.trim(), Accept: "application/json", ...extra };
}

function checkResponse(response, what) {
  if (response.ok) return;
  if (response.status === 401 || response.status === 403) {
    throw new Error("The API key was rejected. Check the key and try again.");
  }
  throw new Error(`The ${what} request failed (${response.status}).`);
}

function friendlyError(error, service) {
  // fetch throws a TypeError when the network or CORS blocks the call
  if (error instanceof TypeError) {
    return `Could not reach the ${service} service. Check your network and Appian CORS settings.`;
  }
  return error.message || `Something went wrong with the ${service} service.`;
}

function toOrganizationOptions(payload) {
  const list = Array.isArray(payload) ? payload : payload?.response || payload?.organizations || payload?.data;
  if (!Array.isArray(list)) throw new Error("The API response did not contain an organization list.");

  const options = list
    .map((item) => {
      if (typeof item === "string") return { value: item, label: item };
      const label = item?.name ?? item?.organizationName ?? item?.displayName ?? item?.label;
      const value = item?.id ?? item?.organizationId ?? item?.value ?? label;
      return label && value ? { value: String(value), label: String(label) } : null;
    })
    .filter(Boolean);

  if (options.length === 0) throw new Error("No organizations were found for this phone number.");
  return options;
}

function toProductRecords(payload) {
  const response = payload?.response;
  if (typeof response === "string" && /no customer products/i.test(response)) return [];

  const list = Array.isArray(payload) ? payload : response;
  if (!Array.isArray(list)) throw new Error("The API response did not contain customer products.");

  return list
    .filter((item) => item?.warrentyEndDate || item?.warrantyEndDate || item?.endDate || item?.product)
    .map((item) => ({
      id:
        item.customerProductId ??
        item.CustomerProductId ??
        item.customerProductID ??
        item.custproduct_ID ??
        item.customerProduct?.customerProductId ??
        item.customerProduct?.CustomerProductId ??
        item.id ??
        item.ID ??
        "",
      endDate: item.warrentyEndDate ?? item.warrantyEndDate ?? item.endDate ?? "",
      name: item.product?.productName || "",
      model: item.product?.model || "",
      months: item.product?.warrantyMonth,
    }));
}

function getRequestId(payload) {
  const data = payload?.response || payload;
  return data?.reqid ?? data?.reqId ?? data?.requestId ?? data?.serviceRequestId ?? data?.serviceReqId;
}

function formatRequestId(requestId) {
  if (requestId == null || String(requestId).trim() === "") return "Not available";

  const value = String(requestId).trim();
  if (/^SR-\d{4}-\d+$/i.test(value) || !/^\d+$/.test(value)) return value;

  return `SR-${new Date().getFullYear()}-${value.padStart(4, "0")}`;
}

async function uploadAttachment(file, requestId) {
  const url = new URL(ATTACHMENTS_API);
  url.searchParams.set("serviceReqId", String(requestId));
  const response = await fetch(url, {
    method: "POST",
    headers: getHeaders({
      "Content-Type": file.type || "application/octet-stream",
      "appian-document-name": file.name,
    }),
    body: file,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || `Upload failed for ${file.name}`);
  }
  console.log(`Uploaded ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB) to request ${requestId}`);
}

// ---------- small components ----------

function Field({ label, required, error, full, htmlFor, children }) {
  return (
    <div className={`sd-field ${full ? "sd-field--full" : ""}`}>
      <label htmlFor={htmlFor}>
        {label}
        {required && <i aria-hidden="true">*</i>}
      </label>
      {children}
      {error && <span className="sd-error" role="alert">{error}</span>}
    </div>
  );
}

function SuccessDetail({ icon: Icon, label, value }) {
  return (
    <div className="sd-success-detail">
      <span className="sd-success-detail__icon">
        <Icon size={17} aria-hidden="true" />
      </span>
      <div>
        <span className="sd-success-detail__label">{label}</span>
        <strong>{value || "Not provided"}</strong>
      </div>
    </div>
  );
}

// ---------- main component ----------

export default function RaiseRequest({ onNavigate, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  // const [customerId, setCustomerId] = useState(() => localStorage.getItem("customerId") || "");
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});

  const [organizations, setOrganizations] = useState([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState("");

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState(null);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const warrantyRequestId = useRef(0);
  const navigateRef = useRef(onNavigate);

  useEffect(() => {
    navigateRef.current = onNavigate;
  }, [onNavigate]);

  useEffect(() => {
    if (!submitted) return undefined;

    const timeoutId = window.setTimeout(
      () => navigateRef.current("home"),
      SUCCESS_DISPLAY_DURATION,
    );
    return () => window.clearTimeout(timeoutId);
  }, [submitted]);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser.");
      return;
    }
      const handleSuccess = (position) => {
        const { longitude, latitude } = position.coords;
        setLatitude(latitude);
        setLongitude(longitude);
      };
    const handleError = (error) => {
      console.error("Error getting location:", error);
    };
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError);
  }, []);

  // Returns an onChange handler that updates one form field
  const handleChange = (name) => (e) => {
    setForm((current) => ({ ...current, [name]: e.target.value }));
  };

  const clearProducts = () => {
    warrantyRequestId.current += 1;
    setProducts([]);
    setProductsError("");
    setProductsLoading(false);
    setForm((current) => ({ ...current, customerProductId: "", productName: "", productModel: "", warrentyEndDate: "" }));
  };

  // ---------- API calls ----------

  const loadOrganizations = async () => {
    const phone = form.phone.trim();
    if (!phone) return;

    setOrgLoading(true);
    setOrgError("");
    try {
      const response = await fetch(`${ORGANIZATIONS_API}?phoneNumber=${encodeURIComponent(phone)}`, {
        headers: getHeaders(),
      });
      checkResponse(response, "organization");
      setOrganizations(toOrganizationOptions(await response.json()));
    } catch (error) {
      setOrganizations([]);
      setOrgError(friendlyError(error, "organization"));
    } finally {
      setOrgLoading(false);
    }
  };

  const loadProducts = async (organizationId) => {
    const phone = form.phone.trim();
    const requestId = ++warrantyRequestId.current;
    if (!organizationId || !phone) {
      setProductsError("Enter the registered phone number before checking the warranty.");
      setProductsLoading(false);
      return;
    }

    setProductsLoading(true);
    setProductsError("");
    try {
      const response = await fetch(CUSTOMER_PRODUCTS_API, {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          orgId: Number(organizationId),
          phoneNumber: phone,
        }),
      });
      checkResponse(response, "warranty");

      const records = toProductRecords(await response.json());
      console.log("Loaded customer products:", records);
      if (requestId !== warrantyRequestId.current) return;
      setProducts(records);
      setForm((current) => {
        const productName = current.productName || (records.length === 1 ? records[0].name : "");
        const matchedProduct = records.find(
          (record) =>
            record.id !== "" &&
            record.name.trim().toLowerCase() === productName.trim().toLowerCase(),
        );
        return {
          ...current,
          customerProductId: matchedProduct ? String(matchedProduct.id) : "",
          productName,
          productModel: current.productModel || matchedProduct?.model || "",
          warrentyEndDate: matchedProduct?.endDate || "",
        };
      });

    } catch (error) {
      if (requestId !== warrantyRequestId.current) return;
      setProducts([]);
      setProductsError(friendlyError(error, "warranty"));
    } finally {
      if (requestId === warrantyRequestId.current) setProductsLoading(false);
    }
  };

  // ---------- event handlers ----------

  const handlePhoneChange = (e) => {
    // A new phone number means the old organizations and products no longer apply
    setForm((current) => ({ ...current, phone: e.target.value, organization: "" }));
    setOrganizations([]);
    setOrgError("");
    clearProducts();
    setErrors((current) => ({ ...current, phone: undefined }));
  };

  const handleOrganizationChange = (e) => {
    const organizationId = e.target.value;
    setForm((current) => ({ ...current, organization: organizationId }));
    clearProducts();
    if (organizationId) loadProducts(organizationId);
  };

  const handleCustomerProductChange = (e) => {
    const productName = e.target.value;
    const matchedProduct = products.find(
      (product) =>
        product.id !== "" &&
        product.name.trim().toLowerCase() === productName.trim().toLowerCase(),
    );
    setForm((current) => ({
      ...current,
      productName,
      customerProductId: matchedProduct ? String(matchedProduct.id) : "",
      productModel: matchedProduct?.model || "",
      warrentyEndDate: matchedProduct?.endDate || "",
    }));
    setErrors((current) => ({ ...current, customerProductId: undefined }));
  };

  const handleAddressChange = (address) => {
    const location = [address.street, address.city, address.state, address.zip, address.country]
      .filter(Boolean)
      .join(", ");

    setForm((current) => ({
      ...current,
      location,
      country: address.country,
      state: address.state,
      city: address.city,
      pincode: address.zip,
      address: address.street,
    }));
    setErrors((current) => ({ ...current, location: undefined }));
  };

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    const problems = [];

    if (picked.length > MAX_FILES) problems.push(`Choose up to ${MAX_FILES} files.`);
    if (picked.some((file) => file.size > MAX_MB * 1024 * 1024)) {
      problems.push(`Each file must be under ${MAX_MB} MB.`);
    }

    if (problems.length > 0) {
      e.target.value = "";
      setFiles([]);
      setErrors((current) => ({ ...current, files: problems.join(" ") }));
      return;
    }

    setFiles(picked);
    setErrors((current) => ({ ...current, files: undefined }));
  };

  const validate = () => {
    const found = {};
    // if (!customerId.trim()) found.customerId = "Enter your customer ID.";
    if (!form.phone.trim()) found.phone = "Enter your registered phone number.";
    if (!form.organization) found.organization = "Select an organization.";
    if (!form.productName.trim()) found.customerProductId = "Enter a customer product.";
    if (!form.title.trim()) found.title = "Enter a request title.";
    if (!form.location.trim()) found.location = "Enter the service location.";
    if (!form.description.trim()) found.description = "Describe the issue so we can help.";
    return found;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const found = validate();
    setErrors((current) => ({ files: current.files, ...found }));
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      // 1. Create the service request
      const response = await fetch(SERVICE_REQUEST_API, {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          customerId: (localStorage.getItem("customerId") || "").trim(),
          organizationId: Number(form.organization),
          customerProductId: form.customerProductId ? Number(form.customerProductId) : null,
          productName: form.productName.trim(),
          issueCategory: form.category,
          issueTitle: form.title.trim(),
          issueDescription: form.description.trim(),
          priority: form.priority,
          warrentyEndDate: form.warrentyEndDate, // API spelling
          country: form.country,
          state: form.state,
          city: form.city,
          pincode: form.pincode,
          address: form.address,
          customerlatitude : latitude,
          customerlongitude : longitude
        }),
      });
      console.log("Requesting service request with payload:", {
        customerId: (localStorage.getItem("customerId") || "").trim(),
        organizationId: Number(form.organization),
        customerProductId: form.customerProductId ? Number(form.customerProductId) : null,
        productName: form.productName.trim(),
        issueCategory: form.category,
        issueTitle: form.title.trim(),
        issueDescription: form.description.trim(),
        priority: form.priority,
        warrentyEndDate: form.warrentyEndDate,
        country: form.country,
        state: form.state,
        city: form.city,
        pincode: form.pincode,
        address: form.address,
        customerlatitude: latitude,
        customerlongitude: longitude
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || `Request creation failed (${response.status}).`);
      }

      const requestId = getRequestId(payload);

      // 2. Upload attachments against the new request id
      if (files.length > 0) {
        if (requestId == null) {
          throw new Error("The request was created, but the response did not contain a request id for attachments.");
        }
        for (const file of files) {
          await uploadAttachment(file, requestId);
        }
      }

      setSubmittedRequestId(requestId);
      setSubmittedAt(new Date());
      onSubmit({ ...form, files, requestId });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(friendlyError(error, "request"));
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- render ----------

  const selectedProduct = products.find(
    (product) => String(product.id) === form.customerProductId,
  );
  const submittedLocation = [
    form.address,
    form.city,
    form.state,
    form.pincode,
    form.country,
  ]
    .filter(Boolean)
    .join(", ");
  const submittedProduct = [
    selectedProduct?.name || form.productName,
    form.productModel || selectedProduct?.model,
  ]
    .filter(Boolean)
    .join(" · ");

  if (submitted) {
    return (
      <div className="sd-form-page sd-success-page" role="status">
        <section className="sd-form-section sd-success-card" aria-labelledby="request-success-title">
          <div className="sd-success-celebration" aria-hidden="true">
            <div className="sd-success-burst sd-success-burst--left">
              {Array.from({ length: 8 }, (_, index) => (
                <i key={index} />
              ))}
            </div>
            <div className="sd-success-burst sd-success-burst--right">
              {Array.from({ length: 8 }, (_, index) => (
                <i key={index} />
              ))}
            </div>
          </div>
          <div className="sd-success-icon">
            <CheckCircle2 size={34} aria-hidden="true" />
          </div>
          <div className="sd-success-copy">
            <h1 id="request-success-title">Request created successfully</h1>
            <p>
              Your request is in. Our support team will keep you updated as it
              progresses.
            </p>
          </div>
          <div className="sd-success-details">
            <div className="sd-success-details__column">
              <SuccessDetail
                icon={ClipboardList}
                label="Request ID"
                value={formatRequestId(submittedRequestId)}
              />
              <SuccessDetail
                icon={Tag}
                label="Issue category"
                value={form.category}
              />
              <SuccessDetail
                icon={FileText}
                label="Issue details"
                value={`${form.title.trim()}: ${form.description.trim()}`}
              />
            </div>
            <div className="sd-success-details__column">
              <SuccessDetail
                icon={CheckCircle2}
                label="Priority"
                value={form.priority}
              />
              <SuccessDetail
                icon={MapPin}
                label="Service location"
                value={submittedLocation}
              />
              <SuccessDetail
                icon={Wrench}
                label="Product"
                value={submittedProduct}
              />
              <SuccessDetail
                icon={CalendarDays}
                label="Submitted on"
                value={
                  submittedAt?.toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }) || "Just now"
                }
              />
            </div>
          </div>
          <p className="sd-success-note">
            You can track updates to this request from My Service Requests.
          </p>
          <div className="sd-success-actions">
            <button
              type="button"
              className="sd-btn sd-btn--ghost"
              onClick={() => onNavigate("requests")}
            >
              View my requests
            </button>
            <button
              type="button"
              className="sd-btn sd-btn--primary"
              onClick={() => onNavigate("home")}
            >
              Close
            </button>
          </div>
        </section>
      </div>  
    );
  }

  // const warrantyText = productsLoading ? "Loading warranty…" : selectedProduct?.endDate || "";

  return (
    <div className="sd-form-page">
      <button className="sd-back" onClick={() => onNavigate("home")}>
        <ArrowLeft size={14} /> Back to home
      </button>

      <div className="sd-form-head">
        <div className="sd-eyebrow">LET'S GET IT SORTED</div>
        <h1>Raise a Service Request</h1>
        <div className="sd-form-sub">
          Tell us what needs attention. <span className="sd-chip"></span>
        </div>
      </div>

      <form className="sd-form" onSubmit={handleSubmit} noValidate>
        {/* Service details */}
        <section className="sd-form-section" aria-labelledby="service-details-heading">
          <h2 id="service-details-heading">Service details</h2>
          <div className="sd-grid">
            {/* <Field label="Customer ID" required htmlFor="customerId" error={errors.customerId}>
              <input
                id="customerId"
                className={`sd-input ${errors.customerId ? "has-error" : ""}`}
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setErrors((current) => ({ ...current, customerId: undefined }));
                }}
                placeholder="Customer ID not found"
              />
            </Field> */}
            <Field label="Registered Phone Number" required htmlFor="phone" error={errors.phone}>
              <input
                id="phone"
                className={`sd-input ${errors.phone ? "has-error" : ""}`}
                placeholder="Enter your registered phone number"
                value={form.phone}
                onChange={handlePhoneChange}
                onBlur={loadOrganizations}
              />
            </Field>

            <Field label="Organization" required htmlFor="organization" error={errors.organization}>
              <select
                id="organization"
                className={`sd-input ${errors.organization ? "has-error" : ""}`}
                value={form.organization}
                onChange={handleOrganizationChange}
                disabled={organizations.length === 0 || orgLoading}
              >
                <option value="">
                  {orgLoading
                    ? "Loading organizations…"
                    : organizations.length > 0
                    ? "Select an organization"
                    : "Organizations unavailable"}
                </option>
                {organizations.map((org) => (
                  <option key={org.value} value={org.value}>
                    {org.label}
                  </option>
                ))}
              </select>
              {orgError && (
                <span className="sd-error" role="alert">
                  {orgError}{" "}
                  <button type="button" className="sd-inline-retry" onClick={loadOrganizations} disabled={orgLoading}>
                    Retry
                  </button>
                </span>
              )}
            </Field>

            <Field label="Customer product" required htmlFor="customerProductId" error={errors.customerProductId}>
              <input
                id="customerProductId"
                type="text"
                className={`sd-input ${errors.customerProductId ? "has-error" : ""}`}
                placeholder={productsLoading ? "Loading product information…" : "Enter customer product"}
                value={form.productName}
                onChange={handleCustomerProductChange}
              />
              {productsError && <span className="sd-error" role="alert">{productsError}</span>}
            </Field>

            {/* <Field label="Warranty end date" htmlFor="warranty-end-date">
              <input
                id="warranty-end-date"
                className="sd-input"
                readOnly
                value={warrantyText}
                placeholder="Select an organization to check warranty"
                aria-live="polite"
              />
              {productsError && <span className="sd-error" role="alert">{productsError}</span>}
            </Field> */}

            {/* <Field label="Product name" htmlFor="productName">
              <input
                id="productName"
                className="sd-input"
                placeholder="Enter product name"
                value={form.productName}
                onChange={handleChange("productName")}
              />
            </Field> */}

            <Field label="Product model" htmlFor="productModel">
              <input
                id="productModel"
                className="sd-input"
                placeholder="Enter product model"
                value={form.productModel}
                onChange={handleChange("productModel")}
              />
            </Field>
          </div>
        </section>

        {/* Location */}
        <section className="sd-form-section" aria-labelledby="location-heading">
          <h2 id="location-heading">Location</h2>
          <div className="sd-grid">
            <Field label="Service address" required full error={errors.location}>
              <AddressForm onAddressChange={handleAddressChange} />
            </Field>
          </div>
        </section>

        {/* Issue details */}
        <section className="sd-form-section" aria-labelledby="issue-details-heading">
          <h2 id="issue-details-heading">Issue details</h2>
          <div className="sd-grid">
            <Field label="Issue title" required htmlFor="title" error={errors.title}>
              <input
                id="title"
                className={`sd-input ${errors.title ? "has-error" : ""}`}
                placeholder="e.g. Air conditioning not cooling"
                value={form.title}
                onChange={handleChange("title")}
              />
            </Field>

            <Field label="Issue category" required htmlFor="category">
              <select id="category" className="sd-input" value={form.category} onChange={handleChange("category")}>
                {CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </Field>

            {/* <Field label="Priority" required htmlFor="priority">
              <select id="priority" className="sd-input" value={form.priority} onChange={handleChange("priority")}>
                {PRIORITIES.map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
            </Field> */}

            <Field label="Issue description" required full htmlFor="description" error={errors.description}>
              <textarea
                id="description"
                rows={4}
                className={`sd-input ${errors.description ? "has-error" : ""}`}
                placeholder="Describe the issue and any relevant details…"
                value={form.description}
                onChange={handleChange("description")}
              />
            </Field>

            <div className="sd-field sd-field--full">
              <span className="sd-label">
                Attachments <em>(optional)</em>
              </span>
              <div className="sd-drop">
                <div className="sd-drop__text">
                  <Upload size={16} /> Photos or documents · Up to {MAX_FILES} files, {MAX_MB} MB each
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  aria-label="Attachments"
                  onChange={handleFiles}
                />
                {files.length > 0 && (
                  <ul className="sd-files">
                    {files.map((file) => (
                      <li key={`${file.name}-${file.lastModified}`}>
                        {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                      </li>
                    ))}
                  </ul>
                )}
                {errors.files && <span className="sd-error" role="alert">{errors.files}</span>}
              </div>
            </div>
          </div>
        </section>

        <div className="sd-form-actions">
          <button type="button" className="sd-btn sd-btn--ghost sd-btn--auto" onClick={() => onNavigate("home")}>
            Cancel
          </button>
          <button type="submit" className="sd-btn sd-btn--primary" disabled={submitting}>
            {submitting ? "Creating request…" : "Create request"}
          </button>
        </div>

        {submitError && <p className="sd-error" role="alert">{submitError}</p>}
      </form>
    </div>
  );
}