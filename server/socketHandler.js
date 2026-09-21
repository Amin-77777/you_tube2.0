/**
 * Real-Time Video Calling Signaling & Room Management Server
 * Handles multi-party WebRTC mesh signaling, host moderation, waiting room,
 * chat, reactions, status syncing, and call recording state.
 */

export function setupSocketIO(io) {
  // In-memory room store: roomId -> roomState
  const rooms = new Map();

  // Helper to find which room a socket is in
  const findUserRoom = (socketId) => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.participants.has(socketId)) {
        return { roomId, room, isWaiting: false };
      }
      if (room.waitingList.has(socketId)) {
        return { roomId, room, isWaiting: true };
      }
    }
    return null;
  };

  // Helper to format participant list for clients
  const getParticipantsList = (room) => {
    return Array.from(room.participants.values());
  };

  // Helper to format waiting list for host/co-hosts
  const getWaitingList = (room) => {
    return Array.from(room.waitingList.values());
  };

  // Helper to notify host/co-hosts of waiting list updates
  const notifyHostsWaitingList = (room) => {
    const waitingUsers = getWaitingList(room);
    for (const [sId, p] of room.participants.entries()) {
      if (p.isHost || p.isCoHost) {
        io.to(sId).emit("waiting-room-updated", { waitingList: waitingUsers });
      }
    }
  };

  io.on("connection", (socket) => {
    console.log(`[Socket Connected] ID: ${socket.id}`);

    // Join room handler
    socket.on("join-room", ({ roomId, userName, avatar, passcode, isHostPreferred = false }) => {
      if (!roomId) return;
      roomId = roomId.trim().toLowerCase();
      userName = userName?.trim() || "Guest " + socket.id.slice(0, 4);

      let room = rooms.get(roomId);

      // If room doesn't exist, create it with this user as host
      if (!room) {
        room = {
          roomId,
          hostId: socket.id,
          passcode: passcode || null,
          isLocked: false,
          waitingRoomEnabled: false,
          allowChat: true,
          allowScreenShare: true,
          isRecording: false,
          recordingStartedBy: null,
          createdAt: Date.now(),
          participants: new Map(),
          waitingList: new Map(),
          chatHistory: [],
        };
        rooms.set(roomId, room);
      }

      // Check if room is locked
      if (room.isLocked && room.hostId !== socket.id) {
        socket.emit("join-error", { message: "This meeting is locked by the host." });
        return;
      }

      // Check passcode if room has one set and user is not the room creator
      if (room.passcode && room.hostId !== socket.id) {
        if (!passcode || passcode !== room.passcode) {
          socket.emit("join-error", { message: "Incorrect meeting passcode." });
          return;
        }
      }

      // Check waiting room
      const isHost = room.hostId === socket.id;
      if (room.waitingRoomEnabled && !isHost) {
        // Place user in waiting room
        room.waitingList.set(socket.id, {
          socketId: socket.id,
          userName,
          avatar: avatar || null,
          requestedAt: Date.now(),
        });

        socket.emit("waiting-room-status", {
          inWaitingRoom: true,
          message: "Please wait, the host will admit you shortly.",
        });

        notifyHostsWaitingList(room);
        console.log(`[Waiting Room] ${userName} (${socket.id}) waiting for room: ${roomId}`);
        return;
      }

      // User admitted directly into room
      admitUserToRoom(socket, room, userName, avatar, isHost);
    });

    // Helper to complete joining room
    function admitUserToRoom(s, room, userName, avatar, isHost) {
      s.join(room.roomId);

      const participant = {
        socketId: s.id,
        userName,
        avatar: avatar || null,
        isHost: isHost,
        isCoHost: false,
        audioEnabled: true,
        videoEnabled: true,
        isHandRaised: false,
        isSpeaking: false,
        connectionQuality: "good",
        joinedAt: Date.now(),
      };

      room.participants.set(s.id, participant);

      console.log(`[User Joined Room] ${userName} (${s.id}) in room: ${room.roomId} (isHost: ${isHost})`);

      // 1. Send initial state to the newly joined participant
      s.emit("room-joined", {
        roomId: room.roomId,
        socketId: s.id,
        isHost: participant.isHost,
        isCoHost: participant.isCoHost,
        participants: getParticipantsList(room),
        settings: {
          isLocked: room.isLocked,
          waitingRoomEnabled: room.waitingRoomEnabled,
          allowChat: room.allowChat,
          allowScreenShare: room.allowScreenShare,
          isRecording: room.isRecording,
          recordingStartedBy: room.recordingStartedBy,
          hasPasscode: Boolean(room.passcode),
        },
        chatHistory: room.chatHistory.filter(
          (m) => !m.isPrivate || m.recipientId === s.id || m.senderId === s.id
        ),
        waitingList: participant.isHost ? getWaitingList(room) : [],
      });

      // 2. Broadcast to other participants in the room that a new user joined
      s.to(room.roomId).emit("user-joined", {
        participant,
      });
    }

    // Host decision on waiting room participant
    socket.on("waiting-room-decision", ({ roomId, targetSocketId, approved }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const caller = room.participants.get(socket.id);
      if (!caller || (!caller.isHost && !caller.isCoHost)) {
        socket.emit("error-message", { message: "Only host or co-hosts can admit participants." });
        return;
      }

      const waitingUser = room.waitingList.get(targetSocketId);
      if (!waitingUser) return;

      room.waitingList.delete(targetSocketId);
      notifyHostsWaitingList(room);

      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (!targetSocket) return;

      if (approved) {
        targetSocket.emit("waiting-room-status", { inWaitingRoom: false });
        admitUserToRoom(targetSocket, room, waitingUser.userName, waitingUser.avatar, false);
      } else {
        targetSocket.emit("denied-entry", { message: "The host has declined your request to join." });
      }
    });

    // WebRTC Signaling: Offer
    socket.on("offer", ({ target, offer }) => {
      io.to(target).emit("offer", {
        sender: socket.id,
        offer,
      });
    });

    // WebRTC Signaling: Answer
    socket.on("answer", ({ target, answer }) => {
      io.to(target).emit("answer", {
        sender: socket.id,
        answer,
      });
    });

    // WebRTC Signaling: ICE Candidate
    socket.on("ice-candidate", ({ target, candidate }) => {
      io.to(target).emit("ice-candidate", {
        sender: socket.id,
        candidate,
      });
    });

    // Real-time participant status updates (audio, video, hand raised, speaking, quality)
    socket.on("update-status", ({ roomId, updates }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const participant = room.participants.get(socket.id);
      if (!participant) return;

      Object.assign(participant, updates);

      io.to(roomId).emit("participant-updated", {
        socketId: socket.id,
        updates,
      });
    });

    // In-Call Chat messaging
    socket.on("send-chat-message", ({ roomId, text, file, isPrivate, recipientId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const sender = room.participants.get(socket.id);
      if (!sender) return;

      if (!room.allowChat && !sender.isHost && !sender.isCoHost) {
        socket.emit("error-message", { message: "Chat has been disabled by the host." });
        return;
      }

      let recipientName = null;
      if (isPrivate && recipientId) {
        const recipient = room.participants.get(recipientId);
        recipientName = recipient ? recipient.userName : "User";
      }

      const message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        senderId: socket.id,
        senderName: sender.userName,
        text: text || "",
        file: file || null,
        isPrivate: Boolean(isPrivate),
        recipientId: isPrivate ? recipientId : null,
        recipientName,
        timestamp: new Date().toISOString(),
      };

      room.chatHistory.push(message);

      if (isPrivate && recipientId) {
        // Send to sender and recipient only
        socket.emit("new-chat-message", { message });
        io.to(recipientId).emit("new-chat-message", { message });
      } else {
        // Send to entire room
        io.to(roomId).emit("new-chat-message", { message });
      }
    });

    // Floating reaction relay
    socket.on("send-reaction", ({ roomId, emoji }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const sender = room.participants.get(socket.id);
      if (!sender) return;

      io.to(roomId).emit("reaction-received", {
        senderId: socket.id,
        senderName: sender.userName,
        emoji,
      });
    });

    // Host Moderation: Force mute single participant
    socket.on("mute-participant", ({ roomId, targetSocketId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const caller = room.participants.get(socket.id);
      if (!caller || (!caller.isHost && !caller.isCoHost)) return;

      io.to(targetSocketId).emit("force-mute", { by: caller.userName });
    });

    // Host Moderation: Force mute all participants
    socket.on("mute-all", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const caller = room.participants.get(socket.id);
      if (!caller || (!caller.isHost && !caller.isCoHost)) return;

      socket.to(roomId).emit("force-mute", { by: caller.userName, all: true });
    });

    // Host Moderation: Remove participant from meeting
    socket.on("kick-participant", ({ roomId, targetSocketId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const caller = room.participants.get(socket.id);
      if (!caller || (!caller.isHost && !caller.isCoHost)) return;

      const target = room.participants.get(targetSocketId);
      if (!target) return;

      room.participants.delete(targetSocketId);

      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit("kicked-from-room", {
          reason: "You were removed from the meeting by the host.",
        });
        targetSocket.leave(roomId);
      }

      io.to(roomId).emit("user-left", {
        socketId: targetSocketId,
        userName: target.userName,
        wasKicked: true,
      });
    });

    // Host Moderation: Assign or Revoke Co-Host
    socket.on("set-cohost", ({ roomId, targetSocketId, isCoHost }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const caller = room.participants.get(socket.id);
      if (!caller || !caller.isHost) return;

      const target = room.participants.get(targetSocketId);
      if (!target) return;

      target.isCoHost = Boolean(isCoHost);

      io.to(roomId).emit("participant-updated", {
        socketId: targetSocketId,
        updates: { isCoHost: target.isCoHost },
      });

      notifyHostsWaitingList(room);
    });

    // Host Moderation: Toggle Room Lock
    socket.on("toggle-lock", ({ roomId, isLocked }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const caller = room.participants.get(socket.id);
      if (!caller || (!caller.isHost && !caller.isCoHost)) return;

      room.isLocked = Boolean(isLocked);

      io.to(roomId).emit("room-settings-updated", {
        isLocked: room.isLocked,
      });
    });

    // Host Moderation: Toggle Waiting Room
    socket.on("toggle-waiting-room", ({ roomId, waitingRoomEnabled }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const caller = room.participants.get(socket.id);
      if (!caller || (!caller.isHost && !caller.isCoHost)) return;

      room.waitingRoomEnabled = Boolean(waitingRoomEnabled);

      io.to(roomId).emit("room-settings-updated", {
        waitingRoomEnabled: room.waitingRoomEnabled,
      });
    });

    // Host Moderation: Toggle Permissions (Chat, Screen Sharing)
    socket.on("toggle-permission", ({ roomId, permission, value }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const caller = room.participants.get(socket.id);
      if (!caller || (!caller.isHost && !caller.isCoHost)) return;

      if (permission === "allowChat") {
        room.allowChat = Boolean(value);
      } else if (permission === "allowScreenShare") {
        room.allowScreenShare = Boolean(value);
      }

      io.to(roomId).emit("room-settings-updated", {
        [permission]: value,
      });
    });

    // Call Recording State
    socket.on("toggle-recording", ({ roomId, isRecording }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const caller = room.participants.get(socket.id);
      if (!caller || (!caller.isHost && !caller.isCoHost)) return;

      room.isRecording = Boolean(isRecording);
      room.recordingStartedBy = isRecording ? caller.userName : null;

      io.to(roomId).emit("recording-status-changed", {
        isRecording: room.isRecording,
        recordingStartedBy: room.recordingStartedBy,
      });
    });

    // Host Moderation: End Meeting for Everyone
    socket.on("end-meeting", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const caller = room.participants.get(socket.id);
      if (!caller || !caller.isHost) return;

      io.to(roomId).emit("meeting-ended", {
        reason: "The host has ended the meeting for all participants.",
      });

      // Clear room
      rooms.delete(roomId);
    });

    // Leave room manually
    socket.on("leave-room", ({ roomId }) => {
      handleUserLeave(socket, roomId);
    });

    // Socket disconnect
    socket.on("disconnect", () => {
      console.log(`[Socket Disconnected] ID: ${socket.id}`);
      const found = findUserRoom(socket.id);
      if (found) {
        handleUserLeave(socket, found.roomId);
      }
    });

    // Cleanup logic when user leaves or disconnects
    function handleUserLeave(s, roomId) {
      const room = rooms.get(roomId);
      if (!room) return;

      // If user was in waiting list
      if (room.waitingList.has(s.id)) {
        room.waitingList.delete(s.id);
        notifyHostsWaitingList(room);
        return;
      }

      // If user was in active participants
      const participant = room.participants.get(s.id);
      if (!participant) return;

      room.participants.delete(s.id);
      s.leave(roomId);

      console.log(`[User Left] ${participant.userName} (${s.id}) left room: ${roomId}`);

      let newHostId = null;

      // If host left, reassign host to a co-host or oldest participant
      if (participant.isHost && room.participants.size > 0) {
        // Find co-host first, or first participant
        let nextHost = null;
        for (const p of room.participants.values()) {
          if (p.isCoHost) {
            nextHost = p;
            break;
          }
        }
        if (!nextHost) {
          nextHost = room.participants.values().next().value;
        }

        if (nextHost) {
          nextHost.isHost = true;
          room.hostId = nextHost.socketId;
          newHostId = nextHost.socketId;

          io.to(roomId).emit("host-changed", {
            newHostId: nextHost.socketId,
            newHostName: nextHost.userName,
          });

          // Send updated waiting list to new host
          io.to(nextHost.socketId).emit("waiting-room-updated", {
            waitingList: getWaitingList(room),
          });
        }
      }

      // Notify others that participant left
      io.to(roomId).emit("user-left", {
        socketId: s.id,
        userName: participant.userName,
        newHostId,
      });

      // If room is completely empty, delete it
      if (room.participants.size === 0 && room.waitingList.size === 0) {
        console.log(`[Room Cleaned] Room ${roomId} deleted as it is empty.`);
        rooms.delete(roomId);
      }
    }
  });
}
