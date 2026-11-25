import { useState, useEffect } from "react";
import "./ShiftManagement.css";

function ShiftManagement() {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Shift Filter States
  const [filterType, setFilterType] = useState("Daily");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");

  // Form state
  const [employeeId, setEmployeeId] = useState("");
  const [shiftDate, setShiftDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [endDate, setEndDate] = useState("");

  const [editShiftId, setEditShiftId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Calculate date range based on filter type
  const calculateDateRange = (type, date) => {
    if (!date) return;

    const selectedDate = new Date(date + "T00:00:00");
    let startDate;
    let endDate;

    if (type === "Daily") {
      startDate = new Date(selectedDate);
      endDate = new Date(selectedDate);
    } else if (type === "Weekly") {
      const day = selectedDate.getDay();
      const difference = day === 0 ? -6 : 1 - day;

      startDate = new Date(selectedDate);
      startDate.setDate(selectedDate.getDate() + difference);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else if (type === "Monthly") {
      startDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1,
      );

      endDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        0,
      );
    }

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    };

    setFilterStartDate(formatDate(startDate));
    setFilterEndDate(formatDate(endDate));
  };

  // Filter shifts based on selected date range
  const filteredShifts = shifts.filter((shift) => {
    if (!appliedStartDate || !appliedEndDate) {
      return true;
    }

    const shiftStartDate = shift.shiftDate;
    const shiftEndDate = shift.endDate || shift.shiftDate;

    return shiftStartDate <= appliedEndDate && shiftEndDate >= appliedStartDate;
  });

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/employees");

      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }

      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  // Fetch shifts
  const fetchShifts = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/shifts");

      if (!response.ok) {
        throw new Error("Failed to fetch shifts");
      }

      const data = await response.json();
      setShifts(data);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchShifts();
  }, []);

  // Automatically calculate end time and date (+9 hours)
  const handleStartTimeChange = (e) => {
    const selectedTime = e.target.value;

    setStartTime(selectedTime);

    if (selectedTime && shiftDate) {
      const startDateTime = new Date(`${shiftDate}T${selectedTime}:00`);

      const endDateTime = new Date(
        startDateTime.getTime() + 9 * 60 * 60 * 1000,
      );

      const formattedEndDate = [
        endDateTime.getFullYear(),
        String(endDateTime.getMonth() + 1).padStart(2, "0"),
        String(endDateTime.getDate()).padStart(2, "0"),
      ].join("-");

      const formattedEndTime = `${String(endDateTime.getHours()).padStart(
        2,
        "0",
      )}:${String(endDateTime.getMinutes()).padStart(2, "0")}`;

      setEndDate(formattedEndDate);
      setEndTime(formattedEndTime);
    } else {
      setEndDate(shiftDate);
      setEndTime("");
    }
  };

  // Update end date and time when start date changes
  const handleShiftDateChange = (e) => {
    const selectedDate = e.target.value;

    setShiftDate(selectedDate);

    if (selectedDate && startTime) {
      const startDateTime = new Date(`${selectedDate}T${startTime}:00`);

      const endDateTime = new Date(
        startDateTime.getTime() + 9 * 60 * 60 * 1000,
      );

      const formattedEndDate = [
        endDateTime.getFullYear(),
        String(endDateTime.getMonth() + 1).padStart(2, "0"),
        String(endDateTime.getDate()).padStart(2, "0"),
      ].join("-");

      const formattedEndTime = `${String(endDateTime.getHours()).padStart(
        2,
        "0",
      )}:${String(endDateTime.getMinutes()).padStart(2, "0")}`;

      setEndDate(formattedEndDate);
      setEndTime(formattedEndTime);
    } else {
      setEndDate(selectedDate);
      setEndTime("");
    }
  };

  // Clear form
  const resetForm = () => {
    setEmployeeId("");
    setShiftDate("");
    setStartTime("");
    setEndDate("");
    setEndTime("");
    setEditShiftId(null);
    setIsEditing(false);
  };

  // Create shift
  const handleAddShift = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/api/shifts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId,
          shiftDate,
          startTime,
          endDate,
          endTime,
          status: "Assigned",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create shift");
      }

      alert("Shift assigned successfully!");

      resetForm();
      await fetchShifts();
    } catch (error) {
      console.error("Error creating shift:", error);
      alert(error.message);
    }
  };

  // Edit shift
  const handleEditShift = (shift) => {
    setEditShiftId(shift.id);
    setEmployeeId(String(shift.employeeId));
    setShiftDate(shift.shiftDate.slice(0, 10));
    setEndDate(shift.endDate?.slice(0, 10) || shift.shiftDate.slice(0, 10));
    setStartTime(shift.startTime.slice(0, 5));
    setEndTime(shift.endTime.slice(0, 5));
    setIsEditing(true);
  };

  // Update shift
  const handleUpdateShift = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `http://localhost:5000/api/shifts/${editShiftId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employeeId,
            shiftDate,
            startTime,
            endDate,
            endTime,
            status: "Assigned",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update shift");
      }

      alert("Shift updated successfully!");

      resetForm();
      await fetchShifts();
    } catch (error) {
      console.error("Error updating shift:", error);
      alert(error.message);
    }
  };

  // Delete shift
  const handleDeleteShift = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this shift?",
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(`http://localhost:5000/api/shifts/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete shift");
      }

      alert("Shift deleted successfully!");

      await fetchShifts();
    } catch (error) {
      console.error("Error deleting shift:", error);
      alert(error.message);
    }
  };

  return (
    <div className="shift-container">
      <h1>Shift Management</h1>
      <p className="shift-description">Manage employee shifts and schedules.</p>

      {/* Shift Form */}
      <div className="shift-form-card">
        <h2>{isEditing ? "Edit Shift" : "Create New Shift"}</h2>

        <form
          className="shift-form"
          onSubmit={isEditing ? handleUpdateShift : handleAddShift}
        >
          <div className="shift-form-group">
            <label>Employee</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
            >
              <option value="">Select Employee</option>

              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>

          <div className="shift-form-group">
            <label>Start Date</label>
            <input
              type="date"
              value={shiftDate}
              onChange={handleShiftDateChange}
              required
            />
          </div>

          <div className="shift-form-group">
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <div className="shift-form-group">
            <label>Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={handleStartTimeChange}
              required
            />
          </div>

          <div className="shift-form-group">
            <label>End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>

          <div className="shift-form-actions">
            <button type="submit">
              {isEditing ? "Update Shift" : "Assign Shift"}
            </button>

            {isEditing && (
              <button
                type="button"
                className="shift-cancel-btn"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Shift List */}
      <div className="shift-section">
        <h2>Shift List</h2>

        <div className="shift-filter-controls">
          <select
            value={filterType}
            onChange={(e) => {
              const selectedType = e.target.value;
              setFilterType(selectedType);

              if (referenceDate) {
                calculateDateRange(selectedType, referenceDate);
              }
            }}
          >
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
          </select>

          <div>
            <label>Start Date:</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => {
                const date = e.target.value;
                setReferenceDate(date);
                calculateDateRange(filterType, date);
              }}
            />
          </div>

          <div>
            <label>End Date:</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (!filterStartDate || !filterEndDate) {
                alert("Please select both start date and end date");
                return;
              }

              if (filterEndDate < filterStartDate) {
                alert("End date cannot be earlier than start date");
                return;
              }

              setAppliedStartDate(filterStartDate);
              setAppliedEndDate(filterEndDate);
            }}
          >
            Apply Filter
          </button>
        </div>

        {loading ? (
          <p>Loading shifts...</p>
        ) : filteredShifts.length === 0 ? (
          <p>No shifts found.</p>
        ) : (
          <div className="shift-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Start Date</th>
                  <th>Start Time</th>
                  <th>End Date</th>
                  <th>End Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredShifts.map((shift) => (
                  <tr key={shift.id}>
                    <td>{shift.employeeName}</td>
                    <td>{shift.shiftDate}</td>
                    <td>{shift.startTime}</td>
                    <td>{shift.endDate || shift.shiftDate}</td>
                    <td>{shift.endTime}</td>
                    <td>
                      <span className="shift-status">{shift.status}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleEditShift(shift)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="shift-delete-btn"
                        onClick={() => handleDeleteShift(shift.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShiftManagement;
