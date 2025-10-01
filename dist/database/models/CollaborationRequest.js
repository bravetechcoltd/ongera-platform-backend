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
exports.CollaborationRequest = exports.CollaborationRequestStatus = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const ResearchProject_1 = require("./ResearchProject");
// Collaboration Request Status
var CollaborationRequestStatus;
(function (CollaborationRequestStatus) {
    CollaborationRequestStatus["PENDING"] = "Pending";
    CollaborationRequestStatus["APPROVED"] = "Approved";
    CollaborationRequestStatus["REJECTED"] = "Rejected";
})(CollaborationRequestStatus || (exports.CollaborationRequestStatus = CollaborationRequestStatus = {}));
/**
 * CollaborationRequest Entity
 * Manages requests from users wanting to contribute to research projects
 */
let CollaborationRequest = class CollaborationRequest {
};
exports.CollaborationRequest = CollaborationRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], CollaborationRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ResearchProject_1.ResearchProject, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "project_id" }),
    __metadata("design:type", ResearchProject_1.ResearchProject)
], CollaborationRequest.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: "requester_id" }),
    __metadata("design:type", User_1.User)
], CollaborationRequest.prototype, "requester", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], CollaborationRequest.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], CollaborationRequest.prototype, "expertise", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: CollaborationRequestStatus,
        default: CollaborationRequestStatus.PENDING,
    }),
    __metadata("design:type", String)
], CollaborationRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], CollaborationRequest.prototype, "rejection_reason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CollaborationRequest.prototype, "requested_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CollaborationRequest.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], CollaborationRequest.prototype, "responded_at", void 0);
exports.CollaborationRequest = CollaborationRequest = __decorate([
    (0, typeorm_1.Entity)("collaboration_requests")
], CollaborationRequest);
