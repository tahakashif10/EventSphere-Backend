
const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");
const User = require("../models/User");

// =====================================
// GET ALL PENDING EXHIBITOR APPLICATIONS
// =====================================

router.get("/exhibitor-applications", protect, authorize("admin"), async (req, res) => {
  try {
    // Find users whose applications are pending
    const applications = await User.find({
      exhibitorStatus: "pending"
    }).select("-password");

    res.status(200).json({
      message: "Pending applications fetched successfully",
      total: applications.length,
      applications
    });

  } catch (error) {
    console.error("Fetch Applications Error:", error.message);

    res.status(500).json({
      message: "Server error while fetching applications"
    });
  }
});


// =====================================
// APPROVE OR REJECT EXHIBITOR APPLICATION
// =====================================

router.patch("/exhibitor-applications/:userId", protect, authorize("admin"), async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    // Only allow approved or rejected status
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be approved or rejected"
      });
    }

    // Rejection reason is required when rejecting
    if (status === "rejected" && !rejectionReason) {
      return res.status(400).json({
        message: "Please provide a rejection reason"
      });
    }

    // Find the applicant
    const applicant = await User.findById(req.params.userId);

    if (!applicant) {
      return res.status(404).json({
        message: "Applicant not found"
      });
    }

    // Only pending applications can be reviewed
    if (applicant.exhibitorStatus !== "pending") {
      return res.status(400).json({
        message: "This application is not pending"
      });
    }

    // Update application status
    applicant.exhibitorStatus = status;

    // Save Admin review information
    applicant.exhibitorReview.reviewedAt = new Date();

    if (status === "approved") {
      // Give Exhibitor role after approval
      applicant.role = "exhibitor";
      applicant.exhibitorReview.rejectionReason = "";
    } else {
      // Keep user as Attendee after rejection
      applicant.role = "attendee";
      applicant.exhibitorReview.rejectionReason = rejectionReason.trim();
    }

    await applicant.save();

    res.status(200).json({
      message: `Exhibitor application ${status} successfully`,
      application: {
        userId: applicant._id,
        fullName: applicant.fullName,
        companyName: applicant.company.companyName,
        status: applicant.exhibitorStatus,
        role: applicant.role,
        reviewedAt: applicant.exhibitorReview.reviewedAt,
        rejectionReason: applicant.exhibitorReview.rejectionReason
      }
    });

  } catch (error) {
    console.error("Review Application Error:", error.message);

    res.status(500).json({
      message: "Server error while reviewing application"
    });
  }
});

module.exports = router;
