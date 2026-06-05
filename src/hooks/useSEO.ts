import { useEffect } from "react";

interface SEOOptions {
  title?: string;
  description?: string;
  canonical?: string;
  noIndex?: boolean;
}

/**
 * Hook léger (sans dépendance) — applique title + meta description + canonical + noindex.
 * Pour des cas avancés (OG, JSON-LD), préférer <Helmet> de react-helmet-async.
 */
export function useSEO({ title, description, canonical, noIndex }: SEOOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) document.title = title;

    const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
      return el;
    };

    const created: HTMLElement[] = [];
    if (description) setMeta("description", description);
    if (noIndex) {
      const el = setMeta("robots", "noindex, nofollow");
      created.push(el);
    }
    let canonicalEl: HTMLLinkElement | null = null;
    if (canonical) {
      canonicalEl = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!canonicalEl) {
        canonicalEl = document.createElement("link");
        canonicalEl.setAttribute("rel", "canonical");
        document.head.appendChild(canonicalEl);
        created.push(canonicalEl);
      }
      canonicalEl.setAttribute("href", canonical);
    }

    return () => {
      document.title = prevTitle;
      if (noIndex) {
        const r = document.head.querySelector('meta[name="robots"]');
        if (r) r.remove();
      }
    };
  }, [title, description, canonical, noIndex]);
}

export default useSEO;