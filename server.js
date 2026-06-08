const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");

const port = Number(process.env.PORT || 5173);
const root = __dirname;
const salesStatusCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQb5d7mSvbIIff5AG9yepjIoLgZmbGYAJlb-edpvpxWRmmC8El6T1QcY1b7-sb6F7MXoaWkNmEQChfB/pub?gid=0&single=true&output=csv";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://localhost:${port}`);

    if (url.pathname === "/api/naver-trends") {
      const keyword = url.searchParams.get("keyword");
      const gender = url.searchParams.get("gender") || "";
      const age = url.searchParams.get("age") || "";
      const data = await fetchNaverTrend(keyword, { gender, age });
      sendJson(response, 200, data);
      return;
    }

    if (url.pathname === "/api/sales-status") {
      const data = await fetchSalesStatuses();
      sendJson(response, 200, data);
      return;
    }

    const filePath = safeFilePath(url.pathname);
    fs.readFile(filePath, (error, data) => {
      if (error) {
        sendText(response, 404, "Not found");
        return;
      }

      const ext = path.extname(filePath);
      response.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
      response.end(data);
    });
  } catch (error) {
    sendJson(response, 500, { message: error.message });
  }
}).listen(port, () => {
  console.log(`예상 소진일 계산기: http://localhost:${port}`);
});

function safeFilePath(pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const normalized = path.normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(root, normalized);

  if (!filePath.startsWith(root)) {
    throw new Error("Invalid path");
  }

  return filePath;
}

async function fetchNaverTrend(keyword, filters = {}) {
  if (!keyword) {
    throw new Error("카테고리명이 없습니다.");
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET을 설정해 주세요.");
  }

  const endDate = formatDate(new Date());
  const startDate = formatDate(addDays(new Date(), -365));
  const requestBody = {
    startDate,
    endDate,
    timeUnit: "date",
    keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
  };

  if (filters.gender) requestBody.gender = filters.gender;
  if (filters.age) requestBody.ages = [filters.age];

  const body = JSON.stringify(requestBody);

  const payload = await postJson("https://openapi.naver.com/v1/datalab/search", body, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "X-Naver-Client-Id": clientId,
    "X-Naver-Client-Secret": clientSecret,
  });

  return {
    keyword,
    startDate,
    endDate,
    filterLabel: getFilterLabel(filters),
    data: payload.results?.[0]?.data ?? [],
  };
}

function getFilterLabel(filters) {
  const genderMap = { f: "여성", m: "남성" };
  const ageMap = {
    1: "0~12세",
    2: "13~18세",
    3: "19~24세",
    4: "25~29세",
    5: "30~34세",
    6: "35~39세",
    7: "40~44세",
    8: "45~49세",
    9: "50~54세",
    10: "55~59세",
    11: "60세 이상",
  };
  const gender = genderMap[filters.gender] || "성별 전체";
  const age = ageMap[filters.age] || "연령 전체";
  return `${gender}, ${age}`;
}

function postJson(url, body, headers) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, { method: "POST", headers }, (response) => {
      let raw = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        raw += chunk;
      });
      response.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = { message: raw };
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(parsed.errorMessage || parsed.message || "네이버 API 요청에 실패했습니다."));
          return;
        }

        resolve(parsed);
      });
    });

    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(text);
}

async function fetchSalesStatuses() {
  const csv = await getText(salesStatusCsvUrl);
  const rows = parseCsv(csv);
  const headerRowIndex = findSalesStatusHeaderRow(rows);
  const header = rows[headerRowIndex] ?? [];
  const codeIndex = findColumnIndex(header, [
    "style no",
    "style no.",
    "styleno",
    "styleno.",
    "상품코드",
    "상품 코드",
    "판매자 상품 코드",
    "판매자상품코드",
    "품목코드",
    "코드",
  ], 0);
  const statusIndex = findColumnIndex(header, [
    "판매상태",
    "판매 상태",
    "상태",
    "sales status",
    "salesstatus",
    "status",
  ], codeIndex === 0 ? 1 : -1);
  const seasonIndex = findColumnIndex(header, [
    "시즌",
    "season",
  ]);
  const costKrwIndex = findColumnIndex(header, [
    "원가(원)",
    "원가원",
    "원가",
    "cost krw",
    "krw cost",
  ]);
  const costCnyIndex = findColumnIndex(header, [
    "원가(위안화)",
    "원가위안화",
    "위안화",
    "cost cny",
    "cny cost",
  ]);

  if (codeIndex < 0 || statusIndex < 0) {
    throw new Error("Google Sheets에서 상품코드 또는 판매상태 열을 찾지 못했습니다.");
  }

  const statuses = {};
  const seasons = {};
  const costKrw = {};
  const costCny = {};
  rows.slice(headerRowIndex + 1).forEach((row) => {
    const code = cleanCode(row[codeIndex]);
    if (!code) return;
    statuses[code] = String(row[statusIndex] ?? "").trim();
    seasons[code] = seasonIndex >= 0 ? String(row[seasonIndex] ?? "").trim() : "";
    costKrw[code] = costKrwIndex >= 0 ? parseSheetNumber(row[costKrwIndex]) : 0;
    costCny[code] = costCnyIndex >= 0 ? parseSheetNumber(row[costCnyIndex]) : 0;
  });

  return {
    count: Object.keys(statuses).length,
    statuses,
    seasons,
    costKrw,
    costCny,
  };
}

function findSalesStatusHeaderRow(rows) {
  const index = rows.findIndex((row) => {
    const hasCode = findColumnIndex(row, [
      "style no",
      "style no.",
      "styleno",
      "styleno.",
      "상품코드",
      "판매자 상품 코드",
      "판매자상품코드",
    ]) >= 0;
    const hasStatus = findColumnIndex(row, ["판매상태", "판매 상태", "상태"]) >= 0;
    return hasCode && hasStatus;
  });

  return index >= 0 ? index : 0;
}

function findColumnIndex(header, aliases, fallbackIndex = -1) {
  const aliasKeys = aliases.map(compactHeader);
  const index = header.findIndex((cell) => {
    const key = compactHeader(cell);
    return aliasKeys.some((alias) => key === alias || key.includes(alias));
  });

  if (index >= 0) return index;
  return fallbackIndex >= 0 && fallbackIndex < header.length ? fallbackIndex : -1;
}

function getText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        getText(new URL(response.headers.location, url).toString()).then(resolve, reject);
        return;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        reject(new Error(`Google Sheets CSV 요청에 실패했습니다. (${response.statusCode})`));
        response.resume();
        return;
      }

      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    }).on("error", reject);
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function compactHeader(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s._\-()[\]]/g, "");
}

function cleanCode(value) {
  return String(value ?? "").trim().replace(/[\s-]/g, "").toUpperCase();
}

function parseSheetNumber(value) {
  const number = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}
