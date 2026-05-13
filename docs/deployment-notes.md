# Deployment notes

## 2026-05-13 — directory works import/export and AI search rollout

- Issue #69 was merged via PR #76: directory works import/export staging flow.
- Issue #70 was merged via PR #78: directory works embeddings and backend-first AI/hybrid search.
- Follow-up hotfix `484adee96a90bd508fce68341f75a29358d3dc90` preserves the import row action literal type for production TypeScript builds.
- Follow-up hotfix `69beac27c4a94a857370fcd985f24a399f66cfc0` converts XLSX export buffers to Web-compatible response bodies for Next.js production builds.

This file is documentation-only and does not affect runtime behavior.
