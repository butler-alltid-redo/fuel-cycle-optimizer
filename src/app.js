// Fuel-cycle optimizer (Feed & SWU)
// Simplified enrichment mass balance + SWU + cost optimization over tails assay.

const $ = (id) => document.getElementById(id);

function fmt(x, digits = 3) {
  // Human-readable formatting:
  // - avoid scientific notation
  // - abbreviate large values with k/M/B
  if (!Number.isFinite(x)) return "–";

  const abs = Math.abs(x);

  // Abbreviate big numbers (typically costs, kgU, SWU)
  if (abs >= 1e3) {
    const units = [
      { v: 1e9, s: "B" },
      { v: 1e6, s: "M" },
      { v: 1e3, s: "k" },
    ];
    const u = units.find((u) => abs >= u.v);
    if (u) {
      const scaled = x / u.v;
      const frac = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2;
      return `${scaled.toLocaleString(undefined, { maximumFractionDigits: frac })}${u.s}`;
    }
  }

  // For small numbers (assays), allow more decimals
  let maxFrac = digits;
  if (abs > 0 && abs < 0.01) maxFrac = Math.max(maxFrac, 6);
  if (abs > 0 && abs < 0.001) maxFrac = Math.max(maxFrac, 8);
  maxFrac = Math.min(maxFrac, 10);

  return x.toLocaleString(undefined, {
    useGrouping: true,
    maximumFractionDigits: maxFrac,
  });
}

function V(x) {
  // value function
  // guard: x must be in (0,1)
  if (!(x > 0 && x < 1)) return NaN;
  return (1 - 2 * x) * Math.log((1 - x) / x);
}

function computeCase({ xp, xf, xt, P }) {
  // Mass balance
  // F = P*(xp-xt)/(xf-xt)
  // W = F - P
  if (!(xt < xf && xf < xp)) {
    return { ok: false, msg: "Need xt < xf < xp for the simple 3-stream model." };
  }
  const F = (P * (xp - xt)) / (xf - xt);
  const W = F - P;
  const SWU = P * V(xp) + W * V(xt) - F * V(xf);
  return { ok: true, F, W, SWU };
}

function computeCost({ F, SWU, CU, CK, CSWU, useCK }) {
  const feedUnit = CU + (useCK ? CK : 0);
  const feedCost = F * feedUnit;
  const swuCost = SWU * CSWU;
  return { feedCost, swuCost, total: feedCost + swuCost };
}

function gridOptimizeXt({ xp, xf, P, CU, CK, CSWU, useCK, xtMin, xtMax, n = 400 }) {
  let best = null;
  for (let i = 0; i <= n; i++) {
    const xt = xtMin + (i / n) * (xtMax - xtMin);
    const c = computeCase({ xp, xf, xt, P });
    if (!c.ok) continue;
    const cost = computeCost({ F: c.F, SWU: c.SWU, CU, CK, CSWU, useCK });
    if (!Number.isFinite(cost.total)) continue;
    if (!best || cost.total < best.cost.total) {
      best = { xt, c, cost };
    }
  }
  return best;
}

function getInputs() {
  return {
    xp: parseFloat($("xp").value),
    xf: parseFloat($("xf").value),
    xt: parseFloat($("xt").value),
    P: parseFloat($("P").value),
    CU: parseFloat($("CU").value),
    CK: parseFloat($("CK").value),
    CSWU: parseFloat($("CSWU").value),
    useCK: $("useCK").checked,
  };
}

function setWarning(text) {
  const el = $("warning");
  if (!text) {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }
  el.textContent = text;
  el.classList.remove("hidden");
}

function syncPair(numId, rangeId, source) {
  // keep number inputs and sliders in sync
  const num = $(numId);
  const range = $(rangeId);
  if (source === "num") range.value = num.value;
  if (source === "range") num.value = range.value;
}

function updateCkVisibility() {
  $("ckRow").classList.toggle("hidden", !$("useCK").checked);
}

function render() {
  updateCkVisibility();

  const inp = getInputs();

  if (![inp.xp, inp.xf, inp.xt, inp.P, inp.CU, inp.CSWU].every(Number.isFinite) || inp.P <= 0) {
    setWarning("Please enter valid numeric inputs.");
    return;
  }

  // Optimization range (teaching-friendly defaults)
  const xtMin = 0.0005; // 0.05%
  const xtMax = Math.min(0.006, inp.xf - 1e-6); // keep xt < xf

  const opt = gridOptimizeXt({
    xp: inp.xp,
    xf: inp.xf,
    P: inp.P,
    CU: inp.CU,
    CK: inp.CK,
    CSWU: inp.CSWU,
    useCK: inp.useCK,
    xtMin,
    xtMax,
    n: 500,
  });

  // Current case
  const c = computeCase({ xp: inp.xp, xf: inp.xf, xt: inp.xt, P: inp.P });
  if (!c.ok) {
    setWarning(c.msg);
    $("outF").textContent = "–";
    $("outW").textContent = "–";
    $("outSWU").textContent = "–";
    $("outCost").textContent = "–";
    $("outFeedCost").textContent = "–";
    $("outSWUCost").textContent = "–";
    $("outXtOpt").textContent = opt ? fmt(opt.xt, 6) : "–";
    return;
  }
  setWarning("");

  const cost = computeCost({ F: c.F, SWU: c.SWU, CU: inp.CU, CK: inp.CK, CSWU: inp.CSWU, useCK: inp.useCK });

  $("outF").textContent = fmt(c.F, 2);
  $("outW").textContent = fmt(c.W, 2);
  $("outSWU").textContent = fmt(c.SWU, 2);
  $("outCost").textContent = fmt(cost.total, 2);
  $("outFeedCost").textContent = fmt(cost.feedCost, 2);
  $("outSWUCost").textContent = fmt(cost.swuCost, 2);
  $("outXtOpt").textContent = opt ? `${fmt(opt.xt, 6)} (${fmt(opt.xt * 100, 3)}%)` : "–";

  // Build curves for plots
  const xs = [];
  const ysCost = [];
  const ysSWU = [];
  const ysFeed = [];

  for (let i = 0; i <= 250; i++) {
    const xt = xtMin + (i / 250) * (xtMax - xtMin);
    const cc = computeCase({ xp: inp.xp, xf: inp.xf, xt, P: inp.P });
    if (!cc.ok) continue;
    const co = computeCost({ F: cc.F, SWU: cc.SWU, CU: inp.CU, CK: inp.CK, CSWU: inp.CSWU, useCK: inp.useCK });
    xs.push(xt * 100); // %
    ysCost.push(co.total);
    ysSWU.push(cc.SWU);
    ysFeed.push(cc.F);
  }

  const optX = opt ? opt.xt * 100 : null;

  const dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const plotBg = dark ? "#0b1220" : "#ffffff";
  const paperBg = dark ? "#0b1220" : "#ffffff";
  const fontColor = dark ? "#e2e8f0" : "#0f172a";
  const gridColor = dark ? "#1f2937" : "#e5e7eb";
  const lineColor = dark ? "#64748b" : "#334155"; // consistent across all plots

  Plotly.react(
    "plotCost",
    [
      {
        x: xs,
        y: ysCost,
        type: "scatter",
        mode: "lines",
        name: "Total cost",
        // Match style with the other plots
        line: { color: lineColor },
      },
      ...(optX
        ? [
            {
              x: [optX],
              y: [opt.cost.total],
              type: "scatter",
              mode: "markers",
              name: "Optimum",
              marker: { size: 10, color: "#f87171" },
            },
          ]
        : []),
      {
        x: [inp.xt * 100],
        y: [cost.total],
        type: "scatter",
        mode: "markers",
        name: "Current",
        marker: { size: 10, color: dark ? "#60a5fa" : "#2563eb" },
      },
    ],
    {
      margin: { t: 40, r: 10, b: 55, l: 60 },
      paper_bgcolor: paperBg,
      plot_bgcolor: plotBg,
      font: { color: fontColor },
      xaxis: { title: "x<sub>t</sub> (tails assay, %)", gridcolor: gridColor, zerolinecolor: gridColor },
      yaxis: { title: "Cost ($)", rangemode: "tozero", gridcolor: gridColor, zerolinecolor: gridColor },
      legend: {
        orientation: "h",
        x: 1,
        xanchor: "right",
        y: 1.25,
        yanchor: "top",
      },
    },
    { displayModeBar: false }
  );

  Plotly.react(
    "plotSWU",
    [
      { x: xs, y: ysSWU, type: "scatter", mode: "lines", name: "SWU", line: { color: lineColor } },
      {
        x: [inp.xt * 100],
        y: [c.SWU],
        type: "scatter",
        mode: "markers",
        name: "Current",
        marker: { size: 9, color: "#2563eb" },
      },
    ],
    {
      margin: { t: 10, r: 10, b: 45, l: 60 },
      paper_bgcolor: paperBg,
      plot_bgcolor: plotBg,
      font: { color: fontColor },
      xaxis: { title: "x<sub>t</sub> (%)", gridcolor: gridColor, zerolinecolor: gridColor },
      yaxis: { title: "SWU", rangemode: "tozero", gridcolor: gridColor, zerolinecolor: gridColor },
      showlegend: false,
    },
    { displayModeBar: false }
  );

  Plotly.react(
    "plotFeed",
    [
      { x: xs, y: ysFeed, type: "scatter", mode: "lines", name: "Feed", line: { color: lineColor } },
      {
        x: [inp.xt * 100],
        y: [c.F],
        type: "scatter",
        mode: "markers",
        name: "Current",
        marker: { size: 9, color: "#2563eb" },
      },
    ],
    {
      margin: { t: 10, r: 10, b: 45, l: 60 },
      paper_bgcolor: paperBg,
      plot_bgcolor: plotBg,
      font: { color: fontColor },
      xaxis: { title: "x<sub>t</sub> (%)", gridcolor: gridColor, zerolinecolor: gridColor },
      yaxis: { title: "Feed F (kgU)", rangemode: "tozero", gridcolor: gridColor, zerolinecolor: gridColor },
      showlegend: false,
    },
    { displayModeBar: false }
  );
}

function setDefaults() {
  $("xp").value = "0.040";
  $("xpRange").value = $("xp").value;

  $("xf").value = "0.00711";
  $("xfRange").value = $("xf").value;

  $("P").value = "1000";

  $("xt").value = "0.0025";
  $("xtRange").value = $("xt").value;

  $("CU").value = "120";
  $("CSWU").value = "110";
  $("useCK").checked = false;
  $("CK").value = "10";

}

function applyPreset(name) {
  setDefaults();
  if (name === "lwr4") {
    // defaults are fine
  } else if (name === "lowU_highSWU") {
    $("CU").value = "60";
    $("CSWU").value = "170";
    $("xt").value = "0.0032";
  } else if (name === "highU_lowSWU") {
    $("CU").value = "220";
    $("CSWU").value = "70";
    $("xt").value = "0.0018";
  }
  $("xtRange").value = $("xt").value;
  render();
}

function wireEvents() {
  // Explicitly sync sliders <-> numeric inputs (more reliable than checking activeElement)
  $("xp").addEventListener("input", () => {
    syncPair("xp", "xpRange", "num");
    render();
  });
  $("xpRange").addEventListener("input", () => {
    syncPair("xp", "xpRange", "range");
    render();
  });

  $("xf").addEventListener("input", () => {
    syncPair("xf", "xfRange", "num");
    render();
  });
  $("xfRange").addEventListener("input", () => {
    syncPair("xf", "xfRange", "range");
    render();
  });

  $("xt").addEventListener("input", () => {
    syncPair("xt", "xtRange", "num");
    render();
  });
  $("xtRange").addEventListener("input", () => {
    syncPair("xt", "xtRange", "range");
    render();
  });

  // Other inputs
  const ids = ["P", "CU", "CSWU", "useCK", "CK"];
  for (const id of ids) {
    $(id).addEventListener("input", () => {
      render();
    });
  }

  $("btnReset").addEventListener("click", () => {
    setDefaults();
    render();
  });

  $("btnSetOpt").addEventListener("click", () => {
    const inp = getInputs();
    const xtMin = 0.0005;
    const xtMax = Math.min(0.006, inp.xf - 1e-6);
    const opt = gridOptimizeXt({
      xp: inp.xp,
      xf: inp.xf,
      P: inp.P,
      CU: inp.CU,
      CK: inp.CK,
      CSWU: inp.CSWU,
      useCK: inp.useCK,
      xtMin,
      xtMax,
      n: 800,
    });
    if (opt) {
      $("xt").value = String(opt.xt);
      $("xtRange").value = $("xt").value;
      render();
    }
  });

  for (const btn of document.querySelectorAll(".presetBtn")) {
    btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
  }
}

function initSystemThemeListener() {
  // Re-render plots when system theme changes
  if (!window.matchMedia) return;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  // Safari uses addListener
  if (mq.addEventListener) mq.addEventListener("change", () => render());
  else if (mq.addListener) mq.addListener(() => render());
}

setDefaults();
initSystemThemeListener();
wireEvents();
render();
