import { useState, useEffect } from "react";
import "./WeeklyRoster.css";

function WeeklyRoster() {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();

    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(today.getDate()).padStart(2, "0")}`;
  });

  const [loading, setLoading] = useState(true);

  // Fetch employees and shifts
  const fetchRosterData = async () => {
    try {
      setLoading(true);

      const [employeeResponse, shiftResponse] = await Promise.all([
        fetch("http://localhost:5000/api/employees"),
        fetch("http://localhost:5000/api/shifts"),
      ]);

      if (!employeeResponse.ok || !shiftResponse.ok) {
        throw new Error("Failed to fetch roster data");
      }

      const employeeData = await employeeResponse.json();
      const shiftData = await shiftResponse.json();

      setEmployees(employeeData);
      setShifts(shiftData);
    } catch (error) {
      console.error("Error fetching roster:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRosterData();
  }, []);

  // Convert selected date into Monday of that week
  const getMonday = (dateString) => {
    const date = new Date(`${dateString}T00:00:00`);
    const day = date.getDay();

    const difference = day === 0 ? -6 : 1 - day;

    date.setDate(date.getDate() + difference);

    return date;
  };

  // Format date as YYYY-MM-DD
  const formatDate = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(date.getDate()).padStart(2, "0")}`;
  };

  // Generate Monday to Sunday
  const monday = getMonday(selectedDate);

  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    return {
      date: formatDate(date),
      day: date.toLocaleDateString("en-US", {
        weekday: "short",
      }),
    };
  });

  return (
    <div className="weekly-roster-container">
      {/* Heading and date picker */}
      <div className="weekly-roster-heading">
        <div>
          <h1>Weekly Roster</h1>
          <p>View employee schedules for an entire week.</p>
        </div>

        <div className="weekly-date-picker">
          <label htmlFor="weekly-date">Select Date</label>
          <input
            id="weekly-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p className="weekly-loading">Loading weekly roster...</p>
      ) : (
        <>
          {/* Week Information */}
          <div className="weekly-period-card">
            <div>
              <p>Selected Week</p>
              <h2>
                {weekDates[0].date} to {weekDates[6].date}
              </h2>
            </div>
            <span className="weekly-period-icon">📅</span>
          </div>

          {/* Employee Weekly Schedule */}
          <div className="weekly-schedule-section">
            <h2>Employee Weekly Schedule</h2>

            {employees.length === 0 ? (
              <p>No employees found.</p>
            ) : (
              <div className="weekly-table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Employee Name</th>

                      {weekDates.map((day) => (
                        <th key={day.date}>
                          <div className="weekly-day-heading">
                            <span>{day.day}</span>
                            <small>{day.date}</small>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee.id}>
                        <td className="weekly-employee-name">
                          {employee.name}
                        </td>

                        {weekDates.map((day) => {
                          // Include overnight shifts on both dates
                          const employeeShifts = shifts.filter((shift) => {
                            const shiftEndDate =
                              shift.endDate ?? shift.shiftDate;

                            return (
                              String(shift.employeeId) ===
                                String(employee.id) &&
                              shift.shiftDate <= day.date &&
                              shiftEndDate >= day.date
                            );
                          });

                          return (
                            <td key={day.date}>
                              {employeeShifts.length > 0 ? (
                                <div className="weekly-shift-list">
                                  {employeeShifts.map((shift) => {
                                    const continuesFromPreviousDay =
                                      shift.shiftDate < day.date;

                                    const continuesToNextDay =
                                      (shift.endDate ?? shift.shiftDate) >
                                      day.date;

                                    return (
                                      <div
                                        className="weekly-shift-card"
                                        key={shift.id}
                                      >
                                        <strong>
                                          {continuesFromPreviousDay
                                            ? `Continues from ${shift.startTime}`
                                            : shift.startTime}
                                        </strong>

                                        <span>
                                          {continuesToNextDay
                                            ? "Continues to next day"
                                            : shift.endTime}
                                        </span>

                                        <small>{shift.status}</small>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="weekly-off-status">
                                  Not Scheduled
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default WeeklyRoster;
