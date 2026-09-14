(() => {
  "use strict";

  const ROOT_SELECTOR = "[data-supervised-learning]";
  const SVG_NS = "http://www.w3.org/2000/svg";
  let instanceCounter = 0;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function svgEl(name, attrs = {}, text = null) {
    const node = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attrs)) {
      node.setAttribute(key, String(value));
    }
    if (text !== null) node.textContent = text;
    return node;
  }

  function htmlEl(name, className, text = null) {
    const node = document.createElement(name);
    if (className) node.className = className;
    if (text !== null) node.textContent = text;
    return node;
  }

  function pathFromPoints(points, close = false) {
    if (!points.length) return "";
    const body = points
      .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(" ");
    return close ? `${body} Z` : body;
  }

  function createLegend(items) {
    const legend = htmlEl("div", "ml-supervised__legend");
    for (const item of items) {
      const row = htmlEl("div", "ml-supervised__legend-item");
      const swatch = htmlEl("span", `ml-supervised__legend-swatch ${item.className}`);
      swatch.setAttribute("aria-hidden", "true");
      row.append(swatch, document.createTextNode(item.label));
      legend.append(row);
    }
    return legend;
  }

  function createPanel({ id, title, subtitle, description, instanceId }) {
    const panel = htmlEl("section", "ml-supervised__panel");
    panel.dataset.panel = id;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", `ml-supervised-${instanceId}-tab-${id}`);

    const header = htmlEl("div", "ml-supervised__panel-header");
    const heading = htmlEl("h4", "ml-supervised__panel-title", title);
    const badge = htmlEl("span", "ml-supervised__panel-badge", subtitle);
    const copy = htmlEl("p", "ml-supervised__panel-copy", description);
    header.append(heading, badge, copy);

    const figure = htmlEl("div", "ml-supervised__figure");
    panel.append(header, figure);

    return { panel, figure };
  }

  function makeAxes(svg, plot, xScale, yScale, xTicks, yTicks, xLabel, yLabel) {
    const grid = svgEl("g", { class: "ml-supervised__gridlines", "aria-hidden": "true" });
    const axes = svgEl("g", { class: "ml-supervised__axes", "aria-hidden": "true" });

    for (const tick of xTicks) {
      const x = xScale(tick);
      grid.append(svgEl("line", { x1: x, x2: x, y1: plot.top, y2: plot.bottom }));
      axes.append(svgEl("line", { x1: x, x2: x, y1: plot.bottom, y2: plot.bottom + 5 }));
      axes.append(
        svgEl(
          "text",
          { x, y: plot.bottom + 22, "text-anchor": "middle", class: "ml-supervised__tick-label" },
          String(tick)
        )
      );
    }

    for (const tick of yTicks) {
      const y = yScale(tick);
      grid.append(svgEl("line", { x1: plot.left, x2: plot.right, y1: y, y2: y }));
      axes.append(svgEl("line", { x1: plot.left - 5, x2: plot.left, y1: y, y2: y }));
      axes.append(
        svgEl(
          "text",
          { x: plot.left - 10, y: y + 4, "text-anchor": "end", class: "ml-supervised__tick-label" },
          String(tick)
        )
      );
    }

    axes.append(
      svgEl("line", { x1: plot.left, x2: plot.right, y1: plot.bottom, y2: plot.bottom, class: "ml-supervised__axis-line" })
    );
    axes.append(
      svgEl("line", { x1: plot.left, x2: plot.left, y1: plot.top, y2: plot.bottom, class: "ml-supervised__axis-line" })
    );

    axes.append(
      svgEl(
        "text",
        { x: (plot.left + plot.right) / 2, y: plot.bottom + 40, "text-anchor": "middle", class: "ml-supervised__axis-label" },
        xLabel
      )
    );
    const yText = svgEl(
      "text",
      {
        x: 15,
        y: (plot.top + plot.bottom) / 2,
        "text-anchor": "middle",
        transform: `rotate(-90 15 ${(plot.top + plot.bottom) / 2})`,
        class: "ml-supervised__axis-label"
      },
      yLabel
    );
    axes.append(yText);

    svg.append(grid, axes);
  }

  function pointerToViewBox(svg, event, width, height) {
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height
    };
  }

  function createClassification(figure, instanceId) {
    const width = 520;
    const height = 360;
    const plot = { left: 52, right: 502, top: 18, bottom: 302 };
    const xDomain = [-3, 3];
    const yDomain = [-3, 3];
    const xScale = x => plot.left + ((x - xDomain[0]) / (xDomain[1] - xDomain[0])) * (plot.right - plot.left);
    const yScale = y => plot.bottom - ((y - yDomain[0]) / (yDomain[1] - yDomain[0])) * (plot.bottom - plot.top);
    const xInvert = px => xDomain[0] + ((px - plot.left) / (plot.right - plot.left)) * (xDomain[1] - xDomain[0]);
    const yInvert = py => yDomain[0] + ((plot.bottom - py) / (plot.bottom - plot.top)) * (yDomain[1] - yDomain[0]);

    const boundary = y => 0.15 + 0.55 * Math.sin(1.12 * y);

    const class1 = [
      [-2.65, 1.05], [-2.45, -0.55], [-2.25, 2.05], [-2.15, -1.55],
      [-1.95, 0.25], [-1.85, 1.35], [-1.70, -0.75], [-1.55, 2.55],
      [-1.35, 0.75], [-1.20, -1.70], [-1.00, 1.75], [-0.80, -0.35]
    ];
    const class2 = [
      [0.65, -1.15], [0.85, 0.60], [1.05, -0.25], [1.20, 1.65],
      [1.45, -1.75], [1.65, 0.85], [1.85, 2.25], [2.05, -0.45],
      [2.25, 1.45], [2.45, -1.25], [2.65, 0.35], [2.80, 1.95]
    ];

    const svg = svgEl("svg", {
      class: "ml-supervised__plot",
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": "Clasificación bidimensional con dos clases, frontera de decisión y un ejemplo nuevo interactivo"
    });

    const defs = svgEl("defs");
    const clipId = `ml-supervised-${instanceId}-classification-clip`;
    const clip = svgEl("clipPath", { id: clipId });
    clip.append(svgEl("rect", { x: plot.left, y: plot.top, width: plot.right - plot.left, height: plot.bottom - plot.top }));
    defs.append(clip);
    svg.append(defs);

    const ys = Array.from({ length: 100 }, (_, i) => 3 - (6 * i) / 99);
    const boundaryPoints = ys.map(y => [xScale(boundary(y)), yScale(y)]);
    const leftRegion = [[plot.left, plot.top], ...boundaryPoints, [plot.left, plot.bottom]];
    const rightRegion = [[plot.right, plot.top], [plot.right, plot.bottom], ...boundaryPoints.slice().reverse()];

    const regions = svgEl("g", { "clip-path": `url(#${clipId})`, "aria-hidden": "true" });
    regions.append(
      svgEl("path", { d: pathFromPoints(leftRegion, true), class: "ml-supervised__region ml-supervised__region--class1" }),
      svgEl("path", { d: pathFromPoints(rightRegion, true), class: "ml-supervised__region ml-supervised__region--class2" })
    );
    svg.append(regions);

    makeAxes(svg, plot, xScale, yScale, [-3, -2, -1, 0, 1, 2, 3], [-3, -2, -1, 0, 1, 2, 3], "x₁", "x₂");

    const boundaryPath = svgEl("path", {
      d: pathFromPoints(boundaryPoints),
      class: "ml-supervised__boundary",
      "aria-hidden": "true"
    });
    svg.append(boundaryPath);

    const observed = svgEl("g", { "aria-hidden": "true" });
    for (const [x, y] of class1) {
      observed.append(svgEl("circle", { cx: xScale(x), cy: yScale(y), r: 5.2, class: "ml-supervised__point ml-supervised__point--class1" }));
    }
    for (const [x, y] of class2) {
      const cx = xScale(x);
      const cy = yScale(y);
      const size = 7;
      observed.append(
        svgEl("path", {
          d: `M${cx},${cy - size} L${cx - size * 0.86},${cy + size * 0.55} L${cx + size * 0.86},${cy + size * 0.55} Z`,
          class: "ml-supervised__point ml-supervised__point--class2"
        })
      );
    }
    svg.append(observed);

    const marker = svgEl("g", {
      class: "ml-supervised__marker ml-supervised__marker--classification",
      tabindex: "0",
      role: "button",
      "aria-label": "Nuevo ejemplo x estrella. Usa las flechas para moverlo."
    });
    marker.append(
      svgEl("circle", { r: 14, class: "ml-supervised__marker-hit", "aria-hidden": "true" }),
      svgEl("line", { x1: -7, y1: -7, x2: 7, y2: 7, class: "ml-supervised__marker-cross" }),
      svgEl("line", { x1: -7, y1: 7, x2: 7, y2: -7, class: "ml-supervised__marker-cross" }),
      svgEl("text", { x: 12, y: -11, class: "ml-supervised__marker-label" }, "x*")
    );
    svg.append(marker);

    const result = htmlEl("div", "ml-supervised__result");
    result.setAttribute("aria-live", "polite");
    const resultLead = htmlEl("span", "ml-supervised__result-label", "Predicción");
    const resultValue = htmlEl("strong", "ml-supervised__result-value");
    result.append(resultLead, resultValue);

    const hint = htmlEl("p", "ml-supervised__hint", "Toca o arrastra x*; con teclado, usa las flechas.");

    figure.append(
      svg,
      createLegend([
        { className: "ml-supervised__legend-swatch--dot-blue", label: "Clase c₁" },
        { className: "ml-supervised__legend-swatch--triangle-orange", label: "Clase c₂" },
        { className: "ml-supervised__legend-swatch--boundary", label: "Frontera de decisión" },
        { className: "ml-supervised__legend-swatch--cross", label: "Nuevo ejemplo x*" }
      ]),
      result,
      hint
    );

    let state = { x: 0.85, y: -0.85 };
    let dragging = false;

    function update(nextState, announce = false) {
      state = {
        x: clamp(nextState.x, xDomain[0], xDomain[1]),
        y: clamp(nextState.y, yDomain[0], yDomain[1])
      };
      marker.setAttribute("transform", `translate(${xScale(state.x)} ${yScale(state.y)})`);
      const predicted = state.x >= boundary(state.y) ? "c₂" : "c₁";
      resultValue.textContent = `ŷ* = ${predicted}`;
      marker.setAttribute("aria-valuetext", `x uno ${state.x.toFixed(1)}, x dos ${state.y.toFixed(1)}, clase ${predicted}`);
      if (announce) result.dataset.changed = String(Date.now());
    }

    function setFromPointer(event) {
      const point = pointerToViewBox(svg, event, width, height);
      if (point.x < plot.left || point.x > plot.right || point.y < plot.top || point.y > plot.bottom) return;
      update({ x: xInvert(point.x), y: yInvert(point.y) }, true);
    }

    svg.addEventListener("pointerdown", event => {
      if (event.button !== undefined && event.button !== 0) return;
      dragging = true;
      svg.setPointerCapture?.(event.pointerId);
      setFromPointer(event);
    });
    svg.addEventListener("pointermove", event => {
      if (!dragging) return;
      setFromPointer(event);
    });
    const endDrag = event => {
      dragging = false;
      if (svg.hasPointerCapture?.(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    };
    svg.addEventListener("pointerup", endDrag);
    svg.addEventListener("pointercancel", endDrag);

    marker.addEventListener("keydown", event => {
      const step = event.shiftKey ? 0.25 : 0.10;
      const next = { ...state };
      if (event.key === "ArrowLeft") next.x -= step;
      else if (event.key === "ArrowRight") next.x += step;
      else if (event.key === "ArrowUp") next.y += step;
      else if (event.key === "ArrowDown") next.y -= step;
      else return;
      event.preventDefault();
      update(next, true);
    });

    update(state);
  }

  function createRegression(figure, instanceId) {
    const width = 520;
    const height = 360;
    const plot = { left: 52, right: 502, top: 18, bottom: 302 };
    const xDomain = [-3, 3];
    const yDomain = [-2.2, 2.2];
    const xScale = x => plot.left + ((x - xDomain[0]) / (xDomain[1] - xDomain[0])) * (plot.right - plot.left);
    const yScale = y => plot.bottom - ((y - yDomain[0]) / (yDomain[1] - yDomain[0])) * (plot.bottom - plot.top);
    const xInvert = px => xDomain[0] + ((px - plot.left) / (plot.right - plot.left)) * (xDomain[1] - xDomain[0]);
    const fHat = x => 0.30 * x + 0.95 * Math.sin(1.12 * x);

    const xs = [-2.85, -2.55, -2.25, -1.95, -1.65, -1.35, -1.05, -0.75, -0.45, -0.15, 0.15, 0.45, 0.75, 1.05, 1.35, 1.65, 1.95, 2.25, 2.55, 2.85];
    const offsets = [0.14, -0.24, 0.17, -0.16, 0.25, -0.11, 0.15, -0.19, 0.12, -0.17, 0.20, -0.12, 0.10, -0.18, 0.22, -0.13, 0.16, -0.20, 0.13, -0.10];
    const observed = xs.map((x, index) => [x, fHat(x) + offsets[index]]);
    const curve = Array.from({ length: 180 }, (_, i) => {
      const x = -3 + (6 * i) / 179;
      return [xScale(x), yScale(fHat(x))];
    });

    const svg = svgEl("svg", {
      class: "ml-supervised__plot",
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": "Regresión unidimensional con datos observados, función aprendida y una predicción interactiva"
    });

    makeAxes(svg, plot, xScale, yScale, [-3, -2, -1, 0, 1, 2, 3], [-2, -1, 0, 1, 2], "x", "y");

    svg.append(
      svgEl("path", { d: pathFromPoints(curve), class: "ml-supervised__regression-curve", "aria-hidden": "true" })
    );

    const observedGroup = svgEl("g", { "aria-hidden": "true" });
    for (const [x, y] of observed) {
      observedGroup.append(svgEl("circle", { cx: xScale(x), cy: yScale(y), r: 4.8, class: "ml-supervised__point ml-supervised__point--observed" }));
    }
    svg.append(observedGroup);

    const guide = svgEl("line", { class: "ml-supervised__prediction-guide", "aria-hidden": "true" });
    svg.append(guide);

    const marker = svgEl("g", {
      class: "ml-supervised__marker ml-supervised__marker--regression",
      tabindex: "0",
      role: "slider",
      "aria-valuemin": xDomain[0],
      "aria-valuemax": xDomain[1],
      "aria-valuenow": 0.75,
      "aria-label": "Nuevo valor x estrella. Usa las flechas izquierda y derecha para moverlo."
    });
    marker.append(
      svgEl("circle", { r: 14, class: "ml-supervised__marker-hit", "aria-hidden": "true" }),
      svgEl("circle", { r: 7.5, class: "ml-supervised__prediction-dot" }),
      svgEl("text", { x: 12, y: -11, class: "ml-supervised__marker-label" }, "ŷ*")
    );
    svg.append(marker);

    const result = htmlEl("div", "ml-supervised__result");
    result.setAttribute("aria-live", "polite");
    const resultLead = htmlEl("span", "ml-supervised__result-label", "Predicción");
    const resultValue = htmlEl("strong", "ml-supervised__result-value");
    result.append(resultLead, resultValue);

    const hint = htmlEl("p", "ml-supervised__hint", "Toca o arrastra horizontalmente x* para cambiar la predicción.");

    figure.append(
      svg,
      createLegend([
        { className: "ml-supervised__legend-swatch--dot-blue", label: "Datos observados" },
        { className: "ml-supervised__legend-swatch--curve", label: "Función aprendida f̂(x)" },
        { className: "ml-supervised__legend-swatch--prediction", label: "Predicción en x*" }
      ]),
      result,
      hint
    );

    let xStar = 0.75;
    let dragging = false;

    function update(nextX, announce = false) {
      xStar = clamp(nextX, xDomain[0], xDomain[1]);
      const yHat = fHat(xStar);
      const px = xScale(xStar);
      const py = yScale(yHat);
      marker.setAttribute("transform", `translate(${px} ${py})`);
      guide.setAttribute("x1", px);
      guide.setAttribute("x2", px);
      guide.setAttribute("y1", py);
      guide.setAttribute("y2", plot.bottom);
      resultValue.textContent = `x* = ${xStar.toFixed(2)}  →  ŷ* = ${yHat.toFixed(2)}`;
      marker.setAttribute("aria-valuenow", xStar.toFixed(2));
      marker.setAttribute("aria-valuetext", `x ${xStar.toFixed(2)}, predicción ${yHat.toFixed(2)}`);
      if (announce) result.dataset.changed = String(Date.now());
    }

    function setFromPointer(event) {
      const point = pointerToViewBox(svg, event, width, height);
      if (point.x < plot.left || point.x > plot.right || point.y < plot.top || point.y > plot.bottom) return;
      update(xInvert(point.x), true);
    }

    svg.addEventListener("pointerdown", event => {
      if (event.button !== undefined && event.button !== 0) return;
      dragging = true;
      svg.setPointerCapture?.(event.pointerId);
      setFromPointer(event);
    });
    svg.addEventListener("pointermove", event => {
      if (!dragging) return;
      setFromPointer(event);
    });
    const endDrag = event => {
      dragging = false;
      if (svg.hasPointerCapture?.(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    };
    svg.addEventListener("pointerup", endDrag);
    svg.addEventListener("pointercancel", endDrag);

    marker.addEventListener("keydown", event => {
      const step = event.shiftKey ? 0.25 : 0.10;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        update(xStar - step, true);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        update(xStar + step, true);
      }
    });

    update(xStar);
  }

  function initialize(root) {
    if (root.dataset.initialized === "true") return;
    root.dataset.initialized = "true";
    root.dataset.activePanel = "classification";
    const instanceId = ++instanceCounter;
    root.innerHTML = "";

    const tabs = htmlEl("div", "ml-supervised__tabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Tipo de problema supervisado");

    const classificationTab = htmlEl("button", "ml-supervised__tab is-active", "Clasificación");
    classificationTab.type = "button";
    classificationTab.id = `ml-supervised-${instanceId}-tab-classification`;
    classificationTab.dataset.tab = "classification";
    classificationTab.setAttribute("role", "tab");
    classificationTab.setAttribute("aria-selected", "true");

    const regressionTab = htmlEl("button", "ml-supervised__tab", "Regresión");
    regressionTab.type = "button";
    regressionTab.id = `ml-supervised-${instanceId}-tab-regression`;
    regressionTab.dataset.tab = "regression";
    regressionTab.setAttribute("role", "tab");
    regressionTab.setAttribute("aria-selected", "false");

    tabs.append(classificationTab, regressionTab);

    const comparison = htmlEl("div", "ml-supervised__comparison");
    const classification = createPanel({
      id: "classification",
      title: "Clasificación",
      subtitle: "salida discreta",
      description: "El modelo asigna regiones del espacio de características a categorías.",
      instanceId
    });
    const regression = createPanel({
      id: "regression",
      title: "Regresión",
      subtitle: "salida continua",
      description: "El modelo aproxima una relación que produce un valor numérico.",
      instanceId
    });

    comparison.append(classification.panel, regression.panel);
    root.append(tabs, comparison);

    createClassification(classification.figure, instanceId);
    createRegression(regression.figure, instanceId);

    const setActivePanel = id => {
      root.dataset.activePanel = id;
      for (const button of tabs.querySelectorAll("[data-tab]")) {
        const active = button.dataset.tab === id;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
      }
    };

    tabs.addEventListener("click", event => {
      const button = event.target.closest("[data-tab]");
      if (!button) return;
      setActivePanel(button.dataset.tab);
    });

    tabs.addEventListener("keydown", event => {
      const current = event.target.closest("[data-tab]");
      if (!current || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const next = current.dataset.tab === "classification" ? regressionTab : classificationTab;
      setActivePanel(next.dataset.tab);
      next.focus();
    });
  }

  const roots = document.querySelectorAll(ROOT_SELECTOR);
  roots.forEach(initialize);
})();
