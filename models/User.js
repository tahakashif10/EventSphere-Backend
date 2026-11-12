
const mongoose = require("mongoose");

// Define User Schema
const userSchema = new mongoose.Schema(
    {
        // Basic user information
        fullName: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },

        phone: {
            type: String,
            default: ""
        },

        // User account role
        role: {
            type: String,
            enum: ["admin", "exhibitor", "attendee"],
            default: "attendee"
        },

        // Currently selected dashboard
        dashboardMode: {
            type: String,
            enum: ["attendee", "exhibitor"],
            default: "attendee"
        },

        // Exhibitor company information
        company: {
            companyName: {
                type: String,
                default: ""
            },

            representative: {
                type: String,
                default: ""
            },

            address: {
                type: String,
                default: ""
            },

            website: {
                type: String,
                default: ""
            },

            description: {
                type: String,
                default: ""
            },

            logo: {
                type: String,
                default: ""
            },

            documents: [{
                type: String
            }]
        },

        // Exhibitor application status
        exhibitorStatus: {
            type: String,
            enum: ["not_applied", "pending", "approved", "rejected"],
            default: "not_applied"
        },

        // Admin review information
        exhibitorReview: {
            reviewedAt: {
                type: Date,
                default: null
            },

            rejectionReason: {
                type: String,
                default: ""
            }
        },

        // Password reset information
        resetPasswordToken: {
            type: String,
            default: null
        },

        resetPasswordExpires: {
            type: Date,
            default: null
        },

        // Used to invalidate old login tokens
        tokenVersion: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

// Create User Model
const User = mongoose.model("User", userSchema);

module.exports = User;
