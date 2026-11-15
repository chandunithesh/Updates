import { useEffect, useRef, useState } from "react";
import {
    ClipboardList, Ticket, Search, RefreshCw, Clock3, CheckCircle2,
    X, PlusCircle, UserRound, MapPin, CalendarDays,
} from "lucide-react";
import "./ServiceAgent.css";

/* ================================================================== */
/* PART 1: API CALLS (all network requests live here)                  */
/* ================================================================== */
const ENDPOINTS = {
    services: "https://techtamminaapps.appiancloud.com/suite/webapi/R3YL3A",
    serviceRequests: "https://techtamminaapps.appiancloud.com/suite/webapi/ServiceRequests",
    customerDetails: "https://techtamminaapps.appiancloud.com/suite/webapi/customerDetailsbyCustId",
    serviceRequest: "https://techtamminaapps.appiancloud.com/suite/webapi/serviceRequest",
    subServices: "https://techtamminaapps.appiancloud.com/suite/webapi/subServicebyServiceId",
    ticket: "https://techtamminaapps.appiancloud.com/suite/webapi/Ticket",
    requestDocuments: "https://techtamminaapps.appiancloud.com/suite/webapi/getDocs",
    documentDownload: "https://techtamminaapps.appiancloud.com/suite/webapi/documentDownload",
};
const API_KEY = process.env.REACT_APP_APPIAN_API_KEY?.trim();

const hasApiKey = Boolean(API_KEY);

async function getJson(endpoint, params = {}) {
    if (!hasApiKey) throw new Error("Missing REACT_APP_APPIAN_API_KEY");

    const url = new URL(endpoint);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));

    const response = await fetch(url, { headers: { "Appian-API-Key": API_KEY }});
    if (!response.ok) throw new Error(`${url.pathname.split("/").pop()} failed (${response.status})`);
    return response.json();
}

function getDocumentIds(payload) {
    if (typeof payload === "string") {
        try {
            return getDocumentIds(JSON.parse(payload));
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error("The documents service returned an unreadable response.");
            }
            throw error;
        }
    }

    if (Array.isArray(payload)) {
        return payload
            .map((item) =>
                typeof item === "number" || typeof item === "string"
                    ? item
                    : fieldValue(item, "documentId", "docId", "id")
            )
            .filter((id) => id !== undefined && id !== null && String(id).trim() !== "");
    }

    if (payload && typeof payload === "object") {
        for (const key of ["documents", "docs", "attachments", "response", "data", "result"]) {
            const nested = fieldValue(payload, key);
            if (Array.isArray(nested) || typeof nested === "string") {
                return getDocumentIds(nested);
            }
            if (nested && typeof nested === "object") return getDocumentIds(nested);
        }
    }

    throw new Error("The documents service returned an invalid response.");
}

async function fetchRequestDocuments(serviceRequestId) {
    if (!hasApiKey) throw new Error("Missing REACT_APP_APPIAN_API_KEY");

    const url = new URL(ENDPOINTS.requestDocuments);
    url.searchParams.set("serviceReqId", serviceRequestId);
    const response = await fetch(url.toString(), {
        headers: { Accept: "application/json", "Appian-API-Key": API_KEY },
    });
    if (!response.ok) throw new Error(`Attachments request failed (${response.status}).`);
    return getDocumentIds(await response.json());
}

async function fetchDocumentAttachment(documentId) {
    if (!hasApiKey) throw new Error("Missing REACT_APP_APPIAN_API_KEY");

    const url = new URL(`${ENDPOINTS.documentDownload}/${encodeURIComponent(documentId)}`);
    url.searchParams.set("attachment", "true");
    const response = await fetch(url.toString(), {
        headers: { Accept: "*/*", "Appian-API-Key": API_KEY },
    });
    if (!response.ok) throw new Error(`Image request failed (${response.status}).`);

    return {
        blob: await response.blob(),
        contentType: response.headers.get("Content-Type"),
    };
}

async function getImageMimeType(blobType, blob) {
    const mimeType = String(blobType || "").split(";")[0].trim().toLowerCase();
    if (mimeType.startsWith("image/")) return mimeType;

    const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    const startsWith = (...signature) =>
        signature.every((byte, index) => bytes[index] === byte);
    const startsWithAt = (offset, ...signature) =>
        signature.every((byte, index) => bytes[offset + index] === byte);

    if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
    if (startsWith(0xff, 0xd8, 0xff)) return "image/jpeg";
    if (startsWith(0x47, 0x49, 0x46, 0x38, 0x37, 0x61) || startsWith(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)) {
        return "image/gif";
    }
    if (startsWith(0x52, 0x49, 0x46, 0x46) && startsWithAt(8, 0x57, 0x45, 0x42, 0x50)) {
        return "image/webp";
    }
    if (startsWith(0x42, 0x4d)) return "image/bmp";

    const prefix = (await blob.slice(0, 256).text()).trimStart().toLowerCase();
    if (prefix.startsWith("<svg") || (prefix.startsWith("<?xml") && prefix.includes("<svg"))) {
        return "image/svg+xml";
    }
    return "";
}

function RequestAttachmentImage({ documentId }) {
    const [imageUrl, setImageUrl] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        let objectUrl = "";

        const loadImage = async () => {
            try {
                const { blob, contentType } = await fetchDocumentAttachment(documentId);
                if (!blob.size) throw new Error("The image returned by Appian is empty.");
                const mimeType = await getImageMimeType(
                    contentType || blob.type,
                    blob
                );
                if (!mimeType) throw new Error("This attachment is not an image.");

                if (!cancelled) {
                    objectUrl = URL.createObjectURL(new Blob([blob], { type: mimeType }));
                    setImageUrl(objectUrl);
                }
            } catch (loadError) {
                if (!cancelled) setError(loadError.message || "Unable to load this image.");
            }
        };

        loadImage();
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [documentId]);

    if (error) return <p className="agent-image-error" role="alert">{error}</p>;
    if (!imageUrl) return <p className="agent-image-status" role="status">Loading image…</p>;

    return (
        <a className="agent-request-image-link" href={imageUrl} target="_blank" rel="noreferrer">
            <img className="agent-request-image" src={imageUrl} alt="Service request attachment" />
        </a>
    );
}

function RequestAttachments({ serviceRequestId }) {
    const [documentIds, setDocumentIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        const loadAttachments = async () => {
            setLoading(true);
            setError("");
            setDocumentIds([]);
            try {
                const ids = await fetchRequestDocuments(serviceRequestId);
                if (!cancelled) setDocumentIds(ids);
            } catch (loadError) {
                if (!cancelled) setError(loadError.message || "Unable to load request images.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        if (serviceRequestId) loadAttachments();
        else {
            setError("Service request ID is missing.");
            setLoading(false);
        }

        return () => { cancelled = true; };
    }, [serviceRequestId]);

    return (
        <div className="agent-detail-card agent-request-attachments">
            <h3><ClipboardList size={15} /> Request Images</h3>
            {loading && <p className="agent-image-status" role="status">Loading images…</p>}
            {error && <p className="agent-image-error" role="alert">{error}</p>}
            {!loading && !error && documentIds.length === 0 && <p>No images attached.</p>}
            {!loading && !error && documentIds.length > 0 && (
                <div className="agent-request-image-grid">
                    {documentIds.map((documentId, index) => (
                        <RequestAttachmentImage key={`${documentId}-${index}`} documentId={documentId} />
                    ))}
                </div>
            )}
        </div>
    );
}

// Some endpoints return a bare array, others wrap it in an object.
async function fetchServiceRequests(orgId) {
    const data = await getJson(ENDPOINTS.serviceRequests, { orgId });
    console.log("Service Requests:", data);
    const rows = Array.isArray(data)
        ? data
        : [data?.response, data?.requests, data?.data, data?.results, data?.items].find(Array.isArray);
    if (!rows) throw new Error("The service request API returned an invalid response.");
    return rows;
}

const fetchCustomer = (custId) => getJson(ENDPOINTS.customerDetails, { custId });
const fetchRequestDetails = (id) => getJson(ENDPOINTS.serviceRequest, { id });

async function fetchList(endpoint, params, label) {
    const data = await getJson(endpoint, params);
    if (!Array.isArray(data)) throw new Error(`${label} lookup returned an invalid response.`);
    return data;
}
const fetchServices = (orgId) => fetchList(ENDPOINTS.services, { orgId }, "Service");
const fetchSubServices = (serviceId) =>
    fetchList(ENDPOINTS.subServices, { serviceId }, "Sub-service");

async function createTicketRequest(payload) {
    if (!hasApiKey) throw new Error("Missing REACT_APP_APPIAN_API_KEY");
    console.log("Creating ticket with payload:", payload);

    const response = await fetch(ENDPOINTS.ticket, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Appian-API-Key": API_KEY,
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Ticket creation failed (${response.status})`);
    
    // The API may answer with empty or non-JSON text, so parse defensively.
    const text = await response.text();
    let data = {};
    try {
        data = text ? JSON.parse(text) : {};
        console.log("Ticket creation response:", data);
    } catch {
        if (!response.ok) throw new Error(text || `Ticket creation failed (${response.status})`);
    }

    const message = data.message || data.Message;
    if (!response.ok) throw new Error(message || `Ticket creation failed (${response.status})`);
    if (data.success === false || data.Success === false) {
        throw new Error(message || "Ticket creation was rejected by the service.");
    }
    return data;
}

/* ================================================================== */
/* PART 2: HELPER FUNCTIONS (pure logic, no React, no network)         */
/* ================================================================== */
const PRIORITIES = ["Low", "Normal", "High", "Urgent"];

const clean = (status) => String(status ?? "").trim().toUpperCase();
const isNewRequest = (r) => ["NEW", "UNDER REVIEW"].includes(clean(r.status));
const isTicketCreated = (r) =>
    Boolean(r.ticketCreated || (r.ticketId !== null && r.ticketId !== undefined && String(r.ticketId).trim())) ||
    clean(r.status) === "TECHNICIAN ASSIGNED";

// First value that is not null / undefined / empty string.
const firstValue = (...values) =>
    values.find((v) => v !== null && v !== undefined && String(v).trim() !== "");

const normalizeFieldName = (value) => String(value).replace(/[^a-z0-9]/gi, "").toLowerCase();

function fieldValue(record, ...names) {
    if (!record || typeof record !== "object") return undefined;
    const directValue = firstValue(...names.map((name) => record[name]));
    if (directValue !== undefined) return directValue;

    const normalizedNames = new Set(names.map(normalizeFieldName));
    const matchingEntry = Object.entries(record).find(
        ([name, value]) =>
            normalizedNames.has(normalizeFieldName(name)) &&
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ""
    );
    return matchingEntry?.[1];
}

function formatDate(value) {
    if (!value) return "—";

    // "2024-05-17..." is parsed by hand to avoid timezone shifts.
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    const date = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);

    return Number.isNaN(date.getTime())
        ? "Invalid Date"
        : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const formatLocation = (city, state, country) =>
    [city, state, country].filter(Boolean).join(", ") || "—";

// APIs wrap their payload differently ({response}, {data}, [..]). Dig out the record.
function unwrapApiRecord(data, extraKeys = []) {
    if (Array.isArray(data)) return data[0] || {};
    if (!data || typeof data !== "object") return {};
    for (const key of ["response", "data", "result", "item", "customerDetails", "serviceRequest", ...extraKeys]) {
        const nested = fieldValue(data, key);
        if (nested && typeof nested === "object") return unwrapApiRecord(nested, extraKeys);
    }
    return data;
}

const productIdOf = (p) =>
    p?.customerProductId ?? p?.CustomerProductId ?? p?.customerProductID ??
    p?.CustomerProductID ?? p?.custproduct_ID ?? p?.custproductId ??
    p?.custproduct_id ?? p?.id;

function customerNameOf(request, customer) {
    const fullName = (first, last) => [first, last].filter(Boolean).join(" ");
    return (
        firstValue(
            typeof customer === "object" && customer
                ? fullName(
                      fieldValue(customer, "firstName"),
                      fieldValue(customer, "lastName")
                  )
                : typeof customer === "string" && !/^\d+$/.test(customer.trim())
                    ? customer
                    : undefined,
            fieldValue(customer, "name", "customerName", "fullName", "customerFullName", "custName"),
            fieldValue(request, "customerName", "fullName", "customerFullName", "custName"),
            fullName(fieldValue(request, "firstName"), fieldValue(request, "lastName")),
            fieldValue(customer, "email"),
            fieldValue(request, "email")
        ) ?? "—"
    );
}

// Turns any shape the API returns into one predictable object the UI can rely on.
function normalizeRequest(request) {
    const customer = fieldValue(request, "customer", "customerDetails");
    const linkedProduct = fieldValue(request, "customerProduct");
    const customerProducts = Array.isArray(customer?.customerProduct) ? customer.customerProduct : [];

    const serviceRequestId = fieldValue(request, "serviceRequestId", "requestId", "reqid", "id");

    const customerProductId =
        productIdOf(request) ??
        productIdOf(linkedProduct) ??
        (customerProducts.length === 1 ? productIdOf(customerProducts[0]) : undefined);

    const organization = fieldValue(request, "organization");
    const organizationId = fieldValue(request, "organizationId", "organaizationId") ??
        fieldValue(organization, "organizationId", "id");

    const productName = customerProducts.find(
        (p) => String(productIdOf(p)) === String(customerProductId)
    )?.product?.productName;

    return {
        ...request,
        id: serviceRequestId ?? request.requestNumber ?? request.RequestNumber,
        serviceRequestId,
        ticketId: fieldValue(request, "ticketId", "serviceTicketId", "serviceTicketNumber", "ticketNumber"),
        customerProductId,
        organizationId,
        requestNumber:
            fieldValue(request, "requestNumber", "serviceRequestNumber") ?? serviceRequestId ?? "—",
        status: clean(fieldValue(request, "status") ?? ""),
        issueCategory: fieldValue(request, "issueCategory", "category") ?? "Other",
        issueTitle: fieldValue(request, "issueTitle", "title") ?? "Untitled request",
        description: fieldValue(request, "issueDescription", "description") ?? "—",
        customerProduct: productName || fieldValue(linkedProduct?.product, "productName") || "Product not linked",
        warrantyMonth: fieldValue(linkedProduct?.product, "warrantyMonth") ?? null,
        customer: customerNameOf(request, customer),
        customerId:
            fieldValue(request, "customerId", "custId") ??
            fieldValue(customer, "customerId", "custId") ??
            (typeof customer === "number" || (typeof customer === "string" && /^\d+$/.test(customer.trim()))
                ? customer
                : "—"),
        email:
            fieldValue(request, "email") ?? fieldValue(customer, "email", "customerEmail", "emailAddress") ?? "—",
        mobile:
            fieldValue(request, "mobile", "phone", "contactNumber") ??
            fieldValue(customer, "contactNumber", "mobile", "mobileNumber", "phoneNumber", "contactNo") ??
            "—",
        city: fieldValue(request, "city") ?? fieldValue(customer, "city") ?? "—",
        state: fieldValue(request, "state") ?? fieldValue(customer, "state") ?? "—",
        country: fieldValue(request, "country") ?? fieldValue(customer, "country"),
        requestRaisedOn: fieldValue(
            request, "RequestRaisedOn", "requestDate", "serviceRequestDate",
            "createdOn", "createdAt", "createdDate", "dateCreated"
        ),
    };
}

// FIX 1 — "ghost" requests.
// The ticket API adds an empty record (no title, no customer, no product) to the
// request list every time a ticket is created. Real requests always have at least
// a title, customer or product, so rows that have none of them are hidden.
const isPlaceholderRequest = (r) =>
    r.issueTitle === "Untitled request" &&
    r.description === "—" &&
    r.customer === "—" &&
    r.customerId === "—" &&
    r.customerProduct === "Product not linked" &&
    !isTicketCreated(r);

function requestRowKey(request) {
    const id = firstValue(request.serviceRequestId, request.id);
    if (id !== undefined && id !== "—") return `id:${String(id).trim()}`;
    const number = firstValue(request.requestNumber);
    if (number !== undefined && number !== "—") return `no:${String(number).trim()}`;
    return `ticket:${String(request.ticketId ?? "unknown")}`;
}

// Merge extra customer / request details into a request, then normalize again.
function mergeDetails(base, customerData, requestData) {
    const hasExtra = customerData || requestData?.customer;
    return normalizeRequest({
        ...base,
        ...requestData,
        customer: hasExtra
            ? { ...customerData, ...(requestData?.customer || {}) }
            : base.customer,
        customerId:
            requestData?.customerId ?? requestData?.CustomerId ??
            customerData?.customerId ?? customerData?.CustomerId ?? base.customerId,
    });
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

function getAgentDisplayName(user) {
    const email = fieldValue(user, "email");
    const emailUserName =
        typeof email === "string" && email.includes("@")
            ? email.slice(0, email.lastIndexOf("@"))
            : undefined;
    const firstName = fieldValue(user, "firstName", "givenName");
    const lastName = fieldValue(user, "lastName", "familyName");
    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    return firstValue(
        emailUserName,
        fieldValue(user, "name", "displayName", "fullName", "userName", "agentName"),
        fullName,
        "Service Agent"
    );
}

function getAgentInitials(name) {
    const parts = name.trim().split(/[^a-zA-Z0-9]+/).filter(Boolean);
    return (parts.length > 1
        ? parts.slice(0, 2).map((part) => part[0]).join("")
        : (parts[0] || "").slice(0, 2)
    ).toUpperCase();
}

function ServiceAgentHeader({ user, onLogout }) {
    const displayName = getAgentDisplayName(user);

    return (
        <header className="agent-user-header">
            <span className="agent-user-name">Service Agent</span>
            <div className="agent-user-actions">
                {user?.email && (
                    <span className="agent-user-avatar" title={`Signed in as ${user.email}`} aria-hidden="true">
                        {getAgentInitials(displayName)}
                    </span>
                )}
                <span className="agent-user-display-name">{displayName}</span>
                {onLogout && (
                    <button className="agent-logout-button" type="button" onClick={onLogout}>
                        Log out
                    </button>
                )}
            </div>
        </header>
    );
}

function StatCard({ color, icon, label, value, hint }) {
    return (
        <article className={`agent-stat agent-stat--${color}`}>
            <span>{icon} {label}</span>
            <strong>{value}</strong>
            <small>{hint}</small>
        </article>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <small>{label}</small>
            <strong>{children}</strong>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

// Remembers the selected tab per user in localStorage.
function useSavedTab(user) {
    const storageKey = `servicedesk-service-agent-tab:${String(user?.email || "demo").toLowerCase()}`;
    const [tab, setTab] = useState(() => {
        const saved = localStorage.getItem(storageKey);
        return ["requests", "tickets"].includes(saved) ? saved : "requests";
    });
    const changeTab = (next) => {
        setTab(next);
        localStorage.setItem(storageKey, next);
    };
    return [tab, changeTab];
}

// For each request, fill in a missing customer name / raised-on date from the detail APIs.
async function enrichRequest(item) {
    const needCustomer = item.customer === "—" && item.customerId !== "—";
    const needRequest = !item.requestRaisedOn && item.serviceRequestId;
    if (!needCustomer && !needRequest) return item;

    const safe = async (promise, key) => {
        try {
            return unwrapApiRecord(await promise, [key, "serviceRequest"]);
        } catch (error) {
            console.warn(`Could not load ${key} for request ${item.requestNumber}:`, error);
            return undefined;
        }
    };
    const [customer, request] = await Promise.all([
        needCustomer ? safe(fetchCustomer(item.customerId), "customer") : undefined,
        needRequest ? safe(fetchRequestDetails(item.serviceRequestId), "request") : undefined,
    ]);
    return mergeDetails(item, customer, request);
}

// Loads and keeps the list of service requests. Call reload() to refetch.
function useServiceRequests(orgId) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError("");
            try {
                const rows = await fetchServiceRequests(orgId);
                const realRows = rows.map(normalizeRequest).filter((r) => !isPlaceholderRequest(r));
                const enriched = await Promise.all(realRows.map(enrichRequest));
                if (!cancelled) setItems(enriched);
            } catch (e) {
                if (!cancelled) setError(e.message || "Could not load service requests.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [orgId, refreshKey]);

    return { items, setItems, loading, error, reload: () => setRefreshKey((k) => k + 1) };
}

/* ------------------------------------------------------------------ */
/* "Create Service Ticket" modal                                       */
/* ------------------------------------------------------------------ */

function TicketModal({ request: initialRequest, user, onClose, onCreated }) {
    const [request, setRequest] = useState(initialRequest);
    const [services, setServices] = useState([]);
    const [subServices, setSubServices] = useState([]);
    const [service, setService] = useState("");
    const [subService, setSubService] = useState("");
    const [priority, setPriority] = useState("");
    const [servicesLoading, setServicesLoading] = useState(false);
    const [subServicesLoading, setSubServicesLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false); // instant guard against double clicks / Enter twice
    const [error, setError] = useState("");

    // 1) Load the list of services for this organization.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!request.organizationId) {
                setError("The selected request has no organization ID.");
                return;
            }
            setServicesLoading(true);
            try {
                const data = await fetchServices(request.organizationId);
                if (!cancelled) setServices(data);
            } catch (e) {
                if (!cancelled) setError(e.message || "Could not load services.");
            } finally {
                if (!cancelled) setServicesLoading(false);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 2) Load fuller customer / request details to show in the modal.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { customerId, serviceRequestId } = initialRequest;
            try {
                const [customer, details] = await Promise.all([
                    customerId && customerId !== "—" ? fetchCustomer(customerId) : undefined,
                    serviceRequestId ? fetchRequestDetails(serviceRequestId) : undefined,
                ]);
                if (cancelled) return;
                setRequest((current) =>
                    mergeDetails(
                        current,
                        customer && unwrapApiRecord(customer, ["customer"]),
                        details && unwrapApiRecord(details, ["request", "serviceRequest"])
                    )
                );
            } catch (e) {
                console.warn("Could not load request details:", e);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 3) Whenever a service is picked, load its sub-services.
    useEffect(() => {
        if (!service) {
            setSubServices([]);
            return undefined;
        }
        let cancelled = false;
        (async () => {
            setSubServicesLoading(true);
            setError("");
            try {
                const data = await fetchSubServices(service);
                if (!cancelled) setSubServices(data);
            } catch (e) {
                if (!cancelled) setError(e.message || "Could not load sub-services.");
            } finally {
                if (!cancelled) setSubServicesLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [service]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (submittingRef.current || !service || !subService || !priority) return;

        const payload = {
            organizationId: Number(request.organizationId),
            customerProductId: Number(request.customerProductId),
            serviceRequestId: Number(request.serviceRequestId),
            serviceId: Number(service),
            subServiceId: Number(subService),
            priority,
            createdBy: user?.email || "",
        };

        // Every ID must be a positive number before we call the API.
        const labels = {
            organizationId: "organization",
            customerProductId: "customer product",
            serviceRequestId: "service request",
            serviceId: "service",
            subServiceId: "sub-service",
        };
        const invalid = Object.keys(labels).filter((k) => !Number.isFinite(payload[k]) || payload[k] <= 0);
        if (invalid.length) {
            setError(`The selected request is missing a valid ${invalid.map((k) => labels[k]).join(", ")} ID required to create a ticket.`);
            return;
        }

        submittingRef.current = true;
        setSubmitting(true);
        setError("");
        try {
            const result = await createTicketRequest(payload);
            console.log("Ticket creating with payload:", payload);
            onCreated(request, result, {
                service: services.find((item) => String(item.id) === service)?.serviceName,
                subService: subServices.find((item) => String(item.id) === subService)?.subServiceName,
                priority, 
            });
            
        } catch (e) {
            setError(e.message || "Could not create the ticket.");
            console.error("Could not create ticket:", e);
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    return (
        <div
            className="agent-modal-backdrop"
            role="presentation"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <section className="agent-modal" role="dialog" aria-modal="true" aria-labelledby="agent-modal-title">
                <div className="agent-hero">
                    <div>
                        <span className="agent-kicker">{request.requestNumber} · RELATED ACTION</span>
                        <h2 id="agent-modal-title"><Ticket size={20} /> Create Service Ticket</h2>
                        <p>
                            Review the customer request, classify the service and set priority.
                            The ticket is made available to technicians.
                        </p>
                    </div>
                    <button className="agent-icon-button" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="agent-detail-card">
                        <h3><UserRound size={15} /> Customer Details</h3>
                        <div className="agent-detail-grid">
                            <Field label="Customer ID">{request.customerId}</Field>
                            <Field label="Customer Name">{request.customer}</Field>
                            <Field label="Email">{request.email}</Field>
                            <Field label="Mobile">{request.mobile}</Field>
                            <Field label="City">{request.city}</Field>
                            <Field label="State">{request.state}</Field>
                        </div>
                    </div>

                    <div className="agent-detail-card">
                        <h3><ClipboardList size={15} /> Service Request Details</h3>
                        <div className="agent-detail-grid">
                            <Field label="Request Number">{request.requestNumber}</Field>
                            <Field label="Issue Category">{request.issueCategory}</Field>
                            <Field label="Issue Title">{request.issueTitle}</Field>
                            {/* <Field label="Warranty Status">{request.warrantyMonth}</Field> */}
                            <Field label="Created On">{formatDate(request.requestRaisedOn)}</Field>
                            <Field label={<><MapPin size={11} /> Location</>}>
                                {formatLocation(request.city, request.state, request.country)}
                            </Field>
                            <Field label="Current Status">{request.status}</Field>
                            <Field label="Product">{request.customerProduct}</Field>
                        </div>
                        <div className="agent-description">
                            <small>Issue Description</small>
                            <p>{request.description}</p>
                        </div>
                    </div>

                    <RequestAttachments serviceRequestId={request.serviceRequestId} />

                    <div className="agent-detail-card">
                        <h3><PlusCircle size={15} /> Ticket Details</h3>
                        <div className="agent-form-grid">
                            <label>
                                <span>Service <em>*</em></span>
                                <select
                                    required
                                    disabled={servicesLoading}
                                    value={service}
                                    onChange={(e) => {
                                        setService(e.target.value);
                                        setSubService("");
                                        setSubServices([]);
                                    }}
                                >
                                    <option value="">{servicesLoading ? "Loading Services..." : "Select Service"}</option>
                                    {services.map((o) => (
                                        <option key={o.id} value={o.id}>{o.serviceName}</option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                <span>Sub Service <em>*</em></span>
                                <select
                                    required
                                    disabled={!service || subServicesLoading}
                                    value={subService}
                                    onChange={(e) => setSubService(e.target.value)}
                                >
                                    <option value="">{subServicesLoading ? "Loading Sub Services..." : "Select Sub Service"}</option>
                                    {subServices.map((o) => (
                                        <option key={o.id} value={o.id}>{o.subServiceName}</option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                <span>Priority <em>*</em></span>
                                <select required value={priority} onChange={(e) => setPriority(e.target.value)}>
                                    <option value="">Select Priority</option>
                                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                                </select>
                            </label>
                        </div>
                        {error && <p className="agent-form-error" role="alert">{error}</p>}
                    </div>

                    <div className="agent-modal-actions">
                        <button type="button" className="agent-cancel-btn" onClick={onClose}>
                            <X size={14} /> Cancel
                        </button>
                        <button
                            type="submit"
                            className="agent-create-btn"
                            disabled={submitting || servicesLoading || subServicesLoading}
                        >
                            <Ticket size={14} /> {submitting ? "Creating..." : "Create Ticket"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Table rows for each tab                                             */
/* ------------------------------------------------------------------ */

const REQUEST_COLUMNS = [
    "Service Request ID", "Request Raised On", "Customer", "Customer Product",
    "Issue Category", "Issue Title", "Status", "Actions",
];
const TICKET_COLUMNS = [
    "Ticket ID", "Service Request ID", "Customer",
    "Priority", "Assigned To", "Status", "Created On",
];

function RequestRow({ item, onReview }) {
    return (
        <tr>
            <td className="agent-id">{item.requestNumber}</td>
            <td>{formatDate(item.requestRaisedOn)}</td>
            <td>{item.customer}</td>
            <td>{item.customerProduct}</td>
            <td>{item.issueCategory}</td>
            <td>{item.issueTitle}</td>
            
            <td><span className="agent-pill is-amber">{item.status}</span></td>
            <td>
                <button className="agent-review-btn" onClick={() => onReview(item)}>
                    Review & Create
                </button>
            </td>
        </tr>
    );
}

function TicketRow({ item }) {
    const isUrgent = item.priority === "High" || item.priority === "Urgent";
    return (
        <tr>
            <td className="agent-id">{item.ticketId || item.requestNumber}</td>
            <td>{item.requestNumber}</td>
            <td>{item.customer}</td>
            <td>
                <span className={`agent-pill ${isUrgent ? "is-red" : "is-blue"}`}>
                    {item.priority || "—"}
                </span>
            </td>
            <td>{item.serviceTicket?.user?.email || "—"}</td>
            <td><span className="agent-pill is-green">{item.status}</span></td>
            <td>{item.createdOn ? new Date(item.createdOn).toLocaleString() : "—"}</td>
        </tr>
    );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function ServiceAgent({ user, onNavigate, onLogout }) {
    const orgId = user?.organizationId ?? user?.orgId ?? 1;

    const [activeTab, changeTab] = useSavedTab(user);
    const { items, setItems, loading, error, reload } = useServiceRequests(orgId);
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [selected, setSelected] = useState(null); // request open in the modal
    const [notice, setNotice] = useState("");
    const [createdTickets, setCreatedTickets] = useState([]);

    const isRequestsTab = activeTab === "requests";
    const mergedItems = [...items];
    createdTickets.forEach((createdTicket) => {
        const index = mergedItems.findIndex((item) =>
            String(item.serviceRequestId ?? item.id) === String(createdTicket.serviceRequestId ?? createdTicket.id)
        );
        if (index === -1) mergedItems.push(createdTicket);
        else mergedItems[index] = { ...mergedItems[index], ...createdTicket };
    });
    const newRequests = mergedItems.filter(isNewRequest);
    const tickets = mergedItems.filter(isTicketCreated);
    const totalRequests = newRequests.length;
    const source = isRequestsTab ? newRequests : tickets;
    const visibleRows = source.filter((item) => {
        const text = `${item.requestNumber} ${item.customer} ${item.issueTitle} ${item.issueCategory} `.toLowerCase();
        const matchesSearch = text.includes(query.toLowerCase());
        const matchesStatus = statusFilter === "All" || item.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const switchTab = (tab) => {
        changeTab(tab);
        setStatusFilter("All");
    };

    const handleTicketCreated = (request, result, details) => {
        const responseRecord = unwrapApiRecord(result, ["ticket"]);
        const createdTicket = normalizeRequest({
            ...request,
            ...responseRecord,
            ticketId: fieldValue(responseRecord, "ticketId", "serviceTicketId", "serviceTicketNumber", "ticketNumber") ??
                fieldValue(result, "ticketId", "serviceTicketId", "serviceTicketNumber", "ticketNumber"),
            status: fieldValue(responseRecord, "status") ?? "TECHNICIAN ASSIGNED",
            ...details,
            createdOn: fieldValue(responseRecord, "createdOn", "createdAt", "dateCreated") ?? new Date().toISOString(),
        });
        setCreatedTickets((current) => [
            ...current.filter((item) => String(item.serviceRequestId ?? item.id) !== String(createdTicket.serviceRequestId ?? createdTicket.id)),
            createdTicket,
        ]);
        setItems((current) => current.map((item) =>
            String(item.serviceRequestId ?? item.id) === String(createdTicket.serviceRequestId ?? createdTicket.id)
                ? { ...item, ...createdTicket }
                : item
        ));
        setSelected(null);
        switchTab("tickets");
        reload();
        setNotice(`Ticket created successfully for ${request.requestNumber} and sent to available technicians.`);
    };

    const emptyTitle = loading ? "Loading service requests" : error ? "Could not load requests" : "No items available";
    const emptyText = error || (isRequestsTab ? "Try changing your search or filter." : "Create a ticket from a service request to see it here.");

    return (
        <main className="sd-main agent-workspace">
            <section className="agent-hero">
                <div>
                    <ServiceAgentHeader user={user} onLogout={onLogout} />
                    <span className="agent-kicker">SERVICE OPERATIONS / AGENT CONSOLE</span>
                    <h1>Agent Workspace</h1>
                    <p>Review incoming service requests and convert them into service tickets for technician assignment.</p>
                </div>
                <span className="agent-hero-icon"><ClipboardList size={30} /></span>
            </section>

            {notice && (
                <div className="agent-notice">
                    <CheckCircle2 size={17} />
                    {notice}
                    <button onClick={() => setNotice("")} aria-label="Dismiss"><X size={16} /></button>
                </div>
            )}

            <section className="agent-stats">
                <StatCard color="green" icon={<ClipboardList size={17} />} label="Total Service Requests"
                    value={totalRequests} hint="Requests logged by customers" />
                <StatCard color="blue" icon={<Ticket size={17} />} label="Tickets Created"
                    value={tickets.length} hint="Requests converted into tickets" />
                <StatCard color="amber" icon={<Clock3 size={17} />} label="Tickets Processed"
                    value={tickets.length} hint="Requests reviewed by the agent" />
            </section>

            <div className="agent-tabs">
                <button className={isRequestsTab ? "is-active" : ""} onClick={() => switchTab("requests")}>
                    <ClipboardList size={15} /> Service Requests <span>{totalRequests}</span>
                </button>
                <button className={!isRequestsTab ? "is-active" : ""} onClick={() => switchTab("tickets")}>
                    <Ticket size={15} /> Service Tickets <span>{tickets.length}</span>
                </button>
            </div>

            <section className="agent-table-card">
                <div className="agent-toolbar">
                    <label className="agent-search">
                        <Search size={17} />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={isRequestsTab ? "Search service requests" : "Search service tickets"}
                        />
                    </label>
                    <select aria-label="Filter status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="All">All statuses</option>
                        {(isRequestsTab
                            ? ["NEW", "UNDER REVIEW"]
                            : [...new Set(tickets.map((ticket) => ticket.status).filter(Boolean))]
                        ).map((s) => (
                            <option key={s}>{s}</option>
                        ))}
                    </select>
                    <button
                        className="agent-icon-button"
                        title="Refresh"
                        disabled={loading}
                        onClick={() => {
                            setQuery("");
                            setStatusFilter("All");
                            reload();
                        }}
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                <div className="agent-table-scroll">
                    <table className="agent-table">
                        <thead>
                            <tr>
                                {(isRequestsTab ? REQUEST_COLUMNS : TICKET_COLUMNS).map((h) => <th key={h}>{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.map((item) =>
                                isRequestsTab
                                    ? <RequestRow key={requestRowKey(item)} item={item} onReview={setSelected} />
                                    : <TicketRow key={requestRowKey(item)} item={item} />
                            )}
                        </tbody>
                    </table>

                    {visibleRows.length === 0 && (
                        <div className="agent-empty">
                            {loading ? <RefreshCw size={24} /> : <Search size={24} />}
                            <strong>{emptyTitle}</strong>
                            <span>{emptyText}</span>
                        </div>
                    )}
                </div>

                <div className="agent-table-footer">
                    Showing {visibleRows.length} of {source.length} {isRequestsTab ? "requests" : "tickets"}
                </div>
            </section>

            {selected && (
                <TicketModal
                    key={selected.id}
                    request={selected}
                    user={user}
                    onClose={() => setSelected(null)}
                    onCreated={handleTicketCreated}
                />
            )}

            {onNavigate && (
                <div className="agent-back-link">
                    <CalendarDays size={14} /> Service operations workspace{" "}
                    <button onClick={() => onNavigate("home")}>Back to customer portal</button>
                </div>
            )}
        </main>
    );
}