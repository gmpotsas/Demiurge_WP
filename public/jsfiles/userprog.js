// --- Global Variables ---
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = new Date();

// User id is pulled from local storage (adjust based on your auth logic)
let user_id = localStorage.getItem('userId');
/**
 * Build the user‑modal table with the same #cols & #rows as the coach table,
 * but leave all fields blank for the user to fill.
 */
function syncUserTableStructure() {
  const coachHeaderEls = document.querySelectorAll('#tableHeader th');
  const coachRows      = document.querySelectorAll('#tableBody tr').length;
  const hdr            = document.getElementById('tableHeader1');
  const tb             = document.getElementById('tableBody1');

  // clear old
  hdr.innerHTML = '';
  tb.innerHTML  = '';

  // re-create the Set‑column header
  const setTH = document.createElement('th');
  setTH.innerHTML =
    'Set ' +
    '<button onclick="addUserRow()" class="btn btn-link small-btn p-0">+</button>' +
    '<button onclick="removeUserRow()" class="btn btn-link small-btn p-0">–</button>';
  hdr.appendChild(setTH);

  // for each coach header after index 0
    // for each coach header after index 0, grab the coach‑table <select> value
    coachHeaderEls.forEach((coachTH, idx) => {
      if (idx === 0) return; // skip the "Set" column
      // find the exercise dropdown the coach is using
      const coachSelect = coachTH.querySelector('select');
      // use the label text; fallback to stripping icons if no <select>
     const label = coachSelect
        ? coachSelect.options[coachSelect.selectedIndex].textContent
        : coachTH.textContent.replace(/[+–]/g,'').trim();
      // build user header dropdown pre‑selected to that same label
      hdr.appendChild(createExerciseHeaderCell(label));
    });

  // build blank rows to match coachRows
  for (let r = 1; r <= coachRows; r++) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.textContent = 'Set ' + r;
    tr.appendChild(td);

    // one empty input cell per coach column
    for (let c = 1; c < coachHeaderEls.length; c++) {
      const cell = document.createElement('td');
      cell.innerHTML = `
        <input type="text" placeholder="Reps/Weight"
               style="background-color:#444;color:#fff;border:none;width:100%;text-align:center;">
      `;
      tr.appendChild(cell);
    }
    tb.appendChild(tr);
  }
}
// --- Calendar Rendering Functions ---
function renderCalendar(month, year) {
  const calendarGrid = document.querySelector('.cal-days');
  const day = document.getElementById('daySelect')
  const calDayLabel  = document.getElementById('calDayLabel');
  const calDateLabel = document.getElementById('calDateLabel');
  const monthname = document.getElementById("calMonthName");
  const today        = new Date();
  const dayNames     = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  // … month/year header code …
 monthname.innerText = getMonthName(month)

  calendarGrid.innerHTML = "";
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth   = new Date(year, month + 1, 0).getDate();

  // blank slots
  for (let i = 0; i < firstDayIndex; i++) {
    const blankBtn = document.createElement('button');
    blankBtn.className = 'btn cal-btn';
    blankBtn.disabled = true;
    calendarGrid.appendChild(blankBtn);
  }

  // day buttons
  for (let d = 1; d <= daysInMonth; d++) {
    const btn     = document.createElement('button');
    btn.className = 'btn cal-btn';
    btn.textContent = d;
    const thisDate = new Date(year, month, d);

    if (thisDate > today) {
      btn.disabled = true;
    } else {
      btn.addEventListener('click', () => {
        // highlight selection
        calendarGrid.querySelectorAll('.cal-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        // update labels & global
        selectedDate = thisDate;
        calDayLabel.textContent  = dayNames[thisDate.getDay()];
        calDateLabel.textContent = `${getMonthName(month)} ${d} ${year}`;

        // load the user side
        loadUserProgress();

        // **fire the coach listener**
        document.dispatchEvent(new CustomEvent('calendarDateChanged', {
          detail: { selectedDate }
        }));
        
      });
    }

    // mark “today”
    if (
      d === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    ) {
      btn.classList.add('today','selected');
    }

    calendarGrid.appendChild(btn);
  }
}

function getMonthName(idx) {
  return [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ][idx];
}
// --- Left Panel: Set Day Dropdown Options Based on Routine ---
function setUserDayOptions(routine) {
  const daySelect = document.getElementById('daySelect');
  daySelect.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Choose...";
  defaultOption.selected = true;
  defaultOption.disabled = true;
  daySelect.appendChild(defaultOption);

  let options = [];
  if (routine === "Push Pull Legs") {
    options = ["Push", "Pull", "Legs"];
  } else if (routine === "Upper/Lower Split") {
    options = ["Upper", "Lower"];
  } else if (routine === "Chest Back Legs Arms") {
    options = ["Chest", "Back", "Legs", "Arms"];
  } else if (routine === "Full Body") {
    options = ["Full Body"];
  } else {
    options = ["Choose Day"];
  }
  options.push("Rest");

  options.forEach(opt => {
    const optionEl = document.createElement("option");
    optionEl.value = opt;
    optionEl.textContent = opt;
    daySelect.appendChild(optionEl);
  });
}

// --- Table Control Functions for the User Progress Table ---
function addUserRow() {
  const tbody = document.getElementById("tableBody1");
  const header = document.getElementById("tableHeader1");
  const colCount = header.getElementsByTagName("th").length;

  const newRow = document.createElement("tr");
  const rowCount = tbody.getElementsByTagName("tr").length;

  const setCell = document.createElement("td");
  setCell.textContent = "Set " + (rowCount + 1);
  newRow.appendChild(setCell);

  for (let i = 1; i < colCount; i++) {
    const td = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Reps/Weight";
    input.style.backgroundColor = "#444";
    input.style.color = "#fff";
    input.style.fontWeight = "bold";
    input.style.border = "none";
    input.style.width = "100%";
    input.style.textAlign = "center";
    input.style.borderRadius = "30px";
    td.appendChild(input);
    newRow.appendChild(td);
  }
  tbody.appendChild(newRow);
}

function removeUserRow() {
  const tbody = document.getElementById("tableBody1");
  if (tbody.rows.length > 1) {
    tbody.deleteRow(tbody.rows.length - 1);
  } else {
    alert("At least one set is required.");
  }
}

function addUserColumn() {
  const header = document.getElementById("tableHeader1");
  const tbody = document.getElementById("tableBody1");

  const newTH = createExerciseHeaderCell();
  header.appendChild(newTH);

  Array.from(tbody.rows).forEach(row => {
    const newTD = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Reps/Weight";
    input.className = "form-control form-control-sm";
    input.style.backgroundColor = "#444";
    input.style.color = "#fff";
    input.style.fontWeight = "bold";
    input.style.border = "none";
    input.style.textAlign = "center";
    input.style.borderRadius = "30px";
    newTD.appendChild(input);
    row.appendChild(newTD);
  });
}

function removeUserColumn() {
  const header = document.getElementById("tableHeader1");
  const tbody = document.getElementById("tableBody1");
  const thCount = header.getElementsByTagName("th").length;

  if (thCount > 2) {
    header.deleteCell(thCount - 1);
    Array.from(tbody.rows).forEach(row => {
      row.deleteCell(row.cells.length - 1);
    });
  } else {
    alert("At least one exercise column is required.");
  }
}

// --- Helper: Build an Exercise Header Cell with Dropdown and Controls ---
function createExerciseHeaderCell(exerciseName = "") {
  const th = document.createElement("th");

  // start the <select>, then:
  //  • if exerciseName is non‑empty, render it as the first, selected option
  //  • else render a disabled placeholder
  const opts = exerciseName
    ? `<option value="${exerciseName}" selected>${exerciseName}</option>`
    : `<option value="" disabled selected>Select Exercise</option>`;

  // now the rest of your exercise choices
  th.innerHTML = `
    <select class="form-select form-select-sm"
            style="background-color: #444; color: #fff; border: none; font-weight: bold; text-align: center;">
      ${opts}
      <option value="bench_press">Bench Press</option>
      <option value="squat">Squat</option>
      <option value="deadlift">Deadlift</option>
      <option value="overhead_press">Overhead Press</option>
      <option value="bicep_curl">Bicep Curl</option>
    </select>
    <div class="d-inline">
      <button onclick="addUserColumn()" class="btn btn-link small-btn p-0">+</button>
      <button onclick="removeUserColumn()" class="btn btn-link small-btn p-0">–</button>
    </div>
  `;
  return th;
}


// --- Table Population Functions ---
function populateUserProgressTable(tableData) {
  const headerRow = document.getElementById("tableHeader1");
  const tbody = document.getElementById("tableBody1");

  headerRow.innerHTML = "";
  tbody.innerHTML = "";

  const setTH = document.createElement("th");
  setTH.innerHTML = 'Set <button onclick="addUserRow()" class="btn btn-link small-btn p-0">+</button><button onclick="removeUserRow()" class="btn btn-link small-btn p-0">–</button>';
  headerRow.appendChild(setTH);

  tableData.headers.forEach(exercise => {
    headerRow.appendChild(createExerciseHeaderCell(exercise));
  });

  tableData.rows.forEach(rowData => {
    const tr = document.createElement("tr");
    const setTD = document.createElement("td");
    setTD.textContent = rowData.set;
    tr.appendChild(setTD);

    rowData.data.forEach(cellData => {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Reps/Weight";
      input.value = cellData;
      input.style.backgroundColor = "#444";
      input.style.color = "#fff";
      input.style.fontWeight = "bold";
      input.style.border = "none";
      input.style.width = "100%";
      input.style.textAlign = "center";
      input.style.borderRadius = "30px";
      td.appendChild(input);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function resetUserProgressTable() {
  const headerRow = document.getElementById("tableHeader1");
  const tbody = document.getElementById("tableBody1");

  headerRow.innerHTML = "";
  const setTH = document.createElement("th");
  setTH.innerHTML = 'Set <button onclick="addUserRow()" class="btn btn-link small-btn p-0">+</button><button onclick="removeUserRow()" class="btn btn-link small-btn p-0">–</button>';
  headerRow.appendChild(setTH);

  headerRow.appendChild(createExerciseHeaderCell());

  tbody.innerHTML = "";
  const tr = document.createElement("tr");
  const setTD = document.createElement("td");
  setTD.textContent = "Set 1";
  tr.appendChild(setTD);

  const td = document.createElement("td");
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Reps/Weight";
  input.className = "form-control form-control-sm";
  input.style.backgroundColor = "#444";
  input.style.color = "#fff";
  input.style.fontWeight = "bold";
  input.style.border = "none";
  input.style.textAlign = "center";
  input.style.borderRadius = "30px";
  td.appendChild(input);
  tr.appendChild(td);

  tbody.appendChild(tr);
}

// --- Data Submission Function ---
async function submitUserProgress() {
  const routine    = document.getElementById('routineSelect').value;
  const day        = document.getElementById('daySelect').value;
    // new: build YYYY‑MM‑DD HH:mm:ss in local time
    const Y  = selectedDate.getFullYear();
    const M  = String(selectedDate.getMonth()+1).padStart(2,'0');
    const D  = String(selectedDate.getDate()).padStart(2,'0');
    const h  = String(selectedDate.getHours()).padStart(2,'0');
    const m  = String(selectedDate.getMinutes()).padStart(2,'0');
    const s  = String(selectedDate.getSeconds()).padStart(2,'0');
    const ts = `${Y}-${M}-${D} ${h}:${m}:${s}`;

  // --- gather tableData from #tableHeader1 / #tableBody1 ---
  const tableData = { headers: [], rows: [] };

  // headers: skip the first “Set” column
  document.querySelectorAll('#tableHeader1 th')
    .forEach((th, i) => {
      if (i === 0) return;
      const select = th.querySelector('select');
      tableData.headers.push(select.value);
    });

  // rows: each <tr> gives a { set, data: [...] }
  document.querySelectorAll('#tableBody1 tr')
    .forEach(tr => {
      const setLabel = tr.children[0].textContent.trim();
      const data = [];
      // cell 1…n
      for (let c = 1; c < tr.children.length; c++) {
        const input = tr.children[c].querySelector('input');
        data.push(input.value);
      }
      tableData.rows.push({ set: setLabel, data });
    });

  if (!routine || !day ) {
    return alert("Routine, day are all required.");
  }

  const payload = {
    user_id:    user_id,
    routine:    routine,
    day:        day,
    date:       ts,
    table:      tableData
  };

  try {
    await fetch('/api/userprogress', {
      method:  'POST',
      headers: {'Content-Type':'application/json'},
      body:    JSON.stringify(payload)
    });
    alert("Progress submitted successfully!");
    bootstrap.Modal.getInstance(document.getElementById('progressModal')).hide();
  } catch(err) {
    console.error(err);
    alert("Error submitting progress.");
  }
}
// --- Function to Load User Progress Data from Backend ---
async function loadUserProgress() {
  // 1) Mirror coach → user with empty inputs
  syncUserTableStructure();

  // 2) Build your query params
  const routine = document.getElementById('routineSelect').value;
  const workoutDay   = document.getElementById('daySelect').value;
  // the actual date you clicked
  const Y = selectedDate.getFullYear();
  const M = String(selectedDate.getMonth()+1).padStart(2,'0');
  const D = String(selectedDate.getDate()).padStart(2,'0');
  const dateParam = `${Y}-${M}-${D}`;
  
  // grab the coach’s “day” (Push/Pull/Legs/etc.) from the workout form
  
  const qs = `/api/userprogress?user_id=${user_id}`
           + `&routine=${encodeURIComponent(routine)}`
           + `&day=${encodeURIComponent(workoutDay)}`
           + `&date=${dateParam}`;

  try {
    const resp = await fetch(qs);
    // nothing in DB → keep the blank structure we just made
    if (!resp.ok) return;

    const data = await resp.json();
 
    // 4) If we got a saved table, rebuild it
    if (data.table) {
      populateUserProgressTable(data.table);
    }
  } catch(err) {
    console.error("Error loading user progress:", err);
  }
}
// --- Function to Open Modal When Called (Optional) ---
// This function now also updates the modal title based on the user's info,
// the selected day, and the bodyweight.
async function showUserProgressModal() {
  // 1) mirror coach‑table shape
  syncUserTableStructure();

  // 2) update the title (you already have this as async)
  await updateProgressModalTitle();

  // 3) load any existing progress, then rebuild the table
  await loadUserProgress();

  // 4) finally, open the modal
  new bootstrap.Modal(document.getElementById('progressModal')).show();
}
// --- Checkbox Event Listener for Triggering Modal ---
document.getElementById('progressToggle').addEventListener('change', async function() {
  if (!this.checked) return;

  // ensure a day is picked
  if (!document.getElementById('daySelect').value) {
    alert("Please select a day before tracking progress.");
    this.checked = false;
    return;
  }

  // mirror coach table immediately
  syncUserTableStructure();

  // run your little “flip” animation
  const lbl = document.querySelector('.toggle-switch label');
  lbl.classList.add('animate');

  // after the flip, load + show
  setTimeout(async () => {
    lbl.classList.remove('animate');
    await showUserProgressModal();
  }, 300);
});

// --- Initialization on DOMContentLoaded ---
async function initPage() {

  // 3) Copy coach → user routine & day options
  const coachRoutineEl   = document.getElementById('routineSelect');
  const userRoutineInput = document.getElementById('inputGroupSelect01');
  if (coachRoutineEl && userRoutineInput) {
    const coachRoutine = coachRoutineEl.value;
    if (coachRoutine) {
      userRoutineInput.value    = coachRoutine;
      userRoutineInput.disabled = true;
      setUserDayOptions(coachRoutine);
    }
  }

  // 4) Update the left‑panel title
  updateLeftColumnTitle();

  // 5) Finally, fade out the overlay
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.addEventListener('transitionend', () => {
      overlay.style.display = 'none';
    }, { once: true });
  }
}


window.addEventListener('load', () => {
  // 1) run your init
  renderCalendar(currentMonth, currentYear);

  initPage && initPage();
  // 2) fade out & remove overlay
  const overlay = document.getElementById('loadingOverlay');
  if (!overlay) return;
  overlay.style.opacity = '0';
  overlay.addEventListener('transitionend', () => {
    overlay.style.display = 'none';
  }, { once: true });
});



const progressModalEl = document.getElementById('progressModal');
if (progressModalEl) {
  progressModalEl.addEventListener('hidden.bs.modal', () => {
    resetUserProgressTable();
    // Reset the track progress toggle to unchecked.
    document.getElementById('progressToggle').checked = false;
  });
}

// --- NEW: Function to update the modal title based on user info, 
// the selected day, and the bodyweight.
async function updateProgressModalTitle() {
  console.log("updateProgressModalTitle() called");
  try {
    // Log the current values for debugging.
    console.log("Updating modal title. Current user_id:", user_id);
    
    // Fetch the user name from your backend endpoint.
    const response = await fetch(`/api/userinfo?userId=${user_id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch user info.");
    }
    const data = await response.json();
    // Assume the endpoint returns an object with a "name" property.
    let userName = data.name || "User";
    
    // Capitalize the first letter of the user name
    if (userName.length > 0) {
      userName = userName.charAt(0).toUpperCase() + userName.slice(1);
    }
    
    // Get the selected day from the dropdown.
    const daySelected    = document.getElementById('daySelect').value           || "Unknown day";
    
    // Compose the new modal title.
    const modalTitle = `${userName}'s Workout Log for ${daySelected} day.`;
    console.log("New modal title:", modalTitle);
    
    // Update the modal title element (assumed to have id "progressModalLabel").
    document.getElementById('progressModalLabel').textContent = modalTitle;
  } catch (error) {
    console.error("Error updating modal title:", error);
  }
}
async function updateLeftColumnTitle() {
  try {
    // Fetch the user info from your backend.
    const response = await fetch(`/api/userinfo?userId=${user_id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch user info.");
    }
    const data = await response.json();
    // Extract the user name, defaulting to 'User' if not provided.
    let userName = data.name || "User";
    
    // Ensure the first letter is capitalized.
    if (userName.length > 0) {
      userName = userName.charAt(0).toUpperCase() + userName.slice(1);
    }
    
    // Update the left column title.
    const leftPanelTitle = document.getElementById('progressTrackerTitle');
    if (leftPanelTitle) {
      leftPanelTitle.textContent = `${userName}'s Workout and Bodyweight Tracker`;
    }
  } catch (error) {
    console.error("Error updating left column title:", error);
  }
}



// 1) format "1st of April"
function formatDateWithSuffix(d) {
  const day = d.getDate();
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  let suffix = "th";
  if (day % 10 === 1 && day !== 11) suffix = "st";
  else if (day % 10 === 2 && day !== 12) suffix = "nd";
  else if (day % 10 === 3 && day !== 13) suffix = "rd";
  return `${day}${suffix} of ${monthNames[d.getMonth()]}`;
}

// 2) show & populate modal when sticky btn clicked
document
  .getElementById('openBodyweightModal')
  .addEventListener('click', async (e) => {
    e.preventDefault();

    // 1) check for an existing bodyweight goal
    const userId = getUserID();
    try {
      const resp = await fetch(`/api/userGoals?userId=${userId}`);
      if (!resp.ok) throw new Error('Network response was not ok');
      const data = await resp.json();

      if (!data.goal) {
        // no goal → block modal and alert
        return alert('⚠️ Please set a bodyweight goal first under “Goals & Stats.”');
      }
    } catch (err) {
      console.error('Error verifying goal:', err);
      return alert('Unable to verify your goal. Please try again later.');
    }

    // 2) at this point, a goal exists → proceed to populate & open the modal
    const title = `Track your bodyweight for ${formatDateWithSuffix(selectedDate)}`;
    document.getElementById('bodyweightModalLabel').textContent = title;

    const sel = document.getElementById('bodyweightSelect');
    sel.innerHTML = '';
    for (let w = 40.0; w <= 140.0; w += 0.1) {
      const opt = document.createElement('option');
      opt.value = w.toFixed(1);
      opt.textContent = w.toFixed(1);
      sel.appendChild(opt);
    }

    new bootstrap.Modal(document.getElementById('bodyweightModal')).show();
  });

// 3) when toggle flipped, POST to backend
document.getElementById('bodyweightToggle')
  .addEventListener('change', async e => {
    if (!e.target.checked) return;
    const weight = document.getElementById('bodyweightSelect').value;
    const Y = selectedDate.getFullYear();
    const M = String(selectedDate.getMonth()+1).padStart(2,'0');
    const D = String(selectedDate.getDate()).padStart(2,'0');
    const date = `${Y}-${M}-${D}`;

    const payload = {
      user_id,       // from your global
      date,          // YYYY‑MM‑DD
      bodyweight:    weight
    };

    try {
      await fetch('/api/userprogress/bodyweight', {
        method:  'POST',
        headers: {'Content-Type':'application/json'},
        body:    JSON.stringify(payload)
      });
      // close modal & reset toggle
      const modalEl = document.getElementById('bodyweightModal');
      bootstrap.Modal.getInstance(modalEl).hide();
      e.target.checked = false;
      alert('Bodyweight saved!');
    } catch(err) {
      console.error(err);
      alert('Error saving bodyweight.');
      e.target.checked = false;
    }
  });

  // wire up Prev/Next
document.getElementById('prevMonth').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar(currentMonth, currentYear);
});
document.getElementById('nextMonth').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar(currentMonth, currentYear);
});

