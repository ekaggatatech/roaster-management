import { useState, useEffect } from "react";
import "./EmployeeAvailability.css";

function EmployeeAvailability() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [maxHoursPerWeek, setMaxHoursPerWeek] = useState(45);
  const [preferredShift, setPreferredShift] = useState("Morning");

  const [weeklyAvailability, setWeeklyAvailability] = useState({
    Monday: "Available",
    Tuesday: "Available",
    Wednesday: "Available",
    Thursday: "Available",
    Friday: "Available",
    Saturday: "Off",
    Sunday: "Off",
  });

  const [unavailableDates, setUnavailableDates] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedEmployeeId) {
      setMessage("Please select an employee");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:5000/api/availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          maxHoursPerWeek: Number(maxHoursPerWeek),
          preferredShift,
          weeklyAvailability,
          unavailableDates,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save availability");
      }

      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/employees");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch employees");
        }

        setEmployees(data.employees || data);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };

    fetchEmployees();
  }, []);

  return (
    <div className="availability-container">
      <div className="availability-heading">
        <div>
          <h1>Employee Availability</h1>
          <p>Manage employee working days, hours and shift preferences.</p>
        </div>
      </div>

      <form className="availability-form" onSubmit={handleSubmit}>
        {/* Employee Selection */}
        <section className="availability-section">
          <h2>Select Employee</h2>

          <select
            className="availability-input"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
          >
            <option value="">Select Employee</option>

            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </section>

        {/* Weekly Availability */}
        <section className="availability-section">
          <h2>Weekly Availability</h2>
          <p>Select whether the employee is available on each day.</p>

          <div className="weekly-availability-grid">
            {Object.keys(weeklyAvailability).map((day) => (
              <div className="availability-day-card" key={day}>
                <label>{day}</label>

                <select
                  value={weeklyAvailability[day]}
                  onChange={(e) =>
                    setWeeklyAvailability({
                      ...weeklyAvailability,
                      [day]: e.target.value,
                    })
                  }
                >
                  <option value="Available">Available</option>
                  <option value="Off">Off</option>
                </select>
              </div>
            ))}
          </div>
        </section>

        {/* Unavailable Dates */}
        <section className="availability-section">
          <h2>Unavailable Dates</h2>
          <p>Add dates when the employee cannot work.</p>

          <input
            className="availability-input date-input"
            type="date"
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => {
              const selectedDate = e.target.value;

              if (selectedDate && !unavailableDates.includes(selectedDate)) {
                setUnavailableDates([...unavailableDates, selectedDate]);
              }
            }}
          />

          <ul className="unavailable-date-list">
            {unavailableDates.map((date) => (
              <li key={date}>
                <span>{date}</span>

                <button
                  type="button"
                  className="remove-date-button"
                  onClick={() =>
                    setUnavailableDates(
                      unavailableDates.filter((item) => item !== date),
                    )
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Work Hours and Preferred Shift */}
        <div className="availability-settings-grid">
          <section className="availability-section">
            <label htmlFor="max-hours">Maximum Hours Per Week</label>

            <input
              id="max-hours"
              className="availability-input"
              type="number"
              min="1"
              value={maxHoursPerWeek}
              onChange={(e) => setMaxHoursPerWeek(e.target.value)}
            />
          </section>

          <section className="availability-section">
            <label htmlFor="preferred-shift">Preferred Shift</label>

            <select
              id="preferred-shift"
              className="availability-input"
              value={preferredShift}
              onChange={(e) => setPreferredShift(e.target.value)}
            >
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Night">Night</option>
              <option value="Not Specified">Not Specified</option>
            </select>
          </section>
        </div>

        {/* Save Button */}
        <div className="availability-actions">
          <button
            type="submit"
            className="save-availability-button"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Availability"}
          </button>
        </div>

        {message && (
          <p className="availability-message" role="status">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}

export default EmployeeAvailability;
