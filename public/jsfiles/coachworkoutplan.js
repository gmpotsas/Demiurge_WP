// Mapping routines to their corresponding day options
const routineDays = {
  "Push Pull Legs": ["Push", "Pull", "Legs"],
  "Chest Back Legs Arms": ["Chest", "Back", "Legs", "Arms"],
  "Full Body": ["Full Body"],
  "Upper/Lower Split": ["Upper", "Lower"]
};

// Possible exercises for header dropdown
const exerciseOptions = [
  { value: 'bench_press', label: 'Bench Press' },
  { value: 'squat', label: 'Squat' },
  { value: 'deadlift', label: 'Deadlift' },
  { value: 'overhead_press', label: 'Overhead Press' },
  { value: 'bicep_curl', label: 'Bicep Curl' }
];

/**
 * Build a coach‑table header cell, mirror user table dropdown + +/- buttons
 */
function createCoachHeaderCell(selectedValue = '') {
  const th = document.createElement('th');
  const select = document.createElement('select');
  select.className = 'form-select form-select-sm';
  Object.assign(select.style, {
    backgroundColor: '#444',
    color: '#fff',
    border: 'none',
    textAlign: 'center',
    fontWeight: 'bold',
    borderRadius: '30px'
  });

  // placeholder option
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.selected = !selectedValue;
  placeholder.textContent = 'Select Exercise';
  select.appendChild(placeholder);

  // add exercise options
  exerciseOptions.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === selectedValue) o.selected = true;
    select.appendChild(o);
  });

  th.appendChild(select);
  // +/- buttons
  ['+', '–'].forEach(symbol => {
    const btn = document.createElement('button');
    btn.textContent = symbol;
    btn.className = 'btn btn-link small-btn p-0';
    btn.onclick = symbol === '+' ? addColumn : removeColumn;
    th.appendChild(btn);
  });

  return th;
}

// Handle routine change: populate day select
function handleRoutineChange() {
  const routine = document.getElementById('routineSelect').value;
  const daySelect = document.getElementById('daySelect');
  daySelect.innerHTML = '<option value="">-- Select Day --</option>';
  (routineDays[routine] || []).forEach(day => {
    const option = document.createElement('option');
    option.value = day;
    option.textContent = day;
    daySelect.appendChild(option);
  });
}

// Handle day change: load plan and show table
async function handleDayChange() {
  const sel  = document.getElementById('daySelect');
  const day  = sel.value;
  console.log('handleDayChange fired – selected raw value:', day);

  const span = document.getElementById('selectedDay');
  if (!span) {
    console.error('❌ Could not find #selectedDay in the DOM');
    return;
  }
  // Capitalize
  const pretty = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
  console.log('Will set span.textContent to:', pretty);
  span.textContent = pretty;

  const tableWrapper      = document.getElementById('tableWrapper');
  const workoutPlanHeader = document.getElementById('workoutPlanHeader');

  if (day) {
    // show header & table
    tableWrapper.style.display      = 'block';
    workoutPlanHeader.classList.remove('hidden');
  } else {
    tableWrapper.style.display      = 'none';
    workoutPlanHeader.classList.add('hidden');
  }

  // Now do your existing loadPlanForRoutineDay (you can await it last)
  const routine = document.getElementById('routineSelect').value;
  const userId = localStorage.getItem('userId');
  if (routine && day) {
    await loadPlanForRoutineDay(userId, routine, day);
  }
}

// Fetch and load plan data for chosen date
async function loadPlanForRoutineDay(user_id, routine, day) {
  try {
    const d = selectedDate;
    const dateParam = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const resp = await fetch(
      `/api/getWorkoutPlan1?user_id=${user_id}` +
      `&routine=${encodeURIComponent(routine)}` +
      `&day=${encodeURIComponent(day)}` +
      `&date=${dateParam}`
    );
    const result = await resp.json();
    if (result.success && result.plan) rebuildTable(result.plan.plan_json);
    else createDefaultTable();
  } catch (err) {
    console.error('Error loading workout plan:', err);
    createDefaultTable();
  }
}

// Rebuild coach table with dropdown headers and saved data
function rebuildTable(planData) {
  const headerRow = document.getElementById('tableHeader');
  const tableBody = document.getElementById('tableBody');
  headerRow.innerHTML = '';
  // Set column with +/-
  const setTh = document.createElement('th');
  setTh.innerHTML = 'Set ';
  ['+', '–'].forEach(symbol => {
    const btn = document.createElement('button');
    btn.textContent = symbol;
    btn.className = 'btn btn-link small-btn p-0';
    btn.onclick = symbol === '+' ? addRow : removeRow;
    setTh.appendChild(btn);
  });
  headerRow.appendChild(setTh);

  // exercise headers
  planData.headers.forEach(h => headerRow.appendChild(createCoachHeaderCell(h)));

  // rows
  tableBody.innerHTML = '';
  planData.rows.forEach(r => {
    const tr = document.createElement('tr');
    // set cell
    const td0 = document.createElement('td');
    td0.textContent = r.set;
    tr.appendChild(td0);
    // data cells
    r.data.forEach(val => {
      const td = document.createElement('td');
      const inp = document.createElement('input');
      inp.type = 'text'; inp.placeholder = 'Reps/Weight'; inp.value = val;
      td.appendChild(inp);
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });
}

// Default table (one empty header + one row)
function createDefaultTable() {
  const headerRow = document.getElementById('tableHeader');
  const tableBody = document.getElementById('tableBody');
  headerRow.innerHTML = '';
  tableBody.innerHTML = '';
  // Set header
  const setTh = document.createElement('th');
  setTh.innerHTML = 'Set <button onclick="addRow()" class="btn btn-link small-btn p-0">+</button>' +
                    '<button onclick="removeRow()" class="btn btn-link small-btn p-0">–</button>';
  headerRow.appendChild(setTh);
  // one exercise header
  headerRow.appendChild(createCoachHeaderCell());
  // one default row
  const tr = document.createElement('tr');
  const td0 = document.createElement('td'); td0.textContent = 'Set 1'; tr.appendChild(td0);
  const td1 = document.createElement('td'); td1.innerHTML = '<input type="text" placeholder="Reps/Weight">'; tr.appendChild(td1);
  tableBody.appendChild(tr);
}

// Add/remove columns (exercises)
function addColumn() {
  document.getElementById('tableHeader').appendChild(createCoachHeaderCell());
  document.querySelectorAll('#tableBody tr').forEach(row => {
    const td = document.createElement('td');
    td.innerHTML = '<input type="text" placeholder="Reps/Weight">';
    row.appendChild(td);
  });
}
function removeColumn() {
  const hdr = document.getElementById('tableHeader');
  if (hdr.children.length > 2) {
    hdr.removeChild(hdr.lastElementChild);
    document.querySelectorAll('#tableBody tr').forEach(r => r.removeChild(r.lastElementChild));
  } else { alert('At least one exercise column must remain.'); }
}

// Add/remove rows (sets)
function addRow() {
  const tbody = document.getElementById('tableBody');
  const newIndex = tbody.rows.length + 1;
  const tr = document.createElement('tr');
  const td0 = document.createElement('td'); td0.textContent = 'Set ' + newIndex; tr.appendChild(td0);
  for (let i = 1; i < document.getElementById('tableHeader').children.length; i++) {
    const td = document.createElement('td');
    td.innerHTML = '<input type="text" placeholder="Reps/Weight">';
    tr.appendChild(td);
  }
  tbody.appendChild(tr);
}
function removeRow() {
  const tbody = document.getElementById('tableBody');
  if (tbody.rows.length > 1) tbody.removeChild(tbody.lastElementChild);
  else alert('At least one row must remain.');
}

// Save the coach's plan
async function saveWorkoutPlan() {
  const routine = document.getElementById('routineSelect').value;
  const day = document.getElementById('daySelect').value;
  const userId = localStorage.getItem('userId');
  const d = selectedDate;
  const dateParam = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ` +
                    `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  if (!routine || !day) { alert('Please select both a routine and a day.'); return; }

  const headers = [];
  document.querySelectorAll('#tableHeader th select').forEach(sel => headers.push(sel.value));
  const rows = Array.from(document.querySelectorAll('#tableBody tr')).map(tr => {
    return {
      set: tr.cells[0].textContent.trim(),
      data: Array.from(tr.cells).slice(1).map(td => td.querySelector('input')?.value || '')
    };
  });

  const planJson = { headers, rows };
  try {
    const resp = await fetch('/api/saveWorkoutPlan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, routine, day, planJson, date: dateParam })
    });
    const res = await resp.json();
    alert(res.success ? 'Workout plan saved successfully.' : 'Failed to save: ' + res.message);
  } catch (err) {
    console.error('Error saving workout plan:', err);
    alert('Error saving workout plan.');
  }
}

// Initialization & event wiring
window.addEventListener('DOMContentLoaded', async () => {
  const userId = localStorage.getItem('userId');
  const routineSelect = document.getElementById('routineSelect');
  const daySelect = document.getElementById('daySelect');
  const tableWrapper = document.getElementById('tableWrapper');
  tableWrapper.style.display = 'none';

  // load latest plan
  try {
    const resp = await fetch(`/api/getWorkoutPlan?user_id=${userId}`);
    const result = await resp.json();
    if (result.success && result.plan) {
      routineSelect.value = result.plan.routine;
      rebuildTable(result.plan.plan_json);
      console.log(result.day)
    } else {
      routineSelect.value = '';
      createDefaultTable();
    }
  } catch (err) {
    console.error('Error fetching plan:', err);
    createDefaultTable();
  }

  handleRoutineChange();
  routineSelect.addEventListener('change', () => {
    handleRoutineChange();
    tableWrapper.style.display = 'none';
  });
  daySelect.addEventListener('change', handleDayChange);
});

// Respond to calendar date change (new calendar integration)
document.addEventListener('calendarDateChanged', async e => {
  selectedDate = e.detail.selectedDate;
  const dateParam = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`;
  const routineSelect = document.getElementById('routineSelect');
  const span = document.getElementById('selectedDay');
  const daySelect = document.getElementById('daySelect');
  const tableWrapper = document.getElementById('tableWrapper');
  const workoutPlanHeader = document.getElementById('workoutPlanHeader');
  const userId = localStorage.getItem('userId');

  try {
    const res = await fetch(`/api/getWorkoutPlansByDate?user_id=${userId}&date=${dateParam}`);
    const json = await res.json();
    if (json.success && json.plans.length) {
      const plan = json.plans[0];
      routineSelect.value = plan.routine;
      handleRoutineChange();
      daySelect.value = plan.day;
      span.textContent = daySelect.value;
      rebuildTable(plan.plan_json);
      tableWrapper.style.display = 'block';
      workoutPlanHeader.classList.remove('hidden');
    } else {
      routineSelect.value = '';
      handleRoutineChange();
      tableWrapper.style.display = 'none';
      workoutPlanHeader.classList.add('hidden');
    }
  } catch (err) {
    console.error('Error loading plan by date:', err);
    routineSelect.value = '';
    handleRoutineChange();
    tableWrapper.style.display = 'none';
    workoutPlanHeader.classList.add('hidden');
  }
});
