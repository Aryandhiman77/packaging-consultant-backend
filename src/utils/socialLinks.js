import { defaultSocialLinks } from "../data/defaultSocialLinks.js";
import { ValidationError } from "./navigation.js";

const platforms = Object.keys(defaultSocialLinks);

export function normalizeSocialLinks(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("socialLinks must be an object");
  }

  return platforms.reduce((links, platform) => {
    const link = typeof value[platform] === "string" ? value[platform].trim() : "";

    if (!link) {
      throw new ValidationError(`socialLinks.${platform} is required`);
    }

    if (link.length > 2048) {
      throw new ValidationError(`socialLinks.${platform} is too long`);
    }

    if (!link.startsWith("#")) {
      let url;
      try {
        url = new URL(link);
      } catch {
        throw new ValidationError(
          `socialLinks.${platform} must be a valid http(s) URL`,
        );
      }

      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new ValidationError(
          `socialLinks.${platform} must be a valid http(s) URL`,
        );
      }
    }

    links[platform] = link;
    return links;
  }, {});
}
