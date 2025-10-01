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
exports.CommunityJoinRequest = exports.JoinRequestStatus = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Community_1 = require("./Community");
var JoinRequestStatus;
(function (JoinRequestStatus) {
    JoinRequestStatus["PENDING"] = "Pending";
    JoinRequestStatus["APPROVED"] = "Approved";
    JoinRequestStatus["REJECTED"] = "Rejected";
})(JoinRequestStatus || (exports.JoinRequestStatus = JoinRequestStatus = {}));
let CommunityJoinRequest = class CommunityJoinRequest {
};
exports.CommunityJoinRequest = CommunityJoinRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], CommunityJoinRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Community_1.Community, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "community_id" }),
    __metadata("design:type", Community_1.Community)
], CommunityJoinRequest.prototype, "community", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "user_id" }),
    __metadata("design:type", User_1.User)
], CommunityJoinRequest.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: JoinRequestStatus,
        default: JoinRequestStatus.PENDING,
    }),
    __metadata("design:type", String)
], CommunityJoinRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], CommunityJoinRequest.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CommunityJoinRequest.prototype, "requested_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], CommunityJoinRequest.prototype, "responded_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "responded_by_id" }),
    __metadata("design:type", User_1.User)
], CommunityJoinRequest.prototype, "responded_by", void 0);
exports.CommunityJoinRequest = CommunityJoinRequest = __decorate([
    (0, typeorm_1.Entity)("community_join_requests")
], CommunityJoinRequest);
