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
exports.QAThread = void 0;
const typeorm_1 = require("typeorm");
const QAAnswer_1 = require("./QAAnswer");
const Community_1 = require("./Community");
const User_1 = require("./User");
let QAThread = class QAThread {
};
exports.QAThread = QAThread;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], QAThread.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.qa_threads),
    (0, typeorm_1.JoinColumn)({ name: "asker_id" }),
    __metadata("design:type", User_1.User)
], QAThread.prototype, "asker", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Community_1.Community, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "community_id" }),
    __metadata("design:type", Community_1.Community)
], QAThread.prototype, "community", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], QAThread.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], QAThread.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Array)
], QAThread.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], QAThread.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], QAThread.prototype, "is_answered", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => QAAnswer_1.QAAnswer, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "best_answer_id" }),
    __metadata("design:type", QAAnswer_1.QAAnswer)
], QAThread.prototype, "best_answer", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], QAThread.prototype, "view_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], QAThread.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], QAThread.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], QAThread.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => QAAnswer_1.QAAnswer, (answer) => answer.thread),
    __metadata("design:type", Array)
], QAThread.prototype, "answers", void 0);
exports.QAThread = QAThread = __decorate([
    (0, typeorm_1.Entity)("qa_threads")
], QAThread);
