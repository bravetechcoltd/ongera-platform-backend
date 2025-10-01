"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResearchProject = exports.CollaborationInfoStatus = exports.CollaborationStatus = exports.Visibility = exports.ResearchType = exports.ProjectStatus = exports.AcademicLevel = exports.ProjectApprovalStatus = void 0;
const typeorm_1 = require("typeorm");
const ProjectFile_1 = require("./ProjectFile");
const ProjectTag_1 = require("./ProjectTag");
const User_1 = require("./User");
const CommunityPost_1 = require("./CommunityPost");
const Event_1 = require("./Event");
const Community_1 = require("./Community");
const Like_1 = require("./Like");
const Comment_1 = require("./Comment");
const CollaborationRequest_1 = require("./CollaborationRequest");
const ProjectContribution_1 = require("./ProjectContribution");
var ProjectApprovalStatus;
(function (ProjectApprovalStatus) {
    ProjectApprovalStatus["DRAFT"] = "Draft";
    ProjectApprovalStatus["PENDING_REVIEW"] = "Pending Review";
    ProjectApprovalStatus["APPROVED"] = "Approved";
    ProjectApprovalStatus["REJECTED"] = "Rejected";
    ProjectApprovalStatus["RETURNED"] = "Returned";
})(ProjectApprovalStatus || (exports.ProjectApprovalStatus = ProjectApprovalStatus = {}));
var AcademicLevel;
(function (AcademicLevel) {
    AcademicLevel["UNDERGRADUATE"] = "Undergraduate";
    AcademicLevel["MASTERS"] = "Masters";
    AcademicLevel["PHD"] = "PhD";
    AcademicLevel["RESEARCHER"] = "Researcher";
    AcademicLevel["DIASPORA"] = "Diaspora";
    AcademicLevel["INSTITUTION"] = "Institution";
})(AcademicLevel || (exports.AcademicLevel = AcademicLevel = {}));
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["DRAFT"] = "Draft";
    ProjectStatus["PUBLISHED"] = "Published";
    ProjectStatus["UNDER_REVIEW"] = "Under Review";
    ProjectStatus["ARCHIVED"] = "Archived";
})(ProjectStatus || (exports.ProjectStatus = ProjectStatus = {}));
var ResearchType;
(function (ResearchType) {
    ResearchType["THESIS"] = "Thesis";
    ResearchType["PAPER"] = "Paper";
    ResearchType["PROJECT"] = "Project";
    ResearchType["DATASET"] = "Dataset";
    ResearchType["CASE_STUDY"] = "Case Study";
})(ResearchType || (exports.ResearchType = ResearchType = {}));
var Visibility;
(function (Visibility) {
    Visibility["PUBLIC"] = "Public";
    Visibility["COMMUNITY_ONLY"] = "Community-Only";
    Visibility["PRIVATE"] = "Private";
})(Visibility || (exports.Visibility = Visibility = {}));
var CollaborationStatus;
(function (CollaborationStatus) {
    CollaborationStatus["SOLO"] = "Solo";
    CollaborationStatus["SEEKING_COLLABORATORS"] = "Seeking Collaborators";
    CollaborationStatus["COLLABORATIVE"] = "Collaborative";
})(CollaborationStatus || (exports.CollaborationStatus = CollaborationStatus = {}));
// ==================== NEW: Collaboration Info Status Enum ====================
var CollaborationInfoStatus;
(function (CollaborationInfoStatus) {
    CollaborationInfoStatus["PENDING"] = "Pending";
    CollaborationInfoStatus["APPROVED"] = "Approved";
    CollaborationInfoStatus["REJECTED"] = "Rejected";
})(CollaborationInfoStatus || (exports.CollaborationInfoStatus = CollaborationInfoStatus = {}));
let ResearchProject = class ResearchProject {
};
exports.ResearchProject = ResearchProject;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], ResearchProject.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.projects),
    (0, typeorm_1.JoinColumn)({ name: "author_id" }),
    __metadata("design:type", User_1.User)
], ResearchProject.prototype, "author", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ResearchProject.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], ResearchProject.prototype, "abstract", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], ResearchProject.prototype, "full_description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ProjectStatus,
        default: ProjectStatus.DRAFT,
    }),
    __metadata("design:type", String)
], ResearchProject.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ProjectApprovalStatus,
        default: ProjectApprovalStatus.DRAFT,
    }),
    __metadata("design:type", String)
], ResearchProject.prototype, "approval_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], ResearchProject.prototype, "requires_approval", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "jsonb",
        default: () => "'[]'::jsonb",
        nullable: false
    }),
    __metadata("design:type", Array)
], ResearchProject.prototype, "status_change_history", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "assigned_instructor_id" }),
    __metadata("design:type", User_1.User)
], ResearchProject.prototype, "assigned_instructor", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ResearchType,
    }),
    __metadata("design:type", String)
], ResearchProject.prototype, "research_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ResearchProject.prototype, "project_file_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ResearchProject.prototype, "cover_image_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "date", nullable: true }),
    __metadata("design:type", Date)
], ResearchProject.prototype, "publication_date", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ResearchProject.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ResearchProject.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], ResearchProject.prototype, "is_featured", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: Visibility,
        default: Visibility.PUBLIC,
    }),
    __metadata("design:type", String)
], ResearchProject.prototype, "visibility", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ResearchProject.prototype, "field_of_study", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ResearchProject.prototype, "doi", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], ResearchProject.prototype, "view_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], ResearchProject.prototype, "download_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], ResearchProject.prototype, "like_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], ResearchProject.prototype, "comment_count", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: CollaborationStatus,
        default: CollaborationStatus.SOLO,
    }),
    __metadata("design:type", String)
], ResearchProject.prototype, "collaboration_status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "jsonb",
        default: () => "'[]'::jsonb",
        nullable: false
    }),
    __metadata("design:type", Array)
], ResearchProject.prototype, "approved_collaborators", void 0);
__decorate([
    (0, typeorm_1.Column)({
        default: 0,
        nullable: false
    }),
    __metadata("design:type", Number)
], ResearchProject.prototype, "collaborator_count", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "jsonb",
        default: () => "'[]'::jsonb",
        nullable: false
    }),
    __metadata("design:type", Array)
], ResearchProject.prototype, "collaboration_info", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ProjectFile_1.ProjectFile, (file) => file.project),
    __metadata("design:type", Array)
], ResearchProject.prototype, "files", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: AcademicLevel,
        nullable: true,
    }),
    __metadata("design:type", String)
], ResearchProject.prototype, "academic_level", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => ProjectTag_1.ProjectTag, (tag) => tag.projects),
    (0, typeorm_1.JoinTable)({
        name: "project_tag_association",
        joinColumn: { name: "project_id" },
        inverseJoinColumn: { name: "tag_id" },
    }),
    __metadata("design:type", Array)
], ResearchProject.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => CommunityPost_1.CommunityPost, (post) => post.linked_project),
    __metadata("design:type", Array)
], ResearchProject.prototype, "community_posts", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Community_1.Community, (community) => community.projects, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "community_id" }),
    __metadata("design:type", Community_1.Community)
], ResearchProject.prototype, "community", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => Event_1.Event, (event) => event.linked_projects),
    __metadata("design:type", Array)
], ResearchProject.prototype, "events", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Like_1.Like, (like) => like.content_id),
    __metadata("design:type", Array)
], ResearchProject.prototype, "likes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Comment_1.Comment, (comment) => comment.content_id),
    __metadata("design:type", Array)
], ResearchProject.prototype, "comments", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => CollaborationRequest_1.CollaborationRequest, (request) => request.project),
    __metadata("design:type", Array)
], ResearchProject.prototype, "collaboration_requests", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ProjectContribution_1.ProjectContribution, (contribution) => contribution.project),
    __metadata("design:type", Array)
], ResearchProject.prototype, "contributions", void 0);
exports.ResearchProject = ResearchProject = __decorate([
    (0, typeorm_1.Entity)("research_projects")
], ResearchProject);
