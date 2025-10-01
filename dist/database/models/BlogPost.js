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
exports.BlogPost = exports.BlogStatus = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Community_1 = require("./Community");
const ResearchProject_1 = require("./ResearchProject");
// Define BlogStatus enum
var BlogStatus;
(function (BlogStatus) {
    BlogStatus["DRAFT"] = "Draft";
    BlogStatus["UNDER_REVIEW"] = "Under Review";
    BlogStatus["PUBLISHED"] = "Published";
    BlogStatus["ARCHIVED"] = "Archived";
})(BlogStatus || (exports.BlogStatus = BlogStatus = {}));
let BlogPost = class BlogPost {
    // Helper method to check if blog is visible to public
    isPublic() {
        return this.status === BlogStatus.PUBLISHED;
    }
    // Helper method to check if blog is archived
    isArchived() {
        return this.status === BlogStatus.ARCHIVED;
    }
    // Helper method to check if blog can be published
    canPublish() {
        return [BlogStatus.DRAFT, BlogStatus.UNDER_REVIEW, BlogStatus.ARCHIVED].includes(this.status);
    }
    // Helper method to publish blog
    publish() {
        if (this.canPublish()) {
            this.status = BlogStatus.PUBLISHED;
            this.published_at = new Date();
        }
    }
    // Helper method to archive blog
    archive() {
        this.status = BlogStatus.ARCHIVED;
    }
    // Helper method to restore from archive
    restoreFromArchive() {
        if (this.status === BlogStatus.ARCHIVED) {
            this.status = BlogStatus.DRAFT;
        }
    }
};
exports.BlogPost = BlogPost;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], BlogPost.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.blog_posts),
    (0, typeorm_1.JoinColumn)({ name: "author_id" }),
    __metadata("design:type", User_1.User)
], BlogPost.prototype, "author", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Community_1.Community, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "community_id" }),
    __metadata("design:type", Community_1.Community)
], BlogPost.prototype, "community", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BlogPost.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], BlogPost.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], BlogPost.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], BlogPost.prototype, "excerpt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BlogPost.prototype, "cover_image_url", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: BlogStatus,
        default: BlogStatus.DRAFT,
    }),
    __metadata("design:type", String)
], BlogPost.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], BlogPost.prototype, "published_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], BlogPost.prototype, "view_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], BlogPost.prototype, "reading_time_minutes", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BlogPost.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ResearchProject_1.ResearchProject, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "linked_project_id" }),
    __metadata("design:type", ResearchProject_1.ResearchProject)
], BlogPost.prototype, "linked_project", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BlogPost.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], BlogPost.prototype, "updated_at", void 0);
exports.BlogPost = BlogPost = __decorate([
    (0, typeorm_1.Entity)("blog_posts"),
    (0, typeorm_1.Index)("idx_blog_status", ["status"]),
    (0, typeorm_1.Index)("idx_blog_category", ["category"]),
    (0, typeorm_1.Index)("idx_blog_published_at", ["published_at"]),
    (0, typeorm_1.Index)("idx_blog_author", ["author"]),
    (0, typeorm_1.Index)("idx_blog_community", ["community"])
], BlogPost);
