import express, { Application } from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes";
import projectRoutes from "./routes/projectRoutes";
import communityRoutes from "./routes/communityRoutes";
import eventRoutes from "./routes/eventRoutes";
import engagementRoutes from "./routes/engagementRoutes";
import blogRoutes from "./routes/blogRoutes";
import qaRoutes from "./routes/qaRoutes";
import { errorHandler } from "./middlewares/errorHandler";
import communityProjectRoutes from "./routes/communityProjects";
import dashboardRoutes from "./routes/dashboardRoutes";
import homeRoutes from "./routes/homeRoutes";
import communityChatRoutes from "./routes/communityChatRoutes"
import subscribeRoutes from "./routes/subscribe";

import monthlyStarTrackerRoutes from "./routes/monthlyStarTracker";
const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Routes
// ===================================
// Add to main app.ts or server.ts:
// ===================================

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/communities", communityRoutes);
app.use("/api/communities", communityProjectRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/engagement", engagementRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/qa", qaRoutes);
app.use("/api", homeRoutes);
app.use("/api/community-chat", communityChatRoutes)
app.use("/api/subscribe", subscribeRoutes);


app.use("/api/tracker", monthlyStarTrackerRoutes);
app.get("/", (req, res) => {
  res.json({ message: "Welcome to ONGERA Platform API" });
});

app.use(errorHandler);

export default app;