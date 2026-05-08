import { GITHUB_REPO } from "../version";

type GitHubReleaseAsset = {
  name: string;
  browser_download_url: string;
};

type GitHubRelease = {
  tag_name: string;
  html_url: string;
  assets?: GitHubReleaseAsset[];
};

export type UpdateInfo = {
  version: string;
  tagName: string;
  pageUrl: string;
  apkUrl: string;
};

const GITHUB_RELEASE_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

function normalizeVersion(value: string) {
  return value.trim().replace(/^v/i, "").split(/[+-]/)[0];
}

function compareVersions(left: string, right: string) {
  const leftParts = normalizeVersion(left).split(".").map((part) => Number(part) || 0);
  const rightParts = normalizeVersion(right).split(".").map((part) => Number(part) || 0);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;
    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
}

function buildUpdateInfo(release: GitHubRelease): UpdateInfo | null {
  const version = normalizeVersion(release.tag_name);
  const apk = release.assets?.find((asset) => asset.name.toLowerCase().endsWith(".apk"));
  if (!version || !apk) return null;

  return {
    version,
    tagName: release.tag_name,
    pageUrl: release.html_url,
    apkUrl: apk.browser_download_url,
  };
}

export async function checkLatestRelease(currentVersion: string): Promise<UpdateInfo | null> {
  const response = await fetch(GITHUB_RELEASE_API, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!response.ok) {
    throw new Error(`GitHub Release request failed: ${response.status}`);
  }

  const release = (await response.json()) as GitHubRelease;
  const update = buildUpdateInfo(release);
  if (!update || compareVersions(update.version, currentVersion) <= 0) return null;

  return update;
}
