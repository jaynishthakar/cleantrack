import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import db from "./db.js";
import authRoutes from "./routes/auth.js";
import complaintRoutes from "./routes/complaints.js";

dotenv.config();
const app = express();

// ✅ Allow all origins for local testing
app.use(cors({
  origin: "*", // or specify: ["http://127.0.0.1:5500"]
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(bodyParser.json());
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);

const PORT = process.env.PORT || 5000;

// ✅ Simple health check
app.get("/", (req, res) => res.send("Server running successfully 🚀"));

app.listen(PORT, "127.0.0.1", () => {
  console.log(`✅ Backend running on http://127.0.0.1:${PORT}`);
  console.log("✅ Connected to MySQL Database");
});
