const db = require("../config/firebase");

// Calculate Monday and Sunday of the requirement week
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

// Calculate shift hours within the selected week
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

// Calculate employee's existing assigned weekly hours
const getEmployeeWeeklyHours = async (employeeId, dateString) => {
  const { weekStart, weekEnd } = getWeekBounds(dateString);

  const snapshot = await db
    .collection("shifts")
    .where("employeeId", "==", employeeId)
    .get();

  let totalHours = 0;

  snapshot.docs.forEach((doc) => {
    const shift = doc.data();

    if (shift.status !== "Assigned") {
      return;
    }

    const shiftHours = getShiftHoursWithinWeek(shift, weekStart, weekEnd);

    totalHours += shiftHours;
  });

  return totalHours;
};

// Generate AI allocation recommendations
const generateRecommendations = async (req, res) => {
  try {
    const { requirementId } = req.body;

    if (!requirementId) {
      return res.status(400).json({
        message: "Shift requirement ID is required",
      });
    }

    // Step 1: Fetch shift requirement
    const requirementDoc = await db
      .collection("shiftRequirements")
      .doc(requirementId)
      .get();

    if (!requirementDoc.exists) {
      return res.status(404).json({
        message: "Shift requirement not found",
      });
    }

    const requirement = requirementDoc.data();

    // Get already assigned employees
    const assignedEmployeeIds = requirement.assignedEmployeeIds || [];

    const remainingPositions =
      requirement.requiredEmployeeCount - assignedEmployeeIds.length;

    // Step 2: Fetch all employees
    const employeeSnapshot = await db.collection("employees").get();

    const employees = employeeSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Step 3: Get weekday name
    const shiftDate = new Date(`${requirement.shiftDate}T00:00:00`);

    const dayName = shiftDate.toLocaleDateString("en-US", {
      weekday: "long",
    });

    // Step 4: Check employee eligibility
    const eligibleEmployees = [];

    const existingShiftsSnapshot = await db.collection("shifts").get();

    const existingShifts = existingShiftsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Convert shift date and time into JavaScript Date
    const getShiftDateTime = (date, time) => {
      return new Date(`${date}T${time}:00`);
    };

    // Requirement start and end time
    const requirementStart = getShiftDateTime(
      requirement.shiftDate,
      requirement.startTime,
    );

    const requirementEnd = getShiftDateTime(
      requirement.endDate || requirement.shiftDate,
      requirement.endTime,
    );

    for (const employee of employees) {
      if (assignedEmployeeIds.includes(employee.id)) {
        continue;
      }
      // Check department and role
      const departmentMatches =
        employee.department?.toLowerCase() ===
        requirement.department?.toLowerCase();

      const roleMatches =
        employee.role?.toLowerCase() ===
        requirement.requiredRole?.toLowerCase();

      if (!departmentMatches || !roleMatches) {
        continue;
      }

      // Fetch employee availability
      const availabilityDoc = await db
        .collection("employeeAvailability")
        .doc(employee.id)
        .get();

      if (!availabilityDoc.exists) {
        continue;
      }

      const availability = availabilityDoc.data();

      // Step 4.1: Check maximum weekly working hours

      const maxHoursPerWeek = Number(availability.maxHoursPerWeek);

      if (!Number.isFinite(maxHoursPerWeek) || maxHoursPerWeek <= 0) {
        continue;
      }

      const existingWeeklyHours = await getEmployeeWeeklyHours(
        employee.id,
        requirement.shiftDate,
      );

      const { weekStart, weekEnd } = getWeekBounds(requirement.shiftDate);

      const newShiftHours = getShiftHoursWithinWeek(
        requirement,
        weekStart,
        weekEnd,
      );

      const totalWeeklyHours = existingWeeklyHours + newShiftHours;

      if (totalWeeklyHours > maxHoursPerWeek) {
        continue;
      }

      // Check weekly availability
      const shiftDate = new Date(`${requirement.shiftDate}T00:00:00`);

      const dayName = shiftDate.toLocaleDateString("en-US", {
        weekday: "long",
      });

      const isAvailable =
        availability.weeklyAvailability?.[dayName] === "Available";

      // Check unavailable dates
      const isUnavailable = (availability.unavailableDates || []).includes(
        requirement.shiftDate,
      );

      if (!isAvailable || isUnavailable) {
        continue;
      }

      // Check existing shift conflicts
      const hasConflict = existingShifts.some((shift) => {
        if (String(shift.employeeId) !== String(employee.id)) {
          return false;
        }

        const existingStart = getShiftDateTime(
          shift.shiftDate,
          shift.startTime,
        );

        const existingEnd = getShiftDateTime(
          shift.endDate || shift.shiftDate,
          shift.endTime,
        );

        return requirementStart < existingEnd && requirementEnd > existingStart;
      });

      if (hasConflict) {
        continue;
      }

      // Employee passed all current eligibility checks
      eligibleEmployees.push({
        id: employee.id,
        name: employee.name,
        department: employee.department,
        role: employee.role,
        preferredShift: availability.preferredShift,
        maxHoursPerWeek: availability.maxHoursPerWeek,
        existingWeeklyHours: existingWeeklyHours,
      });
    }

    // Identify shift type using start time
    const getShiftType = (startTime) => {
      const hour = Number(startTime.split(":")[0]);

      if (hour >= 6 && hour < 12) {
        return "Morning";
      }

      if (hour >= 12 && hour < 18) {
        return "Afternoon";
      }

      return "Night";
    };

    const requiredShiftType = getShiftType(requirement.startTime);

    // Step 5: Calculate employee scores
    const rankedEmployees = eligibleEmployees.map((employee) => {
      let score = 0;

      if (employee.preferredShift === requiredShiftType) {
        score += 10;
      }

      return {
        ...employee,
        score,
      };
    });

    //  Sort employees by score
    const selectedEmployees = [...rankedEmployees]
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return a.existingWeeklyHours - b.existingWeeklyHours;
      })
      .slice(0, remainingPositions);

    //  Return eligible employees
    res.status(200).json({
      message: "AI recommendations generated successfully",
      requirementId,
      requiredEmployeeCount: requirement.requiredEmployeeCount,
      alreadyAssignedCount: assignedEmployeeIds.length,
      remainingPositions,
      eligibleEmployeeCount: rankedEmployees.length,
      selectedEmployeeCount: selectedEmployees.length,
      selectedEmployees,
    });
  } catch (error) {
    console.error("AI allocation error:", error);

    res.status(500).json({
      message: "Error generating recommendations",
      error: error.message,
    });
  }
};

module.exports = {
  generateRecommendations,
};
