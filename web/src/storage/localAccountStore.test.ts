import { describe, expect, it } from "vitest";
import {
  bindGuestAccount,
  createGuestAccount,
  loadActiveLocalAccount,
  loginLocalAccount,
  logoutLocalAccount,
  registerLocalAccount,
  updateLocalNickname,
  type StorageAdapter,
} from "./localAccountStore";

function memoryStorage(): StorageAdapter {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

describe("local account store", () => {
  it("registers, logs out, logs back in, and restores the active account", async () => {
    const storage = memoryStorage();
    const registered = await registerLocalAccount({ account: "manager", password: "football8" }, storage);
    expect(registered.account).toBe("manager");
    expect(registered.isGuest).toBe(false);
    expect(await loadActiveLocalAccount(storage)).toEqual(registered);

    await logoutLocalAccount(storage);
    expect(await loadActiveLocalAccount(storage)).toBeNull();

    const loggedIn = await loginLocalAccount({ account: "manager", password: "football8" }, storage);
    expect(loggedIn).toEqual(registered);
  });

  it("stores password only as a salted digest, never plaintext", async () => {
    const storage = memoryStorage();
    await registerLocalAccount({ account: "manager", password: "football8" }, storage);
    const raw = storage.getItem("ball-girl:accounts-v1");
    expect(raw).toBeTruthy();
    expect(raw).not.toContain("football8");
    const database = JSON.parse(raw!);
    expect(database.users[0].passwordSalt).toBeTruthy();
    expect(database.users[0].passwordHash).not.toBe("football8");
  });

  it("rejects duplicate accounts and wrong passwords", async () => {
    const storage = memoryStorage();
    await registerLocalAccount({ account: "manager", password: "football8" }, storage);
    await expect(registerLocalAccount({ account: "MANAGER", password: "football8" }, storage)).rejects.toThrow("该账号已经注册");
    await expect(loginLocalAccount({ account: "manager", password: "wrongpass" }, storage)).rejects.toThrow("账号或密码错误");
  });

  it("creates an independent guest and binds it in place", async () => {
    const storage = memoryStorage();
    const guest = await createGuestAccount(storage);
    expect(guest.isGuest).toBe(true);
    expect(guest.account).toBeNull();
    const bound = await bindGuestAccount({ account: "manager", password: "football8", passwordConfirmation: "football8" }, storage);
    expect(bound.uid).toBe(guest.uid);
    expect(bound.isGuest).toBe(false);
    expect(bound.account).toBe("manager");
    expect(await loginLocalAccount({ account: "manager", password: "football8" }, storage)).toEqual(bound);
  });

  it("updates the active nickname", async () => {
    const storage = memoryStorage();
    const guest = await createGuestAccount(storage);
    const updated = await updateLocalNickname(guest.uid, "教练", storage);
    expect(updated.nickname).toBe("教练");
  });

  it("isolates accounts from each other", async () => {
    const storage = memoryStorage();
    const first = await registerLocalAccount({ account: "manager_a", password: "football8" }, storage);
    await logoutLocalAccount(storage);
    const second = await registerLocalAccount({ account: "manager_b", password: "football8" }, storage);
    expect(first.uid).not.toBe(second.uid);
    expect(await loadActiveLocalAccount(storage)).toEqual(second);
  });

  it("validates account and password formats", async () => {
    const storage = memoryStorage();
    await expect(registerLocalAccount({ account: "x", password: "football8" }, storage)).rejects.toThrow("账号需为");
    await expect(registerLocalAccount({ account: "manager", password: "short" }, storage)).rejects.toThrow("密码需为");
  });
});
