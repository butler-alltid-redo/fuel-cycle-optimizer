# Fuel-cycle optimizer (feed & SWU) – plan

## Scope and goal
Build a small, self-contained website (static HTML/JS/CSS) that lets a user **play with enrichment/fuel-cycle front-end parameters** and immediately see how choices affect:

- **Feed requirement** (kgU feed)
- **Product** (kgU enriched uranium)
- **Tails** (kgU tails)
- **SWU requirement** (separative work units)
- **Cost** and the **optimal tails assay** (“medelanrikningsoptimering”)

Primary learning outcome: develop intuition for the classic trade-off:

- lower tails assay → **more SWU**, **less feed**
- higher tails assay → **less SWU**, **more feed**

## Constraints / confidentiality
- Use *generic* nuclear fuel-cycle formulas and toy numbers.
- Do **not** embed the provided PDF in the site.
- Avoid copying slide text verbatim; instead implement the underlying concepts.

## What I could extract from the notes (from your message)
- Front-end cost components and rough shares:
  - **U**: natural uranium (U3O8 / “yellow cake”) ~40–45%
  - **K**: conversion (U3O8 → UF6 feed) ~5%
  - **A**: enrichment ~25–30%
  - **T**: fabrication ~15–20%
- Mention of recycling/reprocessing path (repU + Pu/MOX) and that back-end has fixed+variable system costs.

For this first iteration we focus on **front-end** and specifically **U (feed price) + A (SWU price)** optimization, because that’s where the tails/SWU/feed trade is most direct.

## Core model (math we implement)
We model enrichment as a 3-stream mass balance with assays:

- Feed assay: **xf** (e.g. 0.00711 for natural U)
- Product assay: **xp** (e.g. 0.03–0.05 for LWR fuel)
- Tails assay: **xt** (variable; what we optimize)

Given a product mass **P** (kgU), the required feed **F** and tails **W** are:

- **F = P * (xp - xt) / (xf - xt)**
- **W = F - P**

SWU formula (standard):

- **SWU = P*V(xp) + W*V(xt) − F*V(xf)**

where the value function is:

- **V(x) = (1 − 2x) * ln((1 − x)/x)**

### Cost model
Let:
- **CU** = feed cost (e.g. $/kgU as UF6 equivalent)
- **CSWU** = enrichment cost ($/SWU)
- Optional: conversion **CK** ($/kgU feed) as an add-on

Then total front-end cost (simplified) for a given tails **xt**:

- **Cost(xt) = F*(CU + CK) + SWU*CSWU**

We compute:
- Cost vs xt
- The **xt\*** that minimizes cost
- Sensitivities: how xt\* shifts when CU or CSWU changes

## Website features (interactive)
### 1) “Single-case playground” page
Inputs (sliders + numeric fields):
- xp (product assay)
- xf (feed assay; default natural 0.711%)
- P (product mass, e.g. 1 kgU or 1000 kgU)
- xt (tails assay)
- CU ($/kgU feed)
- CK ($/kgU feed) optional toggle
- CSWU ($/SWU)

Outputs (live):
- F, W, SWU
- Cost breakdown (feed vs SWU vs conversion)

Plots:
- Cost vs xt
- SWU vs xt
- Feed vs xt

### 2) “Optimization view” page
- Let user set ranges for xt (e.g. 0.1%–0.4%)
- Compute optimum xt\* by:
  - grid search (simple, robust) for MVP
  - optional later: 1D minimizer (golden section)
- Show xt\* and the cost at optimum

### 3) “Teaching presets”
Buttons that load example scenarios:
- “Low uranium price, high SWU price” (pushes xt upward)
- “High uranium price, low SWU price” (pushes xt downward)
- “Typical LWR 4.0%”

### 4) “Explain” panel (short)
- A compact explanation of what feed/SWU/tails mean.
- A warning that this is a simplified economic model.

## Tech stack (simple, portable)
- Static site (no backend):
  - `index.html`
  - `app.js`
- Styling:
  - **Tailwind CSS** (via CDN for MVP) to keep layout work fast and consistent.
- Plotting:
  - **Plotly.js** (via CDN) for interactive plots (zoom/hover) with minimal code.
- Deploy options later (after you approve plan): GitHub Pages.
- Local run / shareability:
  - Add a **Dockerfile** to serve the static site (nginx or a tiny static server), so anyone can run it with `docker run`.

## Repo structure (proposed)
```
fuel-cycle-optimizer/
  PLAN.md
  README.md
  Dockerfile
  src/
    index.html
    app.js
  docs/            # optional, for GitHub Pages
  notes/
    lecture.pdf    # kept locally; not referenced by site
```

## Validation / sanity checks
- Ensure xt < xf < xp (otherwise formulas break); UI should guard and explain.
- Show units clearly.
- Add a few regression checks in JS (known reference values) so we don’t accidentally break formulas.

## Next step (your approval)
If this plan looks right, I’ll:
1) generate the initial static site scaffold in `src/`
2) implement formulas + UI + plots
3) add presets and a short “explain” panel
4) give you a linkable local preview workflow and (optionally) GitHub Pages deployment.
