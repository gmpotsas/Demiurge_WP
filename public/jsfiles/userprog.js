// --- Global Variables ---
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = new Date();

// User id is pulled from local storage (adjust based on your auth logic)
let user_id = localStorage.getItem('userId');

// --- Calendar Rendering Functions ---
function renderCalendar(month, year) {
  const calendarGrid = document.querySelector('.calendar-grid');
  const calDayLabel = document.getElementById('calDayLabel');
  const calDateLabel = document.getElementById('calDateLabel');
  const calMonthYear = document.getElementById('calMonthYear');
  const today = new Date();
  const dayNames = ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];

  if (month === today.getMonth() && year === today.getFullYear()) {
    calDayLabel.textContent = dayNames[today.getDay()];
    calDateLabel.textContent = `${getMonthName(month)} ${today.getDate()} ${year}`;
  } else {
    const firstDay = new Date(year, month, 1);
    calDayLabel.textContent = dayNames[firstDay.getDay()];
    calDateLabel.textContent = `${getMonthName(month)} 1 ${year}`;
  }
  calMonthYear.innerHTML = `<span>${getMonthName(month)}</span><span>${year}</span>`;

  calendarGrid.innerHTML = "";
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Insert blank cells for days before the first of the month.
  for (let i = 0; i < firstDayIndex; i++) {
    const blank = document.createElement('div');
    blank.classList.add('day-cell', 'blank');
    calendarGrid.appendChild(blank);
  }

  // Create day cells for each day in the month.
  for (let d = 1; d <= daysInMonth; d++) {
    const dayCell = document.createElement('div');
    dayCell.classList.add('day-cell');
    dayCell.textContent = d;

    // Create a date object for the cell.
    const cellDate = new Date(year, month, d);

    // Mark today.
    if (
      d === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    ) {
      dayCell.classList.add('today');
    }

    // If the cell's date is in the future relative to today, disable selection.
    if (cellDate > today) {
      dayCell.classList.add('disabled');
      dayCell.title = "Cannot select future dates";
    } else {
      // For current or past dates, add the click event.
      dayCell.addEventListener('click', () => {
        document.querySelectorAll('.calendar-grid .day-cell').forEach(c => c.classList.remove('selected'));
        dayCell.classList.add('selected');
        selectedDate = new Date(year, month, d);
        calDayLabel.textContent = dayNames[selectedDate.getDay()];
        calDateLabel.textContent = `${getMonthName(month)} ${d} ${year}`;
        // Load the user progress for this date.
        loadUserProgress();
      });
    }
    calendarGrid.appendChild(dayCell);
  }
}

function getMonthName(idx) {
  const months = [
    "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος",
    "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος",
    "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"
  ];
  return months[idx];
}

// --- Left Panel: Set Day Dropdown Options Based on Routine ---
function setUserDayOptions(routine) {
  const daySelect = document.getElementById('inputGroupSelect02');
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
  const selectHTML = `
    <select class="form-select form-select-sm" 
            style="background-color: #444; color: #fff; border: none; font-weight: bold; text-align: center;">
      <option value="" ${exerciseName === "" ? "selected" : "disabled"}>Select Exercise</option>
      <option value="bench_press" ${exerciseName === "Bench Press" ? "selected" : ""}>Bench Press</option>
      <option value="squat" ${exerciseName === "Squat" ? "selected" : ""}>Squat</option>
      <option value="deadlift" ${exerciseName === "Deadlift" ? "selected" : ""}>Deadlift</option>
      <option value="overhead_press" ${exerciseName === "Overhead Press" ? "selected" : ""}>Overhead Press</option>
      <option value="bicep_curl" ${exerciseName === "Bicep Curl" ? "selected" : ""}>Bicep Curl</option>
    </select>
    <div class="d-inline">
      <button onclick="addUserColumn()" class="btn btn-link small-btn p-0">+</button>
      <button onclick="removeUserColumn()" class="btn btn-link small-btn p-0">–</button>
    </div>
  `;
  th.innerHTML = selectHTML;
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
  td.appendChild(input);
  tr.appendChild(td);

  tbody.appendChild(tr);
}

// --- Data Submission Function ---
async function submitUserProgress() {
  const routine = document.getElementById('inputGroupSelect01').value;
  const day = document.getElementById('inputGroupSelect02').value;
  // For the dropdown, the value is taken from the selected option.
  const bodyweight = document.getElementById('bodyweightInput').value;

  const year = selectedDate.getFullYear();
  const month = ('0' + (selectedDate.getMonth() + 1)).slice(-2);
  const dateOfMonth = ('0' + selectedDate.getDate()).slice(-2);
  const hours = ('0' + selectedDate.getHours()).slice(-2);
  const minutes = ('0' + selectedDate.getMinutes()).slice(-2);
  const seconds = ('0' + selectedDate.getSeconds()).slice(-2);
  const date = `${year}-${month}-${dateOfMonth} ${hours}:${minutes}:${seconds}`;

  const tableHeaders = [];
  const headerRow = document.getElementById("tableHeader1");
  for (let i = 1; i < headerRow.children.length; i++) {
    const cell = headerRow.children[i];
    const selectEl = cell.querySelector("select");
    let headerText = "";
    if (selectEl) {
      headerText = selectEl.options[selectEl.selectedIndex]?.text || "";
    } else {
      headerText = cell.textContent.replace('+', '').replace('–', '').trim();
    }
    tableHeaders.push(headerText);
  }

  const rows = [];
  const tbody = document.getElementById("tableBody1");
  for (let i = 0; i < tbody.rows.length; i++) {
    const row = tbody.rows[i];
    const setLabel = row.cells[0].textContent.trim();
    const data = [];
    for (let j = 1; j < row.cells.length; j++) {
      const input = row.cells[j].querySelector("input");
      data.push(input ? input.value.trim() : "");
    }
    rows.push({ set: setLabel, data: data });
  }

  const tableData = { headers: tableHeaders, rows: rows };

  if (routine && day && bodyweight && user_id) {
    const payload = {
      user_id: user_id,
      routine: routine,
      day: day,
      bodyweight: bodyweight,
      date: date,
      table: tableData
    };

    try {
      const response = await fetch('/api/userprogress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      alert("Progress submitted successfully!");
      const progressModal = bootstrap.Modal.getInstance(document.getElementById('progressModal'));
      if (progressModal) progressModal.hide();
    } catch (error) {
      console.error("Error submitting progress:", error);
      alert("Error submitting progress.");
    }
  } else {
    alert("Please ensure you have selected a day, entered your bodyweight, and are logged in.");
  }
}

// --- Function to Load User Progress Data from Backend ---
async function loadUserProgress() {
  resetUserProgressTable();

  const routine = document.getElementById('inputGroupSelect01').value;
  const dayOfMonth = selectedDate.getDate();
  const month = selectedDate.getMonth() + 1;
  const year = selectedDate.getFullYear();

  const queryStr = `/api/userprogress?user_id=${user_id}&day=${dayOfMonth}&month=${month}&year=${year}&routine=${encodeURIComponent(routine)}`;

  try {
    const response = await fetch(queryStr);
    if (!response.ok) {
      if (response.status === 404) {
        resetUserProgressTable();
        return;
      } else {
        console.error("Error loading user progress:", response.statusText);
        return;
      }
    }

    const data = await response.json();

    if (data) {
      if (data.bodyweight != null && String(data.bodyweight).trim() !== "") {
        document.getElementById("bodyweightInput").value = parseFloat(data.bodyweight).toFixed(1);
      }
      if (data.day != null && String(data.day).trim() !== "") {
        document.getElementById("inputGroupSelect02").value = String(data.day);
      }
      if (data.table && Object.keys(data.table).length > 0) {
        populateUserProgressTable(data.table);
      } else {
        resetUserProgressTable();
      }
    }
  } catch (err) {
    console.error("Error loading user progress:", err);
    resetUserProgressTable();
  }
}

// --- Function to Open Modal When Called (Optional) ---
// This function now also updates the modal title based on the user's info,
// the selected day, and the bodyweight.
function showUserProgressModal() {
  updateProgressModalTitle().then(() => {
    const progressModal = new bootstrap.Modal(document.getElementById('progressModal'));
    progressModal.show();
    loadUserProgress();
  });
}

// --- Checkbox Event Listener for Triggering Modal ---
document.getElementById('progressToggle').addEventListener('change', function() {
  if (this.checked) {
    const dayField = document.getElementById('inputGroupSelect02').value;
    const bodyweightField = document.getElementById('bodyweightInput').value.trim();
    if (dayField && bodyweightField) {
      resetUserProgressTable();

      const toggleLabel = document.querySelector('.toggle-switch label');
      toggleLabel.classList.add('animate');
      setTimeout(() => {
        toggleLabel.classList.remove('animate');
        showUserProgressModal();  // Use the dedicated function
      }, 300);
    } else {
      alert("Please select a day and enter your bodyweight before tracking progress.");
      this.checked = false;
    }
    loadUserProgress();
  }
});

// --- Initialization on DOMContentLoaded ---
document.addEventListener("DOMContentLoaded", function() {
  const overlay = document.getElementById("loadingOverlay");
  document.getElementById('inputGroupSelect02').value = "";

  // Populate the dropdown with bodyweight options using vanilla JS.
  populateBodyweightDropdown();
  // Optionally, set the default value.
  document.getElementById('bodyweightInput').value = "";

  if (overlay) {
    overlay.style.opacity = 0;
    setTimeout(() => overlay.style.display = "none", 2000);
  }
  renderCalendar(currentMonth, currentYear);

  // Clear the day input so it starts empty.
  document.getElementById('inputGroupSelect02').value = "";

  const coachRoutineEl = document.getElementById('routineSelect');
  const userRoutineInput = document.getElementById('inputGroupSelect01');
  if (coachRoutineEl && userRoutineInput) {
    const coachRoutine = coachRoutineEl.value;
    if (coachRoutine) {
      userRoutineInput.value = coachRoutine;
      userRoutineInput.disabled = true;
      setUserDayOptions(coachRoutine);
    }
  } else {
    console.error("Could not find routine select elements.");
  }
});

// --- Populates the bodyweight dropdown with weights from 40 to 140 kg in 0.1 increments.
function populateBodyweightDropdown() {
  const selectElement = document.getElementById('bodyweightInput');
  selectElement.innerHTML = ""; // Clear any existing options.
  
  for (let weight = 40.0; weight <= 140.0; weight += 0.1) {
    const option = document.createElement('option');
    option.value = weight.toFixed(1);
    option.textContent = weight.toFixed(1);
    selectElement.appendChild(option);
  }
}

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
    const daySelected = document.getElementById('inputGroupSelect02').value || "Unknown day";
    // Get the bodyweight from the dropdown.
    const bodyweight = document.getElementById('bodyweightInput').value || "Unknown weight";
    
    // Compose the new modal title.
    const modalTitle = `${userName}'s Workout Log for ${daySelected} day Weighing at ${bodyweight}kg`;
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

// Call the function once DOM content is loaded or when appropriate.
document.addEventListener("DOMContentLoaded", function() {
  updateLeftColumnTitle();
});
