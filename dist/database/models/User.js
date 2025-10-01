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
exports.User = exports.InstitutionRole = exports.SystemType = exports.BwengeRole = exports.AccountType = void 0;
const typeorm_1 = require("typeorm");
const UserProfile_1 = require("./UserProfile");
const ResearchProject_1 = require("./ResearchProject");
const Community_1 = require("./Community");
const BlogPost_1 = require("./BlogPost");
const Comment_1 = require("./Comment");
const QAThread_1 = require("./QAThread");
const Like_1 = require("./Like");
const CommunityPost_1 = require("./CommunityPost");
const Event_1 = require("./Event");
const EventAttendee_1 = require("./EventAttendee");
const InstructorStudent_1 = require("./InstructorStudent");
const UserSession_1 = require("./UserSession");
var AccountType;
(function (AccountType) {
    AccountType["STUDENT"] = "Student";
    AccountType["RESEARCHER"] = "Researcher";
    AccountType["DIASPORA"] = "Diaspora";
    AccountType["INSTITUTION"] = "Institution";
    AccountType["ADMIN"] = "admin";
})(AccountType || (exports.AccountType = AccountType = {}));
var BwengeRole;
(function (BwengeRole) {
    BwengeRole["SYSTEM_ADMIN"] = "SYSTEM_ADMIN";
    BwengeRole["INSTITUTION_ADMIN"] = "INSTITUTION_ADMIN";
    BwengeRole["CONTENT_CREATOR"] = "CONTENT_CREATOR";
    BwengeRole["INSTRUCTOR"] = "INSTRUCTOR";
    BwengeRole["LEARNER"] = "LEARNER";
})(BwengeRole || (exports.BwengeRole = BwengeRole = {}));
var SystemType;
(function (SystemType) {
    SystemType["BWENGEPLUS"] = "bwengeplus";
    SystemType["ONGERA"] = "ongera";
})(SystemType || (exports.SystemType = SystemType = {}));
var InstitutionRole;
(function (InstitutionRole) {
    InstitutionRole["ADMIN"] = "ADMIN";
    InstitutionRole["CONTENT_CREATOR"] = "CONTENT_CREATOR";
    InstitutionRole["INSTRUCTOR"] = "INSTRUCTOR";
    InstitutionRole["MEMBER"] = "MEMBER";
})(InstitutionRole || (exports.InstitutionRole = InstitutionRole = {}));
let User = class User {
    storeOriginalValues() {
        console.log(`📋 [User Entity - Ongera] Loading user ${this.id} - storing original values`);
        this._originalBwengeRole = this.bwenge_role;
        this._originalIsForWhichSystem = this.IsForWhichSystem;
        this._originalInstitutionIds = this.institution_ids ? [...this.institution_ids] : [];
        this._originalInstitutionRole = this.institution_role;
        this._originalPrimaryInstitutionId = this.primary_institution_id;
        this._originalIsInstitutionMember = this.is_institution_member;
    }
    protectAllCriticalFields() {
        const monitor = require('../../utils/crossSystemMonitor').crossSystemMonitor;
        console.log(`🛡️ [User Entity - Ongera] Protecting critical fields for user ${this.id}`);
        if (this._originalIsForWhichSystem && !this.IsForWhichSystem) {
            monitor.logProtection({
                userId: this.id,
                system: 'ENTITY',
                field: 'IsForWhichSystem',
                action: 'attempted_null',
                oldValue: this._originalIsForWhichSystem,
                newValue: null,
                timestamp: new Date()
            });
            console.warn(`⚠️ [PROTECTION] Preventing IsForWhichSystem from being set to null`);
            this.IsForWhichSystem = this._originalIsForWhichSystem;
            monitor.logProtection({
                userId: this.id,
                system: 'ENTITY',
                field: 'IsForWhichSystem',
                action: 'protected',
                oldValue: this._originalIsForWhichSystem,
                newValue: this._originalIsForWhichSystem,
                timestamp: new Date()
            });
        }
        // Protect BwengeRole (even though Ongera doesn't use it directly)
        if (this._originalBwengeRole && !this.bwenge_role) {
            console.warn(`⚠️ [PROTECTION - ONGERA] Preventing bwenge_role from being set to null - restoring to: ${this._originalBwengeRole}`);
            this.bwenge_role = this._originalBwengeRole;
        }
        // Protect institution arrays - only add, never remove
        if (this._originalInstitutionIds && this._originalInstitutionIds.length > 0) {
            if (!this.institution_ids || this.institution_ids.length === 0) {
                console.warn(`⚠️ [PROTECTION - ONGERA] Preventing institution_ids from being cleared - restoring original array`);
                this.institution_ids = [...this._originalInstitutionIds];
            }
            else {
                // Merge arrays: keep original + add new ones
                const mergedIds = [...new Set([...this._originalInstitutionIds, ...this.institution_ids])];
                if (mergedIds.length > this._originalInstitutionIds.length) {
                    console.log(`✅ [PROTECTION - ONGERA] Merging institution_ids: added ${mergedIds.length - this._originalInstitutionIds.length} new institutions`);
                    this.institution_ids = mergedIds;
                }
            }
        }
        // Protect institution role
        if (this._originalInstitutionRole && !this.institution_role) {
            console.warn(`⚠️ [PROTECTION - ONGERA] Preventing institution_role from being set to null - restoring to: ${this._originalInstitutionRole}`);
            this.institution_role = this._originalInstitutionRole;
        }
        // Protect primary institution
        if (this._originalPrimaryInstitutionId && !this.primary_institution_id) {
            console.warn(`⚠️ [PROTECTION - ONGERA] Preventing primary_institution_id from being set to null - restoring to: ${this._originalPrimaryInstitutionId}`);
            this.primary_institution_id = this._originalPrimaryInstitutionId;
        }
        // Protect institution member flag
        if (this._originalIsInstitutionMember && !this.is_institution_member) {
            console.warn(`⚠️ [PROTECTION - ONGERA] Preventing is_institution_member from being set to false - restoring to true`);
            this.is_institution_member = true;
        }
    }
    setOriginalBwengeRole(role) {
        this._originalBwengeRole = role;
    }
    isInstructor() {
        return this.assignedStudents && this.assignedStudents.length > 0;
    }
    hasAssignedInstructor() {
        return this.assignedInstructor && this.assignedInstructor.length > 0;
    }
    getStudentCount() {
        return this.assignedStudents ? this.assignedStudents.length : 0;
    }
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "password_hash", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "first_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "last_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "phone_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "profile_picture_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], User.prototype, "bio", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: AccountType,
        default: AccountType.STUDENT,
    }),
    __metadata("design:type", String)
], User.prototype, "account_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "is_verified", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isUserLogin", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "date_joined", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "last_login", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "social_auth_provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "social_auth_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: SystemType,
        nullable: true,
    }),
    __metadata("design:type", String)
], User.prototype, "IsForWhichSystem", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => UserProfile_1.UserProfile, (profile) => profile.user),
    __metadata("design:type", UserProfile_1.UserProfile)
], User.prototype, "profile", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ResearchProject_1.ResearchProject, (project) => project.author),
    __metadata("design:type", Array)
], User.prototype, "projects", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Community_1.Community, (community) => community.creator),
    __metadata("design:type", Array)
], User.prototype, "created_communities", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Event_1.Event, (event) => event.organizer),
    __metadata("design:type", Array)
], User.prototype, "organized_events", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => CommunityPost_1.CommunityPost, (post) => post.author),
    __metadata("design:type", Array)
], User.prototype, "community_posts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => BlogPost_1.BlogPost, (blog) => blog.author),
    __metadata("design:type", Array)
], User.prototype, "blog_posts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => QAThread_1.QAThread, (thread) => thread.asker),
    __metadata("design:type", Array)
], User.prototype, "qa_threads", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Comment_1.Comment, (comment) => comment.author),
    __metadata("design:type", Array)
], User.prototype, "comments", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Like_1.Like, (like) => like.user),
    __metadata("design:type", Array)
], User.prototype, "likes", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => User, (user) => user.following),
    (0, typeorm_1.JoinTable)({
        name: "follows",
        joinColumn: { name: "follower_id" },
        inverseJoinColumn: { name: "following_id" },
    }),
    __metadata("design:type", Array)
], User.prototype, "followers", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => User, (user) => user.followers),
    __metadata("design:type", Array)
], User.prototype, "following", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => EventAttendee_1.EventAttendee, (attendee) => attendee.user),
    __metadata("design:type", Array)
], User.prototype, "eventAttendances", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => InstructorStudent_1.InstructorStudent, (link) => link.instructor),
    __metadata("design:type", Array)
], User.prototype, "assignedStudents", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => InstructorStudent_1.InstructorStudent, (link) => link.student),
    __metadata("design:type", Array)
], User.prototype, "assignedInstructor", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => UserSession_1.UserSession, (session) => session.user),
    __metadata("design:type", Array)
], User.prototype, "sessions", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: BwengeRole,
        nullable: true,
    }),
    __metadata("design:type", String)
], User.prototype, "bwenge_role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", String)
], User.prototype, "primary_institution_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "is_institution_member", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "simple-array", nullable: true }),
    __metadata("design:type", Array)
], User.prototype, "institution_ids", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: InstitutionRole,
        nullable: true,
    }),
    __metadata("design:type", String)
], User.prototype, "institution_role", void 0);
__decorate([
    (0, typeorm_1.AfterLoad)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], User.prototype, "storeOriginalValues", null);
__decorate([
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], User.prototype, "protectAllCriticalFields", null);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)("users")
], User);
