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
exports.Event = exports.EventStatus = exports.EventMode = exports.EventType = void 0;
const typeorm_1 = require("typeorm");
const EventAttendee_1 = require("./EventAttendee");
const EventAgenda_1 = require("./EventAgenda");
const User_1 = require("./User");
const Community_1 = require("./Community");
const ResearchProject_1 = require("./ResearchProject");
var EventType;
(function (EventType) {
    EventType["WEBINAR"] = "Webinar";
    EventType["CONFERENCE"] = "Conference";
    EventType["WORKSHOP"] = "Workshop";
    EventType["SEMINAR"] = "Seminar";
    EventType["MEETUP"] = "Meetup";
})(EventType || (exports.EventType = EventType = {}));
var EventMode;
(function (EventMode) {
    EventMode["ONLINE"] = "Online";
    EventMode["PHYSICAL"] = "Physical";
    EventMode["HYBRID"] = "Hybrid";
})(EventMode || (exports.EventMode = EventMode = {}));
var EventStatus;
(function (EventStatus) {
    EventStatus["UPCOMING"] = "Upcoming";
    EventStatus["ONGOING"] = "Ongoing";
    EventStatus["COMPLETED"] = "Completed";
    EventStatus["CANCELLED"] = "Cancelled";
    EventStatus["DELETED"] = "Deleted";
})(EventStatus || (exports.EventStatus = EventStatus = {}));
let Event = class Event {
};
exports.Event = Event;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Event.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.organized_events),
    (0, typeorm_1.JoinColumn)({ name: "organizer_id" }),
    __metadata("design:type", User_1.User)
], Event.prototype, "organizer", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Community_1.Community, (community) => community.events, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "community_id" }),
    __metadata("design:type", Community_1.Community)
], Event.prototype, "community", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Event.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], Event.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: EventType,
    }),
    __metadata("design:type", String)
], Event.prototype, "event_type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: EventMode,
    }),
    __metadata("design:type", String)
], Event.prototype, "event_mode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp" }),
    __metadata("design:type", Date)
], Event.prototype, "start_datetime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp" }),
    __metadata("design:type", Date)
], Event.prototype, "end_datetime", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Event.prototype, "timezone", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Event.prototype, "location_address", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Event.prototype, "online_meeting_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Event.prototype, "meeting_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Event.prototype, "meeting_password", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Event.prototype, "cover_image_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], Event.prototype, "max_attendees", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], Event.prototype, "registration_deadline", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Event.prototype, "is_free", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", nullable: true }),
    __metadata("design:type", Number)
], Event.prototype, "price_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: EventStatus,
        default: EventStatus.UPCOMING,
    }),
    __metadata("design:type", String)
], Event.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Event.prototype, "requires_approval", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Event.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Event.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => EventAttendee_1.EventAttendee, (attendee) => attendee.event),
    __metadata("design:type", Array)
], Event.prototype, "attendees", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => EventAgenda_1.EventAgenda, (agenda) => agenda.event),
    __metadata("design:type", Array)
], Event.prototype, "agenda_items", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => ResearchProject_1.ResearchProject),
    (0, typeorm_1.JoinTable)({
        name: "event_projects",
        joinColumn: { name: "event_id" },
        inverseJoinColumn: { name: "project_id" },
    }),
    __metadata("design:type", Array)
], Event.prototype, "linked_projects", void 0);
exports.Event = Event = __decorate([
    (0, typeorm_1.Entity)("events")
], Event);
