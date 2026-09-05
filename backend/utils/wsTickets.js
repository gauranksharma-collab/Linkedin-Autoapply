const crypto = require("crypto");

const TICKET_TTL_MS = 30_000;
const tickets = new Map(); // ticket -> { userId, expiresAt }

function issueTicket(userId) {
  const ticket = crypto.randomBytes(24).toString("hex");
  tickets.set(ticket, { userId, expiresAt: Date.now() + TICKET_TTL_MS });
  return ticket;
}

function consumeTicket(ticket) {
  const entry = tickets.get(ticket);
  if (!entry) return null;
  tickets.delete(ticket);
  if (Date.now() > entry.expiresAt) return null;
  return entry.userId;
}

setInterval(() => {
  const now = Date.now();
  for (const [ticket, entry] of tickets) {
    if (now > entry.expiresAt) tickets.delete(ticket);
  }
}, 60_000).unref();

module.exports = { issueTicket, consumeTicket };
