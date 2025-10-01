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
exports.QAAnswer = void 0;
const typeorm_1 = require("typeorm");
const QAThread_1 = require("./QAThread");
const User_1 = require("./User");
const QAVote_1 = require("./QAVote");
let QAAnswer = class QAAnswer {
};
exports.QAAnswer = QAAnswer;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], QAAnswer.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => QAThread_1.QAThread, (thread) => thread.answers),
    (0, typeorm_1.JoinColumn)({ name: "thread_id" }),
    __metadata("design:type", QAThread_1.QAThread)
], QAAnswer.prototype, "thread", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: "answerer_id" }),
    __metadata("design:type", User_1.User)
], QAAnswer.prototype, "answerer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], QAAnswer.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], QAAnswer.prototype, "is_accepted", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], QAAnswer.prototype, "upvotes_count", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], QAAnswer.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], QAAnswer.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => QAVote_1.QAVote, (vote) => vote.answer),
    __metadata("design:type", Array)
], QAAnswer.prototype, "votes", void 0);
exports.QAAnswer = QAAnswer = __decorate([
    (0, typeorm_1.Entity)("qa_answers")
], QAAnswer);
