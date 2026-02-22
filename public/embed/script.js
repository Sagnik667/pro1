// Combined Meeting Scheduler (calendar click fix + theme toggle persistence & accessibility)
//
// Key fixes / additions in this file:
// - Calendar date clicks pass epoch ms to openDayModal to avoid "YYYY-MM-DD" UTC parsing bugs.
// - openDayModal accepts epoch ms or YYYY-MM-DD string and constructs a local-midnight Date.
// - Theme toggle updated to persist preference to localStorage, add keyboard accessibility and update icon opacity/aria attributes.

const STORAGE_KEY = 'meetings.combined.v1';
const REMIND_KEY = 'meetings.combined.v1.reminded';
const THEME_KEY = 'meetings.theme';
const PAST_MEETING_RETENTION_DAYS = 7;

function getUserId() {
  let uid = localStorage.getItem("anonUserId");
  if (!uid) {
    uid = "anon-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("anonUserId", uid);
  }
  return uid;
}

let meetings = [];
let remindedMap = loadReminded();
participants = [];

let notificationEnabled = true;
let alarmType = 'default';
const soundEl = document.getElementById('notifySound');

const today = new Date();
let displayMonth = today.getMonth();
let displayYear = today.getFullYear();

///// --- Utility --- /////
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function now(){ return new Date(); }
function startOfDay(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d){ const x=new Date(d); x.setHours(23,59,59,999); return x; }
function formatDate(d){ const dt = new Date(d); return dt.toLocaleDateString(undefined, { month:'short', day:'numeric' }).toUpperCase(); }
function formatDateTime(dt){ return dt.toLocaleString([], { dateStyle:'medium', timeStyle:'short' }); }
function isWithinPastWindow(meetingEndTime) {
  const now = new Date();
  const diffMs = now - meetingEndTime;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= PAST_MEETING_RETENTION_DAYS;
}


///// --- Persistence --- /////
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings)); }
function load(){
  try{ meetings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch(e){ meetings = []; }
}
function loadReminded(){ try { return JSON.parse(localStorage.getItem(REMIND_KEY) || '{}'); } catch(e){ return {}; } }
function saveReminded(){ localStorage.setItem(REMIND_KEY, JSON.stringify(remindedMap)); }

///// --- Occurrence generator (basic recurrence) --- /////
function occurrencesForMeeting(m, fromDate, toDate){
  const list = [];
  const startBase = new Date(m.date + 'T' + m.start);
  if (isNaN(startBase)) return list;
  const endBase = new Date(m.date + 'T' + m.end);
  const recurrence = m.recurrence || 'none';

  if (recurrence === 'none') {
    if (startBase >= fromDate && startBase <= toDate) list.push({ m, start: startBase, end: endBase });
    return list;
  }

  // iterate occurrences until toDate (safety cap)
  const MAX = 400;
  let cursor = new Date(startBase);
  // advance to >= fromDate
  while (cursor < fromDate) {
    if (recurrence === 'daily') cursor.setDate(cursor.getDate() + 1);
    else if (recurrence === 'weekly') cursor.setDate(cursor.getDate() + 7);
    else if (recurrence === 'monthly') cursor.setMonth(cursor.getMonth() + 1);
    else break;
    if (cursor - startBase > 1000*60*60*24*365*3) break; // safety
  }
  let count = 0;
  while (cursor <= toDate && count < MAX) {
    const s = new Date(cursor);
    const durationMs = (endBase - startBase);
    list.push({ m, start: s, end: new Date(s.getTime() + durationMs) });
    if (recurrence === 'daily') cursor.setDate(cursor.getDate() + 1);
    else if (recurrence === 'weekly') cursor.setDate(cursor.getDate() + 7);
    else if (recurrence === 'monthly') cursor.setMonth(cursor.getMonth() + 1);
    count++;
  }
  return list;
}

function buildOccurrences(fromDate, toDate){
  let occs = [];
  meetings.forEach(m => {
    occs = occs.concat(occurrencesForMeeting(m, fromDate, toDate));
  });
  occs.sort((a,b)=> a.start - b.start);
  return occs;
}

///// --- Render / UI --- /////
function renderAll(){
  renderUpcoming();
  renderAllLists();
  renderCalendar(displayMonth, displayYear);
  save();
  saveReminded();
}

function renderUpcoming(){
  const grid = document.getElementById('upcomingGrid');
  grid.innerHTML = '';
  const from = now();
  const to = new Date(from.getTime() + 1000*60*60*24*30); // next 30 days
  const occs = buildOccurrences(from, to).filter(o => o.end > now()).slice(0,6);

  if (occs.length === 0) {
    grid.innerHTML = '<div class="meeting-card muted">No upcoming meetings</div>';
    return;
  }

  occs.forEach(({m, start, end}) => {
    const card = createCardNode(m, start, end);
    grid.appendChild(card);
  });
}

function renderAllLists(){
  const allGrid = document.getElementById('allGrid');
  const pastGrid = document.getElementById('pastGrid');
  allGrid.innerHTML = '';
  pastGrid.innerHTML = '';

  const from = startOfDay(
    new Date(Date.now() - PAST_MEETING_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  );
  const to = new Date(new Date().getFullYear()+1,0,1);
  const occs = buildOccurrences(from, to);

  const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const pr = document.getElementById('filterPriority')?.value || 'any';

  const filtered = occs.filter(o => {
    if (q) {
      if (!(o.m.title.toLowerCase().includes(q) ||
            formatDateTime(o.start).toLowerCase().includes(q))) return false;
    }
    if (pr !== 'any' && o.m.importance !== pr) return false;
    return true;
  });

  filtered.forEach(({m, start, end}) => {
    const card = createCardNode(m, start, end);
    if (end < now()) {
      if (isWithinPastWindow(end)) {
        pastGrid.appendChild(card.cloneNode(true));
      }
    } else {
      allGrid.appendChild(card);
    }
  });

  if (allGrid.children.length === 0)
    allGrid.innerHTML = '<div class="meeting-card muted">No scheduled meetings</div>';
  if (pastGrid.children.length === 0)
    pastGrid.innerHTML = '<div class="meeting-card muted">No past meetings</div>';
}


function createCardNode(m, start, end) {
  const card = document.createElement('div');
  const isPast = end < now();
  card.className = `meeting-card ${m.importance}`;

  // --- Top section (title / time / actions) ---
  card.innerHTML = `
  <div class="card-top">
    <div class="card-main">
      <div class="date">${formatDate(start)}</div>
      <div class="time">
        ${start.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })} –
        ${end.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
      </div>
      <div class="title">${escapeHtml(m.title)}</div>
    </div>

    <div class="card-actions">
      ${!isPast ? `<button class="small-btn" onclick="openEditModal('${m.id}')">Edit</button>` : ``}
      <button class="small-btn danger" onclick="deleteMeeting('${m.id}')">Delete</button>
    </div>
  </div>
`;

  // --- Footer (status / priority / join) ---
  const footer = document.createElement('div');
  footer.className = 'card-footer';

  const pri = document.createElement('span');
  pri.className = 'badge ' + (m.importance || 'Medium');
  pri.textContent = m.importance;

  const status = computeStatus(start, end, m, start);
  const st = document.createElement('span');
  st.className = 'muted';
  st.textContent = status;

  footer.appendChild(pri);
  footer.appendChild(st);

  // --- Join button ONLY for future / ongoing meetings ---
  if (!isPast) {
    const joinBtn = document.createElement('button');
    joinBtn.className = 'join';
    joinBtn.textContent = 'Join';

    const link =
      m.link ||
      document.getElementById('defaultLink')?.value ||
      'https://meet.google.com/new';

    joinBtn.onclick = (e) => {
      e.stopPropagation();
      window.open(link, '_blank', 'noopener');
    };

    footer.appendChild(joinBtn);
  }

  card.appendChild(footer);
  return card;
}


function computeStatus(start, end, m, occ){
  const nowt = now();
  const completed = (m.completedOccurrences || []).includes(occ.toISOString?.());
  if (completed) return 'Completed';
  if (nowt >= start && nowt <= end) return 'Ongoing';
  if (nowt < start) return 'Upcoming';
  return 'Completed';
}

function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
// ---- Participant helpers ---- //
function addParticipant() {
  const email = document.getElementById("pEmail").value.trim();
  const mobile = document.getElementById("pMobile").value.trim();

  if (!email || !mobile) {
    alert("Please enter both email and mobile");
    return;
  }

  participants.push({ email, mobile });

  document.getElementById("pEmail").value = "";
  document.getElementById("pMobile").value = "";

  renderParticipantList();
}


function renderParticipantList() {
  const ul = document.getElementById("participantList");
  if (!ul) return;

  ul.innerHTML = participants
    .map(
      (p, i) => `
      <li>
        ${p.email} (${p.mobile})
        <button class="small-btn" onclick="removeParticipant(${i})">Remove</button>
      </li>
    `
    )
    .join("");
}

function removeParticipant(index) {
  participants.splice(index, 1);
  renderParticipantList();
}


///// --- Calendar --- /////
function renderCalendar(month, year){
  displayMonth = month; displayYear = year;
  const daysContainer = document.getElementById('calendarDays');
  const monthYearLabel = document.getElementById('monthYear');
  daysContainer.innerHTML = '';

  const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
  monthYearLabel.textContent = `${monthName} ${year}`;

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDayIndex; i++){
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day empty';
    daysContainer.appendChild(emptyCell);
  }

  // occurrences in this month
  const fromRange = startOfDay(new Date(year, month, 1));
  const toRange = endOfDay(new Date(year, month, daysInMonth));
  const occs = buildOccurrences(fromRange, toRange);

  for (let day = 1; day <= daysInMonth; day++){
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    dayCell.textContent = day;

    const date = new Date(year, month, day);
    if (date.toDateString() === new Date().toDateString()) dayCell.classList.add('today');

    const dayStart = startOfDay(date), dayEnd = endOfDay(date);
    const dayOccs = occs.filter(o => o.start >= dayStart && o.start <= dayEnd);
    if (dayOccs.length){
      const markers = document.createElement('div');
      markers.style.position = 'absolute';
      markers.style.right = '8px';
      markers.style.top = '8px';
      markers.style.display = 'flex';
      markers.style.flexDirection = 'column';
      markers.style.gap = '6px';
      dayOccs.slice(0, 3).forEach(o => {
        const dot = document.createElement('div');
        dot.style.width = '10px'; dot.style.height = '10px'; dot.style.borderRadius = '50%';
        if (o.m.importance === 'High') dot.style.background = 'var(--high)';
        else if (o.m.importance === 'Medium') dot.style.background = 'var(--med)';
        else dot.style.background = 'var(--low)';
        markers.appendChild(dot);
      });
      if (dayOccs.length > 3) {
        const more = document.createElement('div'); more.textContent = `+${dayOccs.length - 3}`; more.style.fontSize = '12px'; markers.appendChild(more);
      }
      dayCell.appendChild(markers);
    }

    // Make the date clickable — pass epoch ms to keep local-midnight exactness
    const epochMs = date.getTime();
    dayCell.onclick = () => openDayModal(epochMs);

    daysContainer.appendChild(dayCell);
  }
}

function showMeetingsForDate(date, occs){
  const container = document.getElementById('dateMeetings');
  container.innerHTML = `<h4>Meetings for ${date.toLocaleDateString()}</h4>`;
  if (!occs || occs.length === 0){ container.innerHTML += '<div class="hint muted">No meetings</div>'; return; }
  const ul = document.createElement('div'); ul.className = 'grid';
  occs.forEach(({m, start, end}) => {
    ul.appendChild(createCardNode(m, start, end));
  });
  container.appendChild(ul);
}

function nextMonth(){ displayMonth++; if (displayMonth > 11){ displayMonth = 0; displayYear++; } renderCalendar(displayMonth, displayYear); }
function prevMonth(){ displayMonth--; if (displayMonth < 0){ displayMonth = 11; displayYear--; } renderCalendar(displayMonth, displayYear); }

///// --- CRUD --- /////
function openModal(){
  const modal = document.getElementById('modal');
  modal.style.display = 'block';

  document.getElementById('modalTitle').textContent = 'Schedule Meeting';

  // 🔴 IMPORTANT: reset editId
  document.getElementById('saveBtn').dataset.editId = '';

  // reset form
  clearForm();

  // reset participants
  participants = [];
  renderParticipantList();
}



function closeModal(){
  document.getElementById('modal').style.display = 'none';
  document.getElementById('modal').setAttribute('aria-hidden', 'true');
}

function clearForm(){
  // Reset only the form fields — do NOT reset participants here.
  ['title','date','start','end','type','importance','link','reminder','recurrence'].forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });

  // sensible defaults
  const imp = document.getElementById('importance');
  if (imp) imp.value = 'Medium';
  const rem = document.getElementById('reminder');
  if (rem) rem.value = '10';
  const rec = document.getElementById('recurrence');
  if (rec) rec.value = 'none';
  const typeEl = document.getElementById('type');
  if (typeEl) typeEl.value = 'Online';
}


function saveMeeting(){
  const id = document.getElementById('saveBtn').dataset.editId;
  const title = document.getElementById('title').value.trim();
  const date = document.getElementById('date').value;
  const start = document.getElementById('start').value;
  const end = document.getElementById('end').value;
  const type = document.getElementById('type').value;
  const importance = document.getElementById('importance').value;
  const link = document.getElementById('link').value.trim();
  const reminder = Number(document.getElementById('reminder').value || 10);
  const recurrence = document.getElementById('recurrence').value || 'none';

  if (!title || !date || !start || !end) { alert('Please provide title, date, start and end times.'); return; }
  if (end <= start) { alert('End time must be after start time'); return; }

  const payload = {
    title, date, start, end, type, importance, link, reminder, recurrence
  };

  if (id) updateMeeting(id, payload);
  else createMeeting(payload);

  closeModal();
  renderAll();
}

function createMeeting(payload) {
  const saveBtn = document.getElementById('saveBtn');
saveBtn.disabled = true;
saveBtn.textContent = 'Saving...';

  const m = {
    ...payload,
    id: uid(),
    createdAt: new Date().toISOString(),
    completedOccurrences: []
  };

  // local state + persistence
  meetings.push(m);
  save();

  // take a snapshot of participants now — protects against later resets
  const participantsToSave = participants.slice();

  console.log('Saving participants for meeting', m.id, participantsToSave);

  const serverMeeting = {
    id: m.id,
    userId: getUserId(),
    title: payload.title,
    // keep ISO string; server already converts or expects it
    startTime: new Date(payload.date + "T" + payload.start).toISOString(),
    endTime: payload.end ? new Date(payload.date + "T" + payload.end).toISOString() : null,
    meetingLink: payload.link || null,
    reminderMinutes: payload.reminder || 10,
    importance: payload.importance || "Medium",
    recurrence: payload.recurrence || "none"
  };

  // POST meeting then POST participants (best-effort)
  fetch("/api/meetings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(serverMeeting)
  })
  .then(async res => {
    if (!res.ok) {
      const txt = await res.text().catch(()=>'<no body>');
      throw new Error(`Failed to save meeting: ${res.status} ${txt}`);
    }
    // POST participants in parallel
    return Promise.all(participantsToSave.map(async (p) => {
      try {
        const r = await fetch("/api/participants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingId: m.id,
            email: p.email,
            mobile: p.mobile
          })
        });
        if (!r.ok) {
          const t = await r.text().catch(()=>'<no body>');
          console.error('participant save failed', r.status, t, p);
          return { ok:false, status: r.status, body: t, participant: p };
        }
        // return parsed body optionally
        return { ok:true, participant: p, result: await r.json().catch(()=>null) };
      } catch(err) {
        console.error('participant save error', err, p);
        return { ok:false, error: err.message, participant: p };
      }
    }));
  })
  .then(results => {
    console.log('participants save results', results);
    // Clear participants now that they are saved
    participants = [];
    renderParticipantList();
  })
  .catch(err => {
    console.error("Saving meeting/participants failed", err);
    // keep participants so user can retry — don't silently clear them on error
  });
  saveBtn.disabled = false;
saveBtn.textContent = 'Save';

}





function updateMeeting(id, payload){
  const idx = meetings.findIndex(x => x.id === id);
  if (idx === -1) return;

  // update frontend copy
  meetings[idx] = Object.assign(
    {},
    meetings[idx],
    payload,
    { updatedAt: new Date().toISOString() }
  );

  save();
  renderAll();

  // ---- backend sync (CRITICAL) ----
  const serverMeeting = {
    id,
    userId: getUserId(),
    title: payload.title,
    startTime: new Date(payload.date + "T" + payload.start).toISOString(),
    endTime: payload.end
      ? new Date(payload.date + "T" + payload.end).toISOString()
      : null,
    meetingLink: payload.link || "",
    reminderMinutes: payload.reminder || 10,
    notified: false   // reset notification on edit
  };

  fetch("/api/meetings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(serverMeeting)
  }).catch(err => {
    console.error("Failed to sync edited meeting to backend:", err);
  });
}


function openEditModal(id){
  const m = meetings.find(x => x.id === id);
  if (!m) return;
  document.getElementById('modal').style.display = 'block';
  document.getElementById('modalTitle').textContent = 'Edit Meeting';
  document.getElementById('title').value = m.title;
  document.getElementById('date').value = m.date;
  document.getElementById('start').value = m.start;
  document.getElementById('end').value = m.end;
  document.getElementById('type').value = m.type || 'Online';
  document.getElementById('importance').value = m.importance || 'Medium';
  document.getElementById('link').value = m.link || '';
  document.getElementById('reminder').value = String(m.reminder || 10);
  document.getElementById('recurrence').value = m.recurrence || 'none';
  document.getElementById('saveBtn').dataset.editId = id;
}

function deleteMeeting(id){
  if (!confirm('Delete this meeting series?')) return;

  meetings = meetings.filter(x => x.id !== id);
  save();
  renderAll();

  fetch("/api/meetings", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  }).catch(err => {
    console.error("Failed to delete meeting from backend", err);
  });
}


function markDoneOccurrence(id, occISO){
  const m = meetings.find(x => x.id === id);
  if (!m) return;
  m.completedOccurrences = m.completedOccurrences || [];
  if (!m.completedOccurrences.includes(occISO)) m.completedOccurrences.push(occISO);
  save();
  renderAll();
}

///// --- Day modal functions (NEW) --- /////
// Opens the day modal and shows meetings for the passed date.
// Accepts either a number (epoch ms) or a 'YYYY-MM-DD' string.
// Always constructs a local Date at midnight to avoid UTC parsing issues.
function openDayModal(dateInput) {
  const modal = document.getElementById("dayModal");
  const title = document.getElementById("dayModalTitle");
  const list = document.getElementById("dayMeetingList");

  list.innerHTML = "";

  // Build a local Date that represents midnight of the selected day
  let selectedDate;
  if (typeof dateInput === 'number') {
    selectedDate = new Date(dateInput);
    selectedDate.setHours(0, 0, 0, 0);
  } else if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, d] = dateInput.split('-').map(Number);
    selectedDate = new Date(y, m - 1, d);
  } else {
    selectedDate = new Date(dateInput);
    selectedDate.setHours(0, 0, 0, 0);
  }

  title.textContent = selectedDate.toDateString();

  // Generate occurrences for the selected day
  const from = startOfDay(selectedDate);
  const to = endOfDay(selectedDate);
  const occs = buildOccurrences(from, to);

  if (occs.length === 0) {
    list.innerHTML = `<p style="font-size:16px; opacity:0.7;">You are free 🎉</p>`;
  } else {
    occs.forEach(({ m, start, end }) => {
      const item = document.createElement("div");
      item.className = "day-meeting-item";

      const isPast = end < now();

      item.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div class="time">
              ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –
              ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div class="title">${escapeHtml(m.title)}</div>
            <div class="muted" style="font-size:13px;margin-top:6px;">
              Priority: ${m.importance} • ${m.type || ''}
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:6px;">
            ${!isPast ? `<button class="small-btn" onclick="openEditModal('${m.id}')">Edit</button>` : ``}
            ${!isPast ? `<button class="small-btn" onclick="window.open('${m.link || document.getElementById('defaultLink').value || 'https://meet.google.com/new'}','_blank')">Join</button>` : ``}
            <button class="small-btn" style="border-color:#ef4444;color:#ef4444;" onclick="deleteMeeting('${m.id}')">Delete</button>
          </div>
        </div>
      `;

      list.appendChild(item);
    });
  }

  modal.style.display = "block";
  modal.setAttribute("aria-hidden", "false");
}


function closeDayModal() {
  document.getElementById("dayModal").style.display = "none";
  document.getElementById("dayModal").setAttribute('aria-hidden', 'true');
}

///// --- Notifications / reminders --- /////
function requestNotificationPermission(){
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') Notification.requestPermission();
}

function runReminderChecks(){
  const from = new Date(now().getTime() - 1000*60*2);
  const to = new Date(now().getTime() + 1000*60*60*24*7);
  const occs = buildOccurrences(from, to);
  const nowt = now();

  occs.forEach(({m, start, end}) => {
    const key = `${m.id}|${start.toISOString()}`;
    if (remindedMap[key]) return;
    const remindMs = (m.reminder || 0) * 60 * 1000;
    const remindAt = new Date(start.getTime() - remindMs);
    if (nowt >= remindAt && nowt <= end.getTime() + 60*1000) {
      sendNotification(m, start);
      remindedMap[key] = true;
    }
  });
  saveReminded();
}

function sendNotification(m, start){
  const title = `Reminder: ${m.title}`;
  const body = `${formatDateTime(start)}${m.link ? ' — click Join' : ''}\n${m.type || ''}`;
  if (Notification.permission === 'granted' && notificationEnabled) {
    try { new Notification(title, { body, tag: m.id, timestamp: start.getTime() }); }
    catch(e){ showToast(`${title}\n${body}`); }
  } else if (notificationEnabled) {
    showToast(`${title} — ${formatDateTime(start)}`);
  }
  if (notificationEnabled) {
    try { soundEl.currentTime = 0; soundEl.play().catch(()=>{}); } catch(e){}
  }
}

function showToast(text){
  const toast = document.createElement('div'); toast.className = 'toast'; toast.innerText = text;
  document.body.appendChild(toast);
  setTimeout(()=> toast.remove(), 6000);
}

///// --- Settings --- /////

async function loadNotificationSettings() {
  try {
    const res = await fetch("/api/settings");
    const allSettings = await res.json();

    const userSettings = allSettings[getUserId()];
    if (!userSettings) return;

    if (userSettings.email) {
      document.getElementById("defaultEmail").value = userSettings.email;
    }

    if (userSettings.phone) {
      document.getElementById("defaultPhone").value = userSettings.phone;
    }
  } catch (err) {
    console.error("Failed to load notification settings", err);
  }
}

function toggleNotifications(el){ notificationEnabled = el.checked; }
function changeAlarm(sel){
  alarmType = sel.value;
  if (alarmType === 'soft') soundEl.src = 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg';
  else if (alarmType === 'long') soundEl.src = 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg';
  else soundEl.src = 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg';
}

///// --- Theme switch: persistence + accessibility --- /////
function applyTheme(theme) {
  const checkbox = document.querySelector('.theme-switch__checkbox');
  const label = document.querySelector('.theme-switch');
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark', isDark);
  if (checkbox) checkbox.checked = isDark;
  if (label) {
    label.setAttribute('role', 'switch');
    label.setAttribute('tabindex', '0');
    label.setAttribute('aria-checked', isDark ? 'true' : 'false');
  }
  try { localStorage.setItem(THEME_KEY, theme); } catch(e){}
}

// Add keyboard accessibility to theme switch (space/enter)
function initThemeToggle() {
  const checkbox = document.querySelector('.theme-switch__checkbox');
  const label = document.querySelector('.theme-switch');
  if (!checkbox || !label) return;
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(saved);

  checkbox.addEventListener('change', function() {
    applyTheme(checkbox.checked ? 'dark' : 'light');
  });

  label.addEventListener('keydown', (ev) => {
    if (ev.key === ' ' || ev.key === 'Spacebar' || ev.key === 'Enter') {
      ev.preventDefault();
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change'));
    }
  });

  // ensure aria + checkbox sync if body.dark is toggled elsewhere
  const observer = new MutationObserver(function() {
    const isDark = document.body.classList.contains('dark');
    label.setAttribute('aria-checked', isDark ? 'true' : 'false');
    checkbox.checked = isDark;
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

///// --- Small helpers / UI wiring --- /////
function showPage(id){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function updateImportanceTint(sel){
  const val = sel.value;
  const content = sel.closest('.modal-content');
  content.classList.remove('Low','Medium','High');
  content.classList.add(val);
}

///// --- Init --- /////
async function saveNotificationSettings() {
  const email = document.getElementById("defaultEmail").value.trim();
  const phone = document.getElementById("defaultPhone").value.trim();

  await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: getUserId(),
      email,
      phone
    })
  });

  alert("Notification settings saved.");
}

function init(){
  load();
  renderAll();
  requestNotificationPermission();
  loadNotificationSettings();

  // wire search / filter
  const search = document.getElementById('searchInput');
  const priority = document.getElementById('filterPriority');
  if (search) search.addEventListener('input', () => renderAll());
  if (priority) priority.addEventListener('change', () => renderAll());

  // set settings UI
  document.getElementById('notifToggle').checked = notificationEnabled;
  document.getElementById('alarmSelect').value = alarmType;

  // reminder checks every 15s
  setInterval(runReminderChecks, 15000);
  document.addEventListener('visibilitychange', ()=> { if (!document.hidden) runReminderChecks(); });

  // calendar navigation
  renderCalendar(displayMonth, displayYear);

  // theme toggle init (persistence + keyboard support)
  initThemeToggle();
}

init();