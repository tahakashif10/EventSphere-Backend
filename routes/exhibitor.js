
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const User = require("../models/User");

// =====================================
// SUBMIT EXHIBITOR APPLICATION
// =====================================

router.post("/apply", protect, async (req, res) => {
  try {
    // Get logged-in user from authentication middleware
    const user = await User.findById(req.user._id);

    if (user.role === "exhibitor") {
      return res.status(400).json({
        message: "You are already an approved exhibitor"
      });
    }

    if (user.exhibitorStatus === "pending") {
      return res.status(400).json({
        message: "Your application is already under review"
      });
    }

    // Get company details
    const {
      companyName,
      representative,
      address,
      website,
      description
    } = req.body;

    // Validate required fields
    if (!companyName || !representative || !address || !description) {
      return res.status(400).json({
        message: "Please fill all required company details"
      });
    }

    // Save company information
    user.company = {
      companyName,
      representative,
      address,
      website: website || "",
      description
    };

    // Submit application for Admin review
    user.exhibitorStatus = "pending";

    // Clear previous rejection information
    user.exhibitorReview.rejectionReason = "";
    user.exhibitorReview.reviewedAt = null;

    await user.save();

    res.status(201).json({
      message: "Exhibitor application submitted successfully",
      status: user.exhibitorStatus,
      company: user.company
    });

  } catch (error) {
    console.error("Exhibitor Application Error:", error.message);

    res.status(500).json({
      message: "Server error during application submission"
    });
  }
});


// =====================================
// GET MY EXHIBITOR APPLICATION
// =====================================

router.get("/my-application", protect, async (req, res) => {
  try {
    // Get logged-in user's application
    const user = await User.findById(req.user._id);

    res.status(200).json({
      message: "Application details fetched successfully",

      application: {
        status: user.exhibitorStatus,
        company: user.company,
        submittedAt: user.createdAt,
        reviewedAt: user.exhibitorReview.reviewedAt,
        rejectionReason: user.exhibitorReview.rejectionReason
      }
    });

  } catch (error) {
    console.error("My Application Error:", error.message);

    res.status(500).json({
      message: "Server error while fetching application"
    });
  }
});

module.exports = router;
