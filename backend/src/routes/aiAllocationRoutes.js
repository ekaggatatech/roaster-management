const express = require("express");

const router = express.Router();

const {
  generateRecommendations,
} = require("../controllers/aiAllocationController");

// Generate AI allocation recommendations
router.post("/recommendations", generateRecommendations);

module.exports = router;
