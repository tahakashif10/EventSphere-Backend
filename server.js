
const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Import MongoDB connection function
const connectDB = require("./config/db");

// Import authentication routes
const userRoutes = require("./routes/user");  
const exhibitorRoutes = require("./routes/exhibitor");
const adminRoutes = require("./routes/admin");

// Create Express application
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Use authentication routes
app.use("/api/user", userRoutes);
app.use("/api/exhibitor", exhibitorRoutes);
app.use("/api/admin", adminRoutes);

// Test API route
app.get("/", (req, res) => {
  res.send("EventSphere Management API is running!");
});

// Server configuration
const PORT = process.env.PORT || 5000;

// Connect database first, then start server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

// Start application
startServer();
