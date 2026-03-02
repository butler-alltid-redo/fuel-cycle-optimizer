# Fuel-cycle optimizer (feed & SWU)

Interactive toy model to explore the trade-off between uranium feed, SWU, and tails assay, and to find the cost-minimizing tails assay for a given set of prices.

## Run locally (Node)

```bash
node server.js
# open http://localhost:7856
```

## Run with Docker

```bash
docker build -t fuel-cycle-optimizer:latest .
docker run --rm -p 7856:7856 fuel-cycle-optimizer:latest
# open http://localhost:7856
```

See `PLAN.md` for details.
