# Reference repositories reviewed by the founder's adviser

Repositories the founder sent for review. Each entry gives the URL, the date it was read, the licence, the verdict and what it may be used for. "Reference only" means the repository is used for ideas, not as code in the product. Any code taken later needs its own licence check (D24) and a PR that records it in `docs/product/LICENSES.md`.

## awesome-llm-apps

- **URL:** https://github.com/Shubhamsaboo/awesome-llm-apps
- **Read:** 2026-10-27, shallow clone of the default branch.
- **Licence:** Apache-2.0 at the root. At least 8 subfolders carry their own LICENSE file (in `generative_ui_agents/`), so each folder is checked on its own before any reuse.
- **What it is:** a collection of tutorial and demo apps: agents, RAG, voice agents, MCP agents and agent skills. Most of them are Streamlit demos (113 `requirements.txt` files list streamlit) that call cloud model APIs directly (OpenAI, Gemini, Anthropic, agno).
- **Verdict: reference only, not adopted.** The apps send audio and text straight to cloud providers, which conflicts with D25 (all model traffic goes through OmniRoute, and no provider may train on driver data) and with on-device speech (Sherpa-ONNX). Courier Voice, the D8 address engine and the PyVRP solver already cover these needs more specifically.
- **Ideas worth reading later:**
  - `agent_skills/evals`, for the Courier Voice eval runs (audit A3);
  - `always_on_agents`, for an ops briefing agent (MASTER §17.5, Courier Ops);
  - the hybrid-search RAG examples, for business-name search in the address squad (audit C3).

## google-maps-scraper

- **URL:** https://github.com/gosom/google-maps-scraper
- **Read:** 2026-10-27, shallow clone of the default branch.
- **Licence:** MIT for the code.
- **What it is:** a scraper that extracts business listings, phones, emails, reviews and coordinates from Google Maps, for lead generation.
- **Verdict: not used, in any form.** The MIT licence covers the scraper's code, not Google's data.
  - Scraping Google Maps breaches Google's Terms of Service and the Google Maps Platform terms, which forbid scraping or bulk export of Google Maps content.
  - The data would also carry personal details (phones, emails, reviews) without a lawful basis under the NZ Privacy Act 2020.
  - Using it would put the company's Google accounts (Play, Cloud, OAuth) and the product at risk.
- **The lawful paths for the same need (audit C3):**
  - LINZ first;
  - OpenStreetMap, under its ODbL attribution;
  - the driver's own corrections;
  - the official Google Places API, used only under its terms (a Google map surface or no map, and the 30-day coordinate cache).
