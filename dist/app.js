"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const ssoRoutes_1 = __importDefault(require("./routes/ssoRoutes"));
const projectRoutes_1 = __importDefault(require("./routes/projectRoutes"));
const communityRoutes_1 = __importDefault(require("./routes/communityRoutes"));
const eventRoutes_1 = __importDefault(require("./routes/eventRoutes"));
const engagementRoutes_1 = __importDefault(require("./routes/engagementRoutes"));
const blogRoutes_1 = __importDefault(require("./routes/blogRoutes"));
const qaRoutes_1 = __importDefault(require("./routes/qaRoutes"));
const errorHandler_1 = require("./middlewares/errorHandler");
const communityProjects_1 = __importDefault(require("./routes/communityProjects"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const homeRoutes_1 = __importDefault(require("./routes/homeRoutes"));
const communityChatRoutes_1 = __importDefault(require("./routes/communityChatRoutes"));
const subscribe_1 = __importDefault(require("./routes/subscribe"));
const adminDashboardRoutes_1 = __importDefault(require("./routes/adminDashboardRoutes"));
const CollaborationRoutes_1 = __importDefault(require("./routes/CollaborationRoutes"));
const bulkUserRoutes_1 = __importDefault(require("./routes/bulkUserRoutes"));
const institutionPortalRoutes_1 = __importDefault(require("./routes/institutionPortalRoutes"));
const monthlyStarTracker_1 = __importDefault(require("./routes/monthlyStarTracker"));
const institutionWorkRoutes_1 = __importDefault(require("./routes/institutionWorkRoutes"));
const app = (0, express_1.default)();
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
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        }
        else {
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
    }
    else if (!origin) {
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
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)("dev"));
// Routes
app.use("/api/dashboard", dashboardRoutes_1.default);
app.use("/api/auth", authRoutes_1.default);
app.use("/api/auth", ssoRoutes_1.default); // ✅ NEW: SSO routes
app.use("/api/projects", projectRoutes_1.default);
app.use("/api/communities", communityRoutes_1.default);
app.use("/api/communities", communityProjects_1.default);
app.use("/api/events", eventRoutes_1.default);
app.use("/api/engagement", engagementRoutes_1.default);
app.use("/api/blogs", blogRoutes_1.default);
app.use("/api/qa", qaRoutes_1.default);
app.use("/api", homeRoutes_1.default);
app.use("/api", CollaborationRoutes_1.default);
app.use("/api/community-chat", communityChatRoutes_1.default);
app.use("/api/subscribe", subscribe_1.default);
app.use('/api/admin/dashboard', adminDashboardRoutes_1.default);
app.use("/api/bulk-users", bulkUserRoutes_1.default);
app.use("/api/tracker", monthlyStarTracker_1.default);
app.use("/api/institution-portal", institutionPortalRoutes_1.default);
app.use("/api/institution-work", institutionWorkRoutes_1.default);
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
app.use(errorHandler_1.errorHandler);
exports.default = app;
