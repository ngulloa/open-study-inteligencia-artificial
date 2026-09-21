(() => {
  "use strict";

  const ROOT_SELECTOR = "[data-classifier-evaluation]";
  const COUNT_KEYS = ["tp", "tn", "fp", "fn"];
  const INITIAL_COUNTS = Object.freeze({ tp: 12, tn: 24, fp: 4, fn: 6 });
  const COUNT_LABELS = Object.freeze({
    tp: "Verdaderos positivos",
    tn: "Verdaderos negativos",
    fp: "Falsos positivos",
    fn: "Falsos negativos"
  });
  const METRIC_LABELS = Object.freeze({
    accuracy: "Accuracy",
    precision: "Precision",
    recall: "Recall",
    f1: "F1-score"
  });
  let instanceCounter = 0;

  function htmlEl(name, className, text = null) {
    const node = document.createElement(name);
    if (className) node.className = className;
    if (text !== null) node.textContent = text;
    return node;
  }

  function normalizeCount(rawValue) {
    if (String(rawValue).trim() === "") return null;

    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) return null;

    return Math.min(
      Number.MAX_SAFE_INTEGER,
      Math.max(0, Math.round(numericValue))
    );
  }

  function computeMetrics(counts) {
    const total = counts.tp + counts.tn + counts.fp + counts.fn;
    const predictedPositive = counts.tp + counts.fp;
    const actualPositive = counts.tp + counts.fn;
    const accuracy = total === 0 ? null : (counts.tp + counts.tn) / total;
    const precision = predictedPositive === 0 ? null : counts.tp / predictedPositive;
    const recall = actualPositive === 0 ? null : counts.tp / actualPositive;
    const f1Denominator = precision === null || recall === null
      ? null
      : precision + recall;
    const f1 = f1Denominator === null || f1Denominator === 0
      ? null
      : (2 * precision * recall) / f1Denominator;

    return { accuracy, precision, recall, f1 };
  }

  function metricExplanation(metric, metrics) {
    if (metric === "accuracy") {
      return "La métrica es indefinida porque el total de ejemplos es 0.";
    }

    if (metric === "precision") {
      return "La métrica es indefinida porque no hay predicciones positivas (TP + FP = 0).";
    }

    if (metric === "recall") {
      return "La métrica es indefinida porque no hay casos realmente positivos (TP + FN = 0).";
    }

    if (metrics.precision === null && metrics.recall === null) {
      return "La métrica es indefinida porque precision y recall no están definidos.";
    }

    if (metrics.precision === null) {
      return "La métrica es indefinida porque precision no está definida.";
    }

    if (metrics.recall === null) {
      return "La métrica es indefinida porque recall no está definido.";
    }

    return "La métrica es indefinida porque precision + recall = 0.";
  }

  function formatMetric(value) {
    return value === null ? "—" : `${(value * 100).toFixed(1)} %`;
  }

  function describeMetricChange(metric, before, after) {
    const label = METRIC_LABELS[metric];

    if (before === null && after === null) {
      return `${label} permaneció indefinida`;
    }

    if (before === null) {
      return `${label} pasó de indefinida a ${formatMetric(after)}`;
    }

    if (after === null) {
      return `${label} pasó de ${formatMetric(before)} a indefinida`;
    }

    if (before === after) {
      return `${label} se mantuvo en ${formatMetric(after)}`;
    }

    const direction = after > before ? "aumentó" : "disminuyó";
    const beforeText = formatMetric(before);
    const afterText = formatMetric(after);

    if (beforeText === afterText) {
      return `${label} ${direction} ligeramente (se muestra ${afterText} por redondeo)`;
    }

    return `${label} ${direction} de ${beforeText} a ${afterText}`;
  }

  function changeSummary(key, previousValue, nextValue, currentCounts) {
    if (previousValue === nextValue) {
      return `${COUNT_LABELS[key]} (${key.toUpperCase()}) permanece en ${nextValue}; las métricas no cambiaron.`;
    }

    const previousCounts = { ...currentCounts, [key]: previousValue };
    const before = computeMetrics(previousCounts);
    const after = computeMetrics(currentCounts);
    const direction = nextValue > previousValue ? "aumentó" : "disminuyó";
    const affectedMetrics = {
      tp: ["accuracy", "precision", "recall", "f1"],
      tn: ["accuracy"],
      fp: ["accuracy", "precision", "f1"],
      fn: ["accuracy", "recall", "f1"]
    };
    const effects = affectedMetrics[key].map(metric =>
      describeMetricChange(metric, before[metric], after[metric])
    );

    if (key === "tn") {
      effects.push("Precision, recall y F1-score no dependen directamente de TN y no cambiaron");
    } else if (key === "fp") {
      effects.push("Recall no depende directamente de FP y no cambió");
    } else if (key === "fn") {
      effects.push("Precision no depende directamente de FN y no cambió");
    }

    return `${COUNT_LABELS[key]} (${key.toUpperCase()}) ${direction} de ${previousValue} a ${nextValue}. ${effects.join(
      "; "
    )}.`;
  }

  function createCountControl(key, instanceId) {
    const field = htmlEl("div", "ml-eval__field");
    const inputId = `ml-eval-${instanceId}-count-${key}`;
    const descriptionId = `${inputId}-description`;
    const label = htmlEl(
      "label",
      "ml-eval__label",
      `${COUNT_LABELS[key]} (${key.toUpperCase()})`
    );
    label.htmlFor = inputId;

    const input = htmlEl("input", "ml-eval__input");
    input.id = inputId;
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.value = String(INITIAL_COUNTS[key]);
    input.dataset.count = key;
    input.setAttribute("aria-describedby", descriptionId);

    const descriptions = {
      tp: "Casos realmente positivos clasificados como positivos.",
      tn: "Casos realmente negativos clasificados como negativos.",
      fp: "Casos realmente negativos clasificados como positivos.",
      fn: "Casos realmente positivos clasificados como negativos."
    };
    const description = htmlEl("span", "ml-eval__field-description", descriptions[key]);
    description.id = descriptionId;

    field.append(label, input, description);
    return field;
  }

  function createMatrixCell(key) {
    const correct = key === "tp" || key === "tn";
    const cell = htmlEl(
      "td",
      `ml-eval__cell ml-eval__cell--${correct ? "correct" : "error"}`
    );
    cell.dataset.cell = key;

    const abbreviation = htmlEl("span", "ml-eval__cell-label", key.toUpperCase());
    const count = htmlEl("strong", "ml-eval__cell-value", String(INITIAL_COUNTS[key]));
    count.dataset.cellCount = key;
    const description = htmlEl("span", "ml-eval__cell-text", COUNT_LABELS[key]);
    cell.append(abbreviation, count, description);

    return cell;
  }

  function createMatrix() {
    const region = htmlEl("div", "ml-eval__matrix-wrap");
    const table = htmlEl("table", "ml-eval__matrix");
    const caption = htmlEl(
      "caption",
      "ml-eval__matrix-caption",
      "Matriz de confusión. Las filas representan la clase real y las columnas, la predicción."
    );
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    const corner = htmlEl("th", "ml-eval__matrix-heading", "Clase real");
    corner.scope = "col";
    const predictedPositive = htmlEl("th", "ml-eval__matrix-heading", "Predicción positiva");
    predictedPositive.scope = "col";
    const predictedNegative = htmlEl("th", "ml-eval__matrix-heading", "Predicción negativa");
    predictedNegative.scope = "col";
    headRow.append(corner, predictedPositive, predictedNegative);
    head.append(headRow);

    const body = document.createElement("tbody");
    const positiveRow = document.createElement("tr");
    const positiveHeading = htmlEl("th", "ml-eval__matrix-heading", "Real positiva");
    positiveHeading.scope = "row";
    positiveRow.append(positiveHeading, createMatrixCell("tp"), createMatrixCell("fn"));

    const negativeRow = document.createElement("tr");
    const negativeHeading = htmlEl("th", "ml-eval__matrix-heading", "Real negativa");
    negativeHeading.scope = "row";
    negativeRow.append(negativeHeading, createMatrixCell("fp"), createMatrixCell("tn"));
    body.append(positiveRow, negativeRow);

    table.append(caption, head, body);
    region.append(table);
    return region;
  }

  function createMetricCard(metric, instanceId) {
    const card = htmlEl("article", "ml-eval__metric");
    const title = htmlEl("h4", "ml-eval__metric-name", METRIC_LABELS[metric]);
    const output = htmlEl("output", "ml-eval__metric-value");
    const note = htmlEl("p", "ml-eval__metric-status");
    const noteId = `ml-eval-${instanceId}-metric-${metric}-note`;

    output.dataset.metric = metric;
    output.setAttribute("aria-describedby", noteId);
    note.id = noteId;
    note.hidden = true;
    card.append(title, output, note);

    return card;
  }

  function initialize(root) {
    if (root.dataset.initialized === "true") return;

    const instanceId = ++instanceCounter;
    const content = htmlEl("div", "ml-eval__content");
    const introduction = htmlEl("header", "ml-eval__header");
    const title = htmlEl("h3", "ml-eval__title", "Evaluación de un clasificador");
    const instructions = htmlEl(
      "p",
      "ml-eval__description",
      "Modifica los conteos para observar cómo cambia la matriz de confusión y sus métricas."
    );
    introduction.append(title, instructions);

    const controls = htmlEl("fieldset", "ml-eval__controls");
    const legend = htmlEl(
      "legend",
      "ml-eval__controls-title ml-eval__panel-title",
      "Conteos observados"
    );
    const fields = htmlEl("div", "ml-eval__controls-grid");
    COUNT_KEYS.forEach(key => fields.append(createCountControl(key, instanceId)));

    const actions = htmlEl("div", "ml-eval__actions");
    const reset = htmlEl("button", "ml-eval__reset", "Restablecer");
    reset.type = "button";
    reset.dataset.action = "reset";
    actions.append(reset);
    controls.append(legend, fields, actions);

    const matrix = createMatrix();
    const layout = htmlEl("div", "ml-eval__layout");
    const matrixPanel = htmlEl("section", "ml-eval__panel");
    const matrixTitle = htmlEl("h4", "ml-eval__panel-title", "Matriz de confusión");
    matrixPanel.append(matrixTitle, matrix);

    const metricsPanel = htmlEl("section", "ml-eval__panel");
    const metricsTitle = htmlEl("h4", "ml-eval__panel-title", "Métricas");
    const metricsGrid = htmlEl("div", "ml-eval__metrics");
    ["accuracy", "precision", "recall", "f1"].forEach(metric =>
      metricsGrid.append(createMetricCard(metric, instanceId))
    );
    metricsPanel.append(metricsTitle, metricsGrid);
    layout.append(matrixPanel, metricsPanel);

    const interpretation = htmlEl("section", "ml-eval__interpretation");
    const interpretationTitle = htmlEl("h3", "ml-eval__interpretation-title", "Interpretación del último cambio");
    const summary = htmlEl(
      "p",
      "ml-eval__change-summary",
      "Estado inicial: N = 46. Modifica un conteo para observar el efecto sobre las métricas."
    );
    summary.dataset.changeSummary = "";
    summary.setAttribute("aria-live", "polite");
    interpretation.append(interpretationTitle, summary);

    content.append(introduction, controls, layout, interpretation);

    const inputs = {};
    const cells = {};
    const metricOutputs = {};
    const metricNotes = {};
    let counts = { ...INITIAL_COUNTS };
    let committedCounts = { ...INITIAL_COUNTS };

    COUNT_KEYS.forEach(key => {
      inputs[key] = content.querySelector(`[data-count="${key}"]`);
      cells[key] = content.querySelector(`[data-cell="${key}"]`);
    });

    Object.keys(METRIC_LABELS).forEach(metric => {
      metricOutputs[metric] = content.querySelector(`[data-metric="${metric}"]`);
      metricNotes[metric] = metricOutputs[metric].nextElementSibling;
    });

    function render() {
      COUNT_KEYS.forEach(key => {
        inputs[key].value = String(counts[key]);
        const countNode = cells[key].querySelector(`[data-cell-count="${key}"]`);
        countNode.textContent = String(counts[key]);
        cells[key].setAttribute(
          "aria-label",
          `${COUNT_LABELS[key]} (${key.toUpperCase()}): ${counts[key]}`
        );
      });

      const metrics = computeMetrics(counts);
      Object.keys(METRIC_LABELS).forEach(metric => {
        const value = metrics[metric];
        const explanation = value === null ? metricExplanation(metric, metrics) : "";
        const card = metricOutputs[metric].closest(".ml-eval__metric");
        metricOutputs[metric].textContent = formatMetric(value);
        metricOutputs[metric].setAttribute(
          "aria-label",
          value === null
            ? `${METRIC_LABELS[metric]}: indefinida. ${explanation}`
            : `${METRIC_LABELS[metric]}: ${(value * 100).toFixed(1)} por ciento`
        );
        metricNotes[metric].textContent = explanation;
        metricNotes[metric].hidden = value !== null;
        card.classList.toggle("ml-eval__metric--undefined", value === null);
      });
    }

    COUNT_KEYS.forEach(key => {
      const input = inputs[key];

      input.addEventListener("input", () => {
        const normalized = normalizeCount(input.value);
        if (normalized === null) return;

        counts[key] = normalized;
        render();
      });

      input.addEventListener("change", () => {
        const normalized = normalizeCount(input.value);
        if (normalized !== null) counts[key] = normalized;

        render();
        summary.textContent = changeSummary(
          key,
          committedCounts[key],
          counts[key],
          counts
        );
        committedCounts[key] = counts[key];
      });
    });

    reset.addEventListener("click", () => {
      counts = { ...INITIAL_COUNTS };
      committedCounts = { ...INITIAL_COUNTS };
      render();
      summary.textContent =
        "Valores restablecidos: TP = 12, TN = 24, FP = 4 y FN = 6. " +
        "Accuracy = 78.3 %, precision = 75.0 %, recall = 66.7 % y F1-score = 70.6 %.";
    });

    render();
    root.replaceChildren(content);
    root.dataset.initialized = "true";
  }

  document.querySelectorAll(ROOT_SELECTOR).forEach(root => {
    try {
      initialize(root);
    } catch (error) {
      console.error("No se pudo inicializar la evaluación de clasificadores.", error);
    }
  });
})();
