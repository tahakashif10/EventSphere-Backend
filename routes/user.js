
const express = require("express");
const router = express.Router();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const { protect } = require("../middleware/auth");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

// =====================================
// REGISTER API
// =====================================

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body;

    // Check required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "Please fill all required fields"
      });
    }

    // Check password length
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters"
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered"
      });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Every new user starts as an attendee
    const newUser = await User.create({
      fullName,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone,
      role: "attendee"
    });

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error("Registration Error:", error.message);

    res.status(500).json({
      message: "Server error during registration"
    });
  }
});


// =====================================
// LOGIN API
// =====================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    // Find user by email
    const user = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // Compare entered password with hashed password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // Generate secure JWT token with token version
    const token = jwt.sign(
      {
        userId: user._id,
        tokenVersion: user.tokenVersion
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    // Send login success response
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        dashboardMode: user.dashboardMode
      }
    });

  } catch (error) {
    console.error("Login Error:", error.message);

    res.status(500).json({
      message: "Server error during login"
    });
  }
});


// =====================================
// GET LOGGED-IN USER PROFILE
// =====================================

router.get("/profile", protect, async (req, res) => {
  try {
    // Return current logged-in user's profile
    res.status(200).json({
      message: "Profile fetched successfully",
      user: req.user
    });

  } catch (error) {
    console.error("Profile Error:", error.message);

    res.status(500).json({
      message: "Server error while fetching profile"
    });
  }
});


// =====================================
// SWITCH DASHBOARD MODE
// =====================================

router.patch("/switch-dashboard", protect, async (req, res) => {
  try {
    // Get current user from database
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const { dashboardMode } = req.body;

    // Check valid dashboard mode
    if (!["attendee", "exhibitor"].includes(dashboardMode)) {
      return res.status(400).json({
        message: "Invalid dashboard mode"
      });
    }

    // Only approved exhibitors can access exhibitor dashboard
    if (
      dashboardMode === "exhibitor" &&
      (user.role !== "exhibitor" || user.exhibitorStatus !== "approved")
    ) {
      return res.status(403).json({
        message: "Exhibitor dashboard access denied"
      });
    }

    // Admin dashboard is managed separately
    if (user.role === "admin") {
      return res.status(400).json({
        message: "Admin dashboard cannot be switched here"
      });
    }

    // Update selected dashboard
    user.dashboardMode = dashboardMode;

    await user.save();

    res.status(200).json({
      message: "Dashboard switched successfully",
      role: user.role,
      dashboardMode: user.dashboardMode
    });

  } catch (error) {
    console.error("Dashboard Switch Error:", error.message);

    res.status(500).json({
      message: "Server error while switching dashboard"
    });
  }
});


// =====================================
// FORGOT PASSWORD API
// =====================================

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // Check email input
    if (!email) {
      return res.status(400).json({
        message: "Email is required"
      });
    }

    // Find user by email
    const user = await User.findOne({
      email: email.toLowerCase().trim()
    });

    // Generic response prevents email account discovery
    if (!user) {
      return res.status(200).json({
        message: "If this email is registered, a password reset link will be sent."
      });
    }

    // Generate a secure random reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token before saving it in database
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Reset link expires after 15 minutes
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

    await user.save();

    // Create password reset link
    const frontendURL = process.env.FRONTEND_URL || "http://localhost:5173";

    const resetLink = `${frontendURL}/reset-password/${resetToken}`;

    // Send reset email
    try {
      await sendEmail(
        user.email,
        "EventSphere - Password Reset",
        `
          <h2>Password Reset Request</h2>
          <p>Hello ${user.fullName},</p>
          <p>We received a request to reset your password.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}">Reset My Password</a>
          <p>This link will expire in 15 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        `
      );
    } catch (emailError) {
      // Clear reset details if email delivery fails
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      throw emailError;
    }

    res.status(200).json({
      message: "If this email is registered, a password reset link will be sent."
    });

  } catch (error) {
    console.error("Forgot Password Error:", error.message);

    res.status(500).json({
      message: "Unable to process password reset request"
    });
  }
});


// =====================================
// RESET PASSWORD API
// =====================================

router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Check new password
    if (!newPassword) {
      return res.status(400).json({
        message: "New password is required"
      });
    }

    // Check minimum password length
    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters"
      });
    }

    // Hash the received reset token
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with a valid, non-expired reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    // Reject invalid or expired tokens
    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired password reset link"
      });
    }

    // Hash the new password
    user.password = await bcrypt.hash(newPassword, 10);

    // Clear password reset information
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    // Invalidate all existing login sessions
    user.tokenVersion += 1;

    await user.save();

    res.status(200).json({
      message: "Password reset successful. Please login with your new password."
    });

  } catch (error) {
    console.error("Reset Password Error:", error.message);

    res.status(500).json({
      message: "Server error while resetting password"
    });
  }
});


// =====================================
// LOGOUT API
// =====================================

router.post("/logout", protect, async (req, res) => {
  try {
    // Find the logged-in user
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // Increase token version to invalidate old JWT tokens
    user.tokenVersion += 1;

    await user.save();

    res.status(200).json({
      message: "Logout successful"
    });

  } catch (error) {
    console.error("Logout Error:", error.message);

    res.status(500).json({
      message: "Server error during logout"
    });
  }
});


// =====================================
// CHANGE PASSWORD API
// =====================================

router.patch("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Check required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current and new passwords are required"
      });
    }

    // Check new password length
    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters"
      });
    }

    // Prevent using the same password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different from current password"
      });
    }

    // Get current user from database
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // Verify current password
    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Current password is incorrect"
      });
    }

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 10);

    // Invalidate all existing login sessions
    user.tokenVersion += 1;

    await user.save();

    res.status(200).json({
      message: "Password changed successfully. Please login again."
    });

  } catch (error) {
    console.error("Change Password Error:", error.message);

    res.status(500).json({
      message: "Server error while changing password"
    });
  }
});

// UPDATE USER PROFILE API
// =====================================

router.patch("/update-profile", protect, async (req, res) => {
  try {
    const { fullName, phone } = req.body;

    // Find logged-in user
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // Validate full name if provided
    if (fullName !== undefined) {
      if (typeof fullName !== "string" || !fullName.trim()) {
        return res.status(400).json({
          message: "Please enter a valid full name"
        });
      }

      user.fullName = fullName.trim();
    }

    // Validate phone if provided
    if (phone !== undefined) {
      if (typeof phone !== "string") {
        return res.status(400).json({
          message: "Please enter a valid phone number"
        });
      }

      user.phone = phone.trim();
    }

    // Save updated profile
    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        dashboardMode: user.dashboardMode
      }
    });

  } catch (error) {
    console.error("Update Profile Error:", error.message);

    res.status(500).json({
      message: "Server error while updating profile"
    });
  }
});


// =====================================
// EXPORT ROUTER
// =====================================

module.exports = router;
