export type StorageAdapter = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type PlayerAccount = {
  uid: string;
  account: string | null;
  nickname: string;
  isGuest: boolean;
  createdAt: string;
  updatedAt: string;
};

type StoredUser = PlayerAccount & {
  kind: "guest" | "registered";
  normalizedAccount: string | null;
  passwordSalt: string | null;
  passwordHash: string | null;
};

type AccountDatabase = {
  schemaVersion: 1;
  users: StoredUser[];
};

const ACCOUNTS_KEY = "ball-girl:accounts-v1";
const ACTIVE_ACCOUNT_KEY = "ball-girl:active-account-v1";
const PBKDF2_ITERATIONS = 150_000;

class LocalAccountError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function browserStorage(): StorageAdapter | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

function randomUid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `uid-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  return btoa(String.fromCharCode(...bytes));
}

async function hashPassword(password: string, salt: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new LocalAccountError("当前环境不支持安全的密码哈希", 500);
  }
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    256,
  );
  return btoa(String.fromCharCode(...new Uint8Array(derived)));
}

function normalizeAccount(account: string) {
  return account.trim().toLowerCase();
}

function validateAccount(input: unknown) {
  const account = String(input ?? "").trim();
  const legacy = /^[A-Za-z0-9_]{4,24}$/.test(account);
  const email = account.length <= 254 && /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(account);
  if (!legacy && !email) throw new LocalAccountError("账号需为 4–24 位英文字母、数字或下划线，或有效邮箱地址", 400);
  return account;
}

function validatePassword(input: unknown) {
  const password = String(input ?? "");
  if (password.length < 8 || password.length > 64) throw new LocalAccountError("密码需为 8–64 个字符", 400);
  return password;
}

function validateNickname(input: unknown) {
  const nickname = String(input ?? "").trim();
  const length = Array.from(nickname).length;
  if (length < 1 || length > 16) throw new LocalAccountError("昵称需为 1–16 个字符", 400);
  return nickname;
}

function emptyDatabase(): AccountDatabase {
  return { schemaVersion: 1, users: [] };
}

function loadDatabase(storage: StorageAdapter | null): AccountDatabase {
  const raw = storage?.getItem(ACCOUNTS_KEY);
  if (!raw) return emptyDatabase();
  try {
    const parsed = JSON.parse(raw) as AccountDatabase;
    if (parsed?.schemaVersion === 1 && Array.isArray(parsed.users)) return parsed;
  } catch { /* fall through to a fresh database */ }
  return emptyDatabase();
}

function saveDatabase(storage: StorageAdapter | null, database: AccountDatabase) {
  try { storage?.setItem(ACCOUNTS_KEY, JSON.stringify(database)); } catch { /* keep the game usable when storage is unavailable */ }
}

function activeUid(storage: StorageAdapter | null): string | null {
  try { return storage?.getItem(ACTIVE_ACCOUNT_KEY) ?? null; } catch { return null; }
}

function setActiveUid(storage: StorageAdapter | null, uid: string | null) {
  try {
    if (uid) storage?.setItem(ACTIVE_ACCOUNT_KEY, uid);
    else storage?.removeItem(ACTIVE_ACCOUNT_KEY);
  } catch { /* ignore */ }
}

function toPublic(user: StoredUser): PlayerAccount {
  return {
    uid: user.uid,
    account: user.isGuest ? null : user.account,
    nickname: user.nickname,
    isGuest: user.isGuest,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function loadActiveLocalAccount(storage: StorageAdapter | null = browserStorage()): Promise<PlayerAccount | null> {
  const uid = activeUid(storage);
  if (!uid) return null;
  const user = loadDatabase(storage).users.find((candidate) => candidate.uid === uid);
  return user ? toPublic(user) : null;
}

export async function createGuestAccount(storage: StorageAdapter | null = browserStorage()): Promise<PlayerAccount> {
  const database = loadDatabase(storage);
  const now = new Date().toISOString();
  const user: StoredUser = {
    uid: randomUid(),
    kind: "guest",
    account: null,
    normalizedAccount: null,
    nickname: "",
    passwordSalt: null,
    passwordHash: null,
    isGuest: true,
    createdAt: now,
    updatedAt: now,
  };
  database.users.push(user);
  saveDatabase(storage, database);
  setActiveUid(storage, user.uid);
  return toPublic(user);
}

export async function registerLocalAccount(input: { account: string; password: string }, storage: StorageAdapter | null = browserStorage()): Promise<PlayerAccount> {
  const database = loadDatabase(storage);
  const account = validateAccount(input.account);
  const password = validatePassword(input.password);
  const normalizedAccount = normalizeAccount(account);
  if (database.users.some((user) => user.normalizedAccount === normalizedAccount)) {
    throw new LocalAccountError("该账号已经注册", 409);
  }
  const passwordSalt = randomSalt();
  const passwordHash = await hashPassword(password, passwordSalt);
  const now = new Date().toISOString();
  const user: StoredUser = {
    uid: randomUid(),
    kind: "registered",
    account,
    normalizedAccount,
    nickname: "",
    passwordSalt,
    passwordHash,
    isGuest: false,
    createdAt: now,
    updatedAt: now,
  };
  database.users.push(user);
  saveDatabase(storage, database);
  setActiveUid(storage, user.uid);
  return toPublic(user);
}

export async function loginLocalAccount(input: { account: string; password: string }, storage: StorageAdapter | null = browserStorage()): Promise<PlayerAccount> {
  const database = loadDatabase(storage);
  const normalizedAccount = normalizeAccount(String(input.account ?? ""));
  const password = validatePassword(input.password);
  const user = database.users.find((candidate) => candidate.kind === "registered" && candidate.normalizedAccount === normalizedAccount);
  if (!user || !user.passwordSalt || !user.passwordHash) throw new LocalAccountError("账号或密码错误", 401);
  const actual = await hashPassword(password, user.passwordSalt);
  if (actual !== user.passwordHash) throw new LocalAccountError("账号或密码错误", 401);
  setActiveUid(storage, user.uid);
  return toPublic(user);
}

export async function bindGuestAccount(input: { account: string; password: string; passwordConfirmation: string }, storage: StorageAdapter | null = browserStorage()): Promise<PlayerAccount> {
  const database = loadDatabase(storage);
  const uid = activeUid(storage);
  const user = uid ? database.users.find((candidate) => candidate.uid === uid) : undefined;
  if (!user || user.kind !== "guest") throw new LocalAccountError("当前账号不是游客账号", 409);
  if (input.password !== input.passwordConfirmation) throw new LocalAccountError("两次输入的密码不一致", 400);
  const account = validateAccount(input.account);
  const password = validatePassword(input.password);
  const normalizedAccount = normalizeAccount(account);
  if (database.users.some((candidate) => candidate.uid !== uid && candidate.normalizedAccount === normalizedAccount)) {
    throw new LocalAccountError("该账号已经注册", 409);
  }
  const passwordSalt = randomSalt();
  const passwordHash = await hashPassword(password, passwordSalt);
  user.kind = "registered";
  user.account = account;
  user.normalizedAccount = normalizedAccount;
  user.passwordSalt = passwordSalt;
  user.passwordHash = passwordHash;
  user.isGuest = false;
  user.updatedAt = new Date().toISOString();
  saveDatabase(storage, database);
  return toPublic(user);
}

export async function updateLocalNickname(_uid: string, nickname: string, storage: StorageAdapter | null = browserStorage()): Promise<PlayerAccount> {
  const database = loadDatabase(storage);
  const uid = activeUid(storage);
  const user = uid ? database.users.find((candidate) => candidate.uid === uid) : undefined;
  if (!user) throw new LocalAccountError("请先登录", 401);
  user.nickname = validateNickname(nickname);
  user.updatedAt = new Date().toISOString();
  saveDatabase(storage, database);
  return toPublic(user);
}

export async function logoutLocalAccount(storage: StorageAdapter | null = browserStorage()): Promise<void> {
  setActiveUid(storage, null);
}
