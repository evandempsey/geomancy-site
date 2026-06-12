/**
 * Rehype plugin: prefix root-relative links in Markdown/MDX prose with the
 * site's base path, so authors can keep writing `/course/...` while the built
 * pages link to `/geomancy-site/course/...`. The .astro templates do the same
 * job via withBase(); this covers the parts of the site written as prose.
 *
 * Hand-rolled hast walk to avoid a unist-util-visit dependency.
 *
 * @param {{ base?: string }} [options]
 */
export function rehypeBaseLinks(options = {}) {
  const base = (options.base ?? '/').replace(/\/$/, '');
  const attrs = { a: 'href', area: 'href', img: 'src', source: 'src' };

  /** A path we should rewrite: root-relative, not protocol-relative, not already based. */
  const rewritable = (value) =>
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !(base && (value === base || value.startsWith(base + '/')));

  /** @param {any} node */
  const walk = (node) => {
    if (node.type === 'element') {
      const attr = attrs[node.tagName];
      if (attr && node.properties && rewritable(node.properties[attr])) {
        node.properties[attr] = base + node.properties[attr];
      }
    }
    if (node.children) for (const child of node.children) walk(child);
  };

  return (tree) => {
    walk(tree);
  };
}
