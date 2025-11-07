import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { authRouter } from "./auth";

dotenv.config();

const app = express();

// ✅ Enable CORS for frontend origin
app.use(cors({
  origin: "http://localhost:3000",  // your frontend's origin
  credentials: true                 // if you use cookies or auth headers
}));

app.use(express.json());

// Mount routes
app.use("/api", authRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
