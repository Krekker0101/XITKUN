const githubOwner = "AbdullohAshurov";
const githubRepo = "abdulloh-ashurov-assistant";
const githubBaseUrl = `https://github.com/${githubOwner}/${githubRepo}`;
const portfolioUrl = "https://tajik-develop.yzz.me";

export const BRAND = {
  appName: "XITKUN",
  shortAppName: "XITKUN",
  ownerName: "Abdulloh Ashurov",
  tagline: "Private, local-first AI copilot for meetings, interviews, and focused work.",
  description:
    "A polished desktop AI assistant for live conversations, on-device context, and private workflows.",
  repositoryOwner: githubOwner,
  repositoryName: githubRepo,
  repositoryUrl: portfolioUrl,
  issuesUrl: "",
  releasesUrl: `${githubBaseUrl}/releases`,
  websiteUrl: portfolioUrl,
  supportUrl: "",
  contactEmail: "",
  xUrl: "",
  linkedinUrl: "",
  instagramUrl: "",
  releaseAssetBaseName: "XITKUN",
} as const;

export const hasConfiguredLink = (url?: string | null): url is string =>
  typeof url === "string" && url.trim().length > 0;

export const getBrandContactHref = () =>
  hasConfiguredLink(BRAND.contactEmail) ? `mailto:${BRAND.contactEmail}` : "";

export const getReleaseDownloadUrl = (
  version: string,
  arch: "arm64" | "x64"
) => {
  const normalizedVersion = version.replace(/^v/, "");
  return `${BRAND.releasesUrl}/download/v${normalizedVersion}/${BRAND.releaseAssetBaseName}-${normalizedVersion}-${arch}.dmg`;
};
