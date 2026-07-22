(function exposeVersionCheck(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DurakVersion = api;

  if (typeof document === "undefined") return;
  const script = document.currentScript;
  const currentVersion = api.normalizeVersion(script?.dataset.version || "0.0.0");
  const badge = document.getElementById("versionBadge");
  const notice = document.getElementById("updateNotice");
  const latestLabel = document.getElementById("latestVersion");
  if (badge) badge.textContent = `Versiunea v${currentVersion}`;

  fetch(`version.json?check=${Date.now()}`, { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Versiunea nu a putut fi verificată.");
      return response.json();
    })
    .then(release => {
      const latestVersion = api.normalizeVersion(release.version);
      if (!notice || !api.isVersionNewer(latestVersion, currentVersion)) return;
      if (latestLabel) latestLabel.textContent = `v${latestVersion}`;
      notice.hidden = false;
      notice.title = release.notes || `Actualizează la versiunea v${latestVersion}`;
      notice.onclick = () => {
        const url = new URL(root.location.href);
        url.searchParams.set("update", latestVersion);
        root.location.assign(url.toString());
      };
    })
    .catch(() => {});
})(typeof window !== "undefined" ? window : globalThis, function createVersionCheck() {
  function normalizeVersion(version) {
    return String(version || "0.0.0").trim().replace(/^v/i, "");
  }

  function versionParts(version) {
    return normalizeVersion(version).split(".").map(part => Number.parseInt(part, 10) || 0);
  }

  function isVersionNewer(latest, current) {
    const next = versionParts(latest);
    const installed = versionParts(current);
    const length = Math.max(next.length, installed.length);
    for (let index = 0; index < length; index += 1) {
      if ((next[index] || 0) > (installed[index] || 0)) return true;
      if ((next[index] || 0) < (installed[index] || 0)) return false;
    }
    return false;
  }

  return { normalizeVersion, isVersionNewer };
});
