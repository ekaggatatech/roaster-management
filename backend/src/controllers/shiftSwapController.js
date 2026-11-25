const db = require("../config/firebase");

// Create a shift swap request
const createSwapRequest = async (req, res) => {
  try {
    const {
      requesterEmployeeId,
      targetEmployeeId,
      requesterShiftId,
      targetShiftId,
    } = req.body;

    // Validate required fields
    if (
      !requesterEmployeeId ||
      !targetEmployeeId ||
      !requesterShiftId ||
      !targetShiftId
    ) {
      return res.status(400).json({
        message: "All employee IDs and shift IDs are required",
      });
    }

    // Employees cannot swap with themselves
    if (requesterEmployeeId === targetEmployeeId) {
      return res.status(400).json({
        message: "You cannot request a swap with yourself",
      });
    }

    // Fetch both shifts from Firestore
    const requesterShiftDoc = await db
      .collection("shifts")
      .doc(requesterShiftId)
      .get();

    const targetShiftDoc = await db
      .collection("shifts")
      .doc(targetShiftId)
      .get();

    if (!requesterShiftDoc.exists || !targetShiftDoc.exists) {
      return res.status(404).json({
        message: "One or both shifts were not found",
      });
    }

    const requesterShift = requesterShiftDoc.data();
    const targetShift = targetShiftDoc.data();

    // Verify shift ownership
    if (requesterShift.employeeId !== requesterEmployeeId) {
      return res.status(400).json({
        message: "The first shift does not belong to the requesting employee",
      });
    }

    if (targetShift.employeeId !== targetEmployeeId) {
      return res.status(400).json({
        message: "The second shift does not belong to the target employee",
      });
    }

    // Verify both shifts are assigned
    if (
      requesterShift.status !== "Assigned" ||
      targetShift.status !== "Assigned"
    ) {
      return res.status(400).json({
        message: "Only assigned shifts can be swapped",
      });
    }

    // Save request in Firestore
    const swapRequest = {
      requesterEmployeeId,
      targetEmployeeId,
      requesterShiftId,
      targetShiftId,
      requestDate: new Date().toISOString().slice(0, 10),
      status: "Pending",
      employeeResponse: "Pending",
      managerResponse: "Pending",
      createdAt: new Date(),
    };

    const docRef = await db.collection("shiftSwapRequests").add(swapRequest);

    return res.status(201).json({
      message: "Shift swap request created successfully",
      requestId: docRef.id,
      data: swapRequest,
    });
  } catch (error) {
    console.error("Create swap request error:", error);

    return res.status(500).json({
      message: "Failed to create shift swap request",
      error: error.message,
    });
  }
};

// Get all shift swap requests
const getAllSwapRequests = async (req, res) => {
  try {
    // Fetch all documents from Firestore
    const snapshot = await db.collection("shiftSwapRequests").get();

    // Convert Firestore documents into an array
    const swapRequests = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({
      message: "Shift swap requests fetched successfully",
      count: swapRequests.length,
      data: swapRequests,
    });
  } catch (error) {
    console.error("Get swap requests error:", error);

    return res.status(500).json({
      message: "Failed to fetch shift swap requests",
      error: error.message,
    });
  }
};

// Employee accepts or rejects a swap request
const employeeSwapResponse = async (req, res) => {
  try {
    const { id } = req.params;

    const { employeeId, response } = req.body;

    // Validate employee ID
    if (!employeeId) {
      return res.status(400).json({
        message: "Employee ID is required",
      });
    }

    // Validate response
    if (!["Accepted", "Rejected"].includes(response)) {
      return res.status(400).json({
        message: "Response must be Accepted or Rejected",
      });
    }

    // Find swap request
    const requestRef = db.collection("shiftSwapRequests").doc(id);

    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({
        message: "Swap request not found",
      });
    }

    const requestData = requestDoc.data();

    // Only target employee can respond
    if (requestData.targetEmployeeId !== employeeId) {
      return res.status(403).json({
        message: "Only the target employee can respond",
      });
    }

    // Check request status
    if (requestData.status !== "Pending") {
      return res.status(400).json({
        message: "This request has already been processed",
      });
    }

    // Update employee response
    await requestRef.update({
      employeeResponse: response,
      status: response === "Rejected" ? "Rejected" : "Pending",
    });

    return res.status(200).json({
      message: `Employee ${response.toLowerCase()} the swap request`,
      employeeResponse: response,
      status: response === "Rejected" ? "Rejected" : "Pending",
    });
  } catch (error) {
    console.error("Employee response error:", error);

    return res.status(500).json({
      message: "Failed to update employee response",
      error: error.message,
    });
  }
};

const managerSwapResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    // Validate manager response
    if (!["Approved", "Rejected"].includes(response)) {
      return res.status(400).json({
        message: "Response must be Approved or Rejected",
      });
    }

    const requestRef = db.collection("shiftSwapRequests").doc(id);

    // Handle approval and rejection safely
    const result = await db.runTransaction(async (transaction) => {
      const requestDoc = await transaction.get(requestRef);

      if (!requestDoc.exists) {
        throw new Error("SWAP_REQUEST_NOT_FOUND");
      }

      const requestData = requestDoc.data();

      if (requestData.status !== "Pending") {
        throw new Error("REQUEST_ALREADY_PROCESSED");
      }

      if (requestData.employeeResponse !== "Accepted") {
        throw new Error("EMPLOYEE_NOT_ACCEPTED");
      }

      // Manager rejects the request
      if (response === "Rejected") {
        transaction.update(requestRef, {
          managerResponse: "Rejected",
          status: "Rejected",
          managerRespondedAt: new Date(),
        });

        return { status: "Rejected" };
      }

      // Get both shift documents
      const requesterShiftRef = db
        .collection("shifts")
        .doc(requestData.requesterShiftId);

      const targetShiftRef = db
        .collection("shifts")
        .doc(requestData.targetShiftId);

      const requesterShiftDoc = await transaction.get(requesterShiftRef);
      const targetShiftDoc = await transaction.get(targetShiftRef);

      if (!requesterShiftDoc.exists || !targetShiftDoc.exists) {
        throw new Error("SHIFT_NOT_FOUND");
      }

      const requesterShift = requesterShiftDoc.data();
      const targetShift = targetShiftDoc.data();

      // Verify that the shifts still belong to the correct employees
      if (
        requesterShift.employeeId !== requestData.requesterEmployeeId ||
        targetShift.employeeId !== requestData.targetEmployeeId
      ) {
        throw new Error("SHIFT_OWNERSHIP_CHANGED");
      }

      if (
        requesterShift.status !== "Assigned" ||
        targetShift.status !== "Assigned"
      ) {
        throw new Error("SHIFT_NOT_ASSIGNED");
      }

      // Check whether Ram can take Venkat's shift
      const requesterConflictQuery = db
        .collection("shifts")
        .where("employeeId", "==", requestData.requesterEmployeeId)
        .where("shiftDate", "==", targetShift.shiftDate);

      // Check whether Venkat can take Ram's shift
      const targetConflictQuery = db
        .collection("shifts")
        .where("employeeId", "==", requestData.targetEmployeeId)
        .where("shiftDate", "==", requesterShift.shiftDate);

      const [requesterConflicts, targetConflicts] = await Promise.all([
        transaction.get(requesterConflictQuery),
        transaction.get(targetConflictQuery),
      ]);

      const hasOverlap = (snapshot, incomingShift) =>
        snapshot.docs.some((doc) => {
          // Ignore the two shifts being exchanged
          if (
            doc.id === requestData.requesterShiftId ||
            doc.id === requestData.targetShiftId
          ) {
            return false;
          }

          const existingShift = doc.data();

          if (existingShift.status !== "Assigned") {
            return false;
          }

          return (
            incomingShift.startTime < existingShift.endTime &&
            incomingShift.endTime > existingShift.startTime
          );
        });

      if (
        hasOverlap(requesterConflicts, targetShift) ||
        hasOverlap(targetConflicts, requesterShift)
      ) {
        throw new Error("SHIFT_CONFLICT");
      }

      // Exchange employee assignments only
      transaction.update(requesterShiftRef, {
        employeeId: targetShift.employeeId,
        employeeName: targetShift.employeeName,
      });

      transaction.update(targetShiftRef, {
        employeeId: requesterShift.employeeId,
        employeeName: requesterShift.employeeName,
      });

      // Save swap history
      const historyRef = db.collection("shiftSwapHistory").doc();

      transaction.set(historyRef, {
        swapRequestId: id,
        requesterEmployeeId: requestData.requesterEmployeeId,
        targetEmployeeId: requestData.targetEmployeeId,
        requesterShiftId: requestData.requesterShiftId,
        targetShiftId: requestData.targetShiftId,
        approvedAt: new Date(),
      });

      // Approve the request
      transaction.update(requestRef, {
        managerResponse: "Approved",
        status: "Approved",
        managerRespondedAt: new Date(),
      });

      return {
        status: "Approved",
        historyId: historyRef.id,
      };
    });

    return res.status(200).json({
      message: `Shift swap request ${result.status.toLowerCase()} successfully`,
      ...result,
    });
  } catch (error) {
    console.error("Manager response error:", error);

    const errors = {
      SWAP_REQUEST_NOT_FOUND: [404, "Swap request not found"],
      REQUEST_ALREADY_PROCESSED: [400, "Request has already been processed"],
      EMPLOYEE_NOT_ACCEPTED: [
        400,
        "Employee must accept before manager approval",
      ],
      SHIFT_NOT_FOUND: [404, "One or both shifts were not found"],
      SHIFT_OWNERSHIP_CHANGED: [409, "Shift ownership has changed"],
      SHIFT_NOT_ASSIGNED: [400, "Only assigned shifts can be exchanged"],
      SHIFT_CONFLICT: [409, "Shift conflict detected. Swap cannot be approved"],
    };

    const knownError = errors[error.message];

    return res.status(knownError ? knownError[0] : 500).json({
      message: knownError
        ? knownError[1]
        : "Failed to process manager response",
      ...(knownError ? {} : { error: error.message }),
    });
  }
};

module.exports = {
  createSwapRequest,
  getAllSwapRequests,
  employeeSwapResponse,
  managerSwapResponse,
};
