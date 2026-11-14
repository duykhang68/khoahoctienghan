# Starlight sidebar schema migration

Incident: #2. Run: 43571072282. Status: candidate fix; verification pending.

Starlight >=0.39 requires explicit labeled groups with an items array. Old shape label + autogenerate + collapsed fails config setup. Use label + collapsed + items: [{ autogenerate: { directory } }].

Regression: scripts/check-content.mjs rejects legacy group shape; full Astro build exercises schema.

References: https://starlight.astro.build/guides/sidebar/ ; https://astro.build/blog/starlight-039/
