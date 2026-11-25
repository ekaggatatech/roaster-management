const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/firebase");

const { getApp } = require("firebase-admin/app");

console.log("Firebase project ID:", getApp().options.projectId);
console.log("Firestore database ID:", db.databaseId);

const shiftRoutes = require("./routes/shiftRoutes");
const shiftSwapRoutes = require("./routes/shiftSwapRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const shiftRequirementRoutes = require("./routes/shiftRequirementRoutes");

const aiAllocationRoutes = require("./routes/aiAllocationRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use("/api/shifts", shiftRoutes);

app.use("/api/shift-swaps", shiftSwapRoutes);

app.use("/api/availability", availabilityRoutes);

app.use("/api/shift-requirements", shiftRequirementRoutes);

app.use("/api/ai-allocation", aiAllocationRoutes);

// Test API
app.get("/", (req, res) => {
  res.send("Hourmaker Roster Management API is running!");
});

// GET API - Get all employees from Firestore
app.get("/api/employees", async (req, res) => {
  try {
    const snapshot = await db.collection("employees").get();

    const employees = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching employees",
      error: error.message,
    });
  }
});

// POST API - Add a new employee to Firestore
app.post("/api/employees", async (req, res) => {
  try {
    const newEmployee = {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
      department: req.body.department,
    };

    const docRef = await db.collection("employees").add(newEmployee);

    res.status(201).json({
      message: "Employee added successfully",
      id: docRef.id,
      employee: newEmployee,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error adding employee",
      error: error.message,
    });
  }
});

// PUT API - Update employee in Firestore
app.put("/api/employees/:id", async (req, res) => {
  try {
    const employeeId = req.params.id;

    const employeeRef = db.collection("employees").doc(employeeId);

    const employeeDoc = await employeeRef.get();

    console.log("Employee ID:", employeeId);
    console.log("Document exists:", employeeDoc.exists);
    console.log("Employee data:", employeeDoc.data());

    if (!employeeDoc.exists) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    const updatedEmployee = {
      name: req.body.name ?? employeeDoc.data().name,
      email: req.body.email ?? employeeDoc.data().email,
      role: req.body.role ?? employeeDoc.data().role,
      department: req.body.department ?? employeeDoc.data().department,
    };

    await employeeRef.update(updatedEmployee);

    res.status(200).json({
      message: "Employee updated successfully",
      id: employeeId,
      employee: updatedEmployee,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating employee",
      error: error.message,
    });
  }
});

// DELETE API - Remove employee from Firestore
app.delete("/api/employees/:id", async (req, res) => {
  try {
    const employeeId = req.params.id;

    const employeeRef = db.collection("employees").doc(employeeId);

    const employeeDoc = await employeeRef.get();

    if (!employeeDoc.exists) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    const deletedEmployee = employeeDoc.data();

    await employeeRef.delete();

    res.status(200).json({
      message: "Employee deleted successfully",
      id: employeeId,
      employee: deletedEmployee,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting employee",
      error: error.message,
    });
  }
});

// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
