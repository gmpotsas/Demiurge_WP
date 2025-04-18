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
{ value: 'bicep_curl', label: 'Bicep Curl' },
];

/**
 * Build a coach‑table header cell, mirror user table dropdown + +/- buttons
 */
function createCoachHeaderCell(selectedValue = '') {
  const th = document.createElement('th');
  // dropdown
  const select = document.createElement('select');
  select.className = 'form-select form-select-sm';
  select.style.backgroundColor = '#444';
  select.style.color = '#fff';
  select.style.border = 'none';
  select.style.textAlign = 'center';
  select.style.fontWeight = 'bold';
  select.style.borderRadius = '30px';


  // placeholder
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.selected = !selectedValue;
  placeholder.textContent = 'Select Exercise';
  select.appendChild(placeholder);

  // your existing exerciseOptions list
  exerciseOptions.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === selectedValue) o.selected = true;
    select.appendChild(o);
  });

  th.appendChild(select);
  // +/- buttons
  const addBtn = document.createElement('button');
  addBtn.onclick = addColumn;
  addBtn.className = 'btn btn-link small-btn p-0';
  addBtn.textContent = '+';
  th.appendChild(addBtn);

  const remBtn = document.createElement('button');
  remBtn.onclick = removeColumn;
  remBtn.className = 'btn btn-link small-btn p-0';
  remBtn.textContent = '–';
  th.appendChild(remBtn);

  return th;
}

// Handle routine change: populate days
function handleRoutineChange() {
const routine = document.getElementById('routineSelect').value;
const daySelect = document.getElementById('daySelect');
daySelect.innerHTML = '<option value="">-- Select Day --</option>';
if (routine && routineDays[routine]) {
  routineDays[routine].forEach(day => {
    const option = document.createElement('option');
    option.value = day;
    option.textContent = day;
    daySelect.appendChild(option);
  });
}
}

// Handle day change: load plan and show table
async function handleDayChange() {
const routine = document.getElementById('routineSelect').value;
const day = document.getElementById('daySelect').value;
const tableWrapper = document.getElementById('tableWrapper');
const workoutPlanHeader = document.getElementById('workoutPlanHeader');
const userId = localStorage.getItem('userId');

if ( routine) {
  document.getElementById('selectedDay').textContent = day;
  
  await loadPlanForRoutineDay(userId, routine, day);
  tableWrapper.style.display = 'block';
  workoutPlanHeader.classList.remove('hidden');
} else {
  tableWrapper.style.display = 'none';
  console.log("sexyyyyyyyyyyyyyyyyyyyyyyyy");
  document.getElementById('selectedDay').textContent = day;
  workoutPlanHeader.classList.add('hidden');
}
}

// Fetch and load plan data
async function loadPlanForRoutineDay(user_id, routine, day) {
try {
  const d1 = selectedDate;
  const dateParam = [
    d1.getFullYear(),
    String(d1.getMonth() + 1).padStart(2, '0'),
    String(d1.getDate()).padStart(2, '0')
  ].join('-');
  const response = await fetch(
    `/api/getWorkoutPlan1?user_id=${user_id}` +
    `&routine=${encodeURIComponent(routine)}` +
    `&day=${encodeURIComponent(day)}` +
    `&date=${dateParam}`
  );
  const result = await response.json();
  if (result.success && result.plan) {
    rebuildTable(result.plan.plan_json);
  } else {
    createDefaultTable();
  }
} catch (error) {
  console.error('Error loading workout plan:', error);
  createDefaultTable();
}
}

// Rebuild the workout plan table with dropdown headers
function rebuildTable(planData) {
const headerRow = document.getElementById('tableHeader');
const tableBody = document.getElementById('tableBody');

headerRow.innerHTML = '';
// First cell: Set
const setTh = document.createElement('th');
setTh.innerHTML = 'Set ';
const addRowBtn = document.createElement('button');
addRowBtn.onclick = addRow;
addRowBtn.className = 'btn btn-link small-btn p-0';
addRowBtn.textContent = '+';
const removeRowBtn = document.createElement('button');
removeRowBtn.onclick = removeRow;
removeRowBtn.className = 'btn btn-link small-btn p-0';
removeRowBtn.textContent = '–';
setTh.appendChild(addRowBtn);
setTh.appendChild(removeRowBtn);
headerRow.appendChild(setTh);

// Dropdown headers
planData.headers.forEach(headerValue => {
  headerRow.appendChild(createCoachHeaderCell(headerValue));
});

tableBody.innerHTML = '';
planData.rows.forEach(rowData => {
  const tr = document.createElement('tr');
  const tdSet = document.createElement('td');
  tdSet.textContent = rowData.set;
  tr.appendChild(tdSet);
  rowData.data.forEach(cellValue => {
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Reps/Weight';
    input.value = cellValue;
    td.appendChild(input);
    tr.appendChild(td);
  });
  tableBody.appendChild(tr);
});
}

// Create a default table with one dropdown header
function createDefaultTable() {
const headerRow = document.getElementById('tableHeader');
const tableBody = document.getElementById('tableBody');

headerRow.innerHTML = '';
tableBody.innerHTML = '';

// Set cell
const setTh = document.createElement('th');
setTh.innerHTML = 'Set ';
setTh.innerHTML += '<button onclick="addRow()" class="btn btn-link small-btn p-0">+</button>';
setTh.innerHTML += '<button onclick="removeRow()" class="btn btn-link small-btn p-0">–</button>';
headerRow.appendChild(setTh);

// Single exercise dropdown
headerRow.appendChild(createCoachHeaderCell());

// One row
const tr = document.createElement('tr');
const setTd = document.createElement('td');
setTd.textContent = 'Set 1';
tr.appendChild(setTd);
const inputTd = document.createElement('td');
inputTd.innerHTML = '<input type="text" placeholder="Reps/Weight">';
tr.appendChild(inputTd);
tableBody.appendChild(tr);
}

// Add a new column with dropdown header
function addColumn() {
const headerRow = document.getElementById('tableHeader');
headerRow.appendChild(createCoachHeaderCell());
document.querySelectorAll('#tableBody tr').forEach(row => {
  const td = document.createElement('td');
  td.innerHTML = '<input type="text" placeholder="Reps/Weight">';
  row.appendChild(td);
});
}

// Remove last column
function removeColumn() {
const headerRow = document.getElementById('tableHeader');
if (headerRow.children.length > 2) {
  headerRow.removeChild(headerRow.lastElementChild);
  document.querySelectorAll('#tableBody tr').forEach(row => row.removeChild(row.lastElementChild));
} else {
  alert('At least one exercise column must remain.');
}
}

// Add a new row (set) to the table
function addRow() {
    const tableBody = document.getElementById('tableBody');
    const newRowNumber = tableBody.rows.length + 1;
    const newRow = document.createElement('tr');

    // First cell: Set label
    const setCell = document.createElement('td');
    setCell.textContent = 'Set ' + newRowNumber;
    newRow.appendChild(setCell);

    // Add input cells for each exercise column
    const numCols = document.getElementById('tableHeader').children.length - 1;
    for (let i = 0; i < numCols; i++) {
        const cell = document.createElement('td');
        cell.innerHTML = '<input type="text" placeholder="Reps/Weight">';
        newRow.appendChild(cell);
    }
    tableBody.appendChild(newRow);
}

// Remove the last row if it exists
function removeRow() {
    const tableBody = document.getElementById('tableBody');
    if (tableBody.rows.length > 1) {
        tableBody.removeChild(tableBody.lastElementChild);
    } else {
        alert("At least one row must remain.");
    }
}

// Save Workout Plan (Coach Side)
// This function collects the selected routine, day, and dynamic table data,
// then sends the data as JSON to the /api/saveWorkoutPlan endpoint.
async function saveWorkoutPlan() {
    const routine = document.getElementById('routineSelect').value;
    const day = document.getElementById('daySelect').value;
    const userId = localStorage.getItem('userId'); // Adjust as needed
    const d2 = selectedDate;
    const dateParam = [
      d2.getFullYear(),
      String(d2.getMonth()+1).padStart(2,'0'),
      String(d2.getDate()).padStart(2,'0')
    ].join('-') + ' ' + [
      String(d2.getHours()).padStart(2,'0'),
      String(d2.getMinutes()).padStart(2,'0'),
      String(d2.getSeconds()).padStart(2,'0')
    ].join(':');
    if (!routine || !day) {
        alert("Please select both a routine and a day.");
        return;
    }

    // Collect exercise headers from the table (skip the first cell holding "Set")
    const headers = [];
    document.querySelectorAll('#tableHeader th').forEach((th,i) => {
      if (i===0) return;    // skip “Set” column
      const sel = th.querySelector('select');
      headers.push(sel.value);
    });
    // Collect rows from the table body: each row represents a set and its corresponding exercise details.
    const tableBody = document.getElementById('tableBody');
    const rows = [];
    for (let i = 0; i < tableBody.rows.length; i++) {
        const row = tableBody.rows[i];
        const setLabel = row.cells[0].textContent.trim();
        const data = [];
        for (let j = 1; j < row.cells.length; j++) {
            let cellInput = row.cells[j].querySelector('input');
            data.push(cellInput ? cellInput.value : '');
        }
        rows.push({ set: setLabel, data: data });
    }

    // Create the JSON object to represent the plan
    const planJson = { headers, rows };

    try {
        const response = await fetch('/api/saveWorkoutPlan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, routine, day, planJson ,date: dateParam})
        });
        const result = await response.json();
        if (result.success) {
            alert("Workout plan saved successfully.");
        } else {
            alert("Failed to save workout plan: " + result.message);
        }
    } catch (error) {
        console.error("Error saving workout plan:", error);
        alert("Error saving workout plan.");
    }
}


// Redirect to admin dashboard
function redirectToDashboard() {
    window.location.href = "adminspage.html"; // Adjust the URL as needed
}

function redirectToLockers() {
    window.location.href = "lockers.html"; // Adjust the URL as needed
}

document.addEventListener("DOMContentLoaded", async () => {
    const userId = localStorage.getItem('userId');
    const routineSelect = document.getElementById('routineSelect');
    const daySelect = document.getElementById('daySelect');
    const tableWrapper = document.getElementById('tableWrapper');
    const user_id = userId; // Replace with dynamic user id as needed
    // Initially hide the table container.
    tableWrapper.style.display = "none";
  

    
    try {
      const response = await fetch(
        `/api/getWorkoutPlan?user_id=${user_id}`
      );
      const result = await response.json();
      if (result.success && result.plan) {
        // Populate the routine select with the latest routine from the database.
        routineSelect.value = result.plan.routine;
        // Rebuild the table from the plan JSON.
        rebuildTable(result.plan.plan_json);
        // Optionally, clear the day select so the coach chooses a day anew.
        daySelect.value = "";
        // Note: Table is shown only after the coach selects a day from the dropdown.
      } else {
        // No plan found – leave routine blank so coach will pick one manually.
        routineSelect.value = "";
        // Create a default table (but remain hidden) so that when both fields are chosen
        // a default table appears.
        createDefaultTable();
      }
    } catch (error) {
      console.error("Error fetching latest workout plan:", error);
      routineSelect.value = "";
      createDefaultTable();
    }
  
    // Populate the day select based on the current routine value.
    handleRoutineChange();
  
    // Attach event listeners.
    routineSelect.addEventListener('change', () => {
      // When routine changes, update day options and hide table.
      handleRoutineChange();
      tableWrapper.style.display = "none";
    });
    daySelect.addEventListener('change', handleDayChange);

  });


  // whenever the calendar date changes, reset the coach form
document.addEventListener('calendarDateChanged', async e => {
// 1) grab the clicked date
selectedDate = e.detail.selectedDate;

// 2) format as YYYY‑MM‑DD (local time)
const Y = selectedDate.getFullYear();
const M = String(selectedDate.getMonth()+1).padStart(2,'0');
const D = String(selectedDate.getDate()).padStart(2,'0');
const dateParam = `${Y}-${M}-${D}`;

// 3) DOM refs
const routineSelect      = document.getElementById('routineSelect');
const daySelect          = document.getElementById('daySelect');
const tableWrapper       = document.getElementById('tableWrapper');
const workoutPlanHeader  = document.getElementById('workoutPlanHeader');
const userId             = localStorage.getItem('userId');

// 4) fetch any plans for that exact date
const res  = await fetch(
  `/api/getWorkoutPlansByDate?user_id=${userId}&date=${dateParam}`
);
const json = await res.json();

if (json.success && json.plans.length > 0) {
  // populate form with the first matching plan
  const plan = json.plans[0];
  routineSelect.value = plan.routine;
  handleRoutineChange();              // repopulate daySelect
  daySelect.value = plan.day;

  rebuildTable(plan.plan_json);       // fill in the table
  tableWrapper.style.display = 'block';
  workoutPlanHeader.classList.remove('hidden');
} else {
  // no plan → clear everything
  routineSelect.value = '';
  handleRoutineChange();
  tableWrapper.style.display = 'none';
  workoutPlanHeader.classList.add('hidden');
}
});
