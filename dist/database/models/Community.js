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
exports.Community = exports.CommunityType = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const CommunityPost_1 = require("./CommunityPost");
const Event_1 = require("./Event");
const ResearchProject_1 = require("./ResearchProject");
var CommunityType;
(function (CommunityType) {
    CommunityType["PUBLIC"] = "Public";
    CommunityType["PRIVATE"] = "Private";
    CommunityType["INSTITUTION_SPECIFIC"] = "Institution-Specific";
})(CommunityType || (exports.CommunityType = CommunityType = {}));
let Community = class Community {
};
exports.Community = Community;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Community.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Community.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Community.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Community.prototype, "rules", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], Community.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Community.prototype, "cover_image_url", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.created_communities),
    (0, typeorm_1.JoinColumn)({ name: "creator_id" }),
    __metadata("design:type", User_1.User)
], Community.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: CommunityType,
        default: CommunityType.PUBLIC,
    }),
    __metadata("design:type", String)
], Community.prototype, "community_type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Community.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Community.prototype, "member_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Community.prototype, "post_count", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Community.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Community.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Community.prototype, "join_approval_required", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => User_1.User),
    (0, typeorm_1.JoinTable)({
        name: "community_members",
        joinColumn: { name: "community_id" },
        inverseJoinColumn: { name: "user_id" },
    }),
    __metadata("design:type", Array)
], Community.prototype, "members", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => CommunityPost_1.CommunityPost, (post) => post.community),
    __metadata("design:type", Array)
], Community.prototype, "posts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Event_1.Event, (event) => event.community),
    __metadata("design:type", Array)
], Community.prototype, "events", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ResearchProject_1.ResearchProject, (projects) => projects.community),
    __metadata("design:type", Array)
], Community.prototype, "projects", void 0);
exports.Community = Community = __decorate([
    (0, typeorm_1.Entity)("communities")
], Community);
