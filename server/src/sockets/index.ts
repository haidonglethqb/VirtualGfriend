import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { chatService } from '../modules/chat/chat.service';
import { proactiveNotificationService } from '../modules/ai/proactive-notification.service';
import { moodService } from '../modules/character/mood.service';

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

    // Check for proactive notifications on connection
    (async () => {
      try {
        const characters = await prisma.character.findMany({
          where: { userId },
          select: { id: true, name: true },
        });

        for (const character of characters) {
          const result = await proactiveNotificationService.checkAndSendNotification(character.id);
          if (result.shouldSend && result.notification) {
            socket.emit('notification:proactive', {
              characterId: character.id,
              characterName: character.name,
              type: result.notification.type,
              message: result.notification.message,
            });
          }
        }
      } catch (err) {
        console.error('[Socket] Proactive notification error:', err);
      }
    })();

    // Handle mood check request
    socket.on('character:mood_check', async (data: { characterId: string }) => {
      try {
        const mood = await moodService.getCurrentMood(data.characterId);
        socket.emit('character:mood_update', {
          characterId: data.characterId,
          ...mood,
        });
      } catch (err) {
        console.error('[Socket] Mood check error:', err);
      }
    });

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

          // Emit enhanced affection update with level up and relationship info
          if (result.affectionChange !== undefined) {
            socket.emit('character:affection_change', {
              characterId: data.characterId,
              change: result.affectionChange,
              newAffection: result.newAffection,
              newLevel: result.newLevel,
              levelUp: result.levelUp,
              relationshipUpgrade: result.relationshipUpgrade,
              previousStage: result.previousStage,
              newStage: result.newStage,
              unlocks: result.unlocks,
              rewards: result.rewards,
            });
          }

          // Emit quest completion notifications
          if (result.questsCompleted && result.questsCompleted.length > 0) {
            result.questsCompleted.forEach(quest => {
              socket.emit('quest:completed', quest);
            });
          }

          // Emit milestone unlocks
          if (result.milestonesUnlocked && result.milestonesUnlocked.length > 0) {
            result.milestonesUnlocked.forEach(milestone => {
              socket.emit('milestone:unlocked', { milestone });
            });
          }
        }, 1000 + Math.random() * 2000); // 1-3 seconds delay

      } catch (error) {
        console.error('[Socket] Error sending message:', error);
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
