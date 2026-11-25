import { useState, useEffect } from "react";
import "./DailyRoster.css";

function DailyRoster() {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
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

  // Filter shifts active on the selected date
  const dailyShifts = shifts.filter((shift) => {
    const shiftEndDate = shift.endDate ?? shift.shiftDate;

    return shift.shiftDate <= selectedDate && shiftEndDate >= selectedDate;
  });

  // Count assigned employees
  const assignedEmployeeIds = new Set(
    dailyShifts.map((shift) => shift.employeeId),
  );

  const assignedCount = assignedEmployeeIds.size;

  const offCount = employees.filter(
    (employee) => !assignedEmployeeIds.has(String(employee.id)),
  ).length;

  return (
    <div className="daily-roster-container">
      <div className="daily-roster-heading">
        <div>
          <h1>Daily Roster</h1>
          <p>View employee schedules for a selected date.</p>
        </div>

        <div className="daily-date-picker">
          <label htmlFor="roster-date">Select Date</label>
          <input
            id="roster-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p className="roster-loading">Loading roster...</p>
      ) : (
        <>
          {/* Roster Summary */}
          <div className="roster-summary">
            <div className="roster-summary-card total-card">
              <span className="summary-icon">👥</span>
              <div>
                <p>Total Employees</p>
                <h2>{employees.length}</h2>
              </div>
            </div>

            <div className="roster-summary-card assigned-card">
              <span className="summary-icon">✅</span>
              <div>
                <p>Assigned Employees</p>
                <h2>{assignedCount}</h2>
              </div>
            </div>

            <div className="roster-summary-card off-card">
              <span className="summary-icon">🏠</span>
              <div>
                <p>Employees Without Shifts</p>
                <h2>{offCount}</h2>
              </div>
            </div>
          </div>

          {/* Employee Schedule */}
          <div className="daily-schedule-section">
            <h2>Employee Schedule</h2>

            {employees.length === 0 ? (
              <p>No employees found.</p>
            ) : (
              <div className="daily-table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Start Date</th>
                      <th>Start Time</th>
                      <th>End Date</th>
                      <th>End Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {employees.map((employee) => {
                      const employeeShifts = dailyShifts.filter(
                        (shift) =>
                          String(shift.employeeId) === String(employee.id),
                      );

                      return employeeShifts.length > 0 ? (
                        employeeShifts.map((shift) => (
                          <tr key={shift.id}>
                            <td>{employee.name}</td>
                            <td>{shift.shiftDate}</td>
                            <td>
                              {shift.shiftDate < selectedDate
                                ? `Continues from ${shift.startTime}`
                                : shift.startTime}
                            </td>
                            <td>{shift.endDate ?? shift.shiftDate}</td>
                            <td>{shift.endTime}</td>
                            <td>
                              <span className="daily-status assigned-status">
                                {shift.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr key={employee.id}>
                          <td>{employee.name}</td>
                          <td>--</td>
                          <td>--</td>
                          <td>--</td>
                          <td>--</td>
                          <td>
                            <span className="daily-status off-status">OFF</span>
                          </td>
                        </tr>
                      );
                    })}
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

export default DailyRoster;
