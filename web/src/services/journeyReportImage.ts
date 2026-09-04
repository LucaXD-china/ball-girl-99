export type JourneyReportMatch = {
  day: number | string;
  stage: string;
  opponent: string;
  score: string;
  detail?: string;
  outcome: "win" | "draw" | "loss";
};

export type JourneyReportData = {
  clubName: string;
  managerNickname: string;
  outcome: "champion" | "eliminated";
  score: number;
  evaluation: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  squadStrength: number;
  averageStars: number;
  averageOverall: number;
  mvp?: {
    name: string;
    averageRating: number;
    appearances: number;
    goals: number;
    assists: number;
  };
  fixtures: JourneyReportMatch[];
};

/** Remove characters that are invalid in a filename and bound the length. */
export function sanitizeFilenamePart(value: string): string {
  return value
    .replace(/[\\/:*?"<>|#%&{}$!'@+`=]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40) || "征程报告";
}

export function buildJourneyReportFilename(clubName: string, now = new Date()): string {
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  return `${sanitizeFilenamePart(clubName)}-征程报告-${stamp}.png`;
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function fillPanel(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  roundedRect(context, x, y, width, height, 22);
  context.fillStyle = "#fffaf0";
  context.fill();
  context.strokeStyle = "#dbcaa8";
  context.lineWidth = 2;
  context.stroke();
}

function drawCenteredText(context: CanvasRenderingContext2D, text: string, x: number, y: number) {
  context.textAlign = "center";
  context.fillText(text, x, y);
  context.textAlign = "left";
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG 编码失败")), "image/png");
  });
}

/** Render a compact, standalone report from settlement data. It does not inspect the live page. */
export async function journeyReportToPngBlob(report: JourneyReportData): Promise<Blob> {
  await document.fonts?.ready;
  const width = 1200;
  const fixtureRowHeight = 76;
  const height = 900 + Math.max(1, report.fixtures.length) * fixtureRowHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建报告画布");

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#f9f1df");
  background.addColorStop(1, "#e7d7b7");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#183c43";
  context.fillRect(0, 0, width, 18);

  context.fillStyle = "#183c43";
  context.font = "700 24px system-ui, sans-serif";
  context.fillText("BALL GIRL · CHAMPIONS LEAGUE", 72, 78);
  context.font = "800 58px system-ui, sans-serif";
  context.fillText(report.outcome === "champion" ? "冠军征程报告" : "赛事征程报告", 72, 150);
  context.fillStyle = "#5f6e6b";
  context.font = "500 25px system-ui, sans-serif";
  context.fillText([report.managerNickname, report.clubName].filter(Boolean).join(" · "), 75, 196);

  roundedRect(context, 920, 56, 208, 162, 24);
  context.fillStyle = "#183c43";
  context.fill();
  context.fillStyle = "#f4cf70";
  context.font = "800 68px system-ui, sans-serif";
  drawCenteredText(context, String(report.score), 1024, 137);
  context.font = "700 20px system-ui, sans-serif";
  drawCenteredText(context, `${report.evaluation} · 征程评分`, 1024, 181);

  const statY = 270;
  const statWidth = 246;
  const statGap = 24;
  const stats = [
    ["比赛战绩", `${report.wins}胜 ${report.draws}平 ${report.losses}负`],
    ["进失球", `${report.goalsFor} : ${report.goalsAgainst}`],
    ["名单强度", String(report.squadStrength)],
    ["平均能力", `${report.averageStars}★ · ${report.averageOverall}`],
  ];
  stats.forEach(([label, value], index) => {
    const x = 72 + index * (statWidth + statGap);
    fillPanel(context, x, statY, statWidth, 142);
    context.fillStyle = "#7d715e";
    context.font = "600 19px system-ui, sans-serif";
    drawCenteredText(context, label, x + statWidth / 2, statY + 43);
    context.fillStyle = "#183c43";
    context.font = "800 32px system-ui, sans-serif";
    drawCenteredText(context, value, x + statWidth / 2, statY + 96);
  });

  fillPanel(context, 72, 448, 1056, 150);
  context.fillStyle = "#9a6b22";
  context.font = "700 19px system-ui, sans-serif";
  context.fillText("PLAYER OF THE TOURNAMENT", 104, 490);
  context.fillStyle = "#183c43";
  if (report.mvp) {
    context.font = "800 35px system-ui, sans-serif";
    context.fillText(report.mvp.name, 104, 545);
    context.font = "700 25px system-ui, sans-serif";
    context.fillStyle = "#536763";
    context.fillText(`${report.mvp.averageRating.toFixed(1)} 赛事均分`, 510, 530);
    context.font = "500 21px system-ui, sans-serif";
    context.fillText(`${report.mvp.appearances}场 · ${report.mvp.goals}球 · ${report.mvp.assists}助攻`, 510, 564);
  } else {
    context.font = "700 30px system-ui, sans-serif";
    context.fillText("暂无足够比赛数据", 104, 548);
  }

  context.fillStyle = "#183c43";
  context.font = "800 30px system-ui, sans-serif";
  context.fillText("完整征程", 72, 662);
  context.fillStyle = "#7d715e";
  context.font = "600 18px system-ui, sans-serif";
  context.fillText(`${report.matches} MATCHES`, 72, 692);

  const fixtures = report.fixtures.length ? report.fixtures : [{ day: "—", stage: "暂无比赛", opponent: "—", score: "—", outcome: "draw" as const }];
  fixtures.forEach((fixture, index) => {
    const y = 728 + index * fixtureRowHeight;
    context.fillStyle = index % 2 === 0 ? "rgba(255, 250, 240, .88)" : "rgba(245, 236, 218, .88)";
    roundedRect(context, 72, y, 1056, 62, 14);
    context.fill();
    context.fillStyle = fixture.outcome === "win" ? "#27745c" : fixture.outcome === "loss" ? "#a7443e" : "#9a6b22";
    context.fillRect(72, y, 8, 62);
    context.fillStyle = "#7d715e";
    context.font = "700 18px system-ui, sans-serif";
    context.fillText(`DAY ${fixture.day}`, 100, y + 38);
    context.fillStyle = "#183c43";
    context.font = "700 21px system-ui, sans-serif";
    context.fillText(fixture.stage, 230, y + 38);
    context.font = "600 20px system-ui, sans-serif";
    context.fillText(`VS ${fixture.opponent}`, 430, y + 38);
    if (fixture.detail) {
      context.fillStyle = "#7d715e";
      context.font = "500 16px system-ui, sans-serif";
      context.textAlign = "right";
      context.fillText(fixture.detail, 1010, y + 37);
      context.textAlign = "left";
    }
    context.fillStyle = "#183c43";
    context.font = "800 27px system-ui, sans-serif";
    context.textAlign = "right";
    context.fillText(fixture.score, 1098, y + 41);
    context.textAlign = "left";
  });

  context.fillStyle = "#7d715e";
  context.font = "500 17px system-ui, sans-serif";
  drawCenteredText(context, "99日争冠 · 每一次选择都写进这段征程", width / 2, height - 48);
  return canvasToBlob(canvas);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadJourneyReport(report: JourneyReportData): Promise<void> {
  downloadBlob(await journeyReportToPngBlob(report), buildJourneyReportFilename(report.clubName));
}
