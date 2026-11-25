const express = require("express");
const router = express.Router();

const {
  createSwapRequest,
  getAllSwapRequests,
  employeeSwapResponse,
  managerSwapResponse,
} = require("../controllers/shiftSwapController");

router.post("/", createSwapRequest);
router.get("/", getAllSwapRequests);
router.put("/:id/employee-response", employeeSwapResponse);
router.put("/:id/manager-response", managerSwapResponse);

module.exports = router;
