import { useEffect, useState } from "react";
import "./ShiftSwapManagement.css";

function ShiftSwapManagement() {
  const [employees, setEmployees] = useState([]);
  const [requests, setRequests] = useState([]);

  // Shift Swap Form State
  const [requesterEmployeeId, setRequesterEmployeeId] = useState("");
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [requesterShiftId, setRequesterShiftId] = useState("");
  const [targetShiftId, setTargetShiftId] = useState("");

  const [shifts, setShifts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState("");

  // Fetch all shift swap requests
  const fetchSwapRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://localhost:5000/api/shift-swaps");

      if (!response.ok) {
        throw new Error("Failed to fetch swap requests");
      }

      const result = await response.json();

      setRequests(result.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all employees
  const fetchEmployees = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/employees");

      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }

      const result = await response.json();

      setEmployees(result);
    } catch (error) {
      console.error("Employee fetch error:", error);
    }
  };

  // Fetch all shifts
  const fetchShifts = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/shifts");

      if (!response.ok) {
        throw new Error("Failed to fetch shifts");
      }

      const result = await response.json();

      setShifts(result);
    } catch (error) {
      console.error("Shift fetch error:", error);
    }
  };

  // Find employee name using employee ID
  const getEmployeeName = (employeeId) => {
    const employee = employees.find((emp) => emp.id === employeeId);

    return employee ? employee.name : "Unknown Employee";
  };

  // Employee Accept / Reject response
  const employeeResponse = async (request, responseType) => {
    try {
      setProcessingId(request.id);
      setError("");

      const response = await fetch(
        `http://localhost:5000/api/shift-swaps/${request.id}/employee-response`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employeeId: request.targetEmployeeId,
            response: responseType,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      alert(result.message);

      // Refresh requests after employee response
      await fetchSwapRequests();
    } catch (error) {
      setError(error.message);
    } finally {
      setProcessingId("");
    }
  };

  // Manager Approve / Reject response
  const managerResponse = async (request, responseType) => {
    try {
      setProcessingId(request.id);
      setError("");

      const response = await fetch(
        `http://localhost:5000/api/shift-swaps/${request.id}/manager-response`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            response: responseType,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      alert(result.message);

      // Refresh requests after manager response
      await fetchSwapRequests();
    } catch (error) {
      setError(error.message);
    } finally {
      setProcessingId("");
    }
  };

  // Create Shift Swap Request
  const createSwapRequest = async () => {
    try {
      if (
        !requesterEmployeeId ||
        !targetEmployeeId ||
        !requesterShiftId ||
        !targetShiftId
      ) {
        alert("Please select all fields");
        return;
      }

      const response = await fetch("http://localhost:5000/api/shift-swaps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requesterEmployeeId,
          targetEmployeeId,
          requesterShiftId,
          targetShiftId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      alert(result.message);

      setRequesterEmployeeId("");
      setTargetEmployeeId("");
      setRequesterShiftId("");
      setTargetShiftId("");

      await fetchSwapRequests();
    } catch (error) {
      setError(error.message);
    }
  };

  // Run APIs when component loads
  useEffect(() => {
    fetchSwapRequests();
    fetchEmployees();
    fetchShifts();
  }, []);

  return (
    <div className="swap-container">
      <h2>Shift Swap Management</h2>

      {/* Create Shift Swap Request Form */}
      <div className="swap-form">
        <h3>Create Shift Swap Request</h3>

        {/* Requester Employee */}
        <label>Requester Employee:</label>
        <select
          value={requesterEmployeeId}
          onChange={(e) => setRequesterEmployeeId(e.target.value)}
        >
          <option value="">Select Requester</option>

          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>

        {/* Target Employee */}
        <label>Target Employee:</label>
        <select
          value={targetEmployeeId}
          onChange={(e) => setTargetEmployeeId(e.target.value)}
        >
          <option value="">Select Target Employee</option>

          {employees
            .filter((employee) => employee.id !== requesterEmployeeId)
            .map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
        </select>

        {/* Requester Shift */}
        <label>Requester Shift:</label>
        <select
          value={requesterShiftId}
          onChange={(e) => setRequesterShiftId(e.target.value)}
        >
          <option value="">Select Requester Shift</option>

          {shifts
            .filter((shift) => shift.employeeId === requesterEmployeeId)
            .map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.shiftDate} ({shift.startTime} - {shift.endTime})
              </option>
            ))}
        </select>

        {/* Target Employee Shift */}
        <label>Target Employee Shift:</label>
        <select
          value={targetShiftId}
          onChange={(e) => setTargetShiftId(e.target.value)}
        >
          <option value="">Select Target Shift</option>

          {shifts
            .filter((shift) => shift.employeeId === targetEmployeeId)
            .map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.shiftDate} ({shift.startTime} - {shift.endTime})
              </option>
            ))}
        </select>

        <button onClick={createSwapRequest}>Create Swap Request</button>
      </div>

      <button onClick={fetchSwapRequests}>Refresh Requests</button>

      {loading && <p>Loading swap requests...</p>}

      {error && <p>{error}</p>}

      {!loading && !error && requests.length === 0 && (
        <p>No swap requests found.</p>
      )}

      {!loading &&
        requests.map((request) => (
          <div className="swap-card" key={request.id}>
            <h3>Swap Request</h3>

            <p>
              <strong>Request ID:</strong> {request.id}
            </p>

            <p>
              <strong>Requester Employee:</strong>{" "}
              {getEmployeeName(request.requesterEmployeeId)}
            </p>

            <p>
              <strong>Target Employee:</strong>{" "}
              {getEmployeeName(request.targetEmployeeId)}
            </p>

            <p>
              <strong>Employee Response:</strong> {request.employeeResponse}
            </p>

            <p>
              <strong>Manager Response:</strong> {request.managerResponse}
            </p>

            <p>
              <strong>Status:</strong> {request.status}
            </p>

            {/* Employee Accept / Reject Buttons */}
            {request.employeeResponse === "Pending" &&
              request.status === "Pending" && (
                <div>
                  <button
                    disabled={processingId === request.id}
                    onClick={() => employeeResponse(request, "Accepted")}
                  >
                    {processingId === request.id ? "Processing..." : "Accept"}
                  </button>

                  <button
                    disabled={processingId === request.id}
                    onClick={() => employeeResponse(request, "Rejected")}
                  >
                    Reject
                  </button>
                </div>
              )}

            {/* Manager Approve / Reject Buttons */}
            {request.employeeResponse === "Accepted" &&
              request.managerResponse === "Pending" &&
              request.status === "Pending" && (
                <div>
                  <button
                    disabled={processingId === request.id}
                    onClick={() => managerResponse(request, "Approved")}
                  >
                    {processingId === request.id ? "Processing..." : "Approve"}
                  </button>

                  <button
                    disabled={processingId === request.id}
                    onClick={() => managerResponse(request, "Rejected")}
                  >
                    Reject
                  </button>
                </div>
              )}
          </div>
        ))}
    </div>
  );
}

export default ShiftSwapManagement;
