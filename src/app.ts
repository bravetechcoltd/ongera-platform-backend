import express, { Application } from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes";
import ssoRoutes from "./routes/ssoRoutes";
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
import communityChatRoutes from "./routes/communityChatRoutes";
import subscribeRoutes from "./routes/subscribe";
import adminDashboardRoutes from './routes/adminDashboardRoutes';
import CollaborationRoutes from "./routes/CollaborationRoutes";
import bulkUserRoutes from "./routes/bulkUserRoutes";
import institutionPortalRoutes from "./routes/institutionPortalRoutes";
import monthlyStarTrackerRoutes from "./routes/monthlyStarTracker";

const app: Application = express();

// ✅ CORS configuration for cross-system communication
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    process.env.BWENGE_PLUS_URL || 'http://localhost:3001',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Routes
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/auth", ssoRoutes); // ✅ NEW: SSO routes
app.use("/api/projects", projectRoutes);
app.use("/api/communities", communityRoutes);
app.use("/api/communities", communityProjectRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/engagement", engagementRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/qa", qaRoutes);
app.use("/api", homeRoutes);
app.use("/api", CollaborationRoutes);
app.use("/api/community-chat", communityChatRoutes);
app.use("/api/subscribe", subscribeRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use("/api/bulk-users", bulkUserRoutes);
app.use("/api/tracker", monthlyStarTrackerRoutes);
app.use("/api/institution-portal", institutionPortalRoutes);

app.get("/", (req, res) => {
  res.json({ 
    message: "Welcome to ONGERA Platform API",
    sso_enabled: true, // ✅ NEW
    supported_systems: ["ONGERA", "BWENGE_PLUS"] // ✅ NEW
  });
});

app.use(errorHandler);

export default app;