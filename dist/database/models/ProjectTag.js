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
exports.ProjectTag = exports.TagCategory = void 0;
const typeorm_1 = require("typeorm");
const ResearchProject_1 = require("./ResearchProject");
var TagCategory;
(function (TagCategory) {
    TagCategory["FIELD"] = "Field";
    TagCategory["METHOD"] = "Method";
    TagCategory["TOPIC"] = "Topic";
    TagCategory["REGION"] = "Region";
})(TagCategory || (exports.TagCategory = TagCategory = {}));
let ProjectTag = class ProjectTag {
};
exports.ProjectTag = ProjectTag;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], ProjectTag.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], ProjectTag.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], ProjectTag.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], ProjectTag.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], ProjectTag.prototype, "usage_count", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: TagCategory,
    }),
    __metadata("design:type", String)
], ProjectTag.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => ResearchProject_1.ResearchProject, (project) => project.tags),
    __metadata("design:type", Array)
], ProjectTag.prototype, "projects", void 0);
exports.ProjectTag = ProjectTag = __decorate([
    (0, typeorm_1.Entity)("project_tags")
], ProjectTag);
