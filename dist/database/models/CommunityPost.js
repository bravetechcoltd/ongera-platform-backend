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
exports.CommunityPost = exports.PostType = void 0;
const typeorm_1 = require("typeorm");
const Community_1 = require("./Community");
const User_1 = require("./User");
const ResearchProject_1 = require("./ResearchProject");
const Event_1 = require("./Event"); // ✅ FIXED
var PostType;
(function (PostType) {
    PostType["DISCUSSION"] = "Discussion";
    PostType["QUESTION"] = "Question";
    PostType["RESOURCE"] = "Resource";
    PostType["ANNOUNCEMENT"] = "Announcement";
    PostType["LINKED_PROJECT"] = "LinkedProject";
})(PostType || (exports.PostType = PostType = {}));
let CommunityPost = class CommunityPost {
};
exports.CommunityPost = CommunityPost;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], CommunityPost.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Community_1.Community, (community) => community.posts, {
        onDelete: "CASCADE"
    }),
    (0, typeorm_1.JoinColumn)({ name: "community_id" }),
    __metadata("design:type", Community_1.Community)
], CommunityPost.prototype, "community", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.community_posts),
    (0, typeorm_1.JoinColumn)({ name: "author_id" }),
    __metadata("design:type", User_1.User)
], CommunityPost.prototype, "author", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: PostType,
    }),
    __metadata("design:type", String)
], CommunityPost.prototype, "post_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], CommunityPost.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], CommunityPost.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ResearchProject_1.ResearchProject, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "linked_project_id" }),
    __metadata("design:type", ResearchProject_1.ResearchProject)
], CommunityPost.prototype, "linked_project", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Event_1.Event, { nullable: true }) // ✅ Now valid
    ,
    (0, typeorm_1.JoinColumn)({ name: "linked_event_id" }),
    __metadata("design:type", Event_1.Event)
], CommunityPost.prototype, "linked_event", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Array)
], CommunityPost.prototype, "media_urls", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], CommunityPost.prototype, "is_pinned", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], CommunityPost.prototype, "is_locked", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], CommunityPost.prototype, "view_count", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CommunityPost.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CommunityPost.prototype, "updated_at", void 0);
exports.CommunityPost = CommunityPost = __decorate([
    (0, typeorm_1.Entity)("community_posts")
], CommunityPost);
