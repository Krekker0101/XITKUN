const githubOwner = "AbdullohAshurov";
const githubRepo = "abdulloh-ashurov-assistant";
const githubBaseUrl = `https://github.com/${githubOwner}/${githubRepo}`;

export const BRAND = {
  appName: "Abdulloh Ashurov Assistant",
  shortAppName: "Ashurov Assistant",
  ownerName: "Abdulloh Ashurov",
  tagline: "Private, local-first AI copilot for meetings, interviews, and focused work.",
  description:
    "A polished desktop AI assistant for live conversations, on-device context, and private workflows.",
  repositoryOwner: githubOwner,
  repositoryName: githubRepo,
  repositoryUrl: githubBaseUrl,
  issuesUrl: `${githubBaseUrl}/issues`,
  releasesUrl: `${githubBaseUrl}/releases`,
  websiteUrl: "",
  supportUrl: "",
  contactEmail: "",
  xUrl: "",
  linkedinUrl: "",
  instagramUrl: "",
  releaseAssetBaseName: "Abdulloh-Ashurov-Assistant",
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
