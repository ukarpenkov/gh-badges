import { loadActivity, validUser } from "./activity.js";
import { knownTheme, renderError, renderGallery, renderTheme, themeNames } from "./render.js";

export async function handle(req) {
  const url = new URL(req.url || "/", "http://localhost");
  const route = url.pathname.replace(/\.svg$/, "").replace(/\/+$/, "") || "/";

  if (route === "/" || route === "/api" || route === "/api/badge") {
    const theme = url.searchParams.get("theme");
    if (!theme) return html(renderGallery(origin(req, url), url.searchParams.get("user") || ""));
    return svgResponse(theme, url.searchParams.get("user") || "");
  }

  const theme = route.slice(1);
  if (!knownTheme(theme)) {
    return {
      status: 404,
      headers: { "Content-Type": "image/svg+xml; charset=utf-8" },
      body: renderError("Unknown theme"),
    };
  }
  return svgResponse(theme, url.searchParams.get("user") || "");
}

async function svgResponse(theme, login) {
  if (!knownTheme(theme)) {
    return { status: 404, headers: svgHeaders(60), body: renderError("Unknown theme") };
  }
  if (!validUser(login)) {
    const hint = themeNames().includes(theme) ? "Add ?user=github-login" : "Add ?user=github-login";
    return { status: 200, headers: svgHeaders(300), body: renderError(hint) };
  }
  try {
    const activity = await loadActivity(login);
    return { status: 200, headers: svgHeaders(3600), body: renderTheme(theme, activity) };
  } catch (error) {
    const missing = error.code === "NOT_FOUND";
    return {
      status: 200,
      headers: svgHeaders(missing ? 600 : 60),
      body: renderError(missing ? "GitHub user not found" : "GitHub activity unavailable"),
    };
  }
}

function svgHeaders(seconds) {
  return {
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": `public, max-age=${seconds}, s-maxage=${seconds}`,
  };
}

function html(body) {
  return {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    body,
  };
}

function origin(req, url) {
  const proto = req.headers?.["x-forwarded-proto"] || "http";
  const host = req.headers?.["x-forwarded-host"] || req.headers?.host;
  if (host) return `${proto}://${host}`;
  return url.origin;
}
