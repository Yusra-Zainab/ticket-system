import "server-only";

import { promisify } from "node:util";
import { createHash, randomBytes, scrypt } from "node:crypto";
import net from "node:net";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

const SESSION_COOKIE = "support_portal_session";
const ADMIN_PASSWORD = "Password123!";
const ADMIN_ROLE = "admin";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const ADMIN_ACCOUNTS = [
  {
    email: "yzainan@datapulsetechnologies.org",
    name: "YZainan",
  },
  {
    email: "yzainab@datapulsetechnologies.org",
    name: "YZainab",
  },
] as const;

type AuthUser = {
  id: number;
  email: string;
  role: string;
  name: string;
  lifecycle: string | null;
};

type QueryUserRow = AuthUser & {
  password: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __ticketAuthInitPromise: Promise<void> | undefined;
}

const deriveKey = promisify(scrypt);

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await deriveKey(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null) {
  if (!stored) {
    return false;
  }

  const [salt, hash] = stored.split(":");

  if (!salt || !hash) {
    return false;
  }

  const derived = (await deriveKey(password, salt, 64)) as Buffer;
  return derived.toString("hex") === hash;
}

async function ensureAuthTables() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id BIGINT NOT NULL AUTO_INCREMENT,
      token_hash CHAR(64) NOT NULL,
      user_id INT NOT NULL,
      expires_at DATETIME(3) NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY idx_auth_sessions_token_hash (token_hash),
      KEY idx_auth_sessions_user_id (user_id),
      KEY idx_auth_sessions_expires_at (expires_at)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id BIGINT NOT NULL AUTO_INCREMENT,
      token_hash CHAR(64) NOT NULL,
      user_id INT NOT NULL,
      expires_at DATETIME(3) NOT NULL,
      used_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY idx_password_reset_tokens_token_hash (token_hash),
      KEY idx_password_reset_tokens_user_id (user_id),
      KEY idx_password_reset_tokens_expires_at (expires_at)
    )
  `);
}

async function ensureAdminUsers() {
  const password = await hashPassword(ADMIN_PASSWORD);

  for (const account of ADMIN_ACCOUNTS) {
    await syncAdminAccount(account, password);
  }
}

async function syncAdminAccount(
  account: (typeof ADMIN_ACCOUNTS)[number],
  password?: string,
) {
  const passwordHash = password ?? (await hashPassword(ADMIN_PASSWORD));

  const [rows] = await db.query<QueryUserRow[]>(
    `
      SELECT
        id,
        email,
        role,
        name,
        lifecycle,
        password
      FROM users
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1
    `,
    [account.email],
  );

  if (rows[0]) {
    await db.execute(
      `
        UPDATE users
        SET
          name = ?,
          password = ?,
          role = ?,
          lifecycle = 'OPEN',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [account.name, passwordHash, ADMIN_ROLE, rows[0].id],
    );
    return;
  }

  await db.execute(
    `
      INSERT INTO users (
        name,
        email,
        password,
        role,
        lifecycle,
        form_data
      )
      VALUES (?, ?, ?, ?, 'OPEN', JSON_OBJECT())
    `,
    [account.name, account.email, passwordHash, ADMIN_ROLE],
  );
}

export async function ensureAuthInfrastructure() {
  if (!globalThis.__ticketAuthInitPromise) {
    globalThis.__ticketAuthInitPromise = (async () => {
      await ensureAuthTables();
      await ensureAdminUsers();
    })().catch((error) => {
      globalThis.__ticketAuthInitPromise = undefined;
      throw error;
    });
  }

  await globalThis.__ticketAuthInitPromise;
}

async function findUserByEmail(email: string) {
  const [rows] = await db.query<QueryUserRow[]>(
    `
      SELECT
        id,
        email,
        role,
        name,
        lifecycle,
        password
      FROM users
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1
    `,
    [email.trim()],
  );

  return rows[0];
}

async function findUserById(id: number) {
  const [rows] = await db.query<AuthUser[]>(
    `
      SELECT
        id,
        email,
        role,
        name,
        lifecycle
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );

  return rows[0];
}

function isAdminRole(role: string | null | undefined) {
  return ["admin", "super_admin"].includes(String(role ?? "").toLowerCase());
}

export async function createSession(userId: number) {
  await ensureAuthInfrastructure();

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.execute(
    `
      INSERT INTO auth_sessions (
        token_hash,
        user_id,
        expires_at
      )
      VALUES (?, ?, ?)
    `,
    [sha256(token), userId, expiresAt],
  );

  return {
    token,
    expiresAt,
  };
}

export async function destroySession(token: string | undefined) {
  if (!token) {
    return;
  }

  await ensureAuthInfrastructure();
  await db.execute("DELETE FROM auth_sessions WHERE token_hash = ?", [
    sha256(token),
  ]);
}

export async function destroyAllSessionsForUser(userId: number) {
  await ensureAuthInfrastructure();
  await db.execute("DELETE FROM auth_sessions WHERE user_id = ?", [userId]);
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function signOutCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  await destroySession(token);
  store.delete(SESSION_COOKIE);
}

export async function signOutAllSessions() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const user = await getSessionUserFromToken(token);

  if (user) {
    await destroyAllSessionsForUser(user.id);
  } else if (token) {
    await destroySession(token);
  }

  store.delete(SESSION_COOKIE);
}

export async function getSessionUserFromToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  await ensureAuthInfrastructure();

  const [rows] = await db.query<
    Array<{
      user_id: number;
      expires_at: string;
    }>
  >(
    `
      SELECT
        user_id,
        expires_at
      FROM auth_sessions
      WHERE token_hash = ?
      LIMIT 1
    `,
    [sha256(token)],
  );

  const session = rows[0];

  if (!session) {
    return null;
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await db.execute("DELETE FROM auth_sessions WHERE token_hash = ?", [
      sha256(token),
    ]);
    return null;
  }

  const user = await findUserById(session.user_id);

  if (!user || !isAdminRole(user.role) || user.lifecycle !== "OPEN") {
    return null;
  }

  return user;
}

export async function getSessionUser() {
  const store = await cookies();
  return getSessionUserFromToken(store.get(SESSION_COOKIE)?.value);
}

export async function requireAdminPageSession() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAnonymousPage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/dashboard");
  }
}

export async function authenticateAdmin(email: string, password: string) {
  await ensureAuthInfrastructure();

  const seededAccount = ADMIN_ACCOUNTS.find(
    (account) => account.email.toLowerCase() === email.trim().toLowerCase(),
  );

  if (seededAccount) {
    await syncAdminAccount(seededAccount);
  }

  const user = await findUserByEmail(email);

  if (!user || user.lifecycle !== "OPEN" || !isAdminRole(user.role)) {
    return null;
  }

  const valid = await verifyPassword(password, user.password);
  return valid ? user : null;
}

export async function createPasswordResetToken(email: string) {
  await ensureAuthInfrastructure();

  const seededAccount = ADMIN_ACCOUNTS.find(
    (account) => account.email.toLowerCase() === email.trim().toLowerCase(),
  );

  if (seededAccount) {
    await syncAdminAccount(seededAccount);
  }

  const user = await findUserByEmail(email);

  if (!user || user.lifecycle !== "OPEN" || !isAdminRole(user.role)) {
    return null;
  }

  await db.execute(
    `
      UPDATE password_reset_tokens
      SET used_at = CURRENT_TIMESTAMP(3)
      WHERE user_id = ? AND used_at IS NULL
    `,
    [user.id],
  );

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);
  const ttlSeconds = Math.floor(RESET_TTL_MS / 1000);

  await db.execute(
    `
      INSERT INTO password_reset_tokens (
        token_hash,
        user_id,
        expires_at
      )
      VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL ? SECOND))
    `,
    [sha256(token), user.id, ttlSeconds],
  );

  return {
    token,
    user,
    expiresAt,
  };
}

export async function resetPasswordFromToken(
  token: string,
  nextPassword: string,
) {
  await ensureAuthInfrastructure();

  const [rows] = await db.query<
    Array<{
      id: number;
      user_id: number;
    }>
  >(
    `
      SELECT
        id,
        user_id
      FROM password_reset_tokens
      WHERE
        token_hash = ?
        AND used_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP(3)
      LIMIT 1
    `,
    [sha256(token)],
  );

  const record = rows[0];

  if (!record) {
    return null;
  }

  await db.execute("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [
    await hashPassword(nextPassword),
    record.user_id,
  ]);

  await db.execute(
    "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP(3) WHERE id = ?",
    [record.id],
  );

  return findUserById(record.user_id);
}

function escapeSmtp(value: string) {
  return value.replace(/\r?\n/g, " ").trim();
}

function chunkBase64(value: string) {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? value;
}

async function smtpConversation(
  socket: net.Socket,
  expected: number[],
  command?: string,
) {
  const response = await new Promise<string>((resolve, reject) => {
    let buffer = "";

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");

      const lines = buffer.split("\r\n").filter(Boolean);
      const last = lines.at(-1);

      if (!last || last.length < 4 || last[3] === "-") {
        return;
      }

      socket.off("data", onData);
      resolve(buffer);
    };

    socket.on("data", onData);
    socket.once("error", reject);

    if (command) {
      socket.write(command);
    }
  });

  const code = Number.parseInt(response.slice(0, 3), 10);

  if (!expected.includes(code)) {
    throw new Error(`SMTP error ${code}: ${response.trim()}`);
  }

  return response;
}

export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const host = process.env.MAILHOG_HOST ?? "127.0.0.1";
  const port = Number.parseInt(process.env.MAILHOG_SMTP_PORT ?? "1025", 10);
  const from = process.env.MAIL_FROM ?? ADMIN_ACCOUNTS[0].email;
  const messageId = `<${randomBytes(12).toString("hex")}@ticket-system.local>`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`;
  const payload = [
    `From: ${escapeSmtp(from)}`,
    `To: ${escapeSmtp(to)}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    `Message-ID: ${messageId}`,
    "",
    chunkBase64(Buffer.from(html, "utf8").toString("base64")),
    "",
  ]
    .join("\r\n")
    .replace(/\r?\n\.\r?\n/g, "\r\n..\r\n");

  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host, port }, async () => {
      try {
        await smtpConversation(socket, [220]);
        await smtpConversation(socket, [250], "EHLO localhost\r\n");
        await smtpConversation(socket, [250], `MAIL FROM:<${from}>\r\n`);
        await smtpConversation(socket, [250], `RCPT TO:<${to}>\r\n`);
        await smtpConversation(socket, [354], "DATA\r\n");
        await smtpConversation(socket, [250], `${payload}\r\n.\r\n`);
        await smtpConversation(socket, [221], "QUIT\r\n");
        socket.end();
        resolve();
      } catch (error) {
        socket.destroy();
        reject(error);
      }
    });

    socket.once("error", reject);
  });
}

export function buildResetUrl(request: Request | NextRequest, token: string) {
  const url = new URL(request.url);
  url.pathname = "/resetPassword";
  url.search = "";
  url.searchParams.set("token", token);
  return url.toString();
}

export async function issueSessionResponse(userId: number) {
  const { token, expiresAt } = await createSession(userId);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return response;
}

export async function getProxySessionUser(request: NextRequest) {
  return getSessionUserFromToken(request.cookies.get(SESSION_COOKIE)?.value);
}
