const express = require("express");
const router = express.Router();

const {
  createShiftRequirement,
  getAllShiftRequirements,
  getShiftRequirementById,
  deleteShiftRequirement,
  updateShiftRequirement,
  assignEmployeesToRequirement,
} = require("../controllers/shiftRequirementController");

// POST - Create shift requirement
router.post("/", createShiftRequirement);
// GET - Fetch all shift requirements
router.get("/", getAllShiftRequirements);
// GET - Fetch shift requirement by ID
router.get("/:id", getShiftRequirementById);
// DELETE - Delete shift requirement
router.delete("/:id", deleteShiftRequirement);
// PUT - Update shift requirement
router.put("/:id", updateShiftRequirement);

// PUT - Assign employees to shift requirement
router.put("/:id/assign", assignEmployeesToRequirement);

module.exports = router;
