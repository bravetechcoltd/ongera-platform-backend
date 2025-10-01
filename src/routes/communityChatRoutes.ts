import express from "express";
import { CommunityChatController } from "../controllers/CommunityChatController";
import { authenticate } from "../middlewares/authMiddleware";
import upload from "../helpers/multer";
import type { RequestHandler } from "express";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate as RequestHandler);

// ==================== EXISTING ROUTES - 100% MAINTAINED ====================

// Get paginated messages for a community
router.get(
  "/:communityId/messages",
  CommunityChatController.getCommunityMessages as RequestHandler
);

router.get(
  "/:communityId/direct-conversation/:otherUserId",
  CommunityChatController.getDirectConversation as RequestHandler
);
// Upload file for chat
router.post(
  "/:communityId/messages/upload",
  upload.single("file"),
  CommunityChatController.uploadChatFile as RequestHandler
);

// Get single message details
router.get(
  "/:communityId/messages/:messageId",
  CommunityChatController.getMessage as RequestHandler
);

// Get online members (HTTP fallback)
router.get(
  "/:communityId/members/online",
  CommunityChatController.getOnlineMembers as RequestHandler
);

// ==================== NEW ROUTES FOR DIRECT CHAT ====================

// Get community members available for direct chat
router.get(
  "/:communityId/chat-members",
  CommunityChatController.getCommunityMembersForChat as RequestHandler
);

// ==================== SOCKET TEST PAGE (DEVELOPMENT ONLY) ====================
router.get("/socket-test", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Community Chat Socket Test - Dual Chat System</title>
      <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        h1 { color: #0158B7; }
        h2 { color: #5E96D2; margin-top: 0; }
        button {
          background: #0158B7;
          color: white;
          border: none;
          padding: 10px 20px;
          margin: 5px;
          border-radius: 5px;
          cursor: pointer;
        }
        button:hover { background: #5E96D2; }
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        input, select {
          padding: 8px;
          margin: 5px;
          border: 1px solid #ddd;
          border-radius: 4px;
          width: 300px;
        }
        #logs {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 15px;
          border-radius: 5px;
          max-height: 400px;
          overflow-y: auto;
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }
        .log-entry {
          margin: 5px 0;
          padding: 5px;
          border-left: 3px solid #0158B7;
          padding-left: 10px;
        }
        .success { border-left-color: #4CAF50; }
        .error { border-left-color: #f44336; }
        .info { border-left-color: #2196F3; }
      </style>
    </head>
    <body>
      <h1>🔌 Community Chat Socket Test - Dual Chat System</h1>
      
      <div class="container">
        <h2>📡 Connection</h2>
        <input type="text" id="token" placeholder="JWT Token" />
        <button id="connect">Connect</button>
        <button id="disconnect" disabled>Disconnect</button>
      </div>

      <div class="container">
        <h2>🏠 Community Chat (Broadcast)</h2>
        <input type="text" id="communityId" placeholder="Community ID" />
        <button id="joinRoom">Join Community Room</button>
        <br/>
        <input type="text" id="communityMsg" placeholder="Community message..." />
        <button id="sendCommunityMsg">Send to Community</button>
      </div>

      <div class="container">
        <h2>💬 Direct Messages (User-to-User)</h2>
        <input type="text" id="recipientId" placeholder="Recipient User ID" />
        <br/>
        <input type="text" id="directMsg" placeholder="Direct message..." />
        <button id="sendDirectMsg">Send Direct Message</button>
      </div>

      <div class="container">
        <h2>✏️ Message Actions</h2>
        <input type="text" id="messageId" placeholder="Message ID" />
        <input type="text" id="editContent" placeholder="New content..." />
        <button id="editMsg">Edit Message</button>
        <button id="deleteMsg">Delete Message</button>
        <button id="reactMsg">React 👍</button>
      </div>

      <div class="container">
        <h2>⌨️ Typing Indicators</h2>
        <select id="typingType">
          <option value="community">Community Typing</option>
          <option value="direct">Direct Typing</option>
        </select>
        <button id="startTyping">Start Typing</button>
        <button id="stopTyping">Stop Typing</button>
      </div>

      <div class="container">
        <h2>📋 Logs</h2>
        <button onclick="document.getElementById('logs').innerHTML = ''">Clear Logs</button>
        <div id="logs"></div>
      </div>
      
      <script>
        let socket;
        const logs = document.getElementById('logs');
        
        function log(msg, type = 'info') {
          const timestamp = new Date().toLocaleTimeString();
          const entry = document.createElement('div');
          entry.className = 'log-entry ' + type;
          entry.innerHTML = '<strong>[' + timestamp + ']</strong> ' + msg;
          logs.appendChild(entry);
          logs.scrollTop = logs.scrollHeight;
        }
        
        document.getElementById('connect').addEventListener('click', () => {
          const token = document.getElementById('token').value;
          if (!token) {
            log('❌ Token required', 'error');
            return;
          }

          socket = io('http://localhost:3002', {
            auth: { token },
            transports: ['websocket']
          });
          
          socket.on('connect', () => {
            log('✅ Connected: ' + socket.id, 'success');
            document.getElementById('connect').disabled = true;
            document.getElementById('disconnect').disabled = false;
          });

          socket.on('connection_success', (data) => {
            log('✅ Server confirmed connection: ' + JSON.stringify(data), 'success');
          });

          socket.on('connect_error', (error) => {
            log('❌ Connection error: ' + error.message, 'error');
          });
          
          socket.on('new_community_message', (data) => {
            const chatType = data.chat_type === 'direct' ? '💬 DIRECT' : '🏠 COMMUNITY';
            log(chatType + ' Message: ' + JSON.stringify(data), 'info');
          });

          socket.on('message_edited', (data) => {
            log('✏️ Message edited: ' + JSON.stringify(data), 'info');
          });

          socket.on('message_deleted', (data) => {
            log('🗑️ Message deleted: ' + JSON.stringify(data), 'info');
          });

          socket.on('message_reaction_updated', (data) => {
            log('👍 Reaction updated: ' + JSON.stringify(data), 'info');
          });

          socket.on('user_online', (data) => {
            log('🟢 User online: ' + data.userName, 'success');
          });

          socket.on('user_offline', (data) => {
            log('🔴 User offline: ' + data.userId, 'info');
          });

          socket.on('user_typing', (data) => {
            log('⌨️ ' + data.userName + ' is typing...', 'info');
          });

          socket.on('user_stopped_typing', (data) => {
            log('⏸️ User stopped typing', 'info');
          });
        });

        document.getElementById('disconnect').addEventListener('click', () => {
          if (socket) {
            socket.disconnect();
            log('👋 Disconnected', 'info');
            document.getElementById('connect').disabled = false;
            document.getElementById('disconnect').disabled = true;
          }
        });
        
        document.getElementById('joinRoom').addEventListener('click', () => {
          const communityId = document.getElementById('communityId').value;
          if (!communityId) {
            log('❌ Community ID required', 'error');
            return;
          }

          socket.emit('join_community_rooms', {
            communityIds: [communityId]
          }, (response) => {
            log('🚪 Join response: ' + JSON.stringify(response), response.success ? 'success' : 'error');
          });
        });
        
        document.getElementById('sendCommunityMsg').addEventListener('click', () => {
          const communityId = document.getElementById('communityId').value;
          const content = document.getElementById('communityMsg').value;
          
          if (!communityId || !content) {
            log('❌ Community ID and message required', 'error');
            return;
          }

          socket.emit('send_community_message', {
            communityId,
            content,
            messageType: 'text',
            chat_type: 'community'
          }, (response) => {
            log('📤 Community send response: ' + JSON.stringify(response), response.success ? 'success' : 'error');
            if (response.success) {
              document.getElementById('communityMsg').value = '';
            }
          });
        });

        document.getElementById('sendDirectMsg').addEventListener('click', () => {
          const communityId = document.getElementById('communityId').value;
          const recipientId = document.getElementById('recipientId').value;
          const content = document.getElementById('directMsg').value;
          
          if (!communityId || !recipientId || !content) {
            log('❌ Community ID, recipient ID, and message required', 'error');
            return;
          }

          socket.emit('send_community_message', {
            communityId,
            content,
            messageType: 'text',
            chat_type: 'direct',
            recipient_user_id: recipientId
          }, (response) => {
            log('📤 Direct send response: ' + JSON.stringify(response), response.success ? 'success' : 'error');
            if (response.success) {
              document.getElementById('directMsg').value = '';
            }
          });
        });

        document.getElementById('editMsg').addEventListener('click', () => {
          const messageId = document.getElementById('messageId').value;
          const newContent = document.getElementById('editContent').value;
          const communityId = document.getElementById('communityId').value;

          if (!messageId || !newContent || !communityId) {
            log('❌ Message ID, community ID, and new content required', 'error');
            return;
          }

          socket.emit('edit_message', {
            messageId,
            newContent,
            communityId
          }, (response) => {
            log('✏️ Edit response: ' + JSON.stringify(response), response.success ? 'success' : 'error');
          });
        });

        document.getElementById('deleteMsg').addEventListener('click', () => {
          const messageId = document.getElementById('messageId').value;
          const communityId = document.getElementById('communityId').value;

          if (!messageId || !communityId) {
            log('❌ Message ID and community ID required', 'error');
            return;
          }

          socket.emit('delete_message', {
            messageId,
            deleteType: 'for_everyone',
            communityId
          }, (response) => {
            log('🗑️ Delete response: ' + JSON.stringify(response), response.success ? 'success' : 'error');
          });
        });

        document.getElementById('reactMsg').addEventListener('click', () => {
          const messageId = document.getElementById('messageId').value;
          const communityId = document.getElementById('communityId').value;

          if (!messageId || !communityId) {
            log('❌ Message ID and community ID required', 'error');
            return;
          }

          socket.emit('react_to_message', {
            messageId,
            emoji: '👍',
            communityId
          }, (response) => {
            log('👍 React response: ' + JSON.stringify(response), response.success ? 'success' : 'error');
          });
        });

        document.getElementById('startTyping').addEventListener('click', () => {
          const communityId = document.getElementById('communityId').value;
          const typingType = document.getElementById('typingType').value;
          const recipientId = document.getElementById('recipientId').value;

          if (!communityId) {
            log('❌ Community ID required', 'error');
            return;
          }

          const data = { communityId };
          if (typingType === 'direct' && recipientId) {
            data.recipient_user_id = recipientId;
          }

          socket.emit('typing_indicator', data);
          log('⌨️ Typing indicator sent', 'info');
        });

        document.getElementById('stopTyping').addEventListener('click', () => {
          const communityId = document.getElementById('communityId').value;
          const typingType = document.getElementById('typingType').value;
          const recipientId = document.getElementById('recipientId').value;

          if (!communityId) {
            log('❌ Community ID required', 'error');
            return;
          }

          const data = { communityId };
          if (typingType === 'direct' && recipientId) {
            data.recipient_user_id = recipientId;
          }

          socket.emit('stop_typing', data);
          log('⏸️ Stop typing sent', 'info');
        });
      </script>
    </body>
    </html>
  `);
});

export default router;