import { useState, useEffect } from "react";
import "./MonthlyRoster.css";

function MonthlyRoster() {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);

  // Get current month in YYYY-MM format
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();

    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      "0",
    )}`;
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
      console.error("Error fetching monthly roster:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRosterData();
  }, []);

  // Generate all dates in the selected month
  const [year, month] = selectedMonth.split("-").map(Number);

  const totalDays = new Date(year, month, 0).getDate();

  const monthDates = Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0",
    )}`;
  });

  // Display month name
  const monthName = new Date(year, month - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="monthly-roster-container">
      {/* Heading and month picker */}
      <div className="monthly-roster-heading">
        <div>
          <h1>Monthly Roster</h1>
          <p>View employee schedules for an entire month.</p>
        </div>

        <div className="monthly-date-picker">
          <label htmlFor="monthly-date">Select Month</label>
          <input
            id="monthly-date"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p className="monthly-loading">Loading monthly roster...</p>
      ) : (
        <>
          {/* Month Information */}
          <div className="monthly-period-card">
            <div>
              <p>Selected Month</p>
              <h2>{monthName}</h2>
              <span>{totalDays} Days</span>
            </div>

            <span className="monthly-period-icon">📅</span>
          </div>

          {/* Employee Monthly Schedule */}
          <div className="monthly-schedule-section">
            <h2>Employee Monthly Schedule</h2>

            {employees.length === 0 ? (
              <p>No employees found.</p>
            ) : (
              <div className="monthly-table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th className="monthly-employee-header">Employee Name</th>

                      {monthDates.map((date) => (
                        <th key={date}>{Number(date.split("-")[2])}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee.id}>
                        <td className="monthly-employee-name">
                          {employee.name}
                        </td>

                        {monthDates.map((date) => {
                          // Include overnight shifts across calendar days
                          const employeeShifts = shifts.filter((shift) => {
                            const shiftEndDate =
                              shift.endDate ?? shift.shiftDate;

                            return (
                              String(shift.employeeId) ===
                                String(employee.id) &&
                              shift.shiftDate <= date &&
                              shiftEndDate >= date
                            );
                          });

                          return (
                            <td key={date}>
                              {employeeShifts.length > 0 ? (
                                <div className="monthly-shift-list">
                                  {employeeShifts.map((shift) => {
                                    const continuesFromPreviousDay =
                                      shift.shiftDate < date;

                                    const continuesToNextDay =
                                      (shift.endDate ?? shift.shiftDate) > date;

                                    return (
                                      <div
                                        className="monthly-shift-card"
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
                                <span className="monthly-no-shift">--</span>
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

export default MonthlyRoster;
