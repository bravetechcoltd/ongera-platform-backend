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
exports.CommunityChatMessage = exports.ChatType = exports.MessageType = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
var MessageType;
(function (MessageType) {
    MessageType["TEXT"] = "text";
    MessageType["IMAGE"] = "image";
    MessageType["VIDEO"] = "video";
    MessageType["AUDIO"] = "audio";
    MessageType["DOCUMENT"] = "document";
})(MessageType || (exports.MessageType = MessageType = {}));
// NEW: Chat Type Enum
var ChatType;
(function (ChatType) {
    ChatType["COMMUNITY"] = "community";
    ChatType["DIRECT"] = "direct"; // Private messages between two users
})(ChatType || (exports.ChatType = ChatType = {}));
let CommunityChatMessage = class CommunityChatMessage {
};
exports.CommunityChatMessage = CommunityChatMessage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], CommunityChatMessage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CommunityChatMessage.prototype, "community_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CommunityChatMessage.prototype, "sender_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: "sender_id" }),
    __metadata("design:type", User_1.User)
], CommunityChatMessage.prototype, "sender", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ChatType,
        default: ChatType.COMMUNITY
    }),
    __metadata("design:type", String)
], CommunityChatMessage.prototype, "chat_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Object)
], CommunityChatMessage.prototype, "recipient_user_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "recipient_user_id" }),
    __metadata("design:type", User_1.User)
], CommunityChatMessage.prototype, "recipient_user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], CommunityChatMessage.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: MessageType,
        default: MessageType.TEXT,
    }),
    __metadata("design:type", String)
], CommunityChatMessage.prototype, "message_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: "", nullable: true }),
    __metadata("design:type", String)
], CommunityChatMessage.prototype, "file_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: "", nullable: true }),
    __metadata("design:type", String)
], CommunityChatMessage.prototype, "file_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: "", nullable: true }),
    __metadata("design:type", String)
], CommunityChatMessage.prototype, "file_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Object)
], CommunityChatMessage.prototype, "reply_to_message_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => CommunityChatMessage, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "reply_to_message_id" }),
    __metadata("design:type", CommunityChatMessage)
], CommunityChatMessage.prototype, "reply_to", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", default: {} }),
    __metadata("design:type", Object)
], CommunityChatMessage.prototype, "reactions", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], CommunityChatMessage.prototype, "edited", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], CommunityChatMessage.prototype, "deleted_for_everyone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", array: true, default: [] }),
    __metadata("design:type", Array)
], CommunityChatMessage.prototype, "deleted_by_users", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", array: true, default: [] }),
    __metadata("design:type", Array)
], CommunityChatMessage.prototype, "read_by", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CommunityChatMessage.prototype, "created_at", void 0);
exports.CommunityChatMessage = CommunityChatMessage = __decorate([
    (0, typeorm_1.Entity)("community_chat_messages"),
    (0, typeorm_1.Index)(["community_id", "chat_type"]) // Index for filtering by chat type
    ,
    (0, typeorm_1.Index)(["community_id", "sender_id", "recipient_user_id"]) // Index for direct messages
], CommunityChatMessage);
