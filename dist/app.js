"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
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
const monthlyStarTracker_1 = __importDefault(require("./routes/monthlyStarTracker"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)("dev"));
// Routes
// ===================================
// Add to main app.ts or server.ts:
// ===================================
app.use("/api/dashboard", dashboardRoutes_1.default);
app.use("/api/auth", authRoutes_1.default);
app.use("/api/projects", projectRoutes_1.default);
app.use("/api/communities", communityRoutes_1.default);
app.use("/api/communities", communityProjects_1.default);
app.use("/api/events", eventRoutes_1.default);
app.use("/api/engagement", engagementRoutes_1.default);
app.use("/api/blogs", blogRoutes_1.default);
app.use("/api/qa", qaRoutes_1.default);
app.use("/api", homeRoutes_1.default);
app.use("/api/community-chat", communityChatRoutes_1.default);
app.use("/api/subscribe", subscribe_1.default);
app.use("/api/tracker", monthlyStarTracker_1.default);
app.get("/", (req, res) => {
    res.json({ message: "Welcome to ONGERA Platform API" });
});
app.use(errorHandler_1.errorHandler);
exports.default = app;
