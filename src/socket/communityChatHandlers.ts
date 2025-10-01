import type { Server, Socket } from "socket.io";
import { CommunityChatMessage, MessageType, ChatType } from "../database/models/CommunityChatMessage";
import { Community } from "../database/models/Community";
import { User } from "../database/models/User";
import dbConnection from "../database/db";

interface ActiveUser {
  userId: string;
  userName: string;
  socketIds: Set<string>;
  isOnline: boolean;
  lastSeen: Date;
}

// Store active users per community
const activeCommunityUsers = new Map<string, Map<string, ActiveUser>>();

export const setupCommunityChatHandlers = (io: Server, socket: Socket) => {
  const messageRepository = dbConnection.getRepository(CommunityChatMessage);
  const communityRepository = dbConnection.getRepository(Community);
  const userRepository = dbConnection.getRepository(User);

  // ==================== JOIN COMMUNITY ROOMS ====================
  socket.on("join_community_rooms", async (data: { communityIds: string[] }, callback) => {
    try {
      const userId = socket.data.user?.id;

      if (!userId) {
        return callback?.({ success: false, error: "Not authenticated" });
      }

      const joinedRooms: string[] = [];

      // Join all community rooms
      for (const communityId of data.communityIds) {
        // Verify user is member
        const community = await communityRepository.findOne({
          where: { id: communityId },
          relations: ["members"],
        });

        if (!community) continue;

        const isMember = community.members.some((member) => member.id === userId);
        if (!isMember) continue;

        // Join community-wide room
        const communityRoom = `community_${communityId}`;
        socket.join(communityRoom);
        joinedRooms.push(communityRoom);

        // Join user-specific room for direct messages
        const userRoom = `user_${userId}_community_${communityId}`;
        socket.join(userRoom);
        joinedRooms.push(userRoom);

        console.log(`✅ [JOIN] User ${userId} joined rooms:`, {
          communityRoom,
          userRoom
        });

        // Track active user
        if (!activeCommunityUsers.has(communityId)) {
          activeCommunityUsers.set(communityId, new Map());
        }

        const communityUsers = activeCommunityUsers.get(communityId)!;
        if (!communityUsers.has(userId)) {
          const user = await userRepository.findOne({ where: { id: userId } });
          communityUsers.set(userId, {
            userId,
            userName: user?.first_name || user?.username || "Unknown",
            socketIds: new Set([socket.id]),
            isOnline: true,
            lastSeen: new Date(),
          });
        } else {
          const userInfo = communityUsers.get(userId)!;
          userInfo.socketIds.add(socket.id);
          userInfo.isOnline = true;
        }

        // Broadcast user online status
        io.to(communityRoom).emit("user_online", {
          userId,
          userName: communityUsers.get(userId)!.userName,
          communityId,
        });
      }

      callback?.({ success: true, joinedRooms });
    } catch (error) {
      console.error("Error joining community rooms:", error);
      callback?.({ success: false, error: "Failed to join rooms" });
    }
  });

  // ==================== SEND COMMUNITY MESSAGE (FIXED) ====================
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
      },
      callback
    ) => {
      try {
        const userId = socket.data.user?.id;

        console.log("\n📨 [SEND_MESSAGE] Message send attempt:", {
          senderId: userId,
          recipientId: data.recipient_user_id,
          chatType: data.chat_type,
          communityId: data.communityId,
          content: data.content?.substring(0, 50) + "...",
          timestamp: new Date().toISOString()
        });

        if (!userId) {
          console.error("❌ [SEND_MESSAGE] Not authenticated");
          return callback?.({ success: false, error: "Not authenticated" });
        }

        // Verify user is member
        const community = await communityRepository.findOne({
          where: { id: data.communityId },
          relations: ["members"],
        });

        if (!community) {
          console.error("❌ [SEND_MESSAGE] Community not found:", data.communityId);
          return callback?.({ success: false, error: "Community not found" });
        }

        const isMember = community.members.some((member) => member.id === userId);
        if (!isMember) {
          console.error("❌ [SEND_MESSAGE] User not a member:", userId);
          return callback?.({ success: false, error: "Not a member of this community" });
        }

        // Get sender info
        const sender = await userRepository.findOne({ where: { id: userId } });
        if (!sender) {
          console.error("❌ [SEND_MESSAGE] Sender not found:", userId);
          return callback?.({ success: false, error: "User not found" });
        }

        // Determine chat type
        const chatType = data.chat_type || ChatType.COMMUNITY;

        // Validate direct message requirements
        if (chatType === ChatType.DIRECT) {
          if (!data.recipient_user_id) {
            console.error("❌ [SEND_MESSAGE] Direct message missing recipient");
            return callback?.({ success: false, error: "Recipient user ID required for direct messages" });
          }

          // Verify recipient is a member
          const recipientIsMember = community.members.some((m) => m.id === data.recipient_user_id);
          if (!recipientIsMember) {
            console.error("❌ [SEND_MESSAGE] Recipient not a member:", data.recipient_user_id);
            return callback?.({ success: false, error: "Recipient is not a member of this community" });
          }

          // Prevent self-messaging
          if (data.recipient_user_id === userId) {
            console.error("❌ [SEND_MESSAGE] Self-messaging attempt");
            return callback?.({ success: false, error: "Cannot send direct message to yourself" });
          }

          console.log("✅ [SEND_MESSAGE] Direct message validation passed:", {
            sender: userId,
            recipient: data.recipient_user_id
          });
        }

        // Find reply-to message if provided
        let replyToMessage = null;
        if (data.replyToMessageId) {
          replyToMessage = await messageRepository.findOne({
            where: { id: data.replyToMessageId },
            relations: ["sender"],
          });
        }

        // Create new message
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

        const savedMessage = await messageRepository.save(message);

        console.log("💾 [SEND_MESSAGE] Message saved to database:", {
          messageId: savedMessage.id,
          chatType: savedMessage.chat_type,
          senderId: savedMessage.sender_id,
          recipientId: savedMessage.recipient_user_id
        });

        // Get recipient user info for direct messages
        let recipientUser = null;
        if (chatType === ChatType.DIRECT && data.recipient_user_id) {
          recipientUser = await userRepository.findOne({ where: { id: data.recipient_user_id } });
          console.log("👤 [SEND_MESSAGE] Recipient user fetched:", {
            recipientId: recipientUser?.id,
            recipientName: recipientUser?.first_name || recipientUser?.username
          });
        }

        // Prepare response data
        const responseData = {
          id: savedMessage.id,
          communityId: data.communityId,
          content: savedMessage.content,
          messageType: savedMessage.message_type,
          fileUrl: savedMessage.file_url,
          fileName: savedMessage.file_name,
          fileType: savedMessage.file_type,
          sender: {
            id: sender.id,
            name: sender.first_name || sender.username,
            profilePicture: sender.profile_picture_url,
          },
          replyTo: replyToMessage
            ? {
                id: replyToMessage.id,
                content: replyToMessage.content,
                sender: {
                  id: replyToMessage.sender.id,
                  name: replyToMessage.sender.first_name || replyToMessage.sender.username,
                },
              }
            : null,
          reactions: savedMessage.reactions,
          edited: savedMessage.edited,
          createdAt: savedMessage.created_at,
          chat_type: savedMessage.chat_type,
          recipient_user_id: savedMessage.recipient_user_id,
          recipientUser: recipientUser ? {
            id: recipientUser.id,
            name: recipientUser.first_name || recipientUser.username,
            profilePicture: recipientUser.profile_picture_url,
          } : null,
        };

        // Route message based on chat type
        if (chatType === ChatType.COMMUNITY) {
          const room = `community_${data.communityId}`;
          console.log("📢 [SEND_MESSAGE] Broadcasting community message to room:", room);
          io.to(room).emit("new_community_message", responseData);
        } else if (chatType === ChatType.DIRECT) {
          // Send to sender's room
          const senderRoom = `user_${userId}_community_${data.communityId}`;
          console.log("📤 [SEND_MESSAGE] Sending to sender room:", senderRoom);
          io.to(senderRoom).emit("new_community_message", responseData);
          
          // Send to recipient's room
          const recipientRoom = `user_${data.recipient_user_id}_community_${data.communityId}`;
          console.log("📥 [SEND_MESSAGE] Sending to recipient room:", recipientRoom);
          io.to(recipientRoom).emit("new_community_message", responseData);
          
          console.log("✅ [SEND_MESSAGE] Direct message delivered to both parties");
        }

        callback?.({ success: true, data: responseData });
        console.log("✅ [SEND_MESSAGE] Message send complete\n");
      } catch (error) {
        console.error("❌ [SEND_MESSAGE] Error sending message:", error);
        callback?.({ success: false, error: "Failed to send message" });
      }
    }
  );

  // ==================== EDIT MESSAGE (ENHANCED) ====================
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

        // Verify user is message owner
        if (message.sender_id !== userId) {
          return callback?.({ success: false, error: "Not authorized to edit this message" });
        }

        // Update message
        message.content = data.newContent;
        message.edited = true;
        await messageRepository.save(message);

        const updateData = {
          messageId: data.messageId,
          newContent: data.newContent,
          edited: true,
          editedAt: new Date(),
        };

        // Route based on chat type
        if (message.chat_type === ChatType.COMMUNITY) {
          io.to(`community_${data.communityId}`).emit("message_edited", updateData);
        } else if (message.chat_type === ChatType.DIRECT) {
          io.to(`user_${message.sender_id}_community_${data.communityId}`).emit("message_edited", updateData);
          io.to(`user_${message.recipient_user_id}_community_${data.communityId}`).emit("message_edited", updateData);
        }

        callback?.({ success: true });
      } catch (error) {
        console.error("Error editing message:", error);
        callback?.({ success: false, error: "Failed to edit message" });
      }
    }
  );

  // ==================== DELETE MESSAGE (ENHANCED) ====================
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
          // Verify authorization
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

          // Route based on chat type
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
          // Delete for self only
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
        console.error("Error deleting message:", error);
        callback?.({ success: false, error: "Failed to delete message" });
      }
    }
  );

  // ==================== REACT TO MESSAGE (ENHANCED) ====================
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

      // Toggle reaction
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

      // Route based on chat type
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
      console.error("Error reacting to message:", error);
      callback?.({ success: false, error: "Failed to react to message" });
    }
  });

  // ==================== TYPING INDICATOR (ENHANCED) ====================
  socket.on("typing_indicator", (data: { communityId: string; recipient_user_id?: string }) => {
    const userId = socket.data.user?.id;
    const userName = socket.data.user?.username;

    if (!userId) return;

    const typingData = {
      userId,
      userName,
      communityId: data.communityId,
    };

    if (data.recipient_user_id) {
      // Direct message typing - only notify recipient
      socket.to(`user_${data.recipient_user_id}_community_${data.communityId}`).emit("user_typing", typingData);
    } else {
      // Community-wide typing
      socket.to(`community_${data.communityId}`).emit("user_typing", typingData);
    }
  });

  // ==================== STOP TYPING (ENHANCED) ====================
  socket.on("stop_typing", (data: { communityId: string; recipient_user_id?: string }) => {
    const userId = socket.data.user?.id;

    if (!userId) return;

    const stopTypingData = {
      userId,
      communityId: data.communityId,
    };

    if (data.recipient_user_id) {
      // Direct message typing - only notify recipient
      socket.to(`user_${data.recipient_user_id}_community_${data.communityId}`).emit("user_stopped_typing", stopTypingData);
    } else {
      // Community-wide typing
      socket.to(`community_${data.communityId}`).emit("user_stopped_typing", stopTypingData);
    }
  });

  // ==================== FETCH ONLINE MEMBERS ====================
  socket.on("fetch_online_members", (data: { communityId: string }, callback) => {
    const communityUsers = activeCommunityUsers.get(data.communityId);

    if (!communityUsers) {
      return callback?.({ success: true, onlineUsers: [] });
    }

    const onlineUsers = Array.from(communityUsers.values())
      .filter((user) => user.isOnline)
      .map((user) => ({
        userId: user.userId,
        userName: user.userName,
      }));

    callback?.({ success: true, onlineUsers });
  });

  // ==================== HANDLE DISCONNECT ====================
  socket.on("disconnect", () => {
    const userId = socket.data.user?.id;

    if (!userId) return;

    // Remove user from all community rooms
    activeCommunityUsers.forEach((communityUsers, communityId) => {
      const user = communityUsers.get(userId);
      if (user) {
        user.socketIds.delete(socket.id);

        // If user has no more active sockets, mark offline
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