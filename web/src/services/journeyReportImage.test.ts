import { describe, expect, it } from "vitest";
import { buildJourneyReportFilename, sanitizeFilenamePart } from "./journeyReportImage";

describe("sanitizeFilenamePart", () => {
  it("removes characters that are invalid in filenames", () => {
    expect(sanitizeFilenamePart('北港 / 晴空:*?"<>|')).toBe("北港-晴空");
  });

  it("falls back when nothing remains", () => {
    expect(sanitizeFilenamePart("///")).toBe("征程报告");
  });
});

describe("buildJourneyReportFilename", () => {
  it("produces a dated PNG filename", () => {
    expect(buildJourneyReportFilename("北港晴空", new Date(2026, 7, 22))).toBe("北港晴空-征程报告-20260822.png");
  });
});
