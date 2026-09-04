import { describe, expect, it } from "vitest";
import { availableMascotOptions, isMascotId, mascotGreetingForManager, mascotOptions, sayaMascot } from "./founderMascotData";

describe("mascot data", () => {
  it("supports the three founders and every six-star character", () => {
    expect(sayaMascot).toMatchObject({ anchorId: "founder_left", characterId: "founder_sakura_link_4", name: "纱夜" });
    expect(mascotOptions).toHaveLength(11);
    expect(new Set(mascotOptions.map((mascot) => mascot.anchorId)).size).toBe(11);
    expect(new Set(mascotOptions.map((mascot) => mascot.characterId)).size).toBe(11);
    expect(mascotOptions.filter((mascot) => mascot.anchorId.startsWith("six_star_"))).toHaveLength(8);
    expect(mascotOptions.every((mascot) => mascot.greeting.length > 0)).toBe(true);
  });

  it("accepts only registered mascot ids", () => {
    expect(isMascotId("founder_left")).toBe(true);
    expect(isMascotId("six_star_silver_sofia_acosta")).toBe(true);
    expect(isMascotId("founder_unknown")).toBe(false);
  });

  it("adds only owned six-star characters to the founder rotation", () => {
    const available = availableMascotOptions({ silver_sofia_acosta: 1, fog_harriet_wren: 0 });
    expect(available.map((mascot) => mascot.anchorId)).toEqual([
      "founder_left",
      "founder_center",
      "founder_right",
      "six_star_silver_sofia_acosta",
    ]);
  });

  it("addresses the manager by nickname without duplicating the title", () => {
    expect(mascotGreetingForManager("经理，准备开始吧。", "123")).toBe("123经理，准备开始吧。");
    expect(mascotGreetingForManager("经理，准备开始吧。", "测试经理")).toBe("测试经理，准备开始吧。");
  });

  it("keeps every mascot's own dialogue instead of a shared stage line", () => {
    const greetings = mascotOptions.map((mascot) => mascotGreetingForManager(mascot.greeting, "测试"));
    expect(new Set(greetings).size).toBe(mascotOptions.length);
    expect(greetings.every((greeting) => greeting.includes("测试经理"))).toBe(true);
  });
});
