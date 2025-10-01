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
exports.EventAttendee = exports.RegistrationStatus = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Event_1 = require("./Event");
var RegistrationStatus;
(function (RegistrationStatus) {
    RegistrationStatus["REGISTERED"] = "Registered";
    RegistrationStatus["APPROVED"] = "Approved";
    RegistrationStatus["REJECTED"] = "Rejected";
    RegistrationStatus["WAITLISTED"] = "Waitlisted";
    RegistrationStatus["ATTENDED"] = "Attended";
    RegistrationStatus["NO_SHOW"] = "NoShow";
})(RegistrationStatus || (exports.RegistrationStatus = RegistrationStatus = {}));
let EventAttendee = class EventAttendee {
};
exports.EventAttendee = EventAttendee;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], EventAttendee.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Event_1.Event, (event) => event.attendees, {
        onDelete: "CASCADE"
    }),
    (0, typeorm_1.JoinColumn)({ name: "event_id" }),
    __metadata("design:type", Event_1.Event)
], EventAttendee.prototype, "event", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.eventAttendances, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "user_id" }),
    __metadata("design:type", User_1.User)
], EventAttendee.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: RegistrationStatus,
        default: RegistrationStatus.REGISTERED,
    }),
    __metadata("design:type", String)
], EventAttendee.prototype, "registration_status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], EventAttendee.prototype, "registered_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], EventAttendee.prototype, "approval_note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], EventAttendee.prototype, "check_in_time", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], EventAttendee.prototype, "certificate_issued", void 0);
exports.EventAttendee = EventAttendee = __decorate([
    (0, typeorm_1.Entity)("event_attendees")
], EventAttendee);
