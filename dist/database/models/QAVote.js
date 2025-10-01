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
exports.QAVote = exports.VoteType = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const QAAnswer_1 = require("./QAAnswer");
var VoteType;
(function (VoteType) {
    VoteType["UPVOTE"] = "UPVOTE";
    VoteType["DOWNVOTE"] = "DOWNVOTE";
})(VoteType || (exports.VoteType = VoteType = {}));
let QAVote = class QAVote {
};
exports.QAVote = QAVote;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], QAVote.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: "user_id" }),
    __metadata("design:type", User_1.User)
], QAVote.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => QAAnswer_1.QAAnswer, (answer) => answer.votes),
    (0, typeorm_1.JoinColumn)({ name: "answer_id" }),
    __metadata("design:type", QAAnswer_1.QAAnswer)
], QAVote.prototype, "answer", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: VoteType,
    }),
    __metadata("design:type", String)
], QAVote.prototype, "vote_type", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], QAVote.prototype, "created_at", void 0);
exports.QAVote = QAVote = __decorate([
    (0, typeorm_1.Entity)("qa_votes"),
    (0, typeorm_1.Index)(["user", "answer"], { unique: true })
], QAVote);
