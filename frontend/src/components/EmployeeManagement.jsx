import { useState, useEffect } from "react";

import "./EmployeeManagement.css";

function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");

  const [editingId, setEditingId] = useState(null);

  // GET API - Fetch employees
  const fetchEmployees = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/employees");
      const data = await response.json();

      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }

      setEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  // Edit employee
  const handleEdit = (employee) => {
    setName(employee.name);
    setEmail(employee.email);
    setRole(employee.role);
    setDepartment(employee.department);

    setEditingId(employee.id);
  };

  // PUT API - Update employee
  const updateEmployee = async (e) => {
    e.preventDefault();

    try {
      const updatedEmployee = {
        name,
        email,
        role,
        department,
      };

      const response = await fetch(
        `http://localhost:5000/api/employees/${editingId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedEmployee),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Update failed");
      }

      alert("Employee updated successfully!");

      setEditingId(null);
      setName("");
      setEmail("");
      setRole("");
      setDepartment("");

      await fetchEmployees();
    } catch (error) {
      console.error("Error updating employee:", error);
      alert("Error updating employee");
    }
  };

  // DELETE API - Delete employee
  const deleteEmployee = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this employee?",
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/employees/${id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Delete failed");
      }

      alert("Employee deleted successfully!");

      await fetchEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
      alert("Error deleting employee");
    }
  };

  // POST API - Add new employee
  const addEmployee = async (e) => {
    e.preventDefault();

    const newEmployee = {
      name,
      email,
      role,
      department,
    };

    try {
      const response = await fetch("http://localhost:5000/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newEmployee),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add employee");
      }

      alert("Employee added successfully!");

      setName("");
      setEmail("");
      setRole("");
      setDepartment("");

      await fetchEmployees();
    } catch (error) {
      console.error("Error adding employee:", error);
      alert("Error adding employee");
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  return (
    <div className="container employee-container">
      <main>
        <h1>Employee Management</h1>

        <p>Manage your team members and employee information.</p>

        <form
          className="employee-form"
          onSubmit={editingId ? updateEmployee : addEmployee}
        >
          <h2>{editingId ? "Edit Employee" : "Add New Employee"}</h2>

          <input
            type="text"
            placeholder="Employee Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
          />

          <button type="submit">
            {editingId ? "Update Employee" : "Add Employee"}
          </button>
        </form>

        <div className="employee-section">
          <h2>Employee List</h2>

          {loading ? (
            <p>Loading employees...</p>
          ) : employees.length === 0 ? (
            <p>No employees found.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.name}</td>
                    <td>{employee.email}</td>
                    <td>{employee.role}</td>
                    <td>{employee.department}</td>

                    <td>
                      <button
                        type="button"
                        onClick={() => handleEdit(employee)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteEmployee(employee.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

export default EmployeeManagement;
