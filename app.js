const START_DATE = "2026-07-10";
const END_DATE = "2026-08-25";
const STORAGE_KEY = "summerRoutineLog";
const REWARD_TARGET_RATE = 90;

const TASKS = [
  { key: "wake", label: "6:00 起床", note: "加点項目" },
  { key: "departure", label: "8:25 出発", note: "勝利条件" },
  { key: "sleep", label: "22:00 就寝", note: "勝利条件" },
  { key: "snsOnlyTransit", label: "SNSは移動中のみ", note: "加点項目" },
  { key: "noNightWork", label: "夜作業なし", note: "加点項目" },
];

let logData = loadData();

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("保存データを読み込めませんでした。", error);
    return {};
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logData));
    updateSaveStatus("保存済み", "ok");
    return true;
  } catch (error) {
    console.error("保存できませんでした。", error);
    updateSaveStatus("保存できませんでした。ブラウザの容量やプライベートモードを確認してください。", "error");
    return false;
  }
}

function updateSaveStatus(message, state = "") {
  const status = document.querySelector("#save-status");
  if (!status) return;
  status.textContent = message;
  status.className = state ? `save-status ${state}` : "save-status";
}

function getEmptyDay() {
  return TASKS.reduce((day, task) => {
    day[task.key] = false;
    return day;
  }, {});
}

function getDayScore(dayData = {}) {
  return TASKS.reduce((score, task) => score + (dayData[task.key] === true ? 1 : 0), 0);
}

function isVictoryDay(dayData = {}) {
  return dayData.departure === true && dayData.sleep === true;
}

function getDateKeysInPeriod() {
  const keys = [];
  const current = new Date(`${START_DATE}T00:00:00`);
  const end = new Date(`${END_DATE}T00:00:00`);

  while (current <= end) {
    keys.push(formatDateKey(current));
    current.setDate(current.getDate() + 1);
  }

  return keys;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function calculateStats() {
  const todayKey = getTodayKey();
  const periodKeys = getDateKeysInPeriod();
  const visibleKeys = periodKeys.filter((key) => key <= todayKey);
  const recordedKeys = visibleKeys.filter((key) => logData[key]);
  const scoredKeys = visibleKeys.length > 0 ? visibleKeys : recordedKeys;
  const rewardTargetWins = Math.ceil((REWARD_TARGET_RATE / 100) * periodKeys.length);
  const victoryDays = visibleKeys.filter((key) => isVictoryDay(logData[key])).length;
  const totalScore = scoredKeys.reduce((sum, key) => sum + getDayScore(logData[key]), 0);
  const totalDays = scoredKeys.length;
  const victoryRate = totalDays === 0 ? 0 : (victoryDays / totalDays) * 100;
  const averageScore = totalDays === 0 ? 0 : totalScore / totalDays;
  const winsNeeded = Math.max(0, rewardTargetWins - victoryDays);

  let currentStreak = 0;
  for (let index = visibleKeys.length - 1; index >= 0; index -= 1) {
    const key = visibleKeys[index];
    if (!isVictoryDay(logData[key])) break;
    currentStreak += 1;
  }

  return {
    victoryDays,
    currentStreak,
    victoryRate,
    averageScore,
    winsNeeded,
    totalDays,
  };
}

function renderToday() {
  const todayKey = getTodayKey();
  const dayData = logData[todayKey] || getEmptyDay();
  const todayDate = document.querySelector("#today-date");
  const checklist = document.querySelector("#checklist");
  const judgement = document.querySelector("#judgement");
  const score = getDayScore(dayData);
  const victory = isVictoryDay(dayData);

  todayDate.dateTime = todayKey;
  todayDate.textContent = new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${todayKey}T00:00:00`));

  let title = "敗北";
  let detail = "8:25出発または22:00就寝がまだ未達成です。";
  let className = "judgement lose";

  if (victory && score === TASKS.length) {
    title = "完全勝利";
    detail = "5/5かつ勝利条件達成。今日はかなりいい日です。";
    className = "judgement perfect";
  } else if (victory) {
    title = "通常勝利";
    detail = "8:25出発と22:00就寝を達成しています。";
    className = "judgement win";
  }

  judgement.className = className;
  judgement.innerHTML = `<strong>${title}</strong><span>${score}/5</span><p>${detail}</p>`;

  checklist.innerHTML = TASKS.map((task) => {
    const checked = dayData[task.key] === true ? "checked" : "";
    return `
      <label class="check-item">
        <input type="checkbox" data-key="${task.key}" ${checked}>
        <span>${task.label}<small>${task.note}</small></span>
      </label>
    `;
  }).join("");

  checklist.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", () => {
      const current = { ...getEmptyDay(), ...(logData[todayKey] || {}) };
      current[input.dataset.key] = input.checked;
      logData[todayKey] = current;
      saveData();
      renderAll();
    });
  });
}

function renderDashboard() {
  const stats = calculateStats();
  const periodLabel = document.querySelector("#period-label");

  periodLabel.textContent = `${formatShortDate(START_DATE)}-${formatShortDate(END_DATE)}`;
  document.querySelector("#victory-days").textContent = `${stats.victoryDays}日`;
  document.querySelector("#current-streak").textContent = `${stats.currentStreak}日`;
  document.querySelector("#victory-rate").textContent = `${Math.round(stats.victoryRate)}%`;
  document.querySelector("#average-score").textContent = `${stats.averageScore.toFixed(1)}/5`;
  document.querySelector("#wins-needed").textContent =
    stats.winsNeeded === 0 ? "達成圏内" : `あと${stats.winsNeeded}勝`;
  document.querySelector("#reward-meter").value = Math.min(100, stats.victoryRate);
}

function renderHistory() {
  const body = document.querySelector("#history-body");
  const todayKey = getTodayKey();
  const rows = getDateKeysInPeriod()
    .filter((key) => key <= todayKey && logData[key])
    .sort((a, b) => b.localeCompare(a));

  if (rows.length === 0) {
    body.innerHTML = `<tr><td class="empty-row" colspan="3">まだ記録がありません。</td></tr>`;
    return;
  }

  body.innerHTML = rows.map((key) => {
    const dayData = logData[key];
    const victory = isVictoryDay(dayData);
    const resultClass = victory ? "win" : "lose";
    const resultText = victory ? "○ 勝利" : "× 敗北";

    return `
      <tr>
        <td>${formatShortDate(key)}</td>
        <td>${getDayScore(dayData)}/5</td>
        <td><span class="result-pill ${resultClass}">${resultText}</span></td>
      </tr>
    `;
  }).join("");
}

function exportJson() {
  const blob = new Blob([JSON.stringify(logData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `summer-routine-log-${getTodayKey()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function importJson(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported || typeof imported !== "object" || Array.isArray(imported)) {
        throw new Error("JSONの形式が正しくありません。");
      }
      logData = imported;
      saveData();
      renderAll();
      alert("JSONをインポートしました。");
    } catch (error) {
      alert(`インポートできませんでした: ${error.message}`);
    }
  });
  reader.readAsText(file);
}

function resetAll() {
  const confirmed = confirm("すべての記録を削除します。よろしいですか？");
  if (!confirmed) return;
  logData = {};
  localStorage.removeItem(STORAGE_KEY);
  renderAll();
}

function bindToolEvents() {
  document.querySelector("#export-button").addEventListener("click", exportJson);
  document.querySelector("#import-file").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) importJson(file);
    event.target.value = "";
  });
  document.querySelector("#reset-button").addEventListener("click", resetAll);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((error) => {
      console.warn("Service Workerを登録できませんでした。", error);
    });
  });
}

function renderAll() {
  renderToday();
  renderDashboard();
  renderHistory();
}

bindToolEvents();
registerServiceWorker();
renderAll();
