import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { api, ApiClientError } from "../api/client";
import type { Service } from "../types/domain";
import { currency } from "../utils/format";
import { tomorrowInputValue } from "../utils/date";

const initialForm = {
  name: "Sarah Mitchell",
  email: "sarah@example.test",
  phone: "+1 555 0101",
  serviceId: "",
  scheduledDate: tomorrowInputValue(),
  scheduledStartTime: "10:00",
  address: "42 Oak Street, Springfield",
  specialInstructions: "Focus on kitchen appliances and upstairs bathroom.",
};

export function PublicBookingPreview() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(initialForm);
  const [bookingNumber, setBookingNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void api
      .listServices()
      .then((response) => {
        setServices(response.services);
        setForm((current) => ({ ...current, serviceId: current.serviceId || response.services[0]?.id || "" }));
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Unable to load services. Please try again.");
      });
  }, []);

  const selectedService = useMemo(
    () => services.find((service) => service.id === form.serviceId) ?? services[0],
    [form.serviceId, services],
  );

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.createPublicBooking(form);
      setBookingNumber(response.booking.bookingNumber);
      setCustomerName(response.booking.customerName);
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.issues?.length) {
        setError(caught.issues.map((issue) => issue.message).join(" "));
      } else {
        setError(caught instanceof Error ? caught.message : "Unable to create booking.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (bookingNumber) {
    return (
      <section className="booking-success">
        <CheckCircle2 size={42} aria-hidden="true" />
        <h1>Booking Request Received</h1>
        <p>Thank you, {customerName.split(" ")[0] || customerName}.</p>
        <p>Your booking request <strong>#{bookingNumber}</strong> has been received.</p>
        <p>We will confirm your appointment shortly.</p>
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            setBookingNumber("");
            setCustomerName("");
            setForm({ ...initialForm, scheduledDate: tomorrowInputValue(), serviceId: services[0]?.id ?? "" });
          }}
        >
          Request Another Booking
        </button>
      </section>
    );
  }

  return (
    <div className="public-booking-layout">
      <section className="booking-form-panel">
        <div className="page-header compact-left">
          <div>
            <p className="eyebrow">Public Booking</p>
            <h1>Request a Service Booking</h1>
          </div>
        </div>

        {error && <p className="toast error">{error}</p>}

        <form className="booking-form" onSubmit={handleSubmit}>
          <fieldset>
            <legend>Customer Information</legend>
            <label>
              Full Name
              <input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
            </label>
            <label>
              Phone
              <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
            </label>
          </fieldset>

          <fieldset>
            <legend>Service</legend>
            <label>
              Service Type
              <select value={form.serviceId} onChange={(event) => updateField("serviceId", event.target.value)}>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <fieldset>
            <legend>Schedule</legend>
            <label>
              Date
              <input type="date" value={form.scheduledDate} onChange={(event) => updateField("scheduledDate", event.target.value)} />
            </label>
            <label>
              Preferred Time
              <input type="time" value={form.scheduledStartTime} onChange={(event) => updateField("scheduledStartTime", event.target.value)} />
            </label>
          </fieldset>

          <fieldset>
            <legend>Service Address</legend>
            <label>
              Address
              <textarea value={form.address} onChange={(event) => updateField("address", event.target.value)} rows={3} />
            </label>
          </fieldset>

          <fieldset>
            <legend>Additional Information</legend>
            <label>
              Special Instructions
              <textarea value={form.specialInstructions} onChange={(event) => updateField("specialInstructions", event.target.value)} rows={3} />
            </label>
          </fieldset>

          <button className="primary-button wide" type="submit" disabled={loading || !services.length}>
            {loading ? "Creating Booking..." : "Request Booking"}
          </button>
        </form>
      </section>

      <aside className="booking-summary">
        <h2>{selectedService?.name ?? "Select a Service"}</h2>
        <div>
          <span>Base Price</span>
          <strong>{selectedService ? currency.format(selectedService.basePrice) : "-"}</strong>
        </div>
        <div>
          <span>Estimated Duration</span>
          <strong>{selectedService ? `${selectedService.estimatedDurationMinutes} minutes` : "-"}</strong>
        </div>
        <div>
          <span>Status After Submit</span>
          <strong>Pending Review</strong>
        </div>
      </aside>
    </div>
  );
}
