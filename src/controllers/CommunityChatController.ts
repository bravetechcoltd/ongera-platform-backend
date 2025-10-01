// @ts-nocheck

import type { Request, Response, NextFunction } from "express";
import { CommunityChatMessage, ChatType } from "../database/models/CommunityChatMessage";
import { Community } from "../database/models/Community";
import { User } from "../database/models/User";
import dbConnection from "../database/db";
import { LessThan, Brackets } from "typeorm";
import { UploadToCloud } from "../helpers/cloud";

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    account_type?: any;
    id?: string;
    username?: string;
  };
}

export class CommunityChatController {
  // ==================== GET COMMUNITY MESSAGES (FIXED) ====================
  static getCommunityMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { communityId } = req.params;
      const { page = 1, limit = 50, before_timestamp, chat_type, with_user_id } = req.query;
      const userId = req.user?.id;

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

      const messageRepository = dbConnection.getRepository(CommunityChatMessage);
      const communityRepository = dbConnection.getRepository(Community);

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
      const pageNum = Number.parseInt(page as string);
      const limitNum = Number.parseInt(limit as string);
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
          before: new Date(before_timestamp as string),
        });
      }

      // Filter by chat type
      if (chat_type === "community") {
        console.log("📢 [GET_MESSAGES] Fetching community messages");
        queryBuilder.andWhere("message.chat_type = :chatType", { chatType: ChatType.COMMUNITY });
      } else if (chat_type === "direct") {
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
    chatType: ChatType.DIRECT 
  });
  queryBuilder.andWhere(
    new Brackets((qb) => {
      qb.where(
        new Brackets((sqb) => {
          sqb.where("CAST(message.sender_id AS TEXT) = :userId", { userId })
             .andWhere("CAST(message.recipient_user_id AS TEXT) = :withUserId", 
               { withUserId: with_user_id });
        })
      ).orWhere(
        new Brackets((sqb) => {
          sqb.where("CAST(message.sender_id AS TEXT) = :withUserId", 
              { withUserId: with_user_id })
             .andWhere("CAST(message.recipient_user_id AS TEXT) = :userId", 
               { userId });
        })
      );
    })
  );
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
      const groupedMessages = this.groupMessagesByDate(filteredMessages);

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
    } catch (error: any) {
      console.error("❌ [GET_MESSAGES] Error fetching messages:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch messages",
        error: error.message,
      });
    }
  };

  // ==================== GET COMMUNITY MEMBERS FOR CHAT (FIXED) ====================
  static getCommunityMembersForChat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { communityId } = req.params;
      
      console.log("\n👥 [GET_CHAT_MEMBERS] Fetching chat members...");
      console.log("   Community ID:", communityId);
      console.log("   req.user:", JSON.stringify(req.user, null, 2));
      
      // FIXED: Check both id and userId
      const userId = req.user?.id || req.user?.userId;
      console.log("   Extracted User ID:", userId);

      if (!userId) {
        console.log("   ❌ No user ID found");
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
        return;
      }

      const communityRepository = dbConnection.getRepository(Community);
      const messageRepository = dbConnection.getRepository(CommunityChatMessage);

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
  .andWhere("message.chat_type = :chatType", { chatType: ChatType.DIRECT })
  .andWhere(
    new Brackets((qb) => {
      qb.where(
        new Brackets((sqb) => {
          sqb.where("CAST(message.sender_id AS TEXT) = :userId", { userId })
             .andWhere("CAST(message.recipient_user_id AS TEXT) = :memberId", { memberId: member.id });
        })
      ).orWhere(
        new Brackets((sqb) => {
          sqb.where("CAST(message.sender_id AS TEXT) = :memberId", { memberId: member.id })
             .andWhere("CAST(message.recipient_user_id AS TEXT) = :userId", { userId });
        })
      );
    })
  )
  .orderBy("message.created_at", "DESC")
  .getOne();

// ALSO UPDATE the unread count query:
const unreadCount = await messageRepository
  .createQueryBuilder("message")
  .where("message.community_id = :communityId", { communityId })
  .andWhere("message.chat_type = :chatType", { chatType: ChatType.DIRECT })
  .andWhere("CAST(message.sender_id AS TEXT) = :memberId", { memberId: member.id })
  .andWhere("CAST(message.recipient_user_id AS TEXT) = :userId", { userId })
  .andWhere("message.deleted_for_everyone = :deleted", { deleted: false })
  .andWhere(
    new Brackets((qb) => {
      qb.where("message.read_by IS NULL")
        .orWhere("NOT (:userId = ANY(message.read_by))", { userId });
    })
  )
  .getCount();


          console.log(`   Member ${member.first_name}: lastMsg=${!!lastMessage}, unread=${unreadCount}`);

          membersForChat.push({
            userId: member.id,
            userName: `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.username || 'Unknown User',
            email: member.email,
            profilePicture: member.profile_picture_url || null,
            accountType: member.account_type,
            lastMessageTime: lastMessage?.created_at || null,
            unreadCount: unreadCount || 0,
            profile: member.profile || null,
          });
        } catch (memberError: any) {
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
        if (!a.lastMessageTime && !b.lastMessageTime) return 0;
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
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
    } catch (error: any) {
      console.error("❌ [GET_CHAT_MEMBERS] Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch members",
        error: error.message,
      });
    }
  };

  // ==================== ORIGINAL METHODS (100% MAINTAINED) ====================

  static uploadChatFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

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
      const uploadResult = await UploadToCloud(req.file, res);
      const secureUrl = (uploadResult as any).secure_url;

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
      } else if (req.file.mimetype.startsWith("video/")) {
        fileType = "video";
      } else if (req.file.mimetype.startsWith("audio/")) {
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
    } catch (error: any) {
      console.error("Error uploading file:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload file",
        error: error.message,
      });
    }
  };

  static getMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { communityId, messageId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
        return;
      }

      const messageRepository = dbConnection.getRepository(CommunityChatMessage);
      const communityRepository = dbConnection.getRepository(Community);

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
    } catch (error: any) {
      console.error("Error fetching message:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch message",
        error: error.message,
      });
    }
  };

  static getOnlineMembers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { communityId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
        return;
      }

      const communityRepository = dbConnection.getRepository(Community);

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
    } catch (error: any) {
      console.error("Error fetching online members:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch online members",
        error: error.message,
      });
    }
  };

  private static groupMessagesByDate(messages: CommunityChatMessage[]) {
    const grouped: { [key: string]: any[] } = {};

    messages.forEach((message) => {
      const date = new Date(message.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateKey: string;

      if (date.toDateString() === today.toDateString()) {
        dateKey = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = "Yesterday";
      } else {
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


  static getDirectConversation = async (
  req: AuthenticatedRequest, 
  res: Response
): Promise<void> => {
  try {
    const { communityId, otherUserId } = req.params;
    const { page = 1, limit = 50, before_timestamp } = req.query;
    
    console.log("\n💬 [GET_DIRECT_CONVERSATION] Fetching conversation...");
    console.log("   Community ID:", communityId);
    console.log("   Other User ID:", otherUserId);
    
    const userId = req.user?.id || req.user?.userId;
    console.log("   Current User ID:", userId);

    if (!userId) {
      console.log("   ❌ Not authenticated");
      res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
      return;
    }

    const messageRepository = dbConnection.getRepository(CommunityChatMessage);
    const communityRepository = dbConnection.getRepository(Community);
    const userRepository = dbConnection.getRepository(User);

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

    const isOtherUserMember = community.members.some(
      (member) => member.id === otherUserId
    );
    
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
    const pageNum = Number.parseInt(page as string);
    const limitNum = Number.parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const queryBuilder = messageRepository
      .createQueryBuilder("message")
      .leftJoinAndSelect("message.sender", "sender")
      .leftJoinAndSelect("message.reply_to", "reply_to")
      .leftJoinAndSelect("reply_to.sender", "reply_sender")
      .leftJoinAndSelect("message.recipient_user", "recipient_user")
      .where("message.community_id = :communityId", { communityId })
      .andWhere("message.chat_type = :chatType", { chatType: ChatType.DIRECT })
      .andWhere("message.deleted_for_everyone = :deleted", { deleted: false })
      .andWhere(
        new Brackets((qb) => {
          qb.where(
            new Brackets((sqb) => {
              sqb.where("CAST(message.sender_id AS TEXT) = :userId", { userId })
                 .andWhere("CAST(message.recipient_user_id AS TEXT) = :otherUserId", 
                   { otherUserId });
            })
          ).orWhere(
            new Brackets((sqb) => {
              sqb.where("CAST(message.sender_id AS TEXT) = :otherUserId", 
                  { otherUserId })
                 .andWhere("CAST(message.recipient_user_id AS TEXT) = :userId", 
                   { userId });
            })
          );
        })
      );

    // Add timestamp filter for infinite scroll
    if (before_timestamp) {
      queryBuilder.andWhere("message.created_at < :before", {
        before: new Date(before_timestamp as string),
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
    const filteredMessages = messages.filter(
      (msg) => !msg.deleted_by_users.includes(userId)
    );

    console.log("   ✅ After filtering:", filteredMessages.length);

    // Mark unread messages as read
    const unreadMessageIds = filteredMessages
      .filter(msg => 
        msg.recipient_user_id === userId && 
        (!msg.read_by || !msg.read_by.includes(userId))
      )
      .map(msg => msg.id);

    if (unreadMessageIds.length > 0) {
      await messageRepository
        .createQueryBuilder()
        .update(CommunityChatMessage)
        .set({
          read_by: () => `array_append(COALESCE(read_by, ARRAY[]::text[]), '${userId}')`
        })
        .where("id IN (:...ids)", { ids: unreadMessageIds })
        .andWhere(
          "NOT (:userId = ANY(COALESCE(read_by, ARRAY[]::text[])))", 
          { userId }
        )
        .execute();

      console.log("   ✅ Marked", unreadMessageIds.length, "messages as read");
    }

    // Group messages by date
    const groupedMessages = this.groupMessagesByDate(filteredMessages);

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
  } catch (error: any) {
    console.error("❌ [GET_DIRECT_CONVERSATION] Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversation",
      error: error.message,
    });
  }
};

}