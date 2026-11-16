#!/usr/bin/env python3
"""GitHub Pages SEO Standard v1.0 — artifact gate (Python 3 standard library).

Public sites only. Build-derived canonical HTTPS URLs, same origin/project prefix,
UTF-8 Sitemap 0.9, max 50,000 URLs and 50 MiB per XML file. Exclude noindex,
redirect aliases, protected/admin and non-public data. Generate a TXT fallback
from the exact validated URL set. Preserve the native generator and permalink
structure. robots.txt is effective at HOST ROOT only; a project robots.txt is
informational. Never use robots/noindex as access control. Keep verification
tokens and existing exact-SHA release rules. No scheduled workflow, dependencies
or automatic Search Console submission. Google may still decline to index.
References:
https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
https://developers.google.com/crawling/docs/robots-txt/create-robots-txt
"""
import argparse
from html.parser import HTMLParser
from pathlib import Path
import os
import sys
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree as ET

NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
LIMIT = 50 * 1024 * 1024
ET.register_namespace("", NS[1:-1])

class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonical = []
        self.noindex = False
        self.redirect = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "link" and "canonical" in (a.get("rel") or "").lower().split():
            self.canonical.append(a.get("href") or "")
        if tag == "meta":
            name = (a.get("name") or "").lower()
            value = (a.get("content") or "").lower()
            if name in ("robots", "googlebot") and any(x in value.replace(",", " ").split() for x in ("noindex", "none")):
                self.noindex = True
            if (a.get("http-equiv") or "").lower() == "refresh":
                self.redirect = True

def require(ok, message):
    if not ok:
        raise ValueError(message)

def run(root, site, excluded, filter_entries):
    root = root.resolve()
    prefix = urlsplit(site)
    require(prefix.scheme == "https" and prefix.netloc and prefix.path.endswith("/") and not prefix.query and not prefix.fragment, "Invalid public site base")
    def local(url):
        u = urlsplit(url)
        require(u.scheme == "https" and u.netloc == prefix.netloc and u.path.startswith(prefix.path) and not u.query and not u.fragment and not u.username, "URL outside canonical project: " + url)
        rel = unquote(u.path[len(prefix.path):])
        require(not any(x in (".", "..") for x in rel.split("/")) and "\\" not in rel, "Unsafe URL: " + url)
        f = (root / rel).resolve()
        require(f.is_relative_to(root), "URL escapes export: " + url)
        return f, rel
    primary = root / ("sitemap-index.xml" if (root / "sitemap-index.xml").is_file() else "sitemap.xml")
    require(primary.is_file(), "Missing sitemap.xml or sitemap-index.xml in export")
    seen, visited, removed = set(), set(), []
    pending = {}
    missing_canonical = []
    def visit(file):
        require(file not in visited, "Repeated/cyclic sitemap: " + str(file))
        visited.add(file)
        data = file.read_bytes()
        require(0 < len(data) <= LIMIT, "Invalid sitemap byte size: " + str(file))
        raw = data.decode("utf-8-sig")
        require("<!DOCTYPE" not in raw.upper() and "<!ENTITY" not in raw.upper(), "DTD/entities forbidden")
        tree = ET.fromstring(raw)
        require(tree.tag in (NS+"urlset", NS+"sitemapindex"), "Invalid sitemap root/namespace")
        index = tree.tag == NS+"sitemapindex"
        entries = list(tree)
        require(0 < len(entries) <= 50000, "Empty or oversized sitemap: " + str(file))
        for entry in entries:
            require(entry.tag == NS+("sitemap" if index else "url"), "Unexpected sitemap entry")
            locs = entry.findall(NS+"loc")
            require(len(locs) == 1 and bool(locs[0].text), "Missing or repeated loc")
            url = locs[0].text
            require(url == url.strip() and not any(c.isspace() for c in url), "Whitespace in loc")
            dest, rel = local(url)
            if index:
                require(dest.is_file() and dest.suffix == ".xml", "Missing child sitemap: " + url)
                visit(dest)
                continue
            blocked = any(rel.rstrip("/") == x or rel.startswith(x+"/") for x in excluded)
            if not blocked:
                if dest.is_dir():
                    dest /= "index.html"
                require(dest.is_file() and dest.suffix.lower() == ".html", "Missing exported HTML: " + url)
                meta = Metadata()
                meta.feed(dest.read_text(encoding="utf-8"))
                blocked = meta.noindex or meta.redirect
                if not blocked:
                    if not meta.canonical:
                        missing_canonical.append(url)
                    else:
                        require(meta.canonical == [url], "Canonical mismatch: " + url + " -> " + repr(meta.canonical))
            if blocked:
                require(filter_entries, "Non-indexable route in sitemap: " + url)
                tree.remove(entry)
                removed.append(url)
                continue
            require(url not in seen, "Duplicate URL: " + url)
            seen.add(url)
        require(len(tree) > 0, "Sitemap became empty: " + str(file))
        if len(tree) != len(entries):
            pending[file] = ET.tostring(tree, encoding="utf-8", xml_declaration=True)
    visit(primary)
    require(site in seen, "Homepage missing from sitemap: " + site)
    for file, data in pending.items():
        file.write_bytes(data)
    if primary.name == "sitemap-index.xml":
        alias = root / "sitemap.xml"
        require(not alias.exists() or alias.read_bytes() == primary.read_bytes(), "Conflicting sitemap.xml; review before replacing")
        alias.write_bytes(primary.read_bytes())
    text = "\n".join(sorted(seen)) + "\n"
    require(len(seen) <= 50000 and len(text.encode("utf-8")) <= LIMIT, "TXT fallback requires splitting")
    (root / "sitemap.txt").write_text(text, encoding="utf-8")
    print(f"SEO_ARTIFACT_OK: {len(seen)} URLs; {len(removed)} excluded; {len(visited)} XML files")
    for url in removed:
        print("Excluded non-indexable:", url)
    if missing_canonical:
        print(f"SEO WARNING: {len(missing_canonical)} pages lack explicit canonical; repair in follow-up", file=sys.stderr)
        for url in missing_canonical[:10]:
            print(url, file=sys.stderr)

if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--site", required=True)
    p.add_argument("--exclude", action="append", default=[])
    p.add_argument("--filter", action="store_true", help="Filter explicitly excluded/noindex/redirect entries in native Astro sitemap")
    args = p.parse_args()
    try:
        run(args.out, args.site, [x.strip("/") for x in args.exclude], args.filter)
    except (ValueError, OSError, ET.ParseError) as exc:
        sys.exit("SEO_ARTIFACT_FAILED: " + str(exc))
