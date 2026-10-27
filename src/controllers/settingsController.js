import mongoose from "mongoose";
import { defaultTopNavigation } from "../data/defaultNavigation.js";
import { defaultSocialLinks } from "../data/defaultSocialLinks.js";
import { Settings } from "../models/Settings.js";
import { normalizeTopNavigation } from "../utils/navigation.js";
import { normalizeSocialLinks } from "../utils/socialLinks.js";

const navigationPreset = "packaging-services-pdf-v5-project-pages";
const legacyArtTemplatesPdfLink =
  "/assets/templates/art-templates-choose-your-structure.pdf";
const artTemplatesLink = {
  label: "Art Templates",
  link: "/packaging-services/art-templates",
};
const industryRoutes = new Map([
  ["food & beverage", "/industries/food-beverage"],
  ["coffee and tea", "/industries/coffee-tea"],
  ["bakery and snacks", "/industries/bakery-snacks"],
  ["confections and candy", "/industries/confections-candy"],
  ["pet food and treats", "/industries/pet-food"],
  ["vitamins and supplements", "/industries/vitamins-supplements"],
  ["health and beauty", "/industries/health-beauty"],
  ["household products", "/industries/household-products"],
  ["other product category", "/industries/other-products"],
]);
const projectRoutes = new Map([
  ["packaging starts here", "/projects/packaging-starts-here"],
  ["have product - no packaging", "/projects/product-no-packaging"],
  ["have packaging and product", "/projects/packaging-and-product"],
  ["redesign maintaining brand", "/projects/redesign-maintaining-brand"],
  ["sourcing and manufacturing", "/projects/sourcing-manufacturing"],
  ["packaging problems or issues", "/projects/packaging-problems"],
  ["cost, supply and quality", "/projects/cost-supply-quality"],
]);
const projectReviewRoutes = new Map([
  ["starting point", "/project-review/starting-point"],
  ["product & marketplace", "/project-review/product-marketplace"],
  ["protection & function", "/project-review/protection-function"],
  ["size, structure & design", "/project-review/size-structure-design"],
  ["manufacturing & supply", "/project-review/manufacturing-supply"],
  ["upload files & timing", "/project-review/upload-files-timing"],
  ["contact & submission", "/project-review/contact-submission"],
]);

async function getOrCreateSiteSettings() {
  const existing = await Settings.findOne({ key: "site" });
  if (existing?.navigationPreset === navigationPreset) return existing;

  if (existing) {
    const packagingServices = existing.topNavigation.find(
      (item) =>
        item.label.trim().toLowerCase() === "packaging services" ||
        item.children.some((child) =>
          child.link.startsWith("/packaging-services/"),
        ),
    );

    if (packagingServices) {
      const existingArtTemplates = packagingServices.children.find(
        (child) =>
          child.link === artTemplatesLink.link ||
          child.link === legacyArtTemplatesPdfLink ||
          child.label.trim().toLowerCase() === "art templates",
      );

      if (existingArtTemplates?.link === legacyArtTemplatesPdfLink) {
        existingArtTemplates.label = artTemplatesLink.label;
        existingArtTemplates.link = artTemplatesLink.link;
      } else if (!existingArtTemplates) {
        packagingServices.children.push(artTemplatesLink);
      }
    }

    const industries = existing.topNavigation.find(
      (item) =>
        item.label.trim().toLowerCase() === "industries" ||
        item.children.some((child) =>
          industryRoutes.has(child.label.trim().toLowerCase()),
        ),
    );

    if (industries) {
      industries.children.forEach((child) => {
        const route = industryRoutes.get(child.label.trim().toLowerCase());
        if (route) child.link = route;
      });
    }

    const projects = existing.topNavigation.find(
      (item) =>
        item.label.trim().toLowerCase() === "projects" ||
        item.children.some((child) =>
          projectRoutes.has(child.label.trim().toLowerCase()),
        ),
    );
    if (projects) {
      projects.children.forEach((child) => {
        const route = projectRoutes.get(child.label.trim().toLowerCase());
        if (route) child.link = route;
      });
    }

    const projectReview = existing.topNavigation.find(
      (item) =>
        item.label.trim().toLowerCase() === "project review" ||
        item.children.some((child) =>
          projectReviewRoutes.has(child.label.trim().toLowerCase()),
        ),
    );
    if (projectReview) {
      projectReview.children.forEach((child) => {
        const route = projectReviewRoutes.get(child.label.trim().toLowerCase());
        if (route) child.link = route;
      });
    }

    existing.navigationPreset = navigationPreset;
    return existing.save();
  }

  return Settings.findOneAndUpdate(
    { key: "site" },
    {
      $set: { navigationPreset, topNavigation: defaultTopNavigation },
      $setOnInsert: { key: "site", socialLinks: defaultSocialLinks },
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
}

function assertObjectId(id) {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Invalid settings id");
    error.status = 400;
    throw error;
  }
}

export async function getPublicNavigation(_request, response) {
  const settings = await getOrCreateSiteSettings();
  response.json({
    topNavigation: settings.topNavigation,
    socialLinks: settings.socialLinks,
    updatedAt: settings.updatedAt,
  });
}

export async function listSettings(_request, response) {
  const settings = await Settings.find().sort({ createdAt: 1 });
  response.json({ data: settings });
}

export async function getCurrentSettings(_request, response) {
  const settings = await getOrCreateSiteSettings();
  response.json({ data: settings });
}

export async function createSettings(request, response) {
  const key =
    typeof request.body.key === "string" && request.body.key.trim()
      ? request.body.key.trim()
      : "site";
  const topNavigation = normalizeTopNavigation(
    request.body.topNavigation ?? [],
  );
  const socialLinks = normalizeSocialLinks(
    request.body.socialLinks ?? defaultSocialLinks,
  );
  const settings = await Settings.create({ key, topNavigation, socialLinks });
  response.status(201).json({ data: settings });
}

export async function updateCurrentSettings(request, response) {
  const update = {};
  if (request.body.topNavigation !== undefined) {
    update.topNavigation = normalizeTopNavigation(request.body.topNavigation);
  }
  if (request.body.socialLinks !== undefined) {
    update.socialLinks = normalizeSocialLinks(request.body.socialLinks);
  }

  const settings = await Settings.findOneAndUpdate(
    { key: "site" },
    {
      $set: update,
      $setOnInsert: {
        key: "site",
        ...(update.topNavigation ? {} : { topNavigation: defaultTopNavigation }),
        ...(update.socialLinks ? {} : { socialLinks: defaultSocialLinks }),
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
  response.json({ data: settings });
}

export async function getSettingsById(request, response) {
  assertObjectId(request.params.id);
  const settings = await Settings.findById(request.params.id);
  if (!settings)
    return response.status(404).json({ message: "Settings not found" });
  return response.json({ data: settings });
}

export async function updateSettingsById(request, response) {
  assertObjectId(request.params.id);
  const update = {};
  if (request.body.key !== undefined)
    update.key = String(request.body.key).trim();
  if (request.body.topNavigation !== undefined) {
    update.topNavigation = normalizeTopNavigation(request.body.topNavigation);
  }
  if (request.body.socialLinks !== undefined) {
    update.socialLinks = normalizeSocialLinks(request.body.socialLinks);
  }

  const settings = await Settings.findByIdAndUpdate(
    request.params.id,
    { $set: update },
    { returnDocument: "after", runValidators: true },
  );
  if (!settings)
    return response.status(404).json({ message: "Settings not found" });
  return response.json({ data: settings });
}

export async function deleteSettingsById(request, response) {
  assertObjectId(request.params.id);
  const settings = await Settings.findByIdAndDelete(request.params.id);
  if (!settings)
    return response.status(404).json({ message: "Settings not found" });
  return response.status(204).send();
}
