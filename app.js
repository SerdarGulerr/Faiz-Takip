/**
 * Aile Günlük Faiz & Kasa Takip Uygulaması
 * Tamamen yerel (offline) çalışan, günlük bileşik faiz motoru.
 */

// Varsayılan Kişiler ve Veri Yapısı
const DEFAULT_STATE = {
  members: [
    { id: 'me', name: 'Ben', avatar: 'avatar-me' },
    { id: 'daughter', name: 'Kızım', avatar: 'avatar-daughter' },
    { id: 'wife', name: 'Eşim', avatar: 'avatar-wife' }
  ],
  transactions: [
    {
      id: 'tx_init_1',
      memberId: 'me',
      type: 'deposit',
      amount: 100000,
      date: getDaysAgoDate(15),
      note: 'İlk hesap açılışı'
    },
    {
      id: 'tx_init_2',
      memberId: 'wife',
      type: 'deposit',
      amount: 80000,
      date: getDaysAgoDate(15),
      note: 'Birikim aktarımı'
    },
    {
      id: 'tx_init_3',
      memberId: 'daughter',
      type: 'deposit',
      amount: 30000,
      date: getDaysAgoDate(10),
      note: 'Harçlık hesabı'
    }
  ],
  rateHistory: [
    {
      id: 'rate_init_1',
      date: getDaysAgoDate(15),
      annualRate: 48.0
    }
  ],
  taxRate: 17.5 // %17.5 Yasal Gelir Vergisi (Stopaj) Kesintisi
};

let appState = null;

// Helper: X gün öncesinin YYYY-MM-DD tarihini al
function getDaysAgoDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// Helper: Bugünün YYYY-MM-DD tarihi
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format: 12345.67 -> 12.345,67 ₺
function formatTL(num) {
  if (isNaN(num)) return '0,00 ₺';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num) + ' ₺';
}

// Format Date: 2026-10-23 -> 23 Eki 2026
function formatDateTR(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(d);
}

// --- LocalStorage State Management ---
function loadState() {
  try {
    const raw = localStorage.getItem('faiz_takip_data_v1');
    if (raw) {
      appState = JSON.parse(raw);
      if (typeof appState.taxRate === 'undefined') {
        appState.taxRate = 17.5;
        saveState();
      }
    } else {
      appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
      saveState();
    }
  } catch (e) {
    console.error('Veri yüklenemedi, varsayılan yüklendi', e);
    appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

function saveState() {
  localStorage.setItem('faiz_takip_data_v1', JSON.stringify(appState));
}

// --- Faiz Hesaplama Motoru (Bileşik Günlük Faiz) ---
// "Girdiğim oran ben değiştirene kadar bir önceki günün oranını kullanmaya devam edecek"
function calculateLedger() {
  const today = getTodayDateString();
  const membersMap = {};
  
  appState.members.forEach(m => {
    membersMap[m.id] = {
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      principal: 0,       // Net yatırılan anapara (Yatırılan - Çekilen)
      balance: 0,         // Anapara + bugüne kadar biriken faiz
      totalProfit: 0,     // Toplam biriken faiz
      todayProfit: 0      // Bugünkü 1 günlük faiz kazancı
    };
  });

  const taxRate = typeof appState.taxRate === 'number' ? appState.taxRate : 17.5;

  // Tarihleri sırala
  const rates = [...appState.rateHistory].sort((a, b) => a.date.localeCompare(b.date));
  const txs = [...appState.transactions].sort((a, b) => a.date.localeCompare(b.date));

  // Eğer hiç işlem yoksa
  if (txs.length === 0) {
    const latestRate = rates.length > 0 ? rates[rates.length - 1].annualRate : 0;
    return {
      members: Object.values(membersMap),
      totalBalance: 0,
      totalPrincipal: 0,
      totalProfit: 0,
      todayProfit: 0,
      todayGross: 0,
      todayTax: 0,
      totalTax: 0,
      taxRate: taxRate,
      currentRate: latestRate,
      dailyLogs: []
    };
  }

  // İlk işlem tarihinden bugüne kadar olan günleri belirle
  const startDateStr = txs[0].date;
  let currentDateObj = new Date(startDateStr);
  const targetDateObj = new Date(today);

  // Gün gün döngü için
  const dailyLogs = [];
  let txIndex = 0;

  // Verilen bir tarih için geçerli olan son oranı bulur
  function getRateForDate(dStr) {
    let activeRate = 0;
    for (const r of rates) {
      if (r.date <= dStr) {
        activeRate = r.annualRate;
      } else {
        break;
      }
    }
    return activeRate;
  }

  // Günlük simülasyon döngüsü (Bankacılık Gecelik Faiz / Valör Kuralı)
  // Kural: 22 Eylül'de yatırılan paranın faizi 22 gecesi işler, ilk getiri 23 Eylül sabahı hesaba geçer.
  while (currentDateObj <= targetDateObj) {
    const dStr = currentDateObj.toISOString().split('T')[0];

    // O gün geçerli olan yıllık brüt faiz oranını al
    const annualRate = getRateForDate(dStr);
    const dailyRate = (annualRate / 100) / 365;

    // 1. DÜN GECEDEN DEVREDEN BAKİYE ÜZERİNDEN SABAH HESABA YATAN FAİZ
    let dayTotalGross = 0;
    let dayTotalTax = 0;
    let dayTotalNet = 0;
    const memberSnapshots = {};

    for (const mId in membersMap) {
      const mem = membersMap[mId];
      let grossGain = 0;
      let taxAmount = 0;
      let netGain = 0;

      // Dün geceden devreden bakiye varsa bu sabah faizi yansır
      if (mem.balance > 0) {
        grossGain = mem.balance * dailyRate;
        taxAmount = grossGain * (taxRate / 100);
        netGain = grossGain - taxAmount;
      }

      // Hesaba ve kasaya net getiri eklenir (Bileşik büyüme)
      mem.balance += netGain;
      mem.totalProfit += netGain;
      mem.totalTax = (mem.totalTax || 0) + taxAmount;
      mem.todayProfit = netGain;
      mem.todayGross = grossGain;
      mem.todayTax = taxAmount;

      dayTotalGross += grossGain;
      dayTotalTax += taxAmount;
      dayTotalNet += netGain;

      memberSnapshots[mId] = {
        balance: mem.balance,
        grossGain: grossGain,
        taxAmount: taxAmount,
        netGain: netGain
      };
    }

    // 2. GÜN İÇİNDE YAPILAN PARA YATIRMA / ÇEKME HAREKETLERİ
    // (Bugün yatırılan para gün sonu bakiyesine eklenir, faizi yarın sabah yansır)
    while (txIndex < txs.length && txs[txIndex].date === dStr) {
      const tx = txs[txIndex];
      const member = membersMap[tx.memberId];
      if (member) {
        if (tx.type === 'deposit') {
          member.principal += tx.amount;
          member.balance += tx.amount;
        } else if (tx.type === 'withdraw') {
          member.principal -= tx.amount;
          member.balance -= tx.amount;
        }
        if (memberSnapshots[tx.memberId]) {
          memberSnapshots[tx.memberId].balance = member.balance;
        }
      }
      txIndex++;
    }

    let dailyTotalBalance = 0;
    for (const mId in membersMap) {
      dailyTotalBalance += membersMap[mId].balance;
    }

    dailyLogs.unshift({
      date: dStr,
      annualRate: annualRate,
      taxRate: taxRate,
      dayTotalGross: dayTotalGross,
      dayTotalTax: dayTotalTax,
      dayTotalNet: dayTotalNet,
      totalBalance: dailyTotalBalance,
      memberSnapshots: memberSnapshots
    });

    // Sonraki güne geç
    currentDateObj.setDate(currentDateObj.getDate() + 1);
  }

  // Genel Toplamlar
  let grandTotalBalance = 0;
  let grandTotalPrincipal = 0;
  let grandTotalProfit = 0;
  let grandTodayProfit = 0;
  let grandTodayGross = 0;
  let grandTodayTax = 0;
  let grandTotalTax = 0;

  for (const mId in membersMap) {
    const mem = membersMap[mId];
    grandTotalBalance += mem.balance;
    grandTotalPrincipal += mem.principal;
    grandTotalProfit += mem.totalProfit;
    grandTodayProfit += mem.todayProfit;
    grandTodayGross += mem.todayGross || 0;
    grandTodayTax += mem.todayTax || 0;
    grandTotalTax += mem.totalTax || 0;
  }

  const currentActiveRate = getRateForDate(today);

  return {
    members: Object.values(membersMap),
    totalBalance: grandTotalBalance,
    totalPrincipal: grandTotalPrincipal,
    totalProfit: grandTotalProfit,
    todayProfit: grandTodayProfit,
    todayGross: grandTodayGross,
    todayTax: grandTodayTax,
    totalTax: grandTotalTax,
    taxRate: taxRate,
    currentRate: currentActiveRate,
    dailyLogs: dailyLogs
  };
}

// --- UI Render Metotları ---
function renderUI() {
  const result = calculateLedger();

  // Header & Tarih
  const dateEl = document.getElementById('currentDateDisplay');
  if (dateEl) {
    const today = new Date();
    dateEl.innerText = new Intl.DateTimeFormat('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(today);
  }

  // Hero Stats
  document.getElementById('displayTotalBalance').innerText = formatTL(result.totalBalance);
  document.getElementById('displayTodayInterest').innerText = '+' + formatTL(result.todayProfit);
  const taxDetailEl = document.getElementById('displayTodayTaxDetail');
  if (taxDetailEl) {
    taxDetailEl.innerText = `(Stopaj %${result.taxRate}: -${formatTL(result.todayTax)})`;
  }
  document.getElementById('displayTotalPrincipal').innerText = formatTL(result.totalPrincipal);
  document.getElementById('displayTotalProfit').innerText = '+' + formatTL(result.totalProfit);
  document.getElementById('displayCurrentRate').innerText = `%${result.currentRate.toFixed(2)}`;
  document.getElementById('memberCountTag').innerText = `${result.members.length} Kişi`;

  // Render Member Cards
  const membersContainer = document.getElementById('membersContainer');
  membersContainer.innerHTML = '';

  result.members.forEach(m => {
    const sharePercent = result.totalBalance > 0 ? ((m.balance / result.totalBalance) * 100).toFixed(1) : '0.0';
    const initial = m.name.charAt(0).toUpperCase();

    const card = document.createElement('div');
    card.className = 'member-card';
    card.innerHTML = `
      <div class="member-header">
        <div class="member-info">
          <div class="member-avatar ${m.avatar || 'avatar-other'}">${initial}</div>
          <div>
            <div class="member-name">${m.name}</div>
            <span class="member-share-pill">%${sharePercent} Pay</span>
          </div>
        </div>
        <div class="member-balance-box">
          <div class="member-balance">${formatTL(m.balance)}</div>
          <div class="member-daily-gain">+${formatTL(m.todayProfit)} / gün</div>
        </div>
      </div>

      <div class="share-bar-container">
        <div class="share-bar-fill" style="width: ${sharePercent}%; background: ${getAvatarColor(m.avatar)};"></div>
      </div>

      <div class="member-footer-stats">
        <span>Yatırılan: <strong>${formatTL(m.principal)}</strong></span>
        <span>Net Faiz: <strong class="gain-val">+${formatTL(m.totalProfit)}</strong></span>
      </div>
    `;
    membersContainer.appendChild(card);
  });

  // Render Person Selector in Deposit Modal
  const personSelector = document.getElementById('personSelector');
  personSelector.innerHTML = '';
  appState.members.forEach((m, idx) => {
    const label = document.createElement('label');
    label.className = 'segment-opt';
    label.innerHTML = `
      <input type="radio" name="personSelect" value="${m.id}" ${idx === 0 ? 'checked' : ''}>
      <span>${m.name}</span>
    `;
    personSelector.appendChild(label);
  });

  // Render Rate History in Rates Modal
  renderRateHistoryList();
}

function getAvatarColor(avatarClass) {
  if (avatarClass === 'avatar-daughter') return '#ec4899';
  if (avatarClass === 'avatar-wife') return '#8b5cf6';
  if (avatarClass === 'avatar-me') return '#3b82f6';
  return '#f59e0b';
}

// Render Rate History inside Rates Modal
function renderRateHistoryList() {
  const container = document.getElementById('rateHistoryList');
  if (!container) return;
  container.innerHTML = '';

  const sortedRates = [...appState.rateHistory].sort((a, b) => b.date.localeCompare(a.date));
  if (sortedRates.length === 0) {
    container.innerHTML = '<p class="field-hint">Henüz oran kaydı yok.</p>';
    return;
  }

  sortedRates.forEach(r => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <span><strong>%${r.annualRate.toFixed(2)}</strong> (${formatDateTR(r.date)} tarihinden itibaren)</span>
      <button class="btn-del" onclick="deleteRate('${r.id}')" title="Bu oranı sil">&times;</button>
    `;
    container.appendChild(item);
  });
}

// Render Daily Report Table
function renderDailyReport() {
  const result = calculateLedger();
  const theadRow = document.querySelector('#dailyReportTable thead tr');
  
  // Header sütunlarını dinamik yap
  let thHtml = `
    <th>Tarih</th>
    <th>Brüt Oran</th>
    <th>Brüt Faiz</th>
    <th>Stopaj (%${result.taxRate})</th>
    <th>Net Faiz</th>
  `;
  appState.members.forEach(m => {
    thHtml += `<th>${m.name}</th>`;
  });
  thHtml += `<th>Toplam Kasa</th>`;
  theadRow.innerHTML = thHtml;

  const tbody = document.getElementById('dailyReportBody');
  tbody.innerHTML = '';

  if (result.dailyLogs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 20px;">Kayıtlı işlem bulunamadı.</td></tr>';
    return;
  }

  result.dailyLogs.forEach(log => {
    const tr = document.createElement('tr');
    let rowHtml = `
      <td><strong>${formatDateTR(log.date)}</strong></td>
      <td>%${log.annualRate.toFixed(2)}</td>
      <td>+${formatTL(log.dayTotalGross)}</td>
      <td style="color: #fca5a5;">-${formatTL(log.dayTotalTax)}</td>
      <td style="color: var(--emerald); font-weight: 700;">+${formatTL(log.dayTotalNet)}</td>
    `;

    appState.members.forEach(m => {
      const snap = log.memberSnapshots[m.id];
      const bal = snap ? snap.balance : 0;
      rowHtml += `<td>${formatTL(bal)}</td>`;
    });

    rowHtml += `<td><strong>${formatTL(log.totalBalance)}</strong></td>`;
    tr.innerHTML = rowHtml;
    tbody.appendChild(tr);
  });
}

// Render Transactions History Modal
function renderTxHistory() {
  const container = document.getElementById('txHistoryContainer');
  container.innerHTML = '';

  const sortedTxs = [...appState.transactions].sort((a, b) => b.date.localeCompare(a.date));
  if (sortedTxs.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding:20px; color: var(--text-muted);">Henüz para yatırma/çekme işlemi yok.</p>';
    return;
  }

  sortedTxs.forEach(tx => {
    const member = appState.members.find(m => m.id === tx.memberId) || { name: 'Bilinmeyen' };
    const isDeposit = tx.type === 'deposit';

    const item = document.createElement('div');
    item.className = 'tx-item';
    item.innerHTML = `
      <div class="tx-left">
        <span class="tx-person">${member.name} ${tx.note ? `<small style="font-weight: normal; color: var(--text-dim);">(${tx.note})</small>` : ''}</span>
        <span class="tx-meta">${formatDateTR(tx.date)} &bull; ${isDeposit ? 'Yatırıldı' : 'Çekildi'}</span>
      </div>
      <div class="tx-right">
        <span class="tx-amount ${isDeposit ? 'deposit' : 'withdraw'}">
          ${isDeposit ? '+' : '-'}${formatTL(tx.amount)}
        </span>
        <button class="btn-del" onclick="deleteTx('${tx.id}')" title="İşlemi Sil">&times;</button>
      </div>
    `;
    container.appendChild(item);
  });
}

// Render Settings Modal
function renderSettings() {
  const container = document.getElementById('membersManagerList');
  container.innerHTML = '';

  appState.members.forEach(m => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <span><strong>${m.name}</strong></span>
      ${appState.members.length > 1 ? `<button class="btn-del" onclick="deleteMember('${m.id}')" title="Kişiyi Sil">&times;</button>` : ''}
    `;
    container.appendChild(item);
  });
}

// --- Form & Action Handlers ---
function handleDepositSubmit(e) {
  e.preventDefault();
  const personRadio = document.querySelector('input[name="personSelect"]:checked');
  const txTypeRadio = document.querySelector('input[name="txType"]:checked');
  const amountInput = document.getElementById('inputAmount');
  const dateInput = document.getElementById('inputTxDate');
  const noteInput = document.getElementById('inputNote');

  if (!personRadio || !amountInput.value || !dateInput.value) return;

  const newTx = {
    id: 'tx_' + Date.now(),
    memberId: personRadio.value,
    type: txTypeRadio.value,
    amount: parseFloat(amountInput.value),
    date: dateInput.value,
    note: noteInput.value.trim()
  };

  appState.transactions.push(newTx);
  saveState();
  renderUI();
  closeModal('modalDeposit');
  e.target.reset();
}

function handleRateSubmit(e) {
  e.preventDefault();
  const rateInput = document.getElementById('inputRate');
  const dateInput = document.getElementById('inputRateDate');
  const taxInput = document.getElementById('inputTaxRate');

  if (!rateInput.value || !dateInput.value) return;

  if (taxInput && taxInput.value) {
    appState.taxRate = parseFloat(taxInput.value);
  }

  const newRate = {
    id: 'rate_' + Date.now(),
    date: dateInput.value,
    annualRate: parseFloat(rateInput.value)
  };

  // Varsa aynı tarihteki kaydı güncelle, yoksa ekle
  const existingIdx = appState.rateHistory.findIndex(r => r.date === newRate.date);
  if (existingIdx >= 0) {
    appState.rateHistory[existingIdx].annualRate = newRate.annualRate;
  } else {
    appState.rateHistory.push(newRate);
  }

  saveState();
  renderUI();
  closeModal('modalRates');
}

function deleteTx(txId) {
  if (confirm('Bu para hareketini silmek istediğinize emin misiniz?')) {
    appState.transactions = appState.transactions.filter(t => t.id !== txId);
    saveState();
    renderUI();
    renderTxHistory();
  }
}

function deleteRate(rateId) {
  if (appState.rateHistory.length <= 1) {
    alert('En az 1 adet faiz oranı kaydı bulunmalıdır.');
    return;
  }
  if (confirm('Bu faiz oranını silmek istediğinize emin misiniz?')) {
    appState.rateHistory = appState.rateHistory.filter(r => r.id !== rateId);
    saveState();
    renderUI();
  }
}

function addNewMember() {
  const input = document.getElementById('inputNewMemberName');
  const name = input.value.trim();
  if (!name) return;

  const id = 'mem_' + Date.now();
  appState.members.push({
    id: id,
    name: name,
    avatar: 'avatar-other'
  });

  input.value = '';
  saveState();
  renderUI();
  renderSettings();
}

function deleteMember(memberId) {
  const hasTx = appState.transactions.some(t => t.memberId === memberId);
  if (hasTx) {
    alert('Bu kişiye ait para hareketleri var! Önce geçmişten bu kişinin işlemlerini silmelisiniz.');
    return;
  }
  if (confirm('Bu kişiyi listeden çıkarmak istediğinize emin misiniz?')) {
    appState.members = appState.members.filter(m => m.id !== memberId);
    saveState();
    renderUI();
    renderSettings();
  }
}

// Backup & Restore
function exportDataBackup() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `AileFaiz_Yedek_${getTodayDateString()}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}

function importDataBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const imported = JSON.parse(evt.target.result);
      if (imported.members && imported.transactions && imported.rateHistory) {
        appState = imported;
        saveState();
        renderUI();
        renderSettings();
        alert('Yedek başarıyla yüklendi!');
      } else {
        alert('Geçersiz yedek dosyası formatı!');
      }
    } catch (err) {
      alert('Dosya okunamadı: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function resetAllData() {
  if (confirm('DİKKAT: Tüm işlemler, faiz oranları ve kişiler sıfırlanacak! Emin misiniz?')) {
    localStorage.removeItem('faiz_takip_data_v1');
    loadState();
    renderUI();
    closeModal('modalSettings');
    alert('Veriler sıfırlandı.');
  }
}

// Modal Kontrolleri
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.showModal();
    // Default tarihleri bugün yap
    const today = getTodayDateString();
    if (id === 'modalDeposit') {
      const dInput = document.getElementById('inputTxDate');
      if (dInput && !dInput.value) dInput.value = today;
    }
    if (id === 'modalRates') {
      const rInput = document.getElementById('inputRateDate');
      if (rInput && !rInput.value) rInput.value = today;
      const taxInput = document.getElementById('inputTaxRate');
      if (taxInput) taxInput.value = typeof appState.taxRate === 'number' ? appState.taxRate : 17.5;
    }
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.close();
}

// --- Başlatma (Init) ---
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderUI();

  // Event Listeners
  document.getElementById('btnOpenDeposit').addEventListener('click', () => openModal('modalDeposit'));
  document.getElementById('btnOpenRates').addEventListener('click', () => openModal('modalRates'));
  document.getElementById('btnOpenDailyReport').addEventListener('click', () => {
    renderDailyReport();
    openModal('modalDailyReport');
  });
  document.getElementById('btnOpenTxHistory').addEventListener('click', () => {
    renderTxHistory();
    openModal('modalTxHistory');
  });
  document.getElementById('btnSettings').addEventListener('click', () => {
    renderSettings();
    openModal('modalSettings');
  });

  // Modal dışına tıklayınca kapatma
  document.querySelectorAll('.app-modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      const rect = modal.getBoundingClientRect();
      const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
      if (!isInDialog) {
        modal.close();
      }
    });
  });

  // Service Worker Registration for PWA / Offline
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.log('ServiceWorker not registered in local file preview:', err);
    });
  }
});
