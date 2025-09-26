// middleware/logger.js
import { query } from "../db.js";

async function logToDb(level, message, source = "app") {
  try {
    await query(
      "INSERT INTO logs (level, message, source) VALUES ($1, $2, $3)",
      [level, message, source]
    );
  } catch (err) {
    console.error("Failed to insert log:", err.message);
  }
}

// Middleware for logging requests
function requestLogger(req, res, next) {
  const message = `${req.method} ${req.originalUrl} from ${req.ip}`;
  logToDb("INFO", message, `http-ip ${req.ip}`);

  next();
}

export { requestLogger, logToDb };
