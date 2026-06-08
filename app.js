const state = {
  sales: new Map(),
  stock: new Map(),
  inbound: new Map(),
  unshipped: new Map(),
  reorder: new Map(),
  recommendations: new Map(),
  notes: new Map(),
  salesStatuses: new Map(),
  seasons: new Map(),
  costKrw: new Map(),
  costCny: new Map(),
  results: [],
  sortKey: "days",
  sortDirection: "asc",
  statusFilter: "",
};

const columnAliases = {
  code: ["상품코드", "상품 코드", "품목코드", "품번", "sku", "상품번호", "바코드", "코드", "옵션코드", "제품코드"],
  style: ["style no", "styleno", "1-1. style no(라벨출력용)", "1-1.style no(라벨출력용)", "스타일", "스타일번호"],
  color: ["컬러", "9.컬러", "색상"],
  size: ["사이즈", "10.사이즈", "size"],
  name: ["상품명", "제품명", "품명", "옵션명", "상품 이름", "name", "상품명(확정)", "품목명[규격]", "품목명(규격)"],
  sales: ["판매량", "주문수량", "출고수량", "판매수량", "수량", "판매"],
  stock: ["재고", "재고수량", "현재고", "가용재고", "수량"],
  inbound: ["미입고", "입고예정", "입고예정수량", "발주수량", "미입고수량", "미구매수량", "수량"],
  unshipped: ["미발수량", "미발", "미출고", "미배송", "미발주문", "미발수량", "수량"],
};

const elements = {
  salesDays: document.querySelector("#salesDays"),
  baseDate: document.querySelector("#baseDate"),
  warningDays: document.querySelector("#warningDays"),
  searchInput: document.querySelector("#searchInput"),
  exportButton: document.querySelector("#exportButton"),
  resultBody: document.querySelector("#resultBody"),
  trendPanel: document.querySelector(".trendPanel"),
  trendTitle: document.querySelector("#trendTitle"),
  trendChart: document.querySelector("#trendChart"),
  trendStats: document.querySelector("#trendStats"),
  trendLegend: document.querySelector("#trendLegend"),
  trendMessage: document.querySelector("#trendMessage"),
  trendCloseButton: document.querySelector("#trendCloseButton"),
  trendGender: document.querySelector("#trendGender"),
  trendAge: document.querySelector("#trendAge"),
  trendSubcategory: document.querySelector("#trendSubcategory"),
  loadSalesStatusButton: document.querySelector("#loadSalesStatusButton"),
  recommendReorderButton: document.querySelector("#recommendReorderButton"),
  applyRecommendationWrapper: document.querySelector("#applyRecommendationWrapper"),
  applyRecommendationButton: document.querySelector("#applyRecommendationButton"),
  recommendTooltip: document.querySelector("#recommendTooltip"),
  recommendMessage: document.querySelector("#recommendMessage"),
  reorderExportButton: document.querySelector("#reorderExportButton"),
  totalItems: document.querySelector("#totalItems"),
  riskItems: document.querySelector("#riskItems"),
  watchItems: document.querySelector("#watchItems"),
  availableQty: document.querySelector("#availableQty"),
  reorderTotalQty: document.querySelector("#reorderTotalQty"),
  reorderTotalAmount: document.querySelector("#reorderTotalAmount"),
};

const fileInputs = [
  ["sales", document.querySelector("#salesFile"), document.querySelector("#salesStatus")],
  ["stock", document.querySelector("#stockFile"), document.querySelector("#stockStatus")],
  ["inbound", document.querySelector("#inboundFile"), document.querySelector("#inboundStatus")],
  ["unshipped", document.querySelector("#unshippedFile"), document.querySelector("#unshippedStatus")],
];

elements.baseDate.valueAsDate = new Date();

fileInputs.forEach(([kind, input, status]) => {
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    status.textContent = "읽는 중...";
    try {
      const rows = await readWorkbook(file);
      state[kind] = normalizeRows(rows, kind);
      status.textContent = `${state[kind].size.toLocaleString("ko-KR")}개 상품`;
      calculate();
    } catch (error) {
      console.error(error);
      state[kind] = new Map();
      status.textContent = "파일을 읽지 못했습니다";
    }
  });
});

["input", "change"].forEach((eventName) => {
  elements.salesDays.addEventListener(eventName, calculate);
  elements.baseDate.addEventListener(eventName, calculate);
  elements.warningDays.addEventListener(eventName, calculate);
  elements.searchInput.addEventListener(eventName, render);
});

document.querySelector("#resetButton").addEventListener("click", () => {
  state.sales.clear();
  state.stock.clear();
  state.inbound.clear();
  state.unshipped.clear();
  state.reorder.clear();
  state.recommendations.clear();
  state.notes.clear();
  state.salesStatuses.clear();
  state.seasons.clear();
  state.costKrw.clear();
  state.costCny.clear();
  state.results = [];
  fileInputs.forEach(([, input, status]) => {
    input.value = "";
    status.textContent = "대기 중";
  });
  render();
});

document.querySelector("#sampleButton").addEventListener("click", () => {
  state.sales = normalizeRows([
    { "상품코드": "A-1001", "상품명": "데일리 셔츠", "판매량": 120 },
    { "상품코드": "A-1002", "상품명": "코튼 팬츠", "판매량": 42 },
    { "상품코드": "B-2101", "상품명": "라이트 자켓", "판매량": 8 },
    { "상품코드": "C-3302", "상품명": "니트 베스트", "판매량": 0 },
  ], "sales");
  state.stock = normalizeRows([
    { "상품코드": "A-1001", "상품명": "데일리 셔츠", "재고": 62 },
    { "상품코드": "A-1002", "상품명": "코튼 팬츠", "재고": 18 },
    { "상품코드": "B-2101", "상품명": "라이트 자켓", "재고": 4 },
    { "상품코드": "C-3302", "상품명": "니트 베스트", "재고": 50 },
  ], "stock");
  state.inbound = normalizeRows([
    { "상품코드": "A-1001", "미입고": 40 },
    { "상품코드": "A-1002", "미입고": 0 },
    { "상품코드": "B-2101", "미입고": 12 },
  ], "inbound");
  state.unshipped = normalizeRows([
    { "상품코드": "A-1001", "미발수량": 9 },
    { "상품코드": "A-1002", "미발수량": 6 },
    { "상품코드": "B-2101", "미발수량": 1 },
  ], "unshipped");
  fileInputs.forEach(([kind, , status]) => {
    status.textContent = `샘플 ${state[kind].size.toLocaleString("ko-KR")}개 상품`;
  });
  calculate();
});

document.querySelectorAll(".sortButton").forEach((button) => {
  button.addEventListener("click", () => {
    const nextKey = button.dataset.sort;
    if (state.sortKey === nextKey) {
      state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
    } else {
      state.sortKey = nextKey;
      state.sortDirection = defaultSortDirection(nextKey);
    }
    render();
  });
});

document.querySelectorAll(".summaryItem").forEach((button) => {
  button.addEventListener("click", () => {
    state.statusFilter = button.dataset.statusFilter || "";
    render();
  });
});

elements.trendCloseButton.addEventListener("click", () => {
  elements.trendPanel.classList.remove("visible");
});

[elements.trendGender, elements.trendAge].forEach((select) => {
  select.addEventListener("change", () => {
    if (state.currentTrendCategory) {
      loadTrend(state.currentTrendCategory);
    }
  });
});

elements.trendSubcategory.addEventListener("change", () => {
  if (state.currentTrendCategory) {
    loadTrend(state.currentTrendCategory);
  }
});

elements.exportButton.addEventListener("click", () => {
  const header = ["상태", "상품코드", "판매상태", "시즌", "컬러", "사이즈", "상품명", "카테고리", "원가(원)", "원가(위안화)", "추천수량", "리오더수량", "리오더금액", "비고", "판매량", "일평균판매량", "재고", "미입고", "미발수량", "잔여가능수량", "소진까지", "예상소진일"];
  const lines = [header, ...state.results.map((row) => [
    row.statusText,
    row.code,
    row.salesStatus,
    row.season,
    row.color,
    row.size,
    row.name,
    row.category,
    row.costKrw,
    row.costCny,
    row.recommendedReorder,
    row.reorder,
    formatReorderAmount(row),
    row.note,
    row.sales,
    row.dailySales,
    row.stock,
    row.inbound,
    row.unshipped,
    row.available,
    row.daysText,
    row.stockoutDateText,
  ])];
  const csv = lines.map((line) => line.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "예상_소진일_계산결과.csv";
  link.click();
  URL.revokeObjectURL(link.href);
});

elements.reorderExportButton.addEventListener("click", () => {
  const rows = state.results.filter((row) => row.reorder > 0);
  if (!rows.length || !window.XLSX) return;

  const data = rows.map((row) => ({
    상태: row.statusText,
    상품코드: row.code,
    판매상태: row.salesStatus,
    시즌: row.season,
    컬러: row.color,
    사이즈: row.size,
    상품명: row.name,
    카테고리: row.category,
    "원가(원)": row.costKrw,
    "원가(위안화)": row.costCny,
    리오더수량: row.reorder,
    리오더금액: formatReorderAmount(row),
    비고: row.note,
    판매량: row.sales,
    일평균판매량: round(row.dailySales, 2),
    재고: row.stock,
    미입고: row.inbound,
    미발수량: row.unshipped,
    "잔여가능수량(리오더포함)": row.available,
    소진까지: row.daysText,
    예상소진일: row.stockoutDateText,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "리오더");
  const workbookArray = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  addReorderWorkbookStyles(workbookArray).then((styledWorkbook) => {
    saveBlob(styledWorkbook, `리오더_상품_${formatFileDate(new Date())}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  });
});

elements.recommendReorderButton.addEventListener("click", recommendReorders);
elements.applyRecommendationButton.addEventListener("click", applyRecommendations);
elements.applyRecommendationWrapper.addEventListener("mouseenter", showApplyRecommendationTooltip);
elements.applyRecommendationWrapper.addEventListener("mousemove", moveRecommendTooltip);
elements.applyRecommendationWrapper.addEventListener("mouseleave", hideRecommendTooltip);
elements.applyRecommendationButton.addEventListener("focus", showApplyRecommendationTooltip);
elements.applyRecommendationButton.addEventListener("blur", hideRecommendTooltip);
elements.loadSalesStatusButton.addEventListener("click", loadSalesStatuses);

async function loadSalesStatuses() {
  elements.loadSalesStatusButton.disabled = true;
  elements.recommendMessage.textContent = "Google Sheets에서 판매상태를 불러오는 중입니다...";

  try {
    const response = await fetch("/api/sales-status");
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "판매상태를 불러오지 못했습니다.");
    }

    state.salesStatuses = new Map(Object.entries(payload.statuses ?? {}));
    state.seasons = new Map(Object.entries(payload.seasons ?? {}));
    state.costKrw = new Map(Object.entries(payload.costKrw ?? {}));
    state.costCny = new Map(Object.entries(payload.costCny ?? {}));
    calculate();
    elements.recommendMessage.textContent = `${Number(payload.count || 0).toLocaleString("ko-KR")}개 상품의 판매상태를 불러왔습니다.`;
  } catch (error) {
    elements.recommendMessage.textContent = `${error.message} Google Sheets 게시 링크를 확인해 주세요.`;
  } finally {
    elements.loadSalesStatusButton.disabled = false;
  }
}

async function recommendReorders() {
  const candidates = state.results.filter((row) => ["risk", "watch"].includes(row.status.className) && row.dailySales > 0);

  if (!candidates.length) {
    elements.recommendMessage.textContent = "리오더 추천 대상인 위험/주의 상품이 없습니다.";
    return;
  }

  elements.recommendReorderButton.disabled = true;
  elements.recommendMessage.textContent = "네이버 검색추이를 반영해 리오더 수량을 계산하는 중입니다...";

  try {
    const trendMap = await loadTrendMultipliers(candidates);
    const targetDays = Math.max(30, Number(elements.warningDays.value || 14) * 2);
    let updatedCount = 0;
    state.recommendations.clear();

    candidates.forEach((row) => {
      const multiplier = trendMap.get(row.category) ?? 1;
      const baseAvailable = row.stock + row.inbound - row.unshipped;
      const targetQty = row.dailySales * targetDays * multiplier;
      const recommendedQty = Math.max(0, Math.ceil(targetQty - baseAvailable));

      if (recommendedQty > 0) {
        state.recommendations.set(row.code, recommendedQty);
        updatedCount += 1;
      }
    });

    calculate();
    elements.recommendMessage.textContent = `${updatedCount.toLocaleString("ko-KR")}개 위험/주의 상품의 추천 수량을 계산했습니다. 적용하려면 '추천 수량 반영'을 눌러주세요. 기준: 목표 ${targetDays}일, 네이버 최근 30일/1년 평균 보정`;
  } catch (error) {
    elements.recommendMessage.textContent = `${error.message} 네이버 검색추이 연결을 확인해 주세요.`;
  } finally {
    elements.recommendReorderButton.disabled = !state.results.some((row) => ["risk", "watch"].includes(row.status.className) && row.dailySales > 0);
  }
}

function applyRecommendations() {
  let appliedCount = 0;

  state.recommendations.forEach((quantity, code) => {
    if (quantity > 0) {
      state.reorder.set(code, quantity);
      appliedCount += 1;
    }
  });

  calculate();
  elements.recommendMessage.textContent = `${appliedCount.toLocaleString("ko-KR")}개 상품에 추천 수량을 리오더 수량으로 반영했습니다.`;
}

async function loadTrendMultipliers(rows) {
  const categories = [...new Set(rows.map((row) => row.category).filter(Boolean))];
  const pairs = await Promise.all(categories.map(async (category) => {
    const query = new URLSearchParams({
      keyword: category,
      gender: elements.trendGender.value,
      age: elements.trendAge.value,
    });
    const response = await fetch(`/api/naver-trends?${query.toString()}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || `${category} 검색추이를 불러오지 못했습니다.`);
    }

    return [category, calculateTrendMultiplier(payload.data ?? [])];
  }));

  return new Map(pairs);
}

function calculateTrendMultiplier(points) {
  const values = points.map((point) => Number(point.ratio)).filter(Number.isFinite);
  if (!values.length) return 1;

  const yearlyAverage = average(values);
  const recentAverage = average(values.slice(-30));
  if (!yearlyAverage) return 1;

  return clamp(recentAverage / yearlyAverage, 0.75, 1.6);
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function readWorkbook(file) {
  if (!window.XLSX) {
    throw new Error("XLSX library is not loaded");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });
  return rowsFromDetectedHeader(matrix);
}

function normalizeRows(rows, kind) {
  const result = new Map();
  const valueKey = kind === "sales" ? "sales" : kind;

  rows.forEach((rawRow) => {
    const row = normalizeKeys(rawRow);
    const directCode = cleanCode(pickValue(row, columnAliases.code));
    const code = directCode || composeCode(row);
    if (!code) return;

    const name = pickValue(row, columnAliases.name).trim();
    const explicitColor = pickValue(row, columnAliases.color).trim();
    const explicitSize = pickValue(row, columnAliases.size).trim();
    const parsedVariant = parseVariant(code);
    const qty = parseNumber(pickValue(row, columnAliases[valueKey]));
    const existing = result.get(code) ?? { code, name: "", color: "", size: "", qty: 0 };
    existing.name = existing.name || name;
    existing.color = existing.color || explicitColor || parsedVariant.color;
    existing.size = existing.size || explicitSize || parsedVariant.size;
    existing.qty += qty;
    result.set(code, existing);
  });

  return result;
}

function rowsFromDetectedHeader(matrix) {
  const headerIndex = findHeaderIndex(matrix);
  if (headerIndex < 0) return [];

  const headers = matrix[headerIndex].map((cell, index) => normalizeHeader(cell) || `column_${index + 1}`);
  return matrix.slice(headerIndex + 1)
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function findHeaderIndex(matrix) {
  let bestIndex = -1;
  let bestScore = 0;

  matrix.slice(0, 15).forEach((row, index) => {
    const normalized = row.map(normalizeHeader);
    const score = normalized.reduce((sum, header) => {
      if (!header) return sum;
      const matched = Object.values(columnAliases).some((aliases) => aliases.some((alias) => header.includes(normalizeHeader(alias))));
      return sum + (matched ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore >= 2 ? bestIndex : 0;
}

function normalizeKeys(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]),
  );
}

function pickValue(row, aliases) {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return String(row[key]);
    }
  }
  return "";
}

function composeCode(row) {
  const style = pickValue(row, columnAliases.style).trim();
  const color = pickValue(row, columnAliases.color).trim();
  const size = pickValue(row, columnAliases.size).trim();

  if (!style || !color || !size) return "";
  return cleanCode(`${style}${color}${size}`);
}

function normalizeHeader(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s/g, "");
}

function cleanCode(value) {
  return String(value ?? "").trim().replace(/[\s-]/g, "").toUpperCase();
}

function baseStyleCode(code) {
  const match = cleanCode(code).match(/^([A-Z]{2}\d{2}[A-Z]{2}\d{3})/);
  return match ? match[1] : cleanCode(code);
}

function parseNumber(value) {
  const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function calculate() {
  const codes = new Set([
    ...state.sales.keys(),
    ...state.stock.keys(),
    ...state.inbound.keys(),
    ...state.unshipped.keys(),
  ]);
  const salesDays = Math.max(1, Number(elements.salesDays.value) || 30);
  const warningDays = Math.max(1, Number(elements.warningDays.value) || 14);
  const baseDate = elements.baseDate.valueAsDate || new Date();

  state.results = Array.from(codes).map((code) => {
    const sales = state.sales.get(code)?.qty ?? 0;
    const dailySales = sales / salesDays;
    const stock = state.stock.get(code)?.qty ?? 0;
    const inbound = state.inbound.get(code)?.qty ?? 0;
    const unshipped = state.unshipped.get(code)?.qty ?? 0;
    const reorder = state.reorder.get(code) ?? 0;
    const recommendedReorder = state.recommendations.get(code) ?? 0;
    const note = state.notes.get(code) ?? "";
    const styleCode = baseStyleCode(code);
    const salesStatus = state.salesStatuses.get(code) ?? state.salesStatuses.get(styleCode) ?? "";
    const season = state.seasons.get(code) ?? state.seasons.get(styleCode) ?? "";
    const costKrw = parseNumber(state.costKrw.get(code) ?? state.costKrw.get(styleCode));
    const costCny = parseNumber(state.costCny.get(code) ?? state.costCny.get(styleCode));
    const reorderAmount = reorder > 0 && costKrw > 0 ? reorder * costKrw : 0;
    const reorderAmountCny = reorder > 0 && costCny > 0 ? reorder * costCny : 0;
    const available = stock + inbound + reorder - unshipped;
    const days = dailySales > 0 ? available / dailySales : Infinity;
    const name = pickDisplayName(code);
    const variant = pickVariant(code);
    const category = categorizeProduct(name);
    const stockoutDate = Number.isFinite(days) ? addDays(baseDate, Math.max(0, Math.ceil(days))) : null;
    const status = getStatus(available, dailySales, days, warningDays);

    return {
      code,
      salesStatus,
      season,
      color: variant.color,
      size: variant.size,
      name,
      category,
      costKrw,
      costCny,
      recommendedReorder,
      reorder,
      reorderAmount,
      reorderAmountCny,
      note,
      sales,
      dailySales,
      stock,
      inbound,
      unshipped,
      available,
      days,
      daysText: Number.isFinite(days) ? `${Math.max(0, days).toFixed(1)}일` : "판매 없음",
      stockoutTime: stockoutDate ? stockoutDate.getTime() : Infinity,
      stockoutDateText: stockoutDate ? formatDate(stockoutDate) : "-",
      status,
      statusText: status.label,
    };
  });

  render();
}

function getStatus(available, dailySales, days, warningDays) {
  if (available <= 0) return { className: "risk", label: "위험" };
  if (dailySales <= 0) return { className: "neutral", label: "판매없음" };
  if (days <= warningDays) return { className: "risk", label: "위험" };
  if (days <= warningDays * 2) return { className: "watch", label: "주의" };
  return { className: "ok", label: "정상" };
}

function render() {
  const keyword = elements.searchInput.value.trim().toLowerCase();
  const rows = keyword
    ? state.results.filter((row) => `${row.code} ${row.salesStatus} ${row.season} ${row.color} ${row.size} ${row.name} ${row.category}`.toLowerCase().includes(keyword))
    : state.results;
  const filteredRows = state.statusFilter
    ? rows.filter((row) => row.status.className === state.statusFilter)
    : rows;
  const sortedRows = sortRows(filteredRows);

  elements.totalItems.textContent = state.results.length.toLocaleString("ko-KR");
  elements.riskItems.textContent = state.results.filter((row) => row.status.className === "risk").length.toLocaleString("ko-KR");
  elements.watchItems.textContent = state.results.filter((row) => row.status.className === "watch").length.toLocaleString("ko-KR");
  elements.availableQty.textContent = state.results.reduce((sum, row) => sum + row.available, 0).toLocaleString("ko-KR");
  elements.reorderTotalQty.textContent = state.results.reduce((sum, row) => sum + row.reorder, 0).toLocaleString("ko-KR");
  elements.reorderTotalAmount.textContent = formatReorderTotalAmount();
  elements.exportButton.disabled = state.results.length === 0;
  elements.recommendReorderButton.disabled = !state.results.some((row) => ["risk", "watch"].includes(row.status.className) && row.dailySales > 0);
  elements.applyRecommendationButton.disabled = state.recommendations.size === 0;
  updateApplyRecommendationTooltip();
  elements.reorderExportButton.disabled = !state.results.some((row) => row.reorder > 0);

  updateSortButtons();
  updateSummaryFilters();

  if (sortedRows.length === 0) {
    elements.resultBody.innerHTML = `<tr class="emptyRow"><td colspan="22">${state.results.length ? "검색 결과가 없습니다." : "엑셀 파일을 업로드하면 결과가 표시됩니다."}</td></tr>`;
    return;
  }

  elements.resultBody.innerHTML = sortedRows.map((row) => `
    <tr>
      <td><span class="badge ${row.status.className}">${row.status.label}</span></td>
      <td>${escapeHtml(row.code)}</td>
      <td>${renderSalesStatus(row.salesStatus)}</td>
      <td>${escapeHtml(row.season)}</td>
      <td>${escapeHtml(row.color)}</td>
      <td>${escapeHtml(row.size)}</td>
      <td>${escapeHtml(row.name)}</td>
      <td><button class="categoryButton" type="button" data-category="${escapeHtml(row.category)}">${escapeHtml(row.category)}</button></td>
      <td>${row.costKrw ? formatNumber(row.costKrw) : ""}</td>
      <td>${row.costCny ? formatNumber(row.costCny, 2) : ""}</td>
      <td>
        <span class="recommendValue">${row.recommendedReorder ? formatNumber(row.recommendedReorder) : ""}</span>
        ${row.recommendedReorder ? `<button class="applyRowRecommendation" type="button" data-code="${escapeHtml(row.code)}">반영</button>` : ""}
      </td>
      <td><input class="reorderInput" type="number" min="0" step="1" inputmode="numeric" data-code="${escapeHtml(row.code)}" value="${row.reorder || ""}" aria-label="${escapeHtml(row.code)} 리오더 수량" /></td>
      <td>${renderReorderAmount(row)}</td>
      <td><input class="noteInput" type="text" data-code="${escapeHtml(row.code)}" value="${escapeHtml(row.note)}" aria-label="${escapeHtml(row.code)} 비고" /></td>
      <td>${formatNumber(row.sales)}</td>
      <td>${formatNumber(row.dailySales, 2)}</td>
      <td>${formatNumber(row.stock)}</td>
      <td>${formatNumber(row.inbound)}</td>
      <td>${formatNumber(row.unshipped)}</td>
      <td>${formatNumber(row.available)}</td>
      <td>${row.daysText}</td>
      <td>${row.stockoutDateText}</td>
    </tr>
  `).join("");

  elements.resultBody.querySelectorAll(".categoryButton").forEach((button) => {
    button.addEventListener("click", () => loadTrend(button.dataset.category));
  });
  elements.resultBody.querySelectorAll(".reorderInput").forEach((input) => {
    input.addEventListener("change", () => updateReorder(input));
    input.addEventListener("blur", () => updateReorder(input));
  });
  elements.resultBody.querySelectorAll(".noteInput").forEach((input) => {
    input.addEventListener("input", () => updateNote(input));
  });
  elements.resultBody.querySelectorAll(".applyRowRecommendation").forEach((button) => {
    button.addEventListener("click", () => applyRecommendationForCode(button.dataset.code));
    button.addEventListener("mouseenter", (event) => showRowRecommendationTooltip(event, button.dataset.code));
    button.addEventListener("mousemove", moveRecommendTooltip);
    button.addEventListener("mouseleave", hideRecommendTooltip);
    button.addEventListener("focus", (event) => showRowRecommendationTooltip(event, button.dataset.code));
    button.addEventListener("blur", hideRecommendTooltip);
  });
}

function updateNote(input) {
  const code = input.dataset.code;
  const note = input.value.trim();

  if (note) {
    state.notes.set(code, note);
  } else {
    state.notes.delete(code);
  }
}

function renderSalesStatus(value) {
  if (!value) return "";
  const className = /품절|중지|단종|소진/i.test(value) ? "salesStatusBadge salesStatusWarning" : "salesStatusBadge";
  return `<span class="${className}">${escapeHtml(value)}</span>`;
}

function applyRecommendationForCode(code) {
  const quantity = state.recommendations.get(code) ?? 0;
  if (quantity <= 0) return;

  state.reorder.set(code, quantity);
  calculate();
  elements.recommendMessage.textContent = `${code} 상품에 추천 수량 ${quantity.toLocaleString("ko-KR")}개를 반영했습니다.`;
}

function getRowRecommendationTooltipText(code) {
  const row = state.results.find((item) => item.code === code);
  const recommended = state.recommendations.get(code) ?? 0;

  if (!row || recommended <= 0) {
    return "추천 수량이 없습니다.";
  }

  if (row.dailySales <= 0) {
    return `${code}\n추천 수량: ${recommended.toLocaleString("ko-KR")}개\n판매량이 없어 소진일을 계산할 수 없습니다.`;
  }

  const baseDate = elements.baseDate.valueAsDate || new Date();
  const projectedAvailable = row.stock + row.inbound + recommended - row.unshipped;
  const projectedDays = projectedAvailable / row.dailySales;
  const projectedDate = addDays(baseDate, Math.max(0, Math.ceil(projectedDays)));

  return [
    `${code} 추천 반영 시`,
    `추천 수량: ${recommended.toLocaleString("ko-KR")}개`,
    `소진까지: ${Math.max(0, projectedDays).toFixed(1)}일`,
    `예상 소진일: ${formatDate(projectedDate)}`,
  ].join("\n");
}

function updateSummaryFilters() {
  document.querySelectorAll(".summaryItem").forEach((button) => {
    button.classList.toggle("active", (button.dataset.statusFilter || "") === state.statusFilter);
  });
}

function getApplyRecommendationTooltipText() {
  if (!state.recommendations.size) {
    return "먼저 리오더 추천을 실행해 주세요.";
  }

  const baseDate = elements.baseDate.valueAsDate || new Date();
  const previews = state.results
    .filter((row) => (state.recommendations.get(row.code) ?? 0) > 0 && row.dailySales > 0)
    .map((row) => {
      const recommended = state.recommendations.get(row.code) ?? 0;
      const projectedAvailable = row.stock + row.inbound + recommended - row.unshipped;
      const projectedDays = projectedAvailable / row.dailySales;
      const projectedDate = addDays(baseDate, Math.max(0, Math.ceil(projectedDays)));

      return {
        code: row.code,
        days: projectedDays,
        date: formatDate(projectedDate),
      };
    })
    .sort((a, b) => a.days - b.days);

  if (!previews.length) {
    return "추천 수량 반영 후 계산할 대상이 없습니다.";
  }

  const lines = previews.slice(0, 8).map((item) => `${item.code}: ${Math.max(0, item.days).toFixed(1)}일 / ${item.date}`);
  const extraCount = previews.length - lines.length;
  return [
    "추천 수량 반영 시 예상:",
    ...lines,
    extraCount > 0 ? `외 ${extraCount.toLocaleString("ko-KR")}개 상품` : "",
  ].filter(Boolean).join("\n");
}

function updateApplyRecommendationTooltip() {
  elements.applyRecommendationButton.title = getApplyRecommendationTooltipText();
  if (!elements.recommendTooltip.hidden) {
    elements.recommendTooltip.textContent = getApplyRecommendationTooltipText();
  }
}

function showApplyRecommendationTooltip(event) {
  elements.recommendTooltip.textContent = getApplyRecommendationTooltipText();
  elements.recommendTooltip.hidden = false;
  moveRecommendTooltip(event);
}

function showRowRecommendationTooltip(event, code) {
  elements.recommendTooltip.textContent = getRowRecommendationTooltipText(code);
  elements.recommendTooltip.hidden = false;
  moveRecommendTooltip(event);
}

function moveRecommendTooltip(event) {
  if (elements.recommendTooltip.hidden) return;

  const offset = 14;
  const tooltip = elements.recommendTooltip;
  const targetRect = event?.currentTarget?.getBoundingClientRect?.() ?? elements.applyRecommendationWrapper.getBoundingClientRect();
  const clientX = event?.clientX ?? targetRect.left;
  const clientY = event?.clientY ?? targetRect.bottom;
  const nextLeft = Math.min(clientX + offset, window.innerWidth - tooltip.offsetWidth - 12);
  const nextTop = Math.min(clientY + offset, window.innerHeight - tooltip.offsetHeight - 12);
  tooltip.style.left = `${Math.max(12, nextLeft)}px`;
  tooltip.style.top = `${Math.max(12, nextTop)}px`;
}

function hideRecommendTooltip() {
  elements.recommendTooltip.hidden = true;
}

function updateReorder(input) {
  const code = input.dataset.code;
  const quantity = Math.max(0, Math.floor(parseNumber(input.value)));

  if (quantity > 0) {
    state.reorder.set(code, quantity);
    input.value = quantity;
  } else {
    state.reorder.delete(code);
    input.value = "";
  }

  calculate();
}

async function loadTrend(category) {
  const previousCategory = state.currentTrendCategory;
  state.currentTrendCategory = category;
  if (previousCategory !== category) {
    setSubcategoryOptions(category);
  }

  const keyword = elements.trendSubcategory.value || category;
  elements.trendPanel.classList.add("visible");
  elements.trendTitle.textContent = `${keyword} 최근 1년 검색추이`;
  elements.trendMessage.textContent = "네이버 검색추이를 불러오는 중입니다...";
  elements.trendStats.hidden = true;
  elements.trendLegend.hidden = true;
  drawTrendChart([]);

  try {
    const query = new URLSearchParams({
      keyword,
      gender: elements.trendGender.value,
      age: elements.trendAge.value,
    });
    const response = await fetch(`/api/naver-trends?${query.toString()}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "검색추이를 불러오지 못했습니다.");
    }

    const trendData = payload.data ?? [];
    if (!trendData.length) {
      throw new Error("선택한 조건의 검색추이 데이터가 없습니다.");
    }

    drawTrendChart(trendData, keyword);
    renderTrendStats(trendData);
    elements.trendLegend.hidden = false;
    elements.trendLegend.innerHTML = `<span>${escapeHtml(keyword)}</span><span>${escapeHtml(keyword)}</span>`;
    elements.trendMessage.textContent = `${payload.startDate} ~ ${payload.endDate} / ${payload.filterLabel} / 네이버 DataLab 기준 상대 지수`;
  } catch (error) {
    drawTrendChart([]);
    elements.trendStats.hidden = true;
    elements.trendLegend.hidden = true;
    elements.trendMessage.textContent = `${error.message} 로컬 서버 실행과 네이버 API 키 설정이 필요합니다.`;
  }
}

function renderTrendStats(points) {
  const values = points.map((point) => Number(point.ratio)).filter(Number.isFinite);
  const latest = values.at(-1) ?? 0;
  const recentAverage = average(values.slice(-30));
  const yearlyAverage = average(values);
  const change = yearlyAverage ? ((recentAverage / yearlyAverage) - 1) * 100 : 0;

  elements.trendStats.hidden = false;
  elements.trendStats.innerHTML = `
    <div><span>최근 검색지수</span><strong>${latest.toFixed(1)}</strong></div>
    <div><span>최근 30일 평균</span><strong>${recentAverage.toFixed(1)}</strong></div>
    <div><span>1년 평균</span><strong>${yearlyAverage.toFixed(1)}</strong></div>
    <div><span>30일 변화율</span><strong>${change >= 0 ? "+" : ""}${change.toFixed(1)}%</strong></div>
  `;
}

function setSubcategoryOptions(category) {
  const options = getSubcategories(category);
  elements.trendSubcategory.innerHTML = "";
  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = option.label;
    elements.trendSubcategory.appendChild(item);
  });
  elements.trendSubcategory.disabled = false;
}

function getSubcategories(category) {
  const map = {
    세트: ["셋업", "투피스", "상하세트", "트레이닝세트"],
    티셔츠: ["반팔티셔츠", "긴팔티셔츠", "라운드티", "브이넥티", "프린트티셔츠"],
    블라우스: ["시스루블라우스", "셔링블라우스", "프릴블라우스", "타이블라우스"],
    셔츠: ["여성셔츠", "루즈핏셔츠", "스트라이프셔츠", "데님셔츠"],
    팬츠: ["슬랙스", "와이드팬츠", "데님팬츠", "밴딩팬츠"],
    스커트: ["롱스커트", "플리츠스커트", "미니스커트", "데님스커트"],
    원피스: ["롱원피스", "셔츠원피스", "니트원피스", "플라워원피스"],
    자켓: ["여성자켓", "블레이저", "트위드자켓", "린넨자켓"],
    점퍼: ["여성점퍼", "바람막이", "야상점퍼", "패딩점퍼"],
    코트: ["트렌치코트", "핸드메이드코트", "롱코트", "하프코트"],
    가디건: ["여성가디건", "니트가디건", "크롭가디건", "롱가디건"],
    니트: ["여성니트", "니트티", "반팔니트", "브이넥니트"],
    베스트: ["니트베스트", "여성베스트", "조끼", "패딩베스트"],
    액세서리: ["여성가방", "스카프", "벨트", "모자"],
    기타: [],
  };
  const children = map[category] ?? [];
  return [
    { label: `${category} 전체`, value: "" },
    ...children.map((item) => ({ label: item, value: item })),
  ];
}

function drawTrendChart(points, keyword = "") {
  const canvas = elements.trendChart;
  const context = canvas.getContext("2d");
  const pixelRatio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const displayWidth = rect.width || 1080;
  const displayHeight = 320;

  canvas.width = Math.floor(displayWidth * pixelRatio);
  canvas.height = Math.floor(displayHeight * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const padding = { top: 30, right: 30, bottom: 72, left: 58 };
  const chartWidth = displayWidth - padding.left - padding.right;
  const height = displayHeight;
  const chartHeight = height - padding.top - padding.bottom;

  context.clearRect(0, 0, displayWidth, height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, displayWidth, height);
  context.strokeStyle = "#e5e7eb";
  context.lineWidth = 1;
  context.font = "11px Segoe UI, sans-serif";
  context.fillStyle = "#344054";

  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (chartHeight / 4) * i;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(displayWidth - padding.right, y);
    context.stroke();
    context.fillText(String(100 - i * 25), 18, y + 4);
  }

  for (let i = 0; i <= 10; i += 1) {
    const x = padding.left + (chartWidth / 10) * i;
    context.beginPath();
    context.moveTo(x, padding.top);
    context.lineTo(x, padding.top + chartHeight);
    context.stroke();
  }

  context.strokeStyle = "#00c73c";
  context.lineWidth = 2;

  if (!points.length) {
    context.fillStyle = "#667085";
    context.fillText("표시할 검색추이 데이터가 없습니다.", padding.left + 12, padding.top + 30);
    return;
  }

  const maxValue = Math.max(100, ...points.map((point) => Number(point.ratio) || 0));
  const xStep = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;

  context.beginPath();
  points.forEach((point, index) => {
    const x = padding.left + xStep * index;
    const ratio = Number(point.ratio) || 0;
    const y = padding.top + chartHeight - (ratio / maxValue) * chartHeight;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();

  context.fillStyle = "#111827";
  getMonthlyLabelIndexes(points).forEach((index, labelOrder) => {
    const x = padding.left + xStep * index;
    const label = points[index]?.period ?? "";
    drawTrendDateLabel(context, label, Math.min(x, displayWidth - padding.right - 46), height - 46, labelOrder);
  });

  const latest = points[points.length - 1];
  if (latest) {
    context.fillStyle = "#111827";
    context.font = "13px Segoe UI, sans-serif";
    context.fillText(`${keyword || "검색어"} 최근 지수 ${Number(latest.ratio).toFixed(1)}`, padding.left, 18);
  }
}

function getMonthlyLabelIndexes(points) {
  const indexes = [];
  let previousMonth = "";

  points.forEach((point, index) => {
    const date = new Date(point.period);
    if (Number.isNaN(date.getTime())) return;

    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    if (monthKey !== previousMonth) {
      indexes.push(index);
      previousMonth = monthKey;
    }
  });

  const lastIndex = points.length - 1;
  if (lastIndex >= 0 && indexes[indexes.length - 1] !== lastIndex) {
    indexes.push(lastIndex);
  }

  return indexes;
}

function drawTrendDateLabel(context, value, x, y, order = 0) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    context.fillText(value, x, y);
    return;
  }

  const yOffset = order % 2 === 0 ? 0 : 16;
  context.fillText(`${date.getMonth() + 1}.${date.getDate()}.`, x, y + yOffset);
  if (date.getMonth() === 0 || x < 56) {
    context.fillStyle = "#667085";
    context.fillText(String(date.getFullYear()), x, y + yOffset + 14);
    context.fillStyle = "#111827";
  }
}

function sortRows(rows) {
  const direction = state.sortDirection === "desc" ? -1 : 1;
  const key = state.sortKey;

  return [...rows].sort((a, b) => {
    const reorderPriority = Number(b.reorder > 0) - Number(a.reorder > 0);
    if (reorderPriority !== 0) return reorderPriority;

    const first = sortValue(a, key);
    const second = sortValue(b, key);
    let result;

    if (typeof first === "number" && typeof second === "number") {
      result = first - second;
    } else {
      result = String(first ?? "").localeCompare(String(second ?? ""), "ko-KR", {
        numeric: true,
        sensitivity: "base",
      });
    }

    if (result === 0) {
      result = String(a.code).localeCompare(String(b.code), "ko-KR", { numeric: true });
    }

    return result * direction;
  });
}

function sortValue(row, key) {
  if (key === "statusText") {
    const order = { 위험: 1, 주의: 2, 정상: 3, 판매없음: 4 };
    return order[row.statusText] ?? 99;
  }

  if (["costKrw", "costCny", "sales", "dailySales", "stock", "inbound", "unshipped", "available", "days", "stockoutTime", "reorder", "reorderAmount", "recommendedReorder"].includes(key)) {
    const value = Number(row[key]);
    return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
  }

  return row[key] ?? "";
}

function updateSortButtons() {
  document.querySelectorAll(".sortButton").forEach((button) => {
    button.classList.toggle("asc", button.dataset.sort === state.sortKey && state.sortDirection === "asc");
    button.classList.toggle("desc", button.dataset.sort === state.sortKey && state.sortDirection === "desc");
    if (button.dataset.sort === state.sortKey) {
      button.setAttribute("aria-sort", state.sortDirection === "asc" ? "ascending" : "descending");
    } else {
      button.removeAttribute("aria-sort");
    }
  });
}

function defaultSortDirection(key) {
  return ["costKrw", "costCny", "sales", "dailySales", "stock", "inbound", "unshipped", "available", "reorder", "reorderAmount", "recommendedReorder"].includes(key) ? "desc" : "asc";
}

function pickDisplayName(code) {
  return (
    state.sales.get(code)?.name ||
    state.unshipped.get(code)?.name ||
    state.inbound.get(code)?.name ||
    state.stock.get(code)?.name ||
    ""
  );
}

function pickVariant(code) {
  const fallback = parseVariant(code);
  const source =
    state.sales.get(code) ||
    state.unshipped.get(code) ||
    state.inbound.get(code) ||
    state.stock.get(code) ||
    {};

  return {
    color: source.color || fallback.color,
    size: source.size || fallback.size,
  };
}

function parseVariant(code) {
  const normalized = cleanCode(code);
  if (normalized.length < 4) return { color: "", size: "" };

  return {
    color: normalized.slice(-4, -2),
    size: normalized.slice(-2),
  };
}

function categorizeProduct(name) {
  const text = String(name ?? "").replace(/\s/g, "").toLowerCase();
  const rules = [
    ["세트", ["세트", "셋업", "투피스", "3종"]],
    ["티셔츠", ["티셔츠", "t셔츠", "반팔", "긴팔", "라운드넥", "브이넥"]],
    ["블라우스", ["블라우스"]],
    ["셔츠", ["셔츠", "남방"]],
    ["팬츠", ["팬츠", "바지", "슬랙스", "데님", "진"]],
    ["스커트", ["스커트", "치마"]],
    ["원피스", ["원피스", "드레스"]],
    ["자켓", ["자켓", "재킷", "블레이저"]],
    ["점퍼", ["점퍼", "야상", "패딩"]],
    ["코트", ["코트", "트렌치"]],
    ["가디건", ["가디건"]],
    ["니트", ["니트", "스웨터"]],
    ["베스트", ["베스트", "조끼"]],
    ["액세서리", ["가방", "백", "벨트", "스카프", "모자"]],
  ];

  for (const [category, keywords] of rules) {
    if (keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      return category;
    }
  }

  return "기타";
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(date);
}

function formatNumber(value, digits = 0) {
  return Number(value).toLocaleString("ko-KR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatReorderAmount(row) {
  if (!row.reorderAmount && !row.reorderAmountCny) return "";

  const krw = row.reorderAmount ? `${formatNumber(row.reorderAmount)}원` : "";
  const cny = row.reorderAmountCny ? `${formatNumber(row.reorderAmountCny, 2)}위안` : "";

  if (krw && cny) return `${krw} (${cny})`;
  return krw || `(${cny})`;
}

function renderReorderAmount(row) {
  if (!row.reorderAmount && !row.reorderAmountCny) return "";

  const krw = row.reorderAmount ? `${formatNumber(row.reorderAmount)}원` : "";
  const cny = row.reorderAmountCny ? `(${formatNumber(row.reorderAmountCny, 2)}위안)` : "";

  return `<span class="reorderAmountText">${escapeHtml(krw)}${cny ? `<small>${escapeHtml(cny)}</small>` : ""}</span>`;
}

function formatReorderTotalAmount() {
  const totalKrw = state.results.reduce((sum, row) => sum + row.reorderAmount, 0);
  const totalCny = state.results.reduce((sum, row) => sum + row.reorderAmountCny, 0);
  const krw = totalKrw ? `${formatNumber(totalKrw)}원` : "0원";
  const cny = totalCny ? ` (${formatNumber(totalCny, 2)}위안)` : "";
  return `${krw}${cny}`;
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function formatFileDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function saveBlob(data, filename, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function addReorderWorkbookStyles(workbookArray) {
  if (!window.JSZip) {
    return new Blob([workbookArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  const zip = new JSZip();
  return zip.loadAsync(workbookArray)
    .then((loadedZip) => Promise.all([
      loadedZip.file("xl/styles.xml").async("string"),
      loadedZip.file("xl/worksheets/sheet1.xml").async("string"),
    ]).then(([stylesXml, sheetXml]) => {
      const styled = appendHighlightStyle(stylesXml);
      loadedZip.file("xl/styles.xml", styled.stylesXml);
      loadedZip.file("xl/worksheets/sheet1.xml", applyColumnStyle(sheetXml, ["B", "K"], styled.styleIndex));
      return loadedZip.generateAsync({ type: "blob" });
    }))
    .catch(() => new Blob([workbookArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

function appendHighlightStyle(stylesXml) {
  const fillMatch = stylesXml.match(/<fills count="(\d+)">([\s\S]*?)<\/fills>/);
  const cellXfsMatch = stylesXml.match(/<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/);

  if (!fillMatch || !cellXfsMatch) {
    return { stylesXml, styleIndex: 0 };
  }

  const fillIndex = Number(fillMatch[1]);
  const styleIndex = Number(cellXfsMatch[1]);
  const fillXml = '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill>';
  const xfXml = `<xf numFmtId="0" fontId="0" fillId="${fillIndex}" borderId="0" xfId="0" applyFill="1"/>`;

  const nextStylesXml = stylesXml
    .replace(/<fills count="(\d+)">/, `<fills count="${fillIndex + 1}">`)
    .replace("</fills>", `${fillXml}</fills>`)
    .replace(/<cellXfs count="(\d+)">/, `<cellXfs count="${styleIndex + 1}">`)
    .replace("</cellXfs>", `${xfXml}</cellXfs>`);

  return { stylesXml: nextStylesXml, styleIndex };
}

function applyColumnStyle(sheetXml, columns, styleIndex) {
  return sheetXml.replace(/<c r="([A-Z]+)(\d+)"([^>]*)>/g, (match, column, row, attrs) => {
    if (!columns.includes(column) || Number(row) < 2) return match;

    const nextAttrs = attrs.replace(/\s+s="[^"]*"/, "");
    return `<c r="${column}${row}"${nextAttrs} s="${styleIndex}">`;
  });
}

render();
