import type { Server, Socket } from "socket.io";
import { CommunityChatMessage, MessageType, ChatType } from "../database/models/CommunityChatMessage";
import { Community } from "../database/models/Community";
import { User } from "../database/models/User";
import dbConnection from "../database/db";
import { Brackets } from "typeorm";

interface ActiveUser {
  userId: string;
  userName: string;
  socketIds: Set<string>;
  isOnline: boolean;
  lastSeen: Date;
}

// Exported so HTTP controllers can read live presence state.
export const activeCommunityUsers = new Map<string, Map<string, ActiveUser>>();

/**
 * Returns the list of users currently connected (with at least one open socket)
 * for a given community. Used by the REST `/members/online` endpoint so the UI
 * has correct presence on first paint, before any socket events arrive.
 */
export const getOnlineUsersForCommunity = (communityId: string) => {
  const map = activeCommunityUsers.get(communityId);
  if (!map) return [];
  return Array.from(map.values())
    .filter((u) => u.isOnline && u.socketIds.size > 0)
    .map((u) => ({
      userId: u.userId,
      userName: u.userName,
      communityId,
    }));
};

export const setupCommunityChatHandlers = (io: Server, socket: Socket) => {
  const messageRepository = dbConnection.getRepository(CommunityChatMessage);
  const communityRepository = dbConnection.getRepository(Community);
  const userRepository = dbConnection.getRepository(User);

  socket.on("join_community_rooms", async (data: { communityIds: string[] }, callback) => {
    try {
      const userId = socket.data.user?.id;

      if (!userId) {
        return callback?.({ success: false, error: "Not authenticated" });
      }

      const joinedRooms: string[] = [];
      const onlineSnapshots: Record<string, any[]> = {};

      for (const communityId of data.communityIds) {
        const community = await communityRepository.findOne({
          where: { id: communityId },
          relations: ["members"],
        });

        if (!community) continue;

        const isMember = community.members.some((member) => member.id === userId);
        if (!isMember) continue;

        const communityRoom = `community_${communityId}`;
        socket.join(communityRoom);
        joinedRooms.push(communityRoom);

        const userRoom = `user_${userId}_community_${communityId}`;
        socket.join(userRoom);
        joinedRooms.push(userRoom);

        if (!activeCommunityUsers.has(communityId)) {
          activeCommunityUsers.set(communityId, new Map());
        }

        const communityUsers = activeCommunityUsers.get(communityId)!;
        if (!communityUsers.has(userId)) {
          const user = await userRepository.findOne({ where: { id: userId } });
          communityUsers.set(userId, {
            userId,
            userName:
              `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
              user?.username ||
              "Unknown",
            socketIds: new Set([socket.id]),
            isOnline: true,
            lastSeen: new Date(),
          });
        } else {
          const userInfo = communityUsers.get(userId)!;
          userInfo.socketIds.add(socket.id);
          userInfo.isOnline = true;
          userInfo.lastSeen = new Date();
        }

        // Tell everyone in the room this user is now online
        io.to(communityRoom).emit("user_online", {
          userId,
          userName: communityUsers.get(userId)!.userName,
          communityId,
        });

        // Send the full current online snapshot back to the joining socket only,
        // so it can seed its UI state without waiting for events to trickle in.
        onlineSnapshots[communityId] = getOnlineUsersForCommunity(communityId);
        socket.emit("community_online_snapshot", {
          communityId,
          onlineMembers: onlineSnapshots[communityId],
        });
      }

      callback?.({ success: true, joinedRooms, onlineSnapshots });
    } catch (error) {
      callback?.({ success: false, error: "Failed to join rooms" });
    }
  });

  socket.on(
    "send_community_message",
    async (
      data: {
        communityId: string;
        content: string;
        messageType?: MessageType;
        fileUrl?: string;
        fileName?: string;
        fileType?: string;
        replyToMessageId?: string;
        chat_type?: ChatType;
        recipient_user_id?: string;
        client_temp_id?: string;
      },
      callback
    ) => {
      try {
        const userId = socket.data.user?.id;

        if (!userId) {
          return callback?.({ success: false, error: "Not authenticated" });
        }

        const community = await communityRepository.findOne({
          where: { id: data.communityId },
          relations: ["members"],
        });

        if (!community) {
          return callback?.({ success: false, error: "Community not found" });
        }

        const isMember = community.members.some((member) => member.id === userId);
        if (!isMember) {
          return callback?.({ success: false, error: "Not a member of this community" });
        }

        const sender = await userRepository.findOne({ where: { id: userId } });
        if (!sender) {
          return callback?.({ success: false, error: "User not found" });
        }

        const chatType = data.chat_type || ChatType.COMMUNITY;

        if (chatType === ChatType.DIRECT) {
          if (!data.recipient_user_id) {
            return callback?.({ success: false, error: "Recipient user ID required for direct messages" });
          }

          const recipientIsMember = community.members.some((m) => m.id === data.recipient_user_id);
          if (!recipientIsMember) {
            return callback?.({ success: false, error: "Recipient is not a member of this community" });
          }

          if (data.recipient_user_id === userId) {
            return callback?.({ success: false, error: "Cannot send direct message to yourself" });
          }
        }

        let replyToMessage = null;
        if (data.replyToMessageId) {
          replyToMessage = await messageRepository.findOne({
            where: { id: data.replyToMessageId },
            relations: ["sender"],
          });
        }

        const message = new CommunityChatMessage();
        message.community_id = data.communityId;
        message.sender_id = userId;
        message.content = data.content;
        message.message_type = data.messageType || MessageType.TEXT;
        message.file_url = data.fileUrl || "";
        message.file_name = data.fileName || "";
        message.file_type = data.fileType || "";
        message.reply_to_message_id = data.replyToMessageId || null;
        message.chat_type = chatType;
        message.recipient_user_id = data.recipient_user_id || null;
        // Sender has implicitly read their own message
        message.read_by = [userId];

        const savedMessage = await messageRepository.save(message);

        let recipientUser = null;
        if (chatType === ChatType.DIRECT && data.recipient_user_id) {
          recipientUser = await userRepository.findOne({ where: { id: data.recipient_user_id } });
        }

        const responseData: any = {
          id: savedMessage.id,
          communityId: data.communityId,
          content: savedMessage.content,
          messageType: savedMessage.message_type,
          fileUrl: savedMessage.file_url,
          fileName: savedMessage.file_name,
          fileType: savedMessage.file_type,
          sender: {
            id: sender.id,
            name:
              `${sender.first_name || ""} ${sender.last_name || ""}`.trim() ||
              sender.username,
            profilePicture: sender.profile_picture_url,
          },
          replyTo: replyToMessage
            ? {
                id: replyToMessage.id,
                content: replyToMessage.content,
                sender: {
                  id: replyToMessage.sender.id,
                  name:
                    `${replyToMessage.sender.first_name || ""} ${replyToMessage.sender.last_name || ""}`.trim() ||
                    replyToMessage.sender.username,
                },
              }
            : null,
          reactions: savedMessage.reactions,
          edited: savedMessage.edited,
          createdAt: savedMessage.created_at,
          read_by: savedMessage.read_by,
          chat_type: savedMessage.chat_type,
          recipient_user_id: savedMessage.recipient_user_id,
          recipientUser: recipientUser
            ? {
                id: recipientUser.id,
                name:
                  `${recipientUser.first_name || ""} ${recipientUser.last_name || ""}`.trim() ||
                  recipientUser.username,
                profilePicture: recipientUser.profile_picture_url,
              }
            : null,
          // Echo client temp id so the sender can match server message → optimistic message
          client_temp_id: data.client_temp_id || null,
        };

        if (chatType === ChatType.COMMUNITY) {
          const room = `community_${data.communityId}`;
          io.to(room).emit("new_community_message", responseData);
        } else if (chatType === ChatType.DIRECT) {
          const senderRoom = `user_${userId}_community_${data.communityId}`;
          io.to(senderRoom).emit("new_community_message", responseData);

          const recipientRoom = `user_${data.recipient_user_id}_community_${data.communityId}`;
          io.to(recipientRoom).emit("new_community_message", responseData);
        }

        callback?.({ success: true, data: responseData });
      } catch (error) {
        callback?.({ success: false, error: "Failed to send message" });
      }
    }
  );

  socket.on(
    "edit_message",
    async (data: { messageId: string; newContent: string; communityId: string }, callback) => {
      try {
        const userId = socket.data.user?.id;

        if (!userId) {
          return callback?.({ success: false, error: "Not authenticated" });
        }

        const message = await messageRepository.findOne({
          where: { id: data.messageId },
          relations: ["sender"],
        });

        if (!message) {
          return callback?.({ success: false, error: "Message not found" });
        }

        if (message.sender_id !== userId) {
          return callback?.({ success: false, error: "Not authorized to edit this message" });
        }

        message.content = data.newContent;
        message.edited = true;
        await messageRepository.save(message);

        const updateData = {
          messageId: data.messageId,
          newContent: data.newContent,
          edited: true,
          editedAt: new Date(),
        };

        if (message.chat_type === ChatType.COMMUNITY) {
          io.to(`community_${data.communityId}`).emit("message_edited", updateData);
        } else if (message.chat_type === ChatType.DIRECT) {
          io.to(`user_${message.sender_id}_community_${data.communityId}`).emit("message_edited", updateData);
          io.to(`user_${message.recipient_user_id}_community_${data.communityId}`).emit("message_edited", updateData);
        }

        callback?.({ success: true });
      } catch (error) {
        callback?.({ success: false, error: "Failed to edit message" });
      }
    }
  );

  socket.on(
    "delete_message",
    async (data: { messageId: string; deleteType: "for_everyone" | "for_me"; communityId: string }, callback) => {
      try {
        const userId = socket.data.user?.id;

        if (!userId) {
          return callback?.({ success: false, error: "Not authenticated" });
        }

        const message = await messageRepository.findOne({
          where: { id: data.messageId },
        });

        if (!message) {
          return callback?.({ success: false, error: "Message not found" });
        }

        if (data.deleteType === "for_everyone") {
          const community = await communityRepository.findOne({
            where: { id: data.communityId },
            relations: ["creator"],
          });

          const isOwner = message.sender_id === userId;
          const isAdmin = community?.creator.id === userId;

          if (!isOwner && !isAdmin) {
            return callback?.({ success: false, error: "Not authorized to delete this message" });
          }

          message.deleted_for_everyone = true;
          await messageRepository.save(message);

          const deleteData = {
            messageId: data.messageId,
            deleteType: "for_everyone",
          };

          if (message.chat_type === ChatType.COMMUNITY) {
            io.to(`community_${data.communityId}`).emit("message_deleted", deleteData);
          } else if (message.chat_type === ChatType.DIRECT) {
            io.to(`user_${message.sender_id}_community_${data.communityId}`).emit("message_deleted", deleteData);
            io.to(`user_${message.recipient_user_id}_community_${data.communityId}`).emit(
              "message_deleted",
              deleteData
            );
          }
        } else {
          if (!message.deleted_by_users.includes(userId)) {
            message.deleted_by_users.push(userId);
            await messageRepository.save(message);
          }

          socket.emit("message_deleted", {
            messageId: data.messageId,
            deleteType: "for_me",
            userId,
          });
        }

        callback?.({ success: true });
      } catch (error) {
        callback?.({ success: false, error: "Failed to delete message" });
      }
    }
  );

  socket.on("react_to_message", async (data: { messageId: string; emoji: string; communityId: string }, callback) => {
    try {
      const userId = socket.data.user?.id;

      if (!userId) {
        return callback?.({ success: false, error: "Not authenticated" });
      }

      const message = await messageRepository.findOne({
        where: { id: data.messageId },
      });

      if (!message) {
        return callback?.({ success: false, error: "Message not found" });
      }

      const reactions = message.reactions || {};
      if (reactions[userId] === data.emoji) {
        delete reactions[userId];
      } else {
        reactions[userId] = data.emoji;
      }

      message.reactions = reactions;
      await messageRepository.save(message);

      const reactionData = {
        messageId: data.messageId,
        reactions: message.reactions,
      };

      if (message.chat_type === ChatType.COMMUNITY) {
        io.to(`community_${data.communityId}`).emit("message_reaction_updated", reactionData);
      } else if (message.chat_type === ChatType.DIRECT) {
        io.to(`user_${message.sender_id}_community_${data.communityId}`).emit("message_reaction_updated", reactionData);
        io.to(`user_${message.recipient_user_id}_community_${data.communityId}`).emit(
          "message_reaction_updated",
          reactionData
        );
      }

      callback?.({ success: true, reactions: message.reactions });
    } catch (error) {
      callback?.({ success: false, error: "Failed to react to message" });
    }
  });

  socket.on("typing_indicator", (data: { communityId: string; recipient_user_id?: string }) => {
    const userId = socket.data.user?.id;
    const userName =
      socket.data.user?.username || socket.data.user?.first_name || "Someone";

    if (!userId) return;

    const typingData = {
      userId,
      userName,
      communityId: data.communityId,
    };

    if (data.recipient_user_id) {
      socket.to(`user_${data.recipient_user_id}_community_${data.communityId}`).emit("user_typing", typingData);
    } else {
      socket.to(`community_${data.communityId}`).emit("user_typing", typingData);
    }
  });

  socket.on("stop_typing", (data: { communityId: string; recipient_user_id?: string }) => {
    const userId = socket.data.user?.id;

    if (!userId) return;

    const stopTypingData = {
      userId,
      communityId: data.communityId,
    };

    if (data.recipient_user_id) {
      socket.to(`user_${data.recipient_user_id}_community_${data.communityId}`).emit("user_stopped_typing", stopTypingData);
    } else {
      socket.to(`community_${data.communityId}`).emit("user_stopped_typing", stopTypingData);
    }
  });

  // Mark messages as read via socket — broadcasts a `messages_read` event so
  // the original senders can update their checkmarks in real time.
  socket.on(
    "mark_messages_read",
    async (
      data: { communityId: string; chatType?: ChatType; otherUserId?: string },
      callback
    ) => {
      try {
        const userId = socket.data.user?.id;
        if (!userId) {
          return callback?.({ success: false, error: "Not authenticated" });
        }

        const chatType = data.chatType || ChatType.COMMUNITY;

        const qb = messageRepository
          .createQueryBuilder("message")
          .where("message.community_id = :communityId", { communityId: data.communityId })
          .andWhere("message.chat_type = :chatType", { chatType })
          .andWhere("message.deleted_for_everyone = :deleted", { deleted: false })
          .andWhere("message.sender_id != :userId", { userId })
          .andWhere(
            new Brackets((qb2) => {
              qb2
                .where("message.read_by IS NULL")
                .orWhere("NOT (:userId = ANY(message.read_by))", { userId });
            })
          );

        if (chatType === ChatType.DIRECT) {
          if (!data.otherUserId) {
            return callback?.({ success: false, error: "otherUserId required for direct chat" });
          }
          qb.andWhere(
            new Brackets((qb2) => {
              qb2
                .where(
                  new Brackets((q3) => {
                    q3.where("CAST(message.sender_id AS TEXT) = :other", { other: data.otherUserId })
                      .andWhere("CAST(message.recipient_user_id AS TEXT) = :userId", { userId });
                  })
                );
            })
          );
        }

        const unread = await qb.getMany();
        const ids = unread.map((m) => m.id);

        if (ids.length > 0) {
          await messageRepository
            .createQueryBuilder()
            .update(CommunityChatMessage)
            .set({
              read_by: () => `array_append(COALESCE(read_by, ARRAY[]::text[]), '${userId}')`,
            })
            .where("id IN (:...ids)", { ids })
            .andWhere(
              "NOT (:userId = ANY(COALESCE(read_by, ARRAY[]::text[])))",
              { userId }
            )
            .execute();

          // Notify senders that this reader has now seen their messages.
          const payload = {
            communityId: data.communityId,
            chatType,
            messageIds: ids,
            readerId: userId,
            readAt: new Date(),
          };

          if (chatType === ChatType.COMMUNITY) {
            io.to(`community_${data.communityId}`).emit("messages_read", payload);
          } else if (chatType === ChatType.DIRECT && data.otherUserId) {
            io.to(`user_${data.otherUserId}_community_${data.communityId}`).emit(
              "messages_read",
              payload
            );
            io.to(`user_${userId}_community_${data.communityId}`).emit(
              "messages_read",
              payload
            );
          }
        }

        callback?.({ success: true, markedCount: ids.length });
      } catch (error) {
        callback?.({ success: false, error: "Failed to mark messages as read" });
      }
    }
  );

  socket.on("fetch_online_members", (data: { communityId: string }, callback) => {
    callback?.({ success: true, onlineUsers: getOnlineUsersForCommunity(data.communityId) });
  });

  socket.on("disconnect", () => {
    const userId = socket.data.user?.id;

    if (!userId) return;

    activeCommunityUsers.forEach((communityUsers, communityId) => {
      const user = communityUsers.get(userId);
      if (user) {
        user.socketIds.delete(socket.id);

        if (user.socketIds.size === 0) {
          user.isOnline = false;
          user.lastSeen = new Date();

          io.to(`community_${communityId}`).emit("user_offline", {
            userId,
            communityId,
          });
        }
      }
    });
  });
};
