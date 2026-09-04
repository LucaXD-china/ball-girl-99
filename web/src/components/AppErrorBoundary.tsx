import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { failed: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("激射！绿茵少女！Web failed to render", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="fatal-error">
          <p className="eyebrow">CLIENT ERROR</p>
          <h1>游戏暂时无法打开</h1>
          <p>请刷新页面；如果问题持续，请保留浏览器控制台中的错误信息。</p>
          <button type="button" onClick={() => window.location.reload()}>
            重新加载
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
