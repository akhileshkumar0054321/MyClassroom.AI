import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { StudentSession, UserRole } from "./types";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e7 // 10MB for video frames
  });

  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // In-memory state
  const activeSessions = new Map<string, StudentSession>();
  const invigilators = new Set<string>();

  // API Routes
  app.get("/api/invigilator/students", (req, res) => {
    // In a real app, check JWT/Session here
    res.json(Array.from(activeSessions.values()));
  });

  app.post("/api/invigilator/kick", (req, res) => {
    const { studentId, invigilatorId, reason } = req.body;
    const session = activeSessions.get(studentId);
    
    if (session) {
      session.status = 'KICKED';
      // Notify the specific student
      io.to(session.socketId!).emit('student_kicked', { reason });
      // Notify all invigilators
      io.to('invigilators').emit('session_updated', session);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Student session not found" });
    }
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("New connection:", socket.id);

    socket.on("join_as_invigilator", (data) => {
      socket.join("invigilators");
      invigilators.add(socket.id);
      console.log("Invigilator joined:", socket.id);
      // Send current state
      socket.emit("initial_state", Array.from(activeSessions.values()));
    });

    socket.on("student_joined", (session: StudentSession) => {
      session.socketId = socket.id;
      session.status = 'ACTIVE';
      activeSessions.set(session.studentId, session);
      console.log("Student joined:", session.studentName);
      io.to("invigilators").emit("student_joined", session);
    });

    socket.on("violation_updated", (data: { studentId: string, slashCount: number, lastViolation: string }) => {
      const session = activeSessions.get(data.studentId);
      if (session) {
        session.slashCount = data.slashCount;
        session.lastViolation = data.lastViolation;
        io.to("invigilators").emit("session_updated", session);
      }
    });

    socket.on("stream_frame", (data: { studentId: string, frame: string }) => {
      // Relay frame to all invigilators (Simple SFU behavior)
      io.to("invigilators").emit("student_frame", data);
    });

    socket.on("disconnect", () => {
      if (invigilators.has(socket.id)) {
        invigilators.delete(socket.id);
      } else {
        // Find student session and mark as disconnected
        for (const [id, session] of activeSessions.entries()) {
          if (session.socketId === socket.id) {
            session.status = 'DISCONNECTED';
            io.to("invigilators").emit("session_updated", session);
            // We don't delete immediately to allow reconnection or to show history
            break;
          }
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
