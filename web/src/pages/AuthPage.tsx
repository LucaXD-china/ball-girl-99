import { LockKeyhole, Maximize2, Minimize2, Play, UserRoundPlus, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { SceneStage } from "../components/SceneStage";
import { loginStadiumScene } from "../scenes/sceneDefinitions";
import {
  createGuestAccount,
  loginLocalAccount,
  registerLocalAccount,
  type PlayerAccount,
} from "../storage/localAccountStore";

type AuthMode = "login" | "register";

type Props = {
  cachedAccount: PlayerAccount | null;
  onAuthenticated: (account: PlayerAccount) => Promise<void>;
};

export function AuthPage({ cachedAccount, onAuthenticated }: Props) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const fullscreenSupported = typeof document.documentElement.requestFullscreen === "function";

  useEffect(() => {
    function syncFullscreenState() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const account = String(form.get("account") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      if (mode === "register") {
        const confirmation = String(form.get("passwordConfirmation") ?? "");
        if (password !== confirmation) throw new Error("两次输入的密码不一致");
        const player = await registerLocalAccount({
          account,
          password,
        });
        await onAuthenticated(player);
      } else {
        await onAuthenticated(await loginLocalAccount({ account, password }));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "操作失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
  }

  function closeDialog() {
    if (pending) return;
    setDialogOpen(false);
    setError(null);
  }

  async function enterFromLanding() {
    if (cachedAccount) {
      setPending(true);
      try {
        await onAuthenticated(cachedAccount);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "账号同步失败");
        setDialogOpen(true);
      } finally {
        setPending(false);
      }
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onAuthenticated(await createGuestAccount());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "游客试玩创建失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  function openLogin() {
    setMode("login");
    setError(null);
    setDialogOpen(true);
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen();
  }

  return (
    <div className="auth-screen">
      <SceneStage scene={loginStadiumScene} activeCharacterAnchorId={null}>
        <section className="login-entry" aria-label="游戏登录入口">
          <button className="login-primary-action" type="button" onClick={() => void enterFromLanding()} disabled={pending}>
            <Play aria-hidden="true" />
            <span>{pending ? "正在进入…" : cachedAccount ? "继续游戏" : "开始试玩"}</span>
          </button>
          {!cachedAccount ? (
            <button className="login-account-action" type="button" onClick={openLogin} disabled={pending}>
              <LockKeyhole aria-hidden="true" />
              <span>账号登录</span>
            </button>
          ) : null}
          {!dialogOpen && error ? <p className="login-entry-error" role="alert">{error}</p> : null}
          {fullscreenSupported ? (
            <button
              className="login-fullscreen-action"
              type="button"
              aria-pressed={isFullscreen}
              onClick={() => void toggleFullscreen()}
            >
              {isFullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
              <span>{isFullscreen ? "退出全屏" : "全屏体验更佳"}</span>
            </button>
          ) : (
            <span className="login-fullscreen-note">建议使用浏览器全屏体验</span>
          )}
          <small>{cachedAccount ? "欢迎回到俱乐部" : "无需注册 · 进度可稍后绑定账号"}</small>
        </section>

        {dialogOpen ? (
          <div className="auth-modal-backdrop">
            <section className="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
              <button className="auth-close" type="button" aria-label="关闭账号窗口" onClick={closeDialog} disabled={pending}>
                <X aria-hidden="true" />
              </button>
              <p className="auth-game-name">激射！绿茵少女！</p>
              <div className="auth-heading">
                {mode === "register" ? <UserRoundPlus aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
                <div>
                  <strong id="auth-title">{mode === "register" ? "创建俱乐部账号" : "欢迎回到俱乐部"}</strong>
                  <small>{mode === "register" ? "创建账号后，从你的足球记忆开始" : "验证账号后继续当前进度"}</small>
                </div>
              </div>

              <form className="auth-form" onSubmit={submit}>
                <label>
                  <span>{mode === "register" ? "登录账号" : "账号"}</span>
                  <input name="account" autoComplete="username" required maxLength={254} placeholder={mode === "register" ? "英文账号名或邮箱地址" : "账号名或邮箱地址"} aria-describedby={mode === "register" ? "registration-account-help" : undefined} />
                  {mode === "register" ? <small id="registration-account-help" className="auth-field-help">用于登录，不是玩家昵称。账号名限 4–24 位英文字母、数字或下划线，不支持中文；也可使用邮箱。</small> : null}
                </label>
                <label>
                  <span>密码</span>
                  <input name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} required minLength={8} maxLength={64} placeholder="8–64 个字符" />
                </label>
                {mode === "register" ? (
                  <label>
                    <span>确认密码</span>
                    <input name="passwordConfirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={64} placeholder="再次输入密码" />
                  </label>
                ) : null}

                <p className={`auth-error${error ? " visible" : ""}`} role="alert">{error ?? " "}</p>
                <button className="auth-submit" type="submit" data-sfx="confirm" disabled={pending}>
                  {pending ? "处理中…" : mode === "register" ? "注册并开始故事" : "进入游戏"}
                </button>
              </form>

              <button
                className="auth-mode-switch"
                type="button"
                onClick={() => switchMode(mode === "register" ? "login" : "register")}
              >
                {mode === "register" ? "已有账号？去登录" : "第一次来？创建账号"}
              </button>
              <p className="auth-local-note">登录状态与已解锁剧情会安全保存在俱乐部服务器。</p>
            </section>
          </div>
        ) : null}
      </SceneStage>
    </div>
  );
}
