import React, { useState } from "react";
import { CheckCircle2, ClipboardList, Clock3, Loader2, User } from "lucide-react";
import "../technician/Technician.css";

const AVAILABILITY_URL =
  "https://techtamminaapps.appiancloud.com/suite/webapi/updatingAvailability";
const API_KEY = process.env.REACT_APP_APPIAN_API_KEY;

const getTechnicianId = (user) =>
  user?.technicianId || user?.technicianID || user?.id || user?.customerId || user?.email;

const getTechnicianName = (user) => {
  const email = String(user?.email || "").trim();
  const emailUserName = email.includes("@")
    ? email.slice(0, email.lastIndexOf("@"))
    : "";
  const fullName = [
    user?.firstName || user?.FirstName,
    user?.lastName || user?.LastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    emailUserName ||
    user?.name ||
    user?.displayName ||
    user?.fullName ||
    fullName ||
    "Technician"
  );
};

export default function TechnicianHeader({ user, onLogout, onClockIn }) {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [longitude, setLongitude] = useState(null);
  const [latitude, setLatitude] = useState(null);
  const toggleAvailability = async () => {
    setIsUpdating(true);
    setAvailabilityError("");

    try {
      if (!API_KEY?.trim()) {
        throw new Error("Missing REACT_APP_APPIAN_API_KEY");
      }
      const {latitude, longitude} = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation is not supported by this browser."));
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            reject(error);
          }
        );
      });

      setLatitude(latitude);
      setLongitude(longitude);

      const nextAvailability = !isClockedIn;
      const response = await fetch(AVAILABILITY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Appian-API-Key": API_KEY.trim(),
        },
        body: JSON.stringify({
          technicianId: getTechnicianId(user),
          email: user?.email,
          availability: nextAvailability,
          isAvailable: nextAvailability,
          currentLatitude: latitude,
          currentLongitude: longitude,
        }),
      
      }
    );
    console.log("Updating availability with payload:", {
        technicianId: getTechnicianId(user),
        email: user?.email,
        availability: nextAvailability,
        isAvailable: nextAvailability,
        currentLatitude: latitude,
        currentLongitude: longitude,
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed with status ${response.status}`);
      }

      setIsClockedIn(nextAvailability);
      if (nextAvailability) onClockIn?.();
    } catch (error) {
      setAvailabilityError(error.message || "Could not update availability.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <section className="tech-brand-hero">
      <div className="tech-brand-identity">
        <div className="tech-brand-mark">
          <ClipboardList size={40} strokeWidth={1.4} />
        </div>
        <div>
          <h1 className="tech-brand-title">Feild Flow FSM</h1>
          {/* <p className="tech-brand-subtitle">FSM</p> */}
        </div>
      </div>
      <div className="tech-availability">
        <span className={isClockedIn ? "is-available" : "is-unavailable"}>
          <Clock3 size={14} /> {isClockedIn ? "Clocked In" : "Not Clocked In"}
        </span>
        <button
          type="button"
          className="tech-clock-btn"
          onClick={toggleAvailability}
          disabled={isUpdating}
          aria-label={isClockedIn ? "Clock out" : "Clock in"}
        >
          {isUpdating ? <Loader2 className="tech-spin" size={14} /> : isClockedIn ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
          {isUpdating ? "Updating" : isClockedIn ? "Clock Out" : "Clock In"}
        </button>
        {availabilityError && <span className="tech-availability-error">{availabilityError}</span>}
      </div>
      <div className="tech-profile">
        <User size={28} fill="currentColor" />
        <div className="tech-profile-details">
          <strong>{getTechnicianName(user)}</strong>
        </div>
      </div>
      <div className="tech-profile-actions">
        {onLogout && (
          <button type="button" className="tech-header-logout" onClick={onLogout}>
            Sign out
          </button>
        )}
      </div>
    </section>
  );
}
