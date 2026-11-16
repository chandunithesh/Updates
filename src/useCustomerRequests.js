import { useEffect, useState } from "react";

const REQUESTS_RAISED_API =
  "https://techtamminaapps.appiancloud.com/suite/webapi/iOdIEw";

const dateOnly = (value) => (value ? String(value).slice(0, 10) : "");

const normalizeRequest = (request) => {
  const organization = request.organization || {};
  const customer = request.customer || request.customerDetails || {};
  const serviceRequestId =
    request.serviceRequestId ??
    request.serviceRequestID ??
    request.ServiceRequestId ??
    request.ServiceRequestID ??
    request.requestId ??
    request.reqid ??
    request.id;

  return {
    id: String(
      request.requestNumber ??
        request.RequestNumber ??
        request.serviceRequestNumber ??
        request.ServiceRequestNumber ??
        serviceRequestId ??
        "",
    ),
    serviceRequestId,
    organizationId:
      request.organizationId ??
      request.organizationID ??
      request.OrganizationId ??
      request.OrganizationID ??
      request.orgId ??
      request.organaizationId ??
      organization.organizationId ??
      organization.OrganizationId ??
      organization.OrganizationID ??
      organization.id,
    customerId:
      request.customerId ??
      request.CustomerId ??
      request.CustomerID ??
      request.custId ??
      customer.customerId ??
      customer.CustomerId ??
      customer.CustomerID ??
      customer.custId,
    title: request.issueTitle || "Untitled request",
    description: request.issueDescription || request.description || "",
    category: request.issueCategory || request.otherIssueCategory || "Other",
    location:
      [
        request.address,
        request.city,
        request.state,
        request.pincode ?? request.zip,
        request.country,
      ]
        .filter(Boolean)
        .join(", ") ||
      request.location ||
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
  };
};

export default function useCustomerRequests(user) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchRequests = async () => {
      try {
        const customerId =
          localStorage.getItem("customerId") || user?.customerId;
        if (!customerId && user?.isDemo) {
          setRequests([]);
          setError("");
          return;
        }
        const apiKey = process.env.REACT_APP_APPIAN_API_KEY;
        if (!apiKey?.trim()) {
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
            "Appian-API-Key": apiKey.trim(),
            Accept: "application/json",
          },
        });
        if (!response.ok) {
          throw new Error(`Could not load requests (${response.status}).`);
        }

        const result = await response.json();
        if (result?.Success !== true || !Array.isArray(result.response)) {
          throw new Error("Requests service returned an invalid response.");
        }
        if (!cancelled) {
          setRequests(result.response.map(normalizeRequest));
          setError("");
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message || "Could not load service requests.");
          console.error("Error fetching requests:", fetchError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRequests();
    return () => {
      cancelled = true;
    };
  }, [user?.customerId, user?.isDemo]);

  return { requests, loading, error };
}
