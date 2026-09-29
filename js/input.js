const monthList = Array.from({ length: 12 }, (_, index) => {
  const monthNumber = index + 1;
  return {
    key: `2026-${monthNumber.toString().padStart(2, '0')}`,
    label: `2026年${monthNumber}月`
  };
});

const employeeNames = [
  '社員Ａ', '社員Ｂ', '社員Ｃ'
];

// 祝日設定 テスト用 アナログだけど…
const holidaySet = new Set([
  '2026-01-01', // 元日
  '2026-01-12', // 成人の日
  '2026-02-11', // 建国記念の日
  '2026-02-23', // 天皇誕生日
  '2026-03-20', // 春分の日
  '2026-04-29', // 昭和の日
  '2026-05-03', // 憲法記念日
  '2026-05-04', // みどりの日
  '2026-05-05', // こどもの日
  '2026-05-06', // 振替休日
  '2026-07-20', // 海の日
  '2026-08-11', // 山の日
  '2026-09-21', // 秋分の日
  '2026-09-22', // 振替休日
  '2026-10-12', // スポーツの日
  '2026-11-03', // 文化の日
  '2026-11-23', // 勤労感謝の日
]);

// DOM要素
const employeeSelect = document.getElementById('employeeSelect');
const monthSelectButton = document.getElementById('monthSelectButton');
const selectedMonthLabel = document.getElementById('selectedMonthLabel');
const inputButton = document.getElementById('inputButton');
const registerButton = document.getElementById('registerButton');
const cancelButton = document.getElementById('cancelButton');
const calendarSection = document.getElementById('calendarSection');

const monthModalOverlay = document.getElementById('monthModalOverlay');
const monthModalCloseButton = document.getElementById('monthModalCloseButton');
const monthListContainer = document.getElementById('monthListContainer');

const detailModalOverlay = document.getElementById('detailModalOverlay');
const modalCloseButton = document.getElementById('modalCloseButton');
const modalPlannedButton = document.getElementById('modalPlannedButton');
const modalConfirmedButton = document.getElementById('modalConfirmedButton');
const modalEmployeeName = document.getElementById('modalEmployeeName');
const modalStartDate = document.getElementById('modalStartDate');
const modalEndDate = document.getElementById('modalEndDate');
const modalVehicle = document.getElementById('modalVehicle');
const modalLocation = document.getElementById('modalLocation');
const modalStartTime = document.getElementById('modalStartTime');
const modalEndTime = document.getElementById('modalEndTime');
const modalRemarks = document.getElementById('modalRemarks');

const confirmModalOverlay = document.getElementById('confirmModalOverlay');
const confirmYesButton = document.getElementById('confirmYesButton');
const confirmNoButton = document.getElementById('confirmNoButton');

const cancelModalOverlay = document.getElementById('cancelModalOverlay');
const cancelModalCloseButton = document.getElementById('cancelModalCloseButton');
const cancelDate = document.getElementById('cancelDate');
const cancelExecuteButton = document.getElementById('cancelExecuteButton');
const cancelBackButton = document.getElementById('cancelBackButton');

// 状態管理
let selectedEmployee = '';
let selectedMonthKey = '';
let scheduleData = {};

// localStorage キー
const STORAGE_KEY = 'workSchedule';
// GAS Web App の URL を設定すると、登録内容を一括で送信できる。
// デプロイを管理からコピーしたウェブアプリのURLを貼り付ける
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyHs1unfXtZqRvSdElMIeKum3DeYcGGNmRL5rJcR_F69qRPlzfh6JjyDBce9qW09K6vMw/exec';

// 初期化
async function init() {
  await loadScheduleData();
  setupEventListeners();
  renderMonthSelector();
}

// ハンバーガーメニュー
const menuButton = document.getElementById('menuButton');
const menuPanel = document.getElementById('menuPanel');

if (menuButton && menuPanel && menuOverlay) {
  menuButton.addEventListener('click', () => {
    menuPanel.classList.toggle('hidden');
    menuOverlay.classList.toggle('hidden');
  });
  menuOverlay.addEventListener('click', () => {
    menuPanel.classList.add('hidden');
    menuOverlay.classList.add('hidden');
  });
}

// GASのlist APIから取得した予約を入力画面で扱う形式に変換する。
function buildScheduleDataFromReservations(reservations) {
  const data = {};
  if (!Array.isArray(reservations)) return data;

  reservations.forEach((item) => {
    const date = String(item.date || '').trim();
    const employee = String(item.employee || '').trim();
    if (!date || !employee) return;

    const monthKey = date.slice(0, 7);
    const dayKey = String(parseInt(date.slice(8, 10), 10));
    if (!data[monthKey]) data[monthKey] = {};
    if (!data[monthKey][employee]) data[monthKey][employee] = {};

    data[monthKey][employee][dayKey] = {
      ...item,
      startDate: item.startDate || date,
      endDate: item.endDate || date,
      status: item.status === 'confirmed' || item.status === '確定'
        ? 'confirmed'
        : 'planned'
    };
  });

  return data;
}

// GASのlist APIから予約データを取得し、入力画面の状態を更新する。
async function loadScheduleData() {
  if (!GAS_WEB_APP_URL) {
    scheduleData = {};
    return;
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
      body: JSON.stringify({ operation: 'list' }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'GASからデータを取得できませんでした。');
    }

    scheduleData = buildScheduleDataFromReservations(result.reservations);
  } catch (error) {
    console.error(error);
    scheduleData = {};
  }
}

function setupEventListeners() {
  employeeSelect.addEventListener('change', (e) => {
    selectedEmployee = e.target.value;
    updateRegisterButtonState();
    renderCalendar();
  });

  monthSelectButton.addEventListener('click', openMonthModal);
  inputButton.addEventListener('click', openDetailModal);
  cancelButton.addEventListener('click', openCancelModal);
  monthModalCloseButton.addEventListener('click', closeMonthModal);
  monthModalOverlay.addEventListener('click', (e) => {
    if (e.target === monthModalOverlay) closeMonthModal();
  });

  modalCloseButton.addEventListener('click', closeDetailModal);
  detailModalOverlay.addEventListener('click', (e) => {
    if (e.target === detailModalOverlay) closeDetailModal();
  });

  modalPlannedButton.addEventListener('click', () => saveDetailForm('planned'));
  modalConfirmedButton.addEventListener('click', () => saveDetailForm('confirmed'));

  registerButton.addEventListener('click', openConfirmDialog);

  cancelModalCloseButton.addEventListener('click', closeCancelModal);
  cancelBackButton.addEventListener('click', closeCancelModal);
  cancelExecuteButton.addEventListener('click', executeCancel);
  cancelModalOverlay.addEventListener('click', (e) => {
    if (e.target === cancelModalOverlay) closeCancelModal();
  });

  confirmYesButton.addEventListener('click', confirmRegister);
  confirmNoButton.addEventListener('click', closeConfirmDialog);
  confirmModalOverlay.addEventListener('click', (e) => {
    if (e.target === confirmModalOverlay) closeConfirmDialog();
  });
}

function updateRegisterButtonState() {
  const isReady = Boolean(selectedEmployee && selectedMonthKey);
  inputButton.disabled = !isReady;
  registerButton.disabled = !isReady;
  cancelButton.disabled = !isReady;
}

function renderMonthSelector() {
  monthListContainer.innerHTML = '';
  monthList.forEach((month) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = month.label;
    button.className = selectedMonthKey === month.key ? 'active' : '';
    button.addEventListener('click', () => {
      selectedMonthKey = month.key;
      selectedMonthLabel.textContent = month.label;
      updateRegisterButtonState();
      renderCalendar();
      closeMonthModal();
    });
    monthListContainer.appendChild(button);
  });
}

function openMonthModal() {
  if (!selectedEmployee) {
    alert('先に社員名を選択してください。');
    return;
  }
  renderMonthSelector();
  monthModalOverlay.classList.remove('hidden');
}

function closeMonthModal() {
  monthModalOverlay.classList.add('hidden');
}

function getDaysInMonth(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).getDay();
}

function getWeekday(year, month, day) {
  return ['日', '月', '火', '水', '木', '金', '土'][new Date(year, month - 1, day).getDay()];
}

function formatTimeRange(entry) {
  if (entry.startTime || entry.endTime) {
    return `${entry.startTime || '--:--'}-${entry.endTime || '--:--'}`;
  }
  return entry.time || '-';
}

function getStatusClass(entry) {
  if (entry.status === 'planned') return ' status-planned';
  if (entry.status === 'confirmed') return ' status-confirmed';
  return '';
}

// カレンダーを作る関数
function renderCalendar() {
  if (!selectedEmployee || !selectedMonthKey) {
    calendarSection.innerHTML = '';
    return;
  }

  const [year, month] = selectedMonthKey.split('-').map(Number);
  const daysInMonth = getDaysInMonth(selectedMonthKey);
  const firstDayOfMonth = getFirstDayOfMonth(selectedMonthKey);

  let html = `<div class="calendar-container">`;
  html += `<div class="calendar-header">${selectedMonthKey.replace('-', '年')}月</div>`;

  // 曜日ラベル
  html += `<div class="calendar-weekdays">`;
  const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];
  weekdayLabels.forEach((label) => {
    html += `<div class="weekday-label">${label}</div>`;
  });
  html += `</div>`;

  // カレンダーグリッド
  html += `<div class="calendar-grid">`;

  // 前月の埋め込みセル
  for (let i = 0; i < firstDayOfMonth; i++) {
    html += `<div class="calendar-cell other-month"></div>`;
  }

  // 当月のセル
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const weekday = getWeekday(year, month, day);
    const isHoliday = holidaySet.has(dateKey);

    let cellClass = 'calendar-cell';
    let cellContent = `<div class="cell-day">${day}</div>`;

    // 土日祝の色分け
    if (isHoliday) {
      cellClass += ' weekday-holiday';
    } else if (weekday === '日') {
      cellClass += ' weekend-sun';
    } else if (weekday === '土') {
      cellClass += ' weekend-sat';
    }

    // 登録済みデータを確認
    const entry = getScheduleEntry(selectedEmployee, day);
    if (entry) {
      cellClass += ` registered${getStatusClass(entry)}`;
      cellContent += `<div class="cell-time">${formatTimeRange(entry)}</div>`;
      cellContent += `<div class="cell-location">${entry.location || '-'}</div>`;
    }

    html += `<div class="${cellClass}" data-date="${dateKey}">${cellContent}</div>`;
  }

  // 翌月の埋め込みセル
  const totalCells = firstDayOfMonth + daysInMonth;
  const remainingCells = (Math.ceil(totalCells / 7) * 7) - totalCells;
  for (let i = 0; i < remainingCells; i++) {
    html += `<div class="calendar-cell other-month"></div>`;
  }

  html += `</div>`;
  html += `</div>`;

  calendarSection.innerHTML = html;
  document.querySelectorAll('.calendar-cell[data-date]').forEach((cell) => {
    cell.addEventListener('click', () => {
      openDetailModal(cell.dataset.date);
    });
  });
}

function getScheduleEntry(employee, day) {
  const dayStr = day.toString();
  if (
    scheduleData[selectedMonthKey] &&
    scheduleData[selectedMonthKey][employee] &&
    scheduleData[selectedMonthKey][employee][dayStr]
  ) {
    return scheduleData[selectedMonthKey][employee][dayStr];
  }
  return null;
}

function getDefaultDateForSelectedMonth() {
  return selectedMonthKey ? `${selectedMonthKey}-01` : '';
}

// 入力フォームのモーダルを作る関数
function openDetailModal(dateKey) {
  if (!selectedEmployee || !selectedMonthKey) return;

  const day = parseInt(dateKey.slice(8, 10), 10);
  const existingEntry = getScheduleEntry(selectedEmployee, day);
  modalEmployeeName.textContent = selectedEmployee;
  // 日付はカレンダーでクリックした値に設定
  modalStartDate.value = existingEntry?.startDate || dateKey;
  modalEndDate.value = existingEntry?.endDate || dateKey;
  modalVehicle.value = existingEntry?.vehicle || '';
  modalLocation.value = existingEntry?.location || '';
  modalStartTime.value = existingEntry?.startTime || '09:00';
  modalEndTime.value = existingEntry?.endTime || '17:00';
  modalRemarks.value = existingEntry?.remarks || '';

  detailModalOverlay.classList.remove('hidden');
}

function closeDetailModal() {
  detailModalOverlay.classList.add('hidden');
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function saveEntryForDate(date, entry) {
  // ローカル状態に予約IDを保持し、編集時にも同じIDを維持する。
  const monthKey = formatDateKey(date).slice(0, 7);
  const dayKey = String(date.getDate());
  const existingEntry = getScheduleEntry(selectedEmployee, dayKey);
  const reservationId = String(existingEntry?.reservationId || entry.reservationId || '').trim();

  if (!scheduleData[monthKey]) {
    scheduleData[monthKey] = {};
  }
  if (!scheduleData[monthKey][selectedEmployee]) {
    scheduleData[monthKey][selectedEmployee] = {};
  }

  scheduleData[monthKey][selectedEmployee][dayKey] = {
    ...entry,
    reservationId: reservationId || generateReservationId(),
    date: formatDateKey(date)
  };
}

function generateReservationId() {
  // 新規予約に対して、GAS側で更新・削除できるよう予約IDを発行する。
  const timestamp = Date.now().toString();
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `R-${timestamp}-${randomPart}`;
}

function normalizeStatusForGas(status) {
  if (status === 'confirmed') return '確定';
  return '予定';
}

function buildScheduleRecordForDate(date, entry) {
  // GASへ送る予約レコードに予約IDと車両情報を含め、重複判定と更新処理を正しく行えるようにする。
  return {
    reservationId: String(entry.reservationId || '').trim(),
    employee: entry.employee || selectedEmployee,
    vehicle: String(entry.vehicle || '').trim(),
    date: formatDateKey(date),
    startTime: entry.startTime || '',
    endTime: entry.endTime || '',
    location: entry.location || '',
    remarks: entry.remarks || '',
    status: normalizeStatusForGas(entry.status)
  };
}

// GASへJSON配列を1回だけ送信する。
async function postScheduleRecordsToGas(records) {
  if (!GAS_WEB_APP_URL) {
    console.warn('GAS Web App URL is not configured. Skipping POST.');
    return null;
  }

  const response = await fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
    },
    body: JSON.stringify({
      operation: 'save',
      records,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) {
    const error = new Error(result.error || 'GASへの送信に失敗しました。');
    error.conflicts = Array.isArray(result.conflicts) ? result.conflicts : [];
    throw error;
  }

  return result;
}

function formatGasConflictMessage(error) {
  const conflicts = Array.isArray(error?.conflicts) ? error.conflicts : [];
  if (!conflicts.length) {
    return error?.message || 'GASへの送信に失敗しました。';
  }

  const conflictText = conflicts.slice(0, 3).map((conflict) => {
    const reservationId = conflict.reservationId ? String(conflict.reservationId) : '不明';
    const vehicle = conflict.vehicle || '車両';
    const startDateTime = conflict.startDateTime ? conflict.startDateTime.replace('T', ' ') : '不明';
    const endDateTime = conflict.endDateTime ? conflict.endDateTime.replace('T', ' ') : '不明';
    return `・${vehicle} ${startDateTime} ～ ${endDateTime}（予約ID: ${reservationId}）`;
  }).join('\n');

  return `この車両は既存予約と時間が重複しています。\n${conflictText}`;
}

async function saveDetailForm(status) {
  if (!selectedEmployee || !selectedMonthKey) return;

  const startDateValue = modalStartDate.value;
  const endDateValue = modalEndDate.value;

  if (!startDateValue || !endDateValue) {
    alert('開始日と終了日を入力してください。');
    return;
  }

  if (!modalVehicle.value.trim()) {
    alert('車両名を入力してください。');
    return;
  }

  const startDate = parseLocalDate(startDateValue);
  const endDate = parseLocalDate(endDateValue);

  if (startDate > endDate) {
    alert('終了日は開始日以降の日付を入力してください。');
    return;
  }

  const entry = {
    employee: selectedEmployee,
    vehicle: modalVehicle.value,
    startDate: startDateValue,
    endDate: endDateValue,
    location: modalLocation.value,
    startTime: modalStartTime.value,
    endTime: modalEndTime.value,
    status,
    remarks: modalRemarks.value
  };

  const records = [];
  const pendingEntries = [];
  for (let current = new Date(startDate); current <= endDate; current.setDate(current.getDate() + 1)) {
    const dayKey = String(current.getDate());
    const existingEntry = getScheduleEntry(selectedEmployee, dayKey);
    const entryForDate = {
      ...entry,
      reservationId: String(existingEntry?.reservationId || entry.reservationId || '').trim() || generateReservationId(),
    };

    records.push(buildScheduleRecordForDate(current, entryForDate));
    pendingEntries.push({ date: new Date(current), entry: entryForDate });
  }

  closeDetailModal();

  try {
    const result = await postScheduleRecordsToGas(records);
    if (!result || result.ok === false) {
      throw new Error((result && result.error) || 'GASへの送信に失敗しました。');
    }

    pendingEntries.forEach(({ date, entry }) => {
      saveEntryForDate(date, entry);
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scheduleData));
    renderCalendar();
  } catch (error) {
    console.error(error);
    alert(formatGasConflictMessage(error));
  }
}

function openCancelModal() {
  if (!selectedEmployee || !selectedMonthKey) return;

  cancelDate.value = getDefaultDateForSelectedMonth();
  cancelModalOverlay.classList.remove('hidden');
}

function closeCancelModal() {
  cancelModalOverlay.classList.add('hidden');
}

async function executeCancel() {
  if (!cancelDate.value) {
    alert('取消日を入力してください。');
    return;
  }

  const targetMonthKey = cancelDate.value.slice(0, 7);
  const targetDay = String(parseInt(cancelDate.value.slice(8, 10), 10));
  const confirmed = confirm(`${cancelDate.value}の勤務内容を消去します。よろしいですか？`);

  if (!confirmed) return;

  const targetEntry = scheduleData[targetMonthKey] &&
    scheduleData[targetMonthKey][selectedEmployee] &&
    scheduleData[targetMonthKey][selectedEmployee][targetDay];

  if (targetEntry) {
    // 予約IDを使って削除対象を特定し、即時送信のまま削除する。
    const reservationIds = String(targetEntry.reservationId || '').trim()
      ? [String(targetEntry.reservationId).trim()]
      : [];

    try {
      const resp = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({
          operation: 'deleteByIds',
          reservationIds: reservationIds,
        }),
      });
      const result = await resp.json().catch(() => ({}));
      if (!resp.ok || result.ok === false) {
        throw new Error(result.error || 'GAS deletion failed');
      }
    } catch (err) {
      console.error(err);
      alert('スプレッドシートの削除に失敗しました: ' + (err.message || err));
      return;
    }

    delete scheduleData[targetMonthKey][selectedEmployee][targetDay];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scheduleData));
  }

  closeCancelModal();
  renderCalendar();
}

function openConfirmDialog() {
  confirmModalOverlay.classList.remove('hidden');
}

function closeConfirmDialog() {
  confirmModalOverlay.classList.add('hidden');
}

function confirmRegister() {
  // localStorage に保存
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scheduleData));

  closeConfirmDialog();

  // ユーザーへの確認メッセージ
  alert('登録しました！管理者ページで確認できます。');

  // 管理者ページにリダイレクト
  window.location.href = 'index.html';
}

// 初期化
init();
