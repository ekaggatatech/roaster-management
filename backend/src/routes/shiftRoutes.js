const express = require("express");
const router = express.Router();

const db = require("../config/firebase");

// POST API - Create a new shift
router.post("/", async (req, res) => {
  try {
    const { employeeId, shiftDate, startTime, endDate, endTime, status } =
      req.body;

    // Validate date
    const isValidDate = (date) => {
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
      }

      const parsedDate = new Date(`${date}T00:00:00.000Z`);

      return (
        !Number.isNaN(parsedDate.getTime()) &&
        parsedDate.toISOString().slice(0, 10) === date
      );
    };

    // Validate time
    const isValidTime = (time) => {
      return typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
    };

    // Check required fields
    if (!employeeId || !shiftDate || !startTime || !endTime) {
      return res.status(400).json({
        message: "Please provide all required fields",
      });
    }

    // Check employee
    const employeeDoc = await db.collection("employees").doc(employeeId).get();

    if (!employeeDoc.exists) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    // Default end date to shift date for older requests
    const finalEndDate = endDate ?? shiftDate;

    // Validate dates
    if (!isValidDate(shiftDate) || !isValidDate(finalEndDate)) {
      return res.status(400).json({
        message: "Invalid date. Use YYYY-MM-DD format",
      });
    }

    // Validate times
    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return res.status(400).json({
        message: "Invalid time. Use HH:mm format",
      });
    }

    // Convert to complete date-time values
    const startDateTime = new Date(`${shiftDate}T${startTime}:00.000Z`);

    const endDateTime = new Date(`${finalEndDate}T${endTime}:00.000Z`);

    // Calculate duration
    const duration = endDateTime.getTime() - startDateTime.getTime();

    if (duration <= 0) {
      return res.status(400).json({
        message: "End date and time must be later than start date and time",
      });
    }

    // Prevent shifts longer than 24 hours
    if (duration > 24 * 60 * 60 * 1000) {
      return res.status(400).json({
        message: "Shift duration cannot exceed 24 hours",
      });
    }

    // Fetch all shifts for this employee
    const existingShifts = await db
      .collection("shifts")
      .where("employeeId", "==", employeeId)
      .get();

    // Check conflicts across calendar days
    const hasConflict = existingShifts.docs.some((doc) => {
      const existingShift = doc.data();

      const existingEndDate = existingShift.endDate ?? existingShift.shiftDate;

      const existingStart = new Date(
        `${existingShift.shiftDate}T${existingShift.startTime}:00.000Z`,
      );

      const existingEnd = new Date(
        `${existingEndDate}T${existingShift.endTime}:00.000Z`,
      );

      return startDateTime < existingEnd && endDateTime > existingStart;
    });

    if (hasConflict) {
      return res.status(409).json({
        message:
          "Shift conflict! This employee already has a shift during this time.",
      });
    }

    // Prepare shift data
    const newShift = {
      employeeId,
      employeeName: employeeDoc.data().name,
      shiftDate,
      startTime,
      endDate: finalEndDate,
      endTime,
      status: status || "Assigned",
      createdAt: new Date(),
    };

    // Save shift in Firestore
    const docRef = await db.collection("shifts").add(newShift);

    res.status(201).json({
      message: "Shift created successfully",
      id: docRef.id,
      shift: newShift,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating shift",
      error: error.message,
    });
  }
});

// GET API - Get all shifts
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("shifts").get();

    const shifts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(shifts);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching shifts",
      error: error.message,
    });
  }
});

// PUT API - Update an existing shift
router.put("/:id", async (req, res) => {
  try {
    const shiftId = req.params.id;

    const { shiftDate, startTime, endDate, endTime, status } = req.body;

    // Check whether the shift exists
    const shiftRef = db.collection("shifts").doc(shiftId);
    const shiftDoc = await shiftRef.get();

    if (!shiftDoc.exists) {
      return res.status(404).json({
        message: "Shift not found",
      });
    }

    const existingShift = shiftDoc.data();

    // Use existing values when a field is not provided
    const updatedShift = {
      shiftDate: shiftDate ?? existingShift.shiftDate,
      startTime: startTime ?? existingShift.startTime,
      endDate:
        endDate ??
        (shiftDate !== undefined
          ? shiftDate
          : (existingShift.endDate ?? existingShift.shiftDate)),
      endTime: endTime ?? existingShift.endTime,
      status: status ?? existingShift.status,
    };

    // Validate shift date
    const isValidDate = (date) => {
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
      }

      const parsedDate = new Date(`${date}T00:00:00.000Z`);

      return (
        !Number.isNaN(parsedDate.getTime()) &&
        parsedDate.toISOString().slice(0, 10) === date
      );
    };

    // Validate shift time
    const isValidTime = (time) => {
      return typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
    };

    // Check date and time formats
    if (
      !isValidDate(updatedShift.shiftDate) ||
      !isValidDate(updatedShift.endDate) ||
      !isValidTime(updatedShift.startTime) ||
      !isValidTime(updatedShift.endTime)
    ) {
      return res.status(400).json({
        message: "Invalid shift date or time",
      });
    }

    // Convert into complete date-time values
    const startDateTime = new Date(
      `${updatedShift.shiftDate}T${updatedShift.startTime}:00.000Z`,
    );

    const endDateTime = new Date(
      `${updatedShift.endDate}T${updatedShift.endTime}:00.000Z`,
    );

    // Calculate duration
    const duration = endDateTime.getTime() - startDateTime.getTime();

    // Validate duration
    if (duration <= 0) {
      return res.status(400).json({
        message: "End date and time must be later than start date and time",
      });
    }

    // Prevent shifts longer than 24 hours
    if (duration > 24 * 60 * 60 * 1000) {
      return res.status(400).json({
        message: "Shift duration cannot exceed 24 hours",
      });
    }

    // Check for conflicts with other shifts
    const existingShifts = await db
      .collection("shifts")
      .where("employeeId", "==", existingShift.employeeId)
      .get();

    // Check conflicts across calendar days
    const hasConflict = existingShifts.docs.some((doc) => {
      // Ignore the shift currently being updated
      if (doc.id === shiftId) return false;

      const otherShift = doc.data();

      // Support older shifts without endDate
      const otherEndDate = otherShift.endDate ?? otherShift.shiftDate;

      // Convert other shift into complete date-time values
      const otherStart = new Date(
        `${otherShift.shiftDate}T${otherShift.startTime}:00.000Z`,
      );

      const otherEnd = new Date(
        `${otherEndDate}T${otherShift.endTime}:00.000Z`,
      );

      // Check whether the shifts overlap
      return startDateTime < otherEnd && endDateTime > otherStart;
    });

    if (hasConflict) {
      return res.status(409).json({
        message: "Shift conflict! Another shift overlaps with this timing.",
      });
    }

    // Update shift in Firestore
    await shiftRef.update(updatedShift);

    res.status(200).json({
      message: "Shift updated successfully",
      id: shiftId,
      shift: {
        ...existingShift,
        ...updatedShift,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating shift",
      error: error.message,
    });
  }
});

// DELETE API - Delete an existing shift
router.delete("/:id", async (req, res) => {
  try {
    const shiftId = req.params.id;

    // Check whether the shift exists
    const shiftRef = db.collection("shifts").doc(shiftId);
    const shiftDoc = await shiftRef.get();

    if (!shiftDoc.exists) {
      return res.status(404).json({
        message: "Shift not found",
      });
    }

    // Delete shift from Firestore
    await shiftRef.delete();

    res.status(200).json({
      message: "Shift deleted successfully",
      id: shiftId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting shift",
      error: error.message,
    });
  }
});

module.exports = router;
