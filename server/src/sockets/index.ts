import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { chatService } from '../modules/chat/chat.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface JwtPayload {
  userId: string;
  email: string;
}

export function setupSocketHandlers(io: Server) {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'secret'
      ) as JwtPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    
    // Join user's room
    socket.join(`user:${userId}`);

    // Handle sending messages
    socket.on('message:send', async (data: {
      characterId: string;
      content: string;
      messageType?: string;
    }) => {
      try {
        // Emit typing indicator
        socket.emit('character:typing', { characterId: data.characterId });

        // Process message
        const result = await chatService.sendMessage(userId, {
          characterId: data.characterId,
          content: data.content,
          messageType: (data.messageType as 'TEXT') || 'TEXT',
        });

        // Emit user message
        socket.emit('message:receive', {
          ...result.userMessage,
          isOwn: true,
        });

        // Small delay to simulate typing
        setTimeout(() => {
          // Emit AI response
          socket.emit('message:receive', {
            ...result.aiMessage,
            isOwn: false,
            emotion: result.emotion,
          });

          // Emit mood change if any
          if (result.moodChange) {
            socket.emit('character:mood_change', {
              characterId: data.characterId,
              mood: result.moodChange,
            });
          }

          // Emit affection update
          if (result.affectionChange) {
            socket.emit('character:affection_change', {
              characterId: data.characterId,
              change: result.affectionChange,
            });
          }
        }, 1000 + Math.random() * 2000); // 1-3 seconds delay

      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicators
    socket.on('typing:start', (characterId: string) => {
      // Could be used for multiplayer features in the future
    });

    socket.on('typing:stop', (characterId: string) => {
      // Could be used for multiplayer features in the future
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      // User disconnected
    });
  });

  // Helper function to send notifications
  const sendNotification = (userId: string, notification: {
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }) => {
    io.to(`user:${userId}`).emit('notification:new', notification);
  };

  // Export for use in other modules
  return { sendNotification };
}
