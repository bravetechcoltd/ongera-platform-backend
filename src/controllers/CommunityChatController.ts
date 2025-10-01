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
  static getCommunityMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { communityId } = req.params;
      const { page = 1, limit = 50, before_timestamp, chat_type, with_user_id } = req.query;
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

      if (before_timestamp) {
        queryBuilder.andWhere("message.created_at < :before", {
          before: new Date(before_timestamp as string),
        });
      }

      if (chat_type === "community") {
        queryBuilder.andWhere("message.chat_type = :chatType", { chatType: ChatType.COMMUNITY });
      } else if (chat_type === "direct") {
        if (!with_user_id) {
          res.status(400).json({
            success: false,
            message: "with_user_id is required when filtering by direct messages",
          });
          return;
        }

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

      const [messages, total] = await queryBuilder
        .orderBy("message.created_at", "DESC")
        .take(limitNum)
        .skip(skip)
        .getManyAndCount();

      const filteredMessages = messages.filter((msg) => !msg.deleted_by_users.includes(userId));

      const groupedMessages = this.groupMessagesByDate(filteredMessages); 
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
      
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch messages",
        error: error.message,
      });
    }
  };

  static getCommunityMembersForChat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { communityId } = req.params;

      const userId = req.user?.id || req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
        return;
      }

      const communityRepository = dbConnection.getRepository(Community);
      const messageRepository = dbConnection.getRepository(CommunityChatMessage);

      const community = await communityRepository.findOne({
        where: { id: communityId },
        relations: ["members", "members.profile"],
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

      const otherMembers = community.members.filter((member) => member.id !== userId);

      const membersForChat = [];

      for (const member of otherMembers) {
        try {
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

      membersForChat.sort((a, b) => {
        if (!a.lastMessageTime && !b.lastMessageTime) return 0;
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      res.status(200).json({
        success: true,
        data: {
          members: membersForChat,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch members",
        error: error.message,
      });
    }
  };

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

      const maxSize = 50 * 1024 * 1024;
      if (req.file.size > maxSize) {
        res.status(400).json({
          success: false,
          message: `File exceeds ${maxSize / 1024 / 1024}MB limit`,
        });
        return;
      }

      const uploadResult = await UploadToCloud(req.file, res);
      const secureUrl = (uploadResult as any).secure_url;

      if (!secureUrl) {
        res.status(500).json({
          success: false,
          message: "Failed to upload file",
        });
        return;
      }

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
      
      const userId = req.user?.id || req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
        return;
      }

      const messageRepository = dbConnection.getRepository(CommunityChatMessage);
      const communityRepository = dbConnection.getRepository(Community);
      const userRepository = dbConnection.getRepository(User);

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

      const otherUser = await userRepository.findOne({ 
        where: { id: otherUserId } 
      });
      
      if (!otherUser) {
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
        res.status(403).json({
          success: false,
          message: "Other user is not a member of this community",
        });
        return;
      }

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

      if (before_timestamp) {
        queryBuilder.andWhere("message.created_at < :before", {
          before: new Date(before_timestamp as string),
        });
      }

      const [messages, total] = await queryBuilder
        .orderBy("message.created_at", "DESC")
        .take(limitNum)
        .skip(skip)
        .getManyAndCount();

      const filteredMessages = messages.filter(
        (msg) => !msg.deleted_by_users.includes(userId)
      );

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
      }

      const groupedMessages = this.groupMessagesByDate(filteredMessages);

      const otherUserInfo = {
        userId: otherUser.id,
        userName: `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() 
          || otherUser.username || 'Unknown',
        email: otherUser.email,
        profilePicture: otherUser.profile_picture_url || null,
        accountType: otherUser.account_type,
      };

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
      res.status(500).json({
        success: false,
        message: "Failed to fetch conversation",
        error: error.message,
      });
    }
  };
}