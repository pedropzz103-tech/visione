# Development instructions

- Preserve unrelated VISIONE sites and products. Onde Abastecer lives in `onde-abastecer/`; only its two workflows may change for this work.
- Continue the existing Expo/React Native app and Cloudflare Worker. Do not replace the product with a demo or unrelated website.
- Never present fixtures, generated prices or unverified country coverage as real. Missing configuration must produce an explicit error.
- Public accessibility is not a reuse licence. Record source, terms, attribution, update cadence and verification evidence in `onde-abastecer/COUNTRY_COVERAGE.md`. Portugal requires specific review.
- Never commit credentials, location traces, local caches, node_modules, build output or .env files. Public Expo environment variables are not secret storage.
- No paid services, required OpenAI API, production deployment, store publication, merge or force push without explicit authorization.
- Use small commits on a feature branch. Preserve historical PR #23 and current main changes.
- From `onde-abastecer`, run `npm ci`, then `npm run install:apps`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. See README for native validation limits.
- Tests must use explicit synthetic fixtures and injected HTTP responses, not depend on public feeds. Verify source availability separately with the opt-in smoke script.
- For savings, require comparable currency/unit/fuel, known reference and additional road distance. Never use straight-line distance to claim positive net savings.
- Keep planned grocery/charging categories independent and disabled until lawful, verified data exists.
