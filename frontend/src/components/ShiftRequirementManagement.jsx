import { useState, useEffect } from "react";
import "./ShiftRequirementManagement.css";

function ShiftRequirementManagement() {
  const [shiftDate, setShiftDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [department, setDepartment] = useState("");
  const [requiredRole, setRequiredRole] = useState("");
  const [requiredEmployeeCount, setRequiredEmployeeCount] = useState(1);
  const [message, setMessage] = useState("");

  const [requirements, setRequirements] = useState([]);

  const [editRequirementId, setEditRequirementId] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);

  const [selectedRequirementId, setSelectedRequirementId] = useState("");

  // Tab Navigation
  const [activeTab, setActiveTab] = useState("requirements");

  // AI Recommendation States
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const selectedRequirement = requirements.find(
    (req) => req.id === selectedRequirementId,
  );

  const fetchEmployees = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/employees");

      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }

      const data = await response.json();

      console.log("Employee API Response:", data);

      setEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleEmployeeSelection = (employeeId) => {
    setSelectedEmployeeIds((previousIds) => {
      if (previousIds.includes(employeeId)) {
        return previousIds.filter((id) => id !== employeeId);
      }

      return [...previousIds, employeeId];
    });
  };

  const handleGenerateRecommendations = async () => {
    if (!selectedRequirementId) {
      setMessage("Please select a shift requirement");
      return;
    }

    try {
      setIsGeneratingAI(true);
      setAiRecommendations([]);
      setMessage("");

      const response = await fetch(
        "http://localhost:5000/api/ai-allocation/recommendations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requirementId: selectedRequirementId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate recommendations");
      }

      setAiRecommendations(data.selectedEmployees);

      setMessage("AI recommendations generated successfully!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAssignEmployees = async () => {
    if (!selectedRequirementId) {
      setMessage("Please select a shift requirement");
      return;
    }

    if (selectedEmployeeIds.length === 0) {
      setMessage("Please select at least one employee");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/shift-requirements/${selectedRequirementId}/assign`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employeeIds: selectedEmployeeIds,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Employee assignment failed");
      }

      setMessage(data.message);

      await fetchRequirements();

      setSelectedEmployeeIds([]);
      setSelectedRequirementId("");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleEdit = (req) => {
    setEditRequirementId(req.id);

    setShiftDate(req.shiftDate);
    setStartTime(req.startTime);
    setEndDate(req.endDate || req.shiftDate);
    setEndTime(req.endTime);
    setDepartment(req.department);
    setRequiredRole(req.requiredRole);
    setRequiredEmployeeCount(req.requiredEmployeeCount);

    setMessage("Editing shift requirement...");
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this shift requirement?",
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/shift-requirements/${id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete requirement");
      }

      setMessage("Shift requirement deleted successfully!");

      await fetchRequirements();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const start = new Date(`${shiftDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);

    if (end <= start) {
      setMessage("End date and time must be after start date and time.");
      return;
    }

    try {
      const url = editRequirementId
        ? `http://localhost:5000/api/shift-requirements/${editRequirementId}`
        : "http://localhost:5000/api/shift-requirements";

      const response = await fetch(url, {
        method: editRequirementId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shiftDate,
          startTime,
          endDate,
          endTime,
          department,
          requiredRole,
          requiredEmployeeCount,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create requirement");
      }

      setMessage(
        editRequirementId
          ? "Shift requirement updated successfully!"
          : "Shift requirement created successfully!",
      );

      await fetchRequirements();

      // Clear all form fields
      setShiftDate("");
      setStartTime("");
      setEndDate("");
      setEndTime("");
      setDepartment("");
      setRequiredRole("");
      setRequiredEmployeeCount(1);

      // Exit edit mode
      setEditRequirementId(null);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const fetchRequirements = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/shift-requirements",
      );

      if (!response.ok) {
        throw new Error("Failed to fetch shift requirements");
      }

      const data = await response.json();

      console.log("GET API Response:", data);
      setRequirements(data.requirements);
    } catch (error) {
      console.error("Error fetching requirements:", error);
    }
  };

  useEffect(() => {
    fetchRequirements();
    fetchEmployees();
  }, []);

  return (
    <div className="shift-requirement-container">
      <h2>Shift Requirement Management</h2>

      <div className="shift-tabs">
        <button
          className={activeTab === "requirements" ? "active" : ""}
          onClick={() => setActiveTab("requirements")}
        >
          Requirements
        </button>

        <button
          className={activeTab === "ai" ? "active" : ""}
          onClick={() => setActiveTab("ai")}
        >
          AI Allocation
        </button>

        <button
          className={activeTab === "manual" ? "active" : ""}
          onClick={() => setActiveTab("manual")}
        >
          Manual Assignment
        </button>
      </div>

      {activeTab === "requirements" && (
        <>
          <form onSubmit={handleSubmit}>
            <div>
              <label>Shift Date:</label>
              <input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Start Time:</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div>
              <label>End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label>End Time:</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Department:</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Enter department"
                required
              />
            </div>

            <div>
              <label>Required Role:</label>
              <input
                type="text"
                value={requiredRole}
                onChange={(e) => setRequiredRole(e.target.value)}
                placeholder="Enter required role"
                required
              />
            </div>

            <div>
              <label>Required Employee Count:</label>
              <input
                type="number"
                min="1"
                value={requiredEmployeeCount}
                onChange={(e) =>
                  setRequiredEmployeeCount(Number(e.target.value))
                }
                required
              />
            </div>

            <button type="submit">
              {editRequirementId ? "Update Requirement" : "Create Requirement"}
            </button>

            <p>{message}</p>
          </form>

          <h3>All Shift Requirements</h3>

          <table border="1" cellPadding="10" cellSpacing="0">
            <thead>
              <tr>
                <th>Shift Date</th>
                <th>Start Time</th>
                <th>End Date</th>
                <th>End Time</th>
                <th>Department</th>
                <th>Required Role</th>
                <th>Employee Count</th>
                <th>Assigned Employees</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {requirements.map((req) => (
                <tr key={req.id}>
                  <td>{req.shiftDate}</td>
                  <td>{req.startTime}</td>
                  <td>{req.endDate || req.shiftDate}</td>
                  <td>{req.endTime}</td>
                  <td>{req.department}</td>
                  <td>{req.requiredRole}</td>
                  <td>{req.requiredEmployeeCount}</td>
                  <td>
                    {req.assignedEmployees?.length > 0
                      ? req.assignedEmployees
                          .map((employee) => employee.name)
                          .join(", ")
                      : "Not Assigned"}
                  </td>
                  <td>{req.status}</td>

                  <td>
                    <button type="button" onClick={() => handleEdit(req)}>
                      Edit
                    </button>

                    <button type="button" onClick={() => handleDelete(req.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {(activeTab === "ai" || activeTab === "manual") && (
        <div className="assignment-section">
          <h3>Assign Employees to Shift Requirement</h3>

          {activeTab === "manual" && (
            <div className="employee-selection">
              <h4>Select Employees</h4>

              <div className="employee-grid">
                {employees.map((employee) => (
                  <label className="employee-card" key={employee.id}>
                    <input
                      type="checkbox"
                      checked={selectedEmployeeIds.includes(employee.id)}
                      onChange={() => handleEmployeeSelection(employee.id)}
                    />

                    <span>
                      <strong>{employee.name}</strong>
                      <small>
                        {employee.department} - {employee.role}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="requirement-selection">
            <label>Select Shift Requirement:</label>

            <select
              value={selectedRequirementId}
              onChange={(e) => setSelectedRequirementId(e.target.value)}
            >
              <option value="">-- Select Requirement --</option>

              {requirements.map((req) => (
                <option
                  key={req.id}
                  value={req.id}
                  disabled={req.status === "Filled"}
                >
                  {req.shiftDate} {req.startTime}
                  {" - "}
                  {req.endDate || req.shiftDate} {req.endTime}
                  {" | "}
                  {req.department} - {req.requiredRole}
                  {" | Required: "}
                  {req.requiredEmployeeCount}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="ai-recommendation-button"
            onClick={handleGenerateRecommendations}
            disabled={!selectedRequirementId || isGeneratingAI}
          >
            {isGeneratingAI
              ? "Generating Recommendations..."
              : "Generate AI Recommendations"}
          </button>

          <div className="selected-count">
            Selected Employees: <strong>{selectedEmployeeIds.length}</strong>
          </div>

          {selectedRequirement && (
            <div className="selected-requirement-details">
              <h4>Selected Requirement Details</h4>

              <p>Shift Date: {selectedRequirement.shiftDate}</p>

              <p>
                Shift Time: {selectedRequirement.startTime} -{" "}
                {selectedRequirement.endTime}
              </p>

              <p>
                Required Employees: {selectedRequirement.requiredEmployeeCount}
              </p>

              <p>
                Assigned Employees:{" "}
                {selectedRequirement.assignedEmployees?.length || 0}
              </p>

              <p>
                Remaining Positions:{" "}
                {selectedRequirement.requiredEmployeeCount -
                  (selectedRequirement.assignedEmployees?.length || 0)}
              </p>

              <p>
                Assigned Names:{" "}
                {selectedRequirement.assignedEmployees?.length > 0
                  ? selectedRequirement.assignedEmployees
                      .map((employee) => employee.name)
                      .join(", ")
                  : "Not Assigned"}
              </p>
            </div>
          )}

          {/* AI Recommended Employees */}
          {aiRecommendations.length > 0 && (
            <div className="ai-recommendations">
              <h3>AI Recommended Employees</h3>

              {aiRecommendations.map((employee) => (
                <div className="ai-employee-card" key={employee.id}>
                  <h4>{employee.name}</h4>

                  <p>Department: {employee.department}</p>

                  <p>Role: {employee.role}</p>

                  <p>Preference Score: {employee.score}</p>

                  <p>Existing Weekly Hours: {employee.existingWeeklyHours}</p>

                  <p>Maximum Weekly Hours: {employee.maxHoursPerWeek}</p>
                </div>
              ))}
            </div>
          )}

          {/* Select AI Recommended Employees */}
          <button
            type="button"
            className="assign-button"
            onClick={() => {
              setSelectedEmployeeIds(
                aiRecommendations.map((employee) => employee.id),
              );
              setMessage("AI recommended employees selected!");
            }}
            disabled={aiRecommendations.length === 0}
          >
            Select AI Recommended Employees
          </button>

          <button
            type="button"
            className="assign-button"
            onClick={handleAssignEmployees}
          >
            Assign Employees
          </button>
        </div>
      )}
    </div>
  );
}

export default ShiftRequirementManagement;
