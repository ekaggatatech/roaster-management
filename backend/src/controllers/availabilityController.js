const db = require("../config/firebase");

// POST API - Save employee availability
const createAvailability = async (req, res) => {
  try {
    const {
      employeeId,
      maxHoursPerWeek,
      preferredShift,
      weeklyAvailability,
      unavailableDates,
    } = req.body;

    // Validate required fields
    if (
      !employeeId ||
      maxHoursPerWeek === undefined ||
      maxHoursPerWeek === null
    ) {
      return res.status(400).json({
        message: "Employee ID and maximum weekly hours are required",
      });
    }

    const hours = Number(maxHoursPerWeek);

    if (!Number.isFinite(hours) || hours <= 0 || hours > 168) {
      return res.status(400).json({
        message: "Maximum weekly hours must be between 1 and 168",
      });
    }

    // Check employee exists
    const employeeDoc = await db.collection("employees").doc(employeeId).get();

    if (!employeeDoc.exists) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    // Validate optional fields
    if (
      weeklyAvailability !== undefined &&
      (weeklyAvailability === null ||
        typeof weeklyAvailability !== "object" ||
        Array.isArray(weeklyAvailability))
    ) {
      return res.status(400).json({
        message: "weeklyAvailability must be an object",
      });
    }

    const allowedDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    const allowedStatuses = ["Available", "Off"];

    if (
      weeklyAvailability !== undefined &&
      Object.entries(weeklyAvailability).some(
        ([day, status]) =>
          !allowedDays.includes(day) || !allowedStatuses.includes(status),
      )
    ) {
      return res.status(400).json({
        message: "Invalid day or availability status",
      });
    }

    if (
      unavailableDates !== undefined &&
      (!Array.isArray(unavailableDates) ||
        !unavailableDates.every((date) => isValidDate(date)))
    ) {
      return res.status(400).json({
        message: "unavailableDates must be an array of YYYY-MM-DD dates",
      });
    }

    const allowedShifts = ["Morning", "Afternoon", "Night", "Not Specified"];

    if (
      preferredShift !== undefined &&
      !allowedShifts.includes(preferredShift)
    ) {
      return res.status(400).json({
        message: "Invalid preferred shift",
      });
    }

    const employeeData = employeeDoc.data();

    const availabilityData = {
      employeeId,
      employeeName: employeeData.name,
      maxHoursPerWeek: hours,
      preferredShift: preferredShift || "Not Specified",
      updatedBy: "employee",
      updatedAt: new Date(),
    };

    if (weeklyAvailability !== undefined) {
      availabilityData.weeklyAvailability = weeklyAvailability;
    }

    if (unavailableDates !== undefined) {
      availabilityData.unavailableDates = unavailableDates;
    }

    // Merge preserves existing fields
    await db
      .collection("employeeAvailability")
      .doc(employeeId)
      .set(availabilityData, { merge: true });

    res.status(201).json({
      message: "Employee availability saved successfully",
      availability: availabilityData,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error saving employee availability",
      error: error.message,
    });
  }
};

// GET API - Fetch all employee availability
const getAllAvailability = async (req, res) => {
  try {
    const snapshot = await db.collection("employeeAvailability").get();

    const availability = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      message: "Employee availability fetched successfully",
      availability,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching employee availability",
      error: error.message,
    });
  }
};

// GET API - Fetch availability by Employee ID
const getAvailabilityByEmployeeId = async (req, res) => {
  try {
    const employeeId = req.params.employeeId;

    const doc = await db
      .collection("employeeAvailability")
      .doc(employeeId)
      .get();

    if (!doc.exists) {
      return res.status(404).json({
        message: "Employee availability not found",
      });
    }

    res.status(200).json({
      message: "Employee availability fetched successfully",
      availability: {
        id: doc.id,
        ...doc.data(),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching employee availability",
      error: error.message,
    });
  }
};

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

// PUT API - Update employee availability
const updateAvailability = async (req, res) => {
  try {
    // Get employee ID from URL
    const employeeId = req.params.employeeId;

    // Get updated details from request body
    const {
      maxHoursPerWeek,
      preferredShift,
      weeklyAvailability,
      unavailableDates,
    } = req.body;

    // Check whether employee availability exists
    const availabilityRef = db
      .collection("employeeAvailability")
      .doc(employeeId);

    const availabilityDoc = await availabilityRef.get();

    if (!availabilityDoc.exists) {
      return res.status(404).json({
        message: "Employee availability not found",
      });
    }

    if (
      weeklyAvailability !== undefined &&
      (weeklyAvailability === null ||
        typeof weeklyAvailability !== "object" ||
        Array.isArray(weeklyAvailability))
    ) {
      return res.status(400).json({
        message: "weeklyAvailability must be an object",
      });
    }

    const allowedDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    const allowedStatuses = ["Available", "Off"];

    if (
      weeklyAvailability !== undefined &&
      Object.entries(weeklyAvailability).some(
        ([day, status]) =>
          !allowedDays.includes(day) || !allowedStatuses.includes(status),
      )
    ) {
      return res.status(400).json({
        message: "Invalid day or availability status",
      });
    }

    // Validate unavailableDates
    if (
      unavailableDates !== undefined &&
      (!Array.isArray(unavailableDates) ||
        !unavailableDates.every((date) => isValidDate(date)))
    ) {
      return res.status(400).json({
        message: "unavailableDates must be an array of YYYY-MM-DD dates",
      });
    }

    const allowedShifts = ["Morning", "Afternoon", "Night", "Not Specified"];

    if (
      preferredShift !== undefined &&
      !allowedShifts.includes(preferredShift)
    ) {
      return res.status(400).json({
        message: "Invalid preferred shift",
      });
    }

    // Prepare updated data
    const updateData = {
      updatedAt: new Date(),
    };

    if (maxHoursPerWeek !== undefined) {
      const hours = Number(maxHoursPerWeek);

      if (!Number.isFinite(hours) || hours <= 0 || hours > 168) {
        return res.status(400).json({
          message: "Maximum weekly hours must be between 1 and 168",
        });
      }

      updateData.maxHoursPerWeek = hours;
    }

    if (preferredShift !== undefined) {
      updateData.preferredShift = preferredShift;
    }

    if (weeklyAvailability !== undefined) {
      updateData.weeklyAvailability = weeklyAvailability;
    }

    if (unavailableDates !== undefined) {
      updateData.unavailableDates = unavailableDates;
    }

    // Update Firestore document
    await availabilityRef.update(updateData);

    res.status(200).json({
      message: "Employee availability updated successfully",
      availability: {
        id: employeeId,
        ...availabilityDoc.data(),
        ...updateData,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating employee availability",
      error: error.message,
    });
  }
};

module.exports = {
  createAvailability,
  getAllAvailability,
  getAvailabilityByEmployeeId,
  updateAvailability,
};
