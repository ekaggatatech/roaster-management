const express = require("express");
const router = express.Router();

const {
  createAvailability,
  getAllAvailability,
  getAvailabilityByEmployeeId,
  updateAvailability,
} = require("../controllers/availabilityController");

router.post("/", createAvailability);
router.get("/", getAllAvailability);
router.get("/:employeeId", getAvailabilityByEmployeeId);
router.put("/:employeeId", updateAvailability);

module.exports = router;
