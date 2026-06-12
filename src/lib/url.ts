/**
 * Prefix an app-absolute path with the configured base path so links resolve
 * under the deployment subpath (e.g. '/course/' → '/geomancy-site/course/').
 *
 * `import.meta.env.BASE_URL` is Astro's configured `base`, always with a
 * trailing slash ('/geomancy-site/'), and is available in .astro, .ts and
 * client <script> modules alike. Pass app-absolute paths (leading '/'); pass
 * external URLs and in-page anchors through unchanged at the call site.
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return base + (path.startsWith('/') ? path : '/' + path);
}
