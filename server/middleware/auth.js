import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../Modals/Auth.js";
import { validateSession } from "../services/sessionService.js";

const JWT_SECRET = process.env.JWT_SECRET || "yourtube_jwt_super_secret_key_2026";

/**
 * Middleware to authenticate requests.
 * Accepts:
 * 1. Bearer JWT token in Authorization header
 * 2. Legacy fallback for non-security routes only
 * For security and preference endpoints, a verified JWT Bearer token is strictly required.
 * Never trusts unauthenticated or non-existent user data.
 */
export const requireAuth = async (req, res, next) => {
  try {
    let userId = null;
    let currentSession = null;
    const authHeader = req.headers.authorization;
    const isSecurityRoute =
      req.originalUrl?.includes("security") ||
      req.originalUrl?.includes("preferences") ||
      req.baseUrl?.includes("security") ||
      req.baseUrl?.includes("preferences");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id || decoded.userId || decoded._id;

        // If token has associated session ID, verify active session
        if (decoded.sid) {
          currentSession = await validateSession(decoded.sid);
          if (!currentSession) {
            return res.status(401).json({
              message: "Session has been revoked or expired. Please sign in again.",
            });
          }
          req.session = currentSession;
          req.currentJwtId = decoded.sid;
        }
      } catch (jwtErr) {
        return res.status(401).json({ message: "Invalid or expired authentication token" });
      }
    } else if (!isSecurityRoute) {
      // Raw client user ID fallback permitted only for non-security endpoints
      if (req.headers["x-user-id"]) {
        userId = req.headers["x-user-id"];
      } else if (req.body?.userId) {
        userId = req.body.userId;
      } else if (req.query?.userId) {
        userId = req.query.userId;
      }
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        message: isSecurityRoute
          ? "Authentication token required to access account security records."
          : "Authentication required. Please sign in to perform this action.",
      });
    }

    const userDoc = await User.findById(userId);
    if (!userDoc) {
      return res.status(401).json({
        message: "User account not found or deactivated.",
      });
    }

    req.user = userDoc;
    req.userId = userDoc._id;
    next();
  } catch (error) {
    console.error("[Auth Middleware] Verification error:", error.message);
    return res.status(500).json({ message: "Internal authentication error" });
  }
};

/**
 * Optional authentication: attaches user if valid token/ID provided, otherwise continues as guest
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
        userId = decoded.id || decoded.userId || decoded._id;
        if (decoded.sid) {
          const session = await validateSession(decoded.sid);
          if (session) {
            req.session = session;
            req.currentJwtId = decoded.sid;
          }
        }
      } catch (jwtErr) {
        // Ignored for optional auth
      }
    } else if (req.headers["x-user-id"]) {
      userId = req.headers["x-user-id"];
    } else if (req.body?.userId) {
      userId = req.body.userId;
    } else if (req.query?.userId) {
      userId = req.query.userId;
    }

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const userDoc = await User.findById(userId);
      if (userDoc) {
        req.user = userDoc;
        req.userId = userDoc._id;
      }
    }
  } catch (error) {
    // Continue anonymously
  }
  next();
};

/**
 * Generates a signed JWT token for a user.
 */
export function generateToken(userDoc, sid = null) {
  const payload = {
    id: userDoc._id,
    email: userDoc.email,
    name: userDoc.name,
  };
  if (sid) {
    payload.sid = sid;
  }
  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}
