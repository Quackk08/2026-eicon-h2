import { describe, expect, it } from "vitest";
import { looksDirectionless, mentionsDistress } from "./direction.js";

describe("looksDirectionless", () => {
  it("recognises someone saying they have no direction", () => {
    const directionless = [
      "I don't know what I want",
      "I really dont know what to do",
      "No idea",
      "no goal in particular",
      "Not sure what I am aiming for",
      "nothing specific",
      "잘 모르겠어",
      "목적이 없어",
      "하고 싶은 게 없어",
      "그냥",
      ""
    ];
    for (const text of directionless) {
      expect(looksDirectionless(text), text).toBe(true);
    }
  });

  it("leaves a stated direction alone", () => {
    const stated = [
      "A life of studying calmly in cafes and libraries",
      "I want to get back into drawing every week",
      "커피를 내리며 아침을 시작하는 삶",
      "저녁마다 동네를 걷는 사람이 되고 싶어요",
      "Cook simple meals at home instead of ordering in"
    ];
    for (const text of stated) {
      expect(looksDirectionless(text), text).toBe(false);
    }
  });

  it("does not treat distress as directionlessness", () => {
    // These need the Support path, not a starter ladder — answering them
    // with five orienting steps would talk past what was said.
    const distress = ["I feel hopeless about everything", "I want to disappear", "죽고 싶어"];
    for (const text of distress) {
      expect(mentionsDistress(text), text).toBe(true);
      expect(looksDirectionless(text), text).toBe(false);
    }
  });
});
