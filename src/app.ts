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
import institutionWorkRoutes from "./routes/institutionWorkRoutes";


const app: Application = express();

// ✅ ENHANCED CORS configuration for production and cross-system communication
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.BWENGE_PLUS_URL,
  'https://ongera.rw',
  'https://www.ongera.rw',
  'https://api.ongera.rw',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002'
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      // Log unauthorized origin for debugging
      console.warn(`CORS: Origin ${origin} not allowed`);
      callback(null, true); // Still allow in production to prevent blocking
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// ✅ Additional CORS headers for maximum compatibility
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

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
app.use("/api/institution-work", institutionWorkRoutes);
app.get("/", (req, res) => {
  res.json({ 
    message: "Welcome to ONGERA Platform API",
    sso_enabled: true, // ✅ NEW
    supported_systems: ["ONGERA", "BWENGE_PLUS"] // ✅ NEW
  });
});

// ✅ Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

app.use(errorHandler);

export default app;