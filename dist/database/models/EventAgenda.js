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
exports.EventAgenda = exports.SessionType = void 0;
const typeorm_1 = require("typeorm");
const ResearchProject_1 = require("./ResearchProject");
const Event_1 = require("./Event");
const User_1 = require("./User");
var SessionType;
(function (SessionType) {
    SessionType["PRESENTATION"] = "Presentation";
    SessionType["PANEL"] = "Panel";
    SessionType["QA"] = "Q&A";
    SessionType["BREAK"] = "Break";
})(SessionType || (exports.SessionType = SessionType = {}));
let EventAgenda = class EventAgenda {
};
exports.EventAgenda = EventAgenda;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], EventAgenda.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Event_1.Event, (event) => event.agenda_items, {
        onDelete: "CASCADE"
    }),
    (0, typeorm_1.JoinColumn)({ name: "event_id" }),
    __metadata("design:type", Event_1.Event)
], EventAgenda.prototype, "event", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], EventAgenda.prototype, "session_title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], EventAgenda.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], EventAgenda.prototype, "speaker_name", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "speaker_id" }),
    __metadata("design:type", User_1.User)
], EventAgenda.prototype, "speaker", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "time" }),
    __metadata("design:type", String)
], EventAgenda.prototype, "start_time", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "time" }),
    __metadata("design:type", String)
], EventAgenda.prototype, "end_time", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: SessionType,
    }),
    __metadata("design:type", String)
], EventAgenda.prototype, "session_type", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ResearchProject_1.ResearchProject, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "linked_project_id" }),
    __metadata("design:type", ResearchProject_1.ResearchProject)
], EventAgenda.prototype, "linked_project", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], EventAgenda.prototype, "display_order", void 0);
exports.EventAgenda = EventAgenda = __decorate([
    (0, typeorm_1.Entity)("event_agenda")
], EventAgenda);
