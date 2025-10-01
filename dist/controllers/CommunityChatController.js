"use strict";
// @ts-nocheck
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityChatController = void 0;
const CommunityChatMessage_1 = require("../database/models/CommunityChatMessage");
const Community_1 = require("../database/models/Community");
const User_1 = require("../database/models/User");
const db_1 = __importDefault(require("../database/db"));
const typeorm_1 = require("typeorm");
const cloud_1 = require("../helpers/cloud");
class CommunityChatController {
    static groupMessagesByDate(messages) {
        const grouped = {};
        messages.forEach((message) => {
            const date = new Date(message.created_at);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            let dateKey;
            if (date.toDateString() === today.toDateString()) {
                dateKey = "Today";
            }
            else if (date.toDateString() === yesterday.toDateString()) {
                dateKey = "Yesterday";
            }
            else {
                dateKey = date.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                });
            }
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push({
                id: message.id,
                content: message.content,
                messageType: message.message_type,
                fileUrl: message.file_url,
                fileName: message.file_name,
                fileType: message.file_type,
                sender: {
                    id: message.sender.id,
                    name: message.sender.first_name || message.sender.username,
                    profilePicture: message.sender.profile_picture_url,
                },
                replyTo: message.reply_to
                    ? {
                        id: message.reply_to.id,
                        content: message.reply_to.content,
                        sender: {
                            id: message.reply_to.sender.id,
                            name: message.reply_to.sender.first_name || message.reply_to.sender.username,
                        },
                    }
                    : null,
                reactions: message.reactions,
                edited: message.edited,
                createdAt: message.created_at,
                chatType: message.chat_type,
                recipientUserId: message.recipient_user_id,
                recipientUser: message.recipient_user
                    ? {
                        id: message.recipient_user.id,
                        name: message.recipient_user.first_name || message.recipient_user.username,
                        profilePicture: message.recipient_user.profile_picture_url,
                    }
                    : null,
            });
        });
        // Convert to array format
        return Object.entries(grouped).map(([date, messages]) => ({
            date,
            messages: messages.reverse(),
        }));
    }
}
exports.CommunityChatController = CommunityChatController;
_a = CommunityChatController;
// ==================== GET COMMUNITY MESSAGES (FIXED) ====================
CommunityChatController.getCommunityMessages = async (req, res, next) => {
    var _b;
    try {
        const { communityId } = req.params;
        const { page = 1, limit = 50, before_timestamp, chat_type, with_user_id } = req.query;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
        console.log("\n🔍 [GET_MESSAGES] Fetch request:", {
            communityId,
            userId,
            chatType: chat_type,
            withUserId: with_user_id,
            page,
            timestamp: new Date().toISOString()
        });
        if (!userId) {
            console.error("❌ [GET_MESSAGES] Not authenticated");
            res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
            return;
        }
        const messageRepository = db_1.default.getRepository(CommunityChatMessage_1.CommunityChatMessage);
        const communityRepository = db_1.default.getRepository(Community_1.Community);
        // Verify user is member of community
        const community = await communityRepository.findOne({
            where: { id: communityId },
            relations: ["members"],
        });
        if (!community) {
            console.error("❌ [GET_MESSAGES] Community not found:", communityId);
            res.status(404).json({
                success: false,
                message: "Community not found",
            });
            return;
        }
        const isMember = community.members.some((member) => member.id === userId);
        if (!isMember) {
            console.error("❌ [GET_MESSAGES] User not a member:", userId);
            res.status(403).json({
                success: false,
                message: "Not a member of this community",
            });
            return;
        }
        console.log("✅ [GET_MESSAGES] User verified as member");
        // Build query
        const pageNum = Number.parseInt(page);
        const limitNum = Number.parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const queryBuilder = messageRepository
            .createQueryBuilder("message")
            .leftJoinAndSelect("message.sender", "sender")
            .leftJoinAndSelect("message.reply_to", "reply_to")
            .leftJoinAndSelect("reply_to.sender", "reply_sender")
            .leftJoinAndSelect("message.recipient_user", "recipient_user")
            .where("message.community_id = :communityId", { communityId })
            .andWhere("message.deleted_for_everyone = :deleted", { deleted: false });
        // Add timestamp filter for infinite scroll
        if (before_timestamp) {
            queryBuilder.andWhere("message.created_at < :before", {
                before: new Date(before_timestamp),
            });
        }
        // Filter by chat type
        if (chat_type === "community") {
            console.log("📢 [GET_MESSAGES] Fetching community messages");
            queryBuilder.andWhere("message.chat_type = :chatType", { chatType: CommunityChatMessage_1.ChatType.COMMUNITY });
        }
        else if (chat_type === "direct") {
            if (!with_user_id) {
                console.error("❌ [GET_MESSAGES] Direct chat requires with_user_id");
                res.status(400).json({
                    success: false,
                    message: "with_user_id is required when filtering by direct messages",
                });
                return;
            }
            console.log("💬 [GET_MESSAGES] Fetching direct messages between:", {
                user1: userId,
                user2: with_user_id
            });
            // Get conversation between current user and specified user
            queryBuilder.andWhere("message.chat_type = :chatType", {
                chatType: CommunityChatMessage_1.ChatType.DIRECT
            });
            queryBuilder.andWhere(new typeorm_1.Brackets((qb) => {
                qb.where(new typeorm_1.Brackets((sqb) => {
                    sqb.where("CAST(message.sender_id AS TEXT) = :userId", { userId })
                        .andWhere("CAST(message.recipient_user_id AS TEXT) = :withUserId", { withUserId: with_user_id });
                })).orWhere(new typeorm_1.Brackets((sqb) => {
                    sqb.where("CAST(message.sender_id AS TEXT) = :withUserId", { withUserId: with_user_id })
                        .andWhere("CAST(message.recipient_user_id AS TEXT) = :userId", { userId });
                }));
            }));
        }
        // Fetch messages
        const [messages, total] = await queryBuilder
            .orderBy("message.created_at", "DESC")
            .take(limitNum)
            .skip(skip)
            .getManyAndCount();
        console.log("📦 [GET_MESSAGES] Query results:", {
            foundMessages: messages.length,
            total,
            page: pageNum
        });
        // Log first few messages for debugging
        if (messages.length > 0) {
            console.log("📝 [GET_MESSAGES] Sample messages:", messages.slice(0, 3).map(msg => ({
                id: msg.id,
                chatType: msg.chat_type,
                senderId: msg.sender_id,
                recipientId: msg.recipient_user_id,
                content: msg.content.substring(0, 30) + "..."
            })));
        }
        // Filter out messages deleted by this user
        const filteredMessages = messages.filter((msg) => !msg.deleted_by_users.includes(userId));
        console.log("✅ [GET_MESSAGES] After filtering deleted:", filteredMessages.length);
        // Group messages by date
        const groupedMessages = _a.groupMessagesByDate(filteredMessages);
        console.log("✅ [GET_MESSAGES] Response ready:", {
            groupCount: groupedMessages.length,
            totalMessages: filteredMessages.length
        });
        res.status(200).json({
            success: true,
            data: {
                messages: groupedMessages,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: total,
                    totalPages: Math.ceil(total / limitNum),
                    hasMore: skip + filteredMessages.length < total,
                },
            },
        });
        console.log("✅ [GET_MESSAGES] Fetch complete\n");
    }
    catch (error) {
        console.error("❌ [GET_MESSAGES] Error fetching messages:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch messages",
            error: error.message,
        });
    }
};
// ==================== GET COMMUNITY MEMBERS FOR CHAT (FIXED) ====================
CommunityChatController.getCommunityMembersForChat = async (req, res) => {
    var _b, _c;
    try {
        const { communityId } = req.params;
        console.log("\n👥 [GET_CHAT_MEMBERS] Fetching chat members...");
        console.log("   Community ID:", communityId);
        console.log("   req.user:", JSON.stringify(req.user, null, 2));
        // FIXED: Check both id and userId
        const userId = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.userId);
        console.log("   Extracted User ID:", userId);
        if (!userId) {
            console.log("   ❌ No user ID found");
            res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
            return;
        }
        const communityRepository = db_1.default.getRepository(Community_1.Community);
        const messageRepository = db_1.default.getRepository(CommunityChatMessage_1.CommunityChatMessage);
        // Verify user is member
        const community = await communityRepository.findOne({
            where: { id: communityId },
            relations: ["members", "members.profile"],
        });
        if (!community) {
            console.log("   ❌ Community not found");
            res.status(404).json({
                success: false,
                message: "Community not found",
            });
            return;
        }
        const isMember = community.members.some((member) => member.id === userId);
        if (!isMember) {
            console.log("   ❌ User not a member");
            res.status(403).json({
                success: false,
                message: "Not a member of this community",
            });
            return;
        }
        console.log(`   ✅ Community: ${community.name}`);
        console.log(`   Total members: ${community.members.length}`);
        // Get all members except current user
        const otherMembers = community.members.filter((member) => member.id !== userId);
        console.log(`   Other members: ${otherMembers.length}`);
        const membersForChat = [];
        for (const member of otherMembers) {
            try {
                // Get last message with this user - FIXED QUERY
                const lastMessage = await messageRepository
                    .createQueryBuilder("message")
                    .where("message.community_id = :communityId", { communityId })
                    .andWhere("message.chat_type = :chatType", { chatType: CommunityChatMessage_1.ChatType.DIRECT })
                    .andWhere(new typeorm_1.Brackets((qb) => {
                    qb.where(new typeorm_1.Brackets((sqb) => {
                        sqb.where("CAST(message.sender_id AS TEXT) = :userId", { userId })
                            .andWhere("CAST(message.recipient_user_id AS TEXT) = :memberId", { memberId: member.id });
                    })).orWhere(new typeorm_1.Brackets((sqb) => {
                        sqb.where("CAST(message.sender_id AS TEXT) = :memberId", { memberId: member.id })
                            .andWhere("CAST(message.recipient_user_id AS TEXT) = :userId", { userId });
                    }));
                }))
                    .orderBy("message.created_at", "DESC")
                    .getOne();
                // ALSO UPDATE the unread count query:
                const unreadCount = await messageRepository
                    .createQueryBuilder("message")
                    .where("message.community_id = :communityId", { communityId })
                    .andWhere("message.chat_type = :chatType", { chatType: CommunityChatMessage_1.ChatType.DIRECT })
                    .andWhere("CAST(message.sender_id AS TEXT) = :memberId", { memberId: member.id })
                    .andWhere("CAST(message.recipient_user_id AS TEXT) = :userId", { userId })
                    .andWhere("message.deleted_for_everyone = :deleted", { deleted: false })
                    .andWhere(new typeorm_1.Brackets((qb) => {
                    qb.where("message.read_by IS NULL")
                        .orWhere("NOT (:userId = ANY(message.read_by))", { userId });
                }))
                    .getCount();
                console.log(`   Member ${member.first_name}: lastMsg=${!!lastMessage}, unread=${unreadCount}`);
                membersForChat.push({
                    userId: member.id,
                    userName: `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.username || 'Unknown User',
                    email: member.email,
                    profilePicture: member.profile_picture_url || null,
                    accountType: member.account_type,
                    lastMessageTime: (lastMessage === null || lastMessage === void 0 ? void 0 : lastMessage.created_at) || null,
                    unreadCount: unreadCount || 0,
                    profile: member.profile || null,
                });
            }
            catch (memberError) {
                console.error(`   ⚠️ Error processing member ${member.id}:`, memberError.message);
                membersForChat.push({
                    userId: member.id,
                    userName: `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.username || 'Unknown User',
                    email: member.email,
                    profilePicture: member.profile_picture_url || null,
                    accountType: member.account_type,
                    lastMessageTime: null,
                    unreadCount: 0,
                    profile: member.profile || null,
                });
            }
        }
        // Sort by last message time
        membersForChat.sort((a, b) => {
            if (!a.lastMessageTime && !b.lastMessageTime)
                return 0;
            if (!a.lastMessageTime)
                return 1;
            if (!b.lastMessageTime)
                return -1;
            return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
        });
        console.log(`   ✅ Processed ${membersForChat.length} members`);
        console.log(`   Members with msgs: ${membersForChat.filter(m => m.lastMessageTime).length}`);
        console.log(`   Total unread: ${membersForChat.reduce((sum, m) => sum + m.unreadCount, 0)}\n`);
        res.status(200).json({
            success: true,
            data: {
                members: membersForChat,
            },
        });
    }
    catch (error) {
        console.error("❌ [GET_CHAT_MEMBERS] Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch members",
            error: error.message,
        });
    }
};
// ==================== ORIGINAL METHODS (100% MAINTAINED) ====================
CommunityChatController.uploadChatFile = async (req, res, next) => {
    var _b;
    try {
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
            return;
        }
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: "No file uploaded",
            });
            return;
        }
        // Validate file size (50MB max)
        const maxSize = 50 * 1024 * 1024;
        if (req.file.size > maxSize) {
            res.status(400).json({
                success: false,
                message: `File exceeds ${maxSize / 1024 / 1024}MB limit`,
            });
            return;
        }
        // Upload to cloud
        const uploadResult = await (0, cloud_1.UploadToCloud)(req.file, res);
        const secureUrl = uploadResult.secure_url;
        if (!secureUrl) {
            res.status(500).json({
                success: false,
                message: "Failed to upload file",
            });
            return;
        }
        // Determine file type
        let fileType = "document";
        if (req.file.mimetype.startsWith("image/")) {
            fileType = "image";
        }
        else if (req.file.mimetype.startsWith("video/")) {
            fileType = "video";
        }
        else if (req.file.mimetype.startsWith("audio/")) {
            fileType = "audio";
        }
        res.status(200).json({
            success: true,
            data: {
                fileUrl: secureUrl,
                fileName: req.file.originalname,
                fileType: fileType,
            },
        });
    }
    catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).json({
            success: false,
            message: "Failed to upload file",
            error: error.message,
        });
    }
};
CommunityChatController.getMessage = async (req, res, next) => {
    var _b;
    try {
        const { communityId, messageId } = req.params;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
            return;
        }
        const messageRepository = db_1.default.getRepository(CommunityChatMessage_1.CommunityChatMessage);
        const communityRepository = db_1.default.getRepository(Community_1.Community);
        // Verify user is member
        const community = await communityRepository.findOne({
            where: { id: communityId },
            relations: ["members"],
        });
        if (!community) {
            res.status(404).json({
                success: false,
                message: "Community not found",
            });
            return;
        }
        const isMember = community.members.some((member) => member.id === userId);
        if (!isMember) {
            res.status(403).json({
                success: false,
                message: "Not a member of this community",
            });
            return;
        }
        // Get message
        const message = await messageRepository.findOne({
            where: { id: messageId, community_id: communityId },
            relations: ["sender", "reply_to", "reply_to.sender", "recipient_user"],
        });
        if (!message) {
            res.status(404).json({
                success: false,
                message: "Message not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: message,
        });
    }
    catch (error) {
        console.error("Error fetching message:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch message",
            error: error.message,
        });
    }
};
CommunityChatController.getOnlineMembers = async (req, res, next) => {
    var _b;
    try {
        const { communityId } = req.params;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
            return;
        }
        const communityRepository = db_1.default.getRepository(Community_1.Community);
        // Verify user is member
        const community = await communityRepository.findOne({
            where: { id: communityId },
            relations: ["members"],
        });
        if (!community) {
            res.status(404).json({
                success: false,
                message: "Community not found",
            });
            return;
        }
        const isMember = community.members.some((member) => member.id === userId);
        if (!isMember) {
            res.status(403).json({
                success: false,
                message: "Not a member of this community",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: {
                onlineMembers: [],
            },
        });
    }
    catch (error) {
        console.error("Error fetching online members:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch online members",
            error: error.message,
        });
    }
};
CommunityChatController.getDirectConversation = async (req, res) => {
    var _b, _c;
    try {
        const { communityId, otherUserId } = req.params;
        const { page = 1, limit = 50, before_timestamp } = req.query;
        console.log("\n💬 [GET_DIRECT_CONVERSATION] Fetching conversation...");
        console.log("   Community ID:", communityId);
        console.log("   Other User ID:", otherUserId);
        const userId = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.userId);
        console.log("   Current User ID:", userId);
        if (!userId) {
            console.log("   ❌ Not authenticated");
            res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
            return;
        }
        const messageRepository = db_1.default.getRepository(CommunityChatMessage_1.CommunityChatMessage);
        const communityRepository = db_1.default.getRepository(Community_1.Community);
        const userRepository = db_1.default.getRepository(User_1.User);
        // Verify community exists and user is member
        const community = await communityRepository.findOne({
            where: { id: communityId },
            relations: ["members"],
        });
        if (!community) {
            console.log("   ❌ Community not found");
            res.status(404).json({
                success: false,
                message: "Community not found",
            });
            return;
        }
        const isMember = community.members.some((member) => member.id === userId);
        if (!isMember) {
            console.log("   ❌ User not a member");
            res.status(403).json({
                success: false,
                message: "Not a member of this community",
            });
            return;
        }
        // Verify other user exists and is member
        const otherUser = await userRepository.findOne({
            where: { id: otherUserId }
        });
        if (!otherUser) {
            console.log("   ❌ Other user not found");
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        const isOtherUserMember = community.members.some((member) => member.id === otherUserId);
        if (!isOtherUserMember) {
            console.log("   ❌ Other user not a member");
            res.status(403).json({
                success: false,
                message: "Other user is not a member of this community",
            });
            return;
        }
        console.log("   ✅ Both users verified as members");
        // Build query for conversation
        const pageNum = Number.parseInt(page);
        const limitNum = Number.parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const queryBuilder = messageRepository
            .createQueryBuilder("message")
            .leftJoinAndSelect("message.sender", "sender")
            .leftJoinAndSelect("message.reply_to", "reply_to")
            .leftJoinAndSelect("reply_to.sender", "reply_sender")
            .leftJoinAndSelect("message.recipient_user", "recipient_user")
            .where("message.community_id = :communityId", { communityId })
            .andWhere("message.chat_type = :chatType", { chatType: CommunityChatMessage_1.ChatType.DIRECT })
            .andWhere("message.deleted_for_everyone = :deleted", { deleted: false })
            .andWhere(new typeorm_1.Brackets((qb) => {
            qb.where(new typeorm_1.Brackets((sqb) => {
                sqb.where("CAST(message.sender_id AS TEXT) = :userId", { userId })
                    .andWhere("CAST(message.recipient_user_id AS TEXT) = :otherUserId", { otherUserId });
            })).orWhere(new typeorm_1.Brackets((sqb) => {
                sqb.where("CAST(message.sender_id AS TEXT) = :otherUserId", { otherUserId })
                    .andWhere("CAST(message.recipient_user_id AS TEXT) = :userId", { userId });
            }));
        }));
        // Add timestamp filter for infinite scroll
        if (before_timestamp) {
            queryBuilder.andWhere("message.created_at < :before", {
                before: new Date(before_timestamp),
            });
        }
        // Fetch messages
        const [messages, total] = await queryBuilder
            .orderBy("message.created_at", "DESC")
            .take(limitNum)
            .skip(skip)
            .getManyAndCount();
        console.log("   📦 Found messages:", messages.length, "/ Total:", total);
        // Filter out messages deleted by current user
        const filteredMessages = messages.filter((msg) => !msg.deleted_by_users.includes(userId));
        console.log("   ✅ After filtering:", filteredMessages.length);
        // Mark unread messages as read
        const unreadMessageIds = filteredMessages
            .filter(msg => msg.recipient_user_id === userId &&
            (!msg.read_by || !msg.read_by.includes(userId)))
            .map(msg => msg.id);
        if (unreadMessageIds.length > 0) {
            await messageRepository
                .createQueryBuilder()
                .update(CommunityChatMessage_1.CommunityChatMessage)
                .set({
                read_by: () => `array_append(COALESCE(read_by, ARRAY[]::text[]), '${userId}')`
            })
                .where("id IN (:...ids)", { ids: unreadMessageIds })
                .andWhere("NOT (:userId = ANY(COALESCE(read_by, ARRAY[]::text[])))", { userId })
                .execute();
            console.log("   ✅ Marked", unreadMessageIds.length, "messages as read");
        }
        // Group messages by date
        const groupedMessages = _a.groupMessagesByDate(filteredMessages);
        // Get other user info
        const otherUserInfo = {
            userId: otherUser.id,
            userName: `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim()
                || otherUser.username || 'Unknown',
            email: otherUser.email,
            profilePicture: otherUser.profile_picture_url || null,
            accountType: otherUser.account_type,
        };
        console.log("   ✅ Conversation loaded successfully\n");
        res.status(200).json({
            success: true,
            data: {
                messages: groupedMessages,
                otherUser: otherUserInfo,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: total,
                    totalPages: Math.ceil(total / limitNum),
                    hasMore: skip + filteredMessages.length < total,
                },
            },
        });
    }
    catch (error) {
        console.error("❌ [GET_DIRECT_CONVERSATION] Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch conversation",
            error: error.message,
        });
    }
};
