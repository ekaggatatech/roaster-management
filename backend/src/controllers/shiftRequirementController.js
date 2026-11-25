const db = require("../config/firebase");

const getShiftDurationInHours = (shiftDate, startTime, endDate, endTime) => {
  const startDateTime = new Date(`${shiftDate}T${startTime}:00.000Z`);

  const finalEndDate = endDate || shiftDate;

  const endDateTime = new Date(`${finalEndDate}T${endTime}:00.000Z`);

  const duration = endDateTime.getTime() - startDateTime.getTime();

  return duration / (1000 * 60 * 60);
};

const getWeekBounds = (dateString) => {
  const date = new Date(`${dateString}T00:00:00.000Z`);

  const day = date.getUTCDay();

  const difference = day === 0 ? -6 : 1 - day;

  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + difference);

  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(monday.getUTCDate() + 7);

  return {
    weekStart: monday,
    weekEnd: nextMonday,
  };
};

const getShiftHoursWithinWeek = (shift, weekStart, weekEnd) => {
  const startDateTime = new Date(
    `${shift.shiftDate}T${shift.startTime}:00.000Z`,
  );

  const endDate = shift.endDate || shift.shiftDate;

  const endDateTime = new Date(`${endDate}T${shift.endTime}:00.000Z`);

  const actualStart = Math.max(startDateTime.getTime(), weekStart.getTime());

  const actualEnd = Math.min(endDateTime.getTime(), weekEnd.getTime());

  if (actualEnd <= actualStart) {
    return 0;
  }

  return (actualEnd - actualStart) / (1000 * 60 * 60);
};

const getEmployeeWeeklyHours = async (employeeId, dateString) => {
  const { weekStart, weekEnd } = getWeekBounds(dateString);

  const snapshot = await db
    .collection("shifts")
    .where("employeeId", "==", employeeId)
    .get();

  let totalHours = 0;

  snapshot.docs.forEach((doc) => {
    const shift = doc.data();

    // Count only assigned shifts
    if (shift.status !== "Assigned") {
      return;
    }

    const shiftHours = getShiftHoursWithinWeek(shift, weekStart, weekEnd);

    totalHours += shiftHours;
  });

  return totalHours;
};

const createShiftRequirement = async (req, res) => {
  try {
    const {
      shiftDate,
      startTime,
      endDate,
      endTime,
      department,
      requiredRole,
      requiredEmployeeCount,
    } = req.body;

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

    // Validate required fields
    if (
      !shiftDate ||
      !startTime ||
      !endTime ||
      !department ||
      !requiredRole ||
      requiredEmployeeCount === undefined ||
      requiredEmployeeCount === null
    ) {
      return res.status(400).json({
        message: "Please provide all required fields",
      });
    }

    // Validate department and required role
    if (
      typeof department !== "string" ||
      !department.trim() ||
      typeof requiredRole !== "string" ||
      !requiredRole.trim()
    ) {
      return res.status(400).json({
        message: "Department and required role must be valid text",
      });
    }

    // Check whether a matching employee exists
    const employeeSnapshot = await db
      .collection("employees")
      .where("department", "==", department.trim())
      .where("role", "==", requiredRole.trim())
      .get();

    if (employeeSnapshot.empty) {
      return res.status(400).json({
        message: "No employee found with the specified department and role",
      });
    }

    // Validate shift date
    if (!isValidDate(shiftDate)) {
      return res.status(400).json({
        message: "Invalid shift date. Use YYYY-MM-DD format",
      });
    }

    // If endDate is not provided, use shiftDate
    const finalEndDate = endDate ?? shiftDate;

    // Validate end date
    if (!isValidDate(finalEndDate)) {
      return res.status(400).json({
        message: "Invalid end date. Use YYYY-MM-DD format",
      });
    }

    const isValidTime = (time) => {
      return typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
    };

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return res.status(400).json({
        message: "Invalid time. Use HH:mm format",
      });
    }

    // Calculate complete shift duration
    const startDateTime = new Date(`${shiftDate}T${startTime}:00.000Z`);

    const endDateTime = new Date(`${finalEndDate}T${endTime}:00.000Z`);

    const duration = endDateTime.getTime() - startDateTime.getTime();

    // Validate shift date and time range
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

    // Validate employee count
    const employeeCount = Number(requiredEmployeeCount);

    if (!Number.isInteger(employeeCount) || employeeCount <= 0) {
      return res.status(400).json({
        message: "Required employee count must be a positive integer",
      });
    }

    // Prepare shift requirement data
    const requirementData = {
      shiftDate,
      startTime,
      endDate: finalEndDate,
      endTime,
      department: department.trim(),
      requiredRole: requiredRole.trim(),
      requiredEmployeeCount: employeeCount,
      assignedEmployeeIds: [],
      status: "Open",
      createdAt: new Date(),
    };

    // Save to Firestore
    const docRef = await db
      .collection("shiftRequirements")
      .add(requirementData);

    res.status(201).json({
      message: "Shift requirement created successfully",
      requirement: {
        id: docRef.id,
        ...requirementData,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating shift requirement",
      error: error.message,
    });
  }
};

// GET API - Fetch all shift requirements
const getAllShiftRequirements = async (req, res) => {
  try {
    const snapshot = await db.collection("shiftRequirements").get();

    const requirements = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const requirement = doc.data();

        const assignedEmployeeIds = requirement.assignedEmployeeIds || [];

        // Fetch assigned employee details
        const assignedEmployees = await Promise.all(
          assignedEmployeeIds.map(async (employeeId) => {
            const employeeDoc = await db
              .collection("employees")
              .doc(employeeId)
              .get();

            if (!employeeDoc.exists) {
              return {
                id: employeeId,
                name: "Employee not found",
              };
            }

            const employee = employeeDoc.data();

            return {
              id: employeeId,
              name: employee.name,
              department: employee.department,
              role: employee.role,
            };
          }),
        );

        return {
          id: doc.id,
          ...requirement,
          assignedEmployees,
        };
      }),
    );

    res.status(200).json({
      message: "Shift requirements fetched successfully",
      requirements,
    });
  } catch (error) {
    console.error("Fetch requirements error:", error);

    res.status(500).json({
      message: "Error fetching shift requirements",
      error: error.message,
    });
  }
};

// GET API - Fetch shift requirement by ID
const getShiftRequirementById = async (req, res) => {
  try {
    const requirementId = req.params.id;

    const doc = await db
      .collection("shiftRequirements")
      .doc(requirementId)
      .get();

    if (!doc.exists) {
      return res.status(404).json({
        message: "Shift requirement not found",
      });
    }

    res.status(200).json({
      message: "Shift requirement fetched successfully",
      requirement: {
        id: doc.id,
        ...doc.data(),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching shift requirement",
      error: error.message,
    });
  }
};

// DELETE API - Delete shift requirement
const deleteShiftRequirement = async (req, res) => {
  try {
    const requirementId = req.params.id;

    const requirementRef = db
      .collection("shiftRequirements")
      .doc(requirementId);

    const requirementDoc = await requirementRef.get();

    if (!requirementDoc.exists) {
      return res.status(404).json({
        message: "Shift requirement not found",
      });
    }

    const requirementData = requirementDoc.data();

    // Prevent deletion if employees are already assigned
    if (requirementData.assignedEmployeeIds?.length > 0) {
      return res.status(400).json({
        message: "Cannot delete requirement with assigned employees",
      });
    }

    await requirementRef.delete();

    res.status(200).json({
      message: "Shift requirement deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting shift requirement",
      error: error.message,
    });
  }
};

// PUT API - Update shift requirement
const updateShiftRequirement = async (req, res) => {
  try {
    const requirementId = req.params.id;

    const requirementRef = db
      .collection("shiftRequirements")
      .doc(requirementId);

    const requirementDoc = await requirementRef.get();

    if (!requirementDoc.exists) {
      return res.status(404).json({
        message: "Shift requirement not found",
      });
    }

    const {
      shiftDate,
      startTime,
      endDate,
      endTime,
      department,
      requiredRole,
      requiredEmployeeCount,
    } = req.body;

    const updates = {};

    if (shiftDate !== undefined) {
      const parsedDate = new Date(`${shiftDate}T00:00:00.000Z`);

      if (
        typeof shiftDate !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(shiftDate) ||
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== shiftDate
      ) {
        return res.status(400).json({
          message: "Invalid shift date. Use YYYY-MM-DD format",
        });
      }

      updates.shiftDate = shiftDate;
    }

    if (endDate !== undefined) {
      const parsedEndDate = new Date(`${endDate}T00:00:00.000Z`);

      if (
        typeof endDate !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
        Number.isNaN(parsedEndDate.getTime()) ||
        parsedEndDate.toISOString().slice(0, 10) !== endDate
      ) {
        return res.status(400).json({
          message: "Invalid end date. Use YYYY-MM-DD format",
        });
      }

      updates.endDate = endDate;
    }

    if (startTime !== undefined) {
      if (
        typeof startTime !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)
      ) {
        return res.status(400).json({
          message: "Invalid start time. Use HH:mm format",
        });
      }

      updates.startTime = startTime;
    }

    if (endTime !== undefined) {
      if (
        typeof endTime !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)
      ) {
        return res.status(400).json({
          message: "Invalid end time. Use HH:mm format",
        });
      }

      updates.endTime = endTime;
    }

    if (department !== undefined) {
      if (typeof department !== "string" || !department.trim()) {
        return res.status(400).json({
          message: "Department must be valid text",
        });
      }

      updates.department = department.trim();
    }

    if (requiredRole !== undefined) {
      if (typeof requiredRole !== "string" || !requiredRole.trim()) {
        return res.status(400).json({
          message: "Required role must be valid text",
        });
      }

      updates.requiredRole = requiredRole.trim();
    }

    if (requiredEmployeeCount !== undefined) {
      const employeeCount = Number(requiredEmployeeCount);

      if (!Number.isInteger(employeeCount) || employeeCount <= 0) {
        return res.status(400).json({
          message: "Required employee count must be a positive integer",
        });
      }

      updates.requiredEmployeeCount = employeeCount;
    }

    const currentData = requirementDoc.data();

    // Get final date and time values
    const finalShiftDate = updates.shiftDate ?? currentData.shiftDate;
    const finalStartTime = updates.startTime ?? currentData.startTime;

    const finalEndDate =
      updates.endDate ??
      (updates.shiftDate !== undefined
        ? (() => {
            const oldStart = new Date(`${currentData.shiftDate}T00:00:00Z`);
            const oldEnd = new Date(
              `${currentData.endDate ?? currentData.shiftDate}T00:00:00Z`,
            );

            const dayDifference = (oldEnd - oldStart) / (1000 * 60 * 60 * 24);

            const newEnd = new Date(`${updates.shiftDate}T00:00:00Z`);

            newEnd.setUTCDate(newEnd.getUTCDate() + dayDifference);

            return newEnd.toISOString().slice(0, 10);
          })()
        : (currentData.endDate ?? currentData.shiftDate));

    // Save the calculated end date when shift date changes
    if (updates.shiftDate !== undefined && updates.endDate === undefined) {
      updates.endDate = finalEndDate;
    }

    const finalEndTime = updates.endTime ?? currentData.endTime;

    // Convert dates and times into JavaScript Date objects
    const startDateTime = new Date(
      `${finalShiftDate}T${finalStartTime}:00.000Z`,
    );

    const endDateTime = new Date(`${finalEndDate}T${finalEndTime}:00.000Z`);

    // Calculate shift duration
    const duration = endDateTime.getTime() - startDateTime.getTime();

    console.log("Shift date validation:", {
      finalShiftDate,
      finalStartTime,
      finalEndDate,
      finalEndTime,
      durationInHours: duration / (1000 * 60 * 60),
    });

    // Validate shift duration
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

    const finalCount =
      updates.requiredEmployeeCount ?? currentData.requiredEmployeeCount;

    if (finalCount < (currentData.assignedEmployeeIds || []).length) {
      return res.status(400).json({
        message: "Required count cannot be less than assigned employees",
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Please provide at least one field to update",
      });
    }

    await requirementRef.update(updates);

    const updatedDoc = await requirementRef.get();

    res.status(200).json({
      message: "Shift requirement updated successfully",
      requirement: {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating shift requirement",
      error: error.message,
    });
  }
};

const assignEmployeesToRequirement = async (req, res) => {
  try {
    const requirementId = req.params.id;
    const { employeeIds } = req.body;

    // 1. Validate employee IDs
    if (
      !Array.isArray(employeeIds) ||
      employeeIds.length === 0 ||
      employeeIds.some((id) => typeof id !== "string" || !id.trim())
    ) {
      return res.status(400).json({
        message: "Please provide valid employee IDs",
      });
    }

    // 2. Prevent duplicate IDs
    if (new Set(employeeIds).size !== employeeIds.length) {
      return res.status(400).json({
        message: "Duplicate employee IDs are not allowed",
      });
    }

    // 3. Get shift requirement
    const requirementRef = db
      .collection("shiftRequirements")
      .doc(requirementId);

    const requirementDoc = await requirementRef.get();

    if (!requirementDoc.exists) {
      return res.status(404).json({
        message: "Shift requirement not found",
      });
    }

    const requirement = requirementDoc.data();

    const assignedEmployeeIds = requirement.assignedEmployeeIds || [];

    if (!Array.isArray(assignedEmployeeIds)) {
      return res.status(400).json({
        message: "Invalid assigned employee data",
      });
    }

    // 4. Find new employees only
    const newEmployeeIds = employeeIds.filter(
      (id) => !assignedEmployeeIds.includes(id),
    );

    if (newEmployeeIds.length === 0) {
      return res.status(200).json({
        message: "These employees are already assigned",
        assignedEmployeeIds,
      });
    }

    // 5. Validate required employee count
    if (
      assignedEmployeeIds.length + newEmployeeIds.length >
      requirement.requiredEmployeeCount
    ) {
      return res.status(400).json({
        message: "Required employee count exceeded",
      });
    }

    // 6. Prepare employee details
    const employeeDetails = [];

    // 7. Validate each employee
    for (const employeeId of newEmployeeIds) {
      const employeeDoc = await db
        .collection("employees")
        .doc(employeeId)
        .get();

      if (!employeeDoc.exists) {
        return res.status(404).json({
          message: `Employee ${employeeId} not found`,
        });
      }

      const employee = employeeDoc.data();

      // 8. Check department and role
      if (
        employee.department !== requirement.department ||
        employee.role !== requirement.requiredRole
      ) {
        return res.status(400).json({
          message: `Employee ${employeeId} does not match department or role`,
        });
      }

      employeeDetails.push({
        employeeId,
        employeeName: employee.name,
      });

      // 9. Check existing shift conflicts
      const existingShifts = await db
        .collection("shifts")
        .where("employeeId", "==", employeeId)
        .get();

      const requirementStart = new Date(
        `${requirement.shiftDate}T${requirement.startTime}:00.000Z`,
      );

      const requirementEnd = new Date(
        `${requirement.endDate ?? requirement.shiftDate}T${requirement.endTime}:00.000Z`,
      );

      const hasConflict = existingShifts.docs.some((doc) => {
        const shift = doc.data();

        const existingStart = new Date(
          `${shift.shiftDate}T${shift.startTime}:00.000Z`,
        );

        const existingEnd = new Date(
          `${shift.endDate ?? shift.shiftDate}T${shift.endTime}:00.000Z`,
        );

        return requirementStart < existingEnd && requirementEnd > existingStart;
      });

      if (hasConflict) {
        return res.status(409).json({
          message: `Employee ${employeeId} already has a conflicting shift`,
        });
      }

      // 10. Check employee availability
      const availabilityDoc = await db
        .collection("employeeAvailability")
        .doc(employeeId)
        .get();

      if (!availabilityDoc.exists) {
        return res.status(400).json({
          message: `Availability details not found for employee ${employeeId}`,
        });
      }

      const availability = availabilityDoc.data();

      // 11. Check maximum weekly working hours
      const maxHoursPerWeek = Number(availability.maxHoursPerWeek);

      if (!Number.isFinite(maxHoursPerWeek) || maxHoursPerWeek <= 0) {
        return res.status(400).json({
          message: `Invalid maximum weekly hours for employee ${employeeId}`,
        });
      }

      const existingWeeklyHours = await getEmployeeWeeklyHours(
        employeeId,
        requirement.shiftDate,
      );

      const { weekStart, weekEnd } = getWeekBounds(requirement.shiftDate);

      const newShiftHours = getShiftHoursWithinWeek(
        requirement,
        weekStart,
        weekEnd,
      );

      if (existingWeeklyHours + newShiftHours > maxHoursPerWeek) {
        return res.status(400).json({
          message: `Employee ${employeeId} exceeds maximum weekly hours. Existing: ${existingWeeklyHours}, New shift: ${newShiftHours}, Maximum: ${maxHoursPerWeek}`,
        });
      }

      // 12. Check unavailable dates and weekly availability
      const unavailableDates = availability.unavailableDates || [];

      const weeklyAvailability = availability.weeklyAvailability || {};

      const currentDate = new Date(`${requirement.shiftDate}T00:00:00.000Z`);

      const finalDate = new Date(
        `${requirement.endDate ?? requirement.shiftDate}T00:00:00.000Z`,
      );

      while (currentDate <= finalDate) {
        const dateString = currentDate.toISOString().slice(0, 10);

        const dayName = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ][currentDate.getUTCDay()];

        // Check weekly availability
        if (weeklyAvailability[dayName] !== "Available") {
          return res.status(400).json({
            message: `Employee ${employeeId} is not available on ${dayName}`,
          });
        }

        // Check unavailable dates
        if (unavailableDates.includes(dateString)) {
          return res.status(400).json({
            message: `Employee ${employeeId} is unavailable on ${dateString}`,
          });
        }

        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }
    }

    // 13. Prepare updated employee IDs
    const updatedEmployeeIds = [...assignedEmployeeIds, ...newEmployeeIds];

    // 14. Create Firestore batch
    const batch = db.batch();

    // 15. Create actual shift documents
    for (const employee of employeeDetails) {
      const shiftRef = db.collection("shifts").doc();

      batch.set(shiftRef, {
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        shiftDate: requirement.shiftDate,
        startTime: requirement.startTime,
        endDate: requirement.endDate ?? requirement.shiftDate,
        endTime: requirement.endTime,
        status: "Assigned",
        createdAt: new Date(),
      });
    }

    // 16. Update shift requirement
    batch.update(requirementRef, {
      assignedEmployeeIds: updatedEmployeeIds,
      status:
        updatedEmployeeIds.length === requirement.requiredEmployeeCount
          ? "Filled"
          : "Open",
    });

    // 17. Save all changes together
    await batch.commit();

    return res.status(200).json({
      message: "Employees assigned successfully",
      assignedEmployeeIds: updatedEmployeeIds,
    });
  } catch (error) {
    console.error("Assignment error:", error);

    return res.status(500).json({
      message: "Error assigning employees",
      error: error.message,
    });
  }
};

module.exports = {
  createShiftRequirement,
  getAllShiftRequirements,
  getShiftRequirementById,
  deleteShiftRequirement,
  updateShiftRequirement,
  assignEmployeesToRequirement,
};
