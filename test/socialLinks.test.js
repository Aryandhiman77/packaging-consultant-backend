import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSocialLinks } from "../src/utils/socialLinks.js";
import { ValidationError } from "../src/utils/navigation.js";

test("normalizes all supported social media links", () => {
  assert.deepEqual(
    normalizeSocialLinks({
      x: " https://x.com/packaging ",
      facebook: " https://facebook.com/packaging ",
      youtube: " https://youtube.com/@packaging ",
      linkedin: " https://linkedin.com/company/packaging ",
    }),
    {
      x: "https://x.com/packaging",
      facebook: "https://facebook.com/packaging",
      youtube: "https://youtube.com/@packaging",
      linkedin: "https://linkedin.com/company/packaging",
    },
  );
});

test("rejects missing social media links", () => {
  assert.throws(
    () => normalizeSocialLinks({ x: "#x" }),
    ValidationError,
  );
});

test("rejects unsafe social media link protocols", () => {
  assert.throws(
    () => normalizeSocialLinks({
      x: "javascript:alert(1)",
      facebook: "https://facebook.com/packaging",
      youtube: "https://youtube.com/@packaging",
      linkedin: "https://linkedin.com/company/packaging",
    }),
    ValidationError,
  );
});
