// Mapping routines to their corresponding day options
const routineDays = {
    "Push Pull Legs": ["Push", "Pull", "Legs"],
    "Chest Back Legs Arms": ["Chest", "Back", "Legs", "Arms"],
    "Full Body": ["Full Body"],
    "Upper/Lower Split": ["Upper", "Lower"]
  };
  

  function handleRoutineChange() {
    const routine = document.getElementById('routineSelect').value;
    const daySelect = document.getElementById('daySelect');
    // Clear previous day options and add placeholder
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
  
  async function handleDayChange() {
    const routine = document.getElementById('routineSelect').value;
    const day = document.getElementById('daySelect').value;
    const tableWrapper = document.getElementById('tableWrapper');
    const workoutPlanHeader = document.getElementById('workoutPlanHeader');
    const userId = localStorage.getItem('userId'); // Replace with dynamic user id as needed

    if (routine && day) {
        document.getElementById('selectedDay').textContent = day;
        await loadPlanForRoutineDay(userId, routine, day);
        tableWrapper.style.display = "block";
        workoutPlanHeader.classList.remove('hidden');
    } else {
        tableWrapper.style.display = "none";
        workoutPlanHeader.classList.add('hidden');
    }
}
  
  // Load a workout plan for the given user, routine, and day
  async function loadPlanForRoutineDay(user_id, routine, day) {
    try {
      const response = await fetch(
        `/api/getWorkoutPlan1?user_id=${user_id}&routine=${encodeURIComponent(routine)}&day=${encodeURIComponent(day)}`
      );
      const result = await response.json();
      if (result.success && result.plan) {
        rebuildTable(result.plan.plan_json);
      } else {
        createDefaultTable();
      }
    } catch (error) {
      console.error("Error loading workout plan:", error);
      createDefaultTable();
    }
  }
// Rebuild the workout plan table given the plan data
// planData is expected to have { headers: [...], rows: [{ set, data: [...] }, ...] }
function rebuildTable(planData) {
    const headerRow = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');

    // Clear existing header cells
    headerRow.innerHTML = '';
    // Create the first header cell for "Set" with row buttons
    const setTh = document.createElement('th');
    setTh.innerHTML = `Set `;
    // Create and append row add/remove buttons
    const addRowBtn = document.createElement('button');
    addRowBtn.onclick = addRow;
    addRowBtn.className = "btn btn-link small-btn p-0";
    addRowBtn.textContent = "+";
    const removeRowBtn = document.createElement('button');
    removeRowBtn.onclick = removeRow;
    removeRowBtn.className = "btn btn-link small-btn p-0";
    removeRowBtn.textContent = "–";
    setTh.appendChild(addRowBtn);
    setTh.appendChild(removeRowBtn);
    headerRow.appendChild(setTh);

    // Create header cells for each exercise using input fields
    planData.headers.forEach((headerText, index) => {
        const th = document.createElement('th');

        // Create an input for the header
        const input = document.createElement('input');
        input.type = "text";
        input.value = headerText || `Exercise ${index + 1}`; // Use saved value or default
        input.placeholder = "Exercise name";
        input.style.border = "none";
        input.style.textAlign = "center";
        th.appendChild(input);

        // Create add and remove column buttons
        const addColBtn = document.createElement('button');
        addColBtn.onclick = addColumn;
        addColBtn.className = "btn btn-link small-btn p-0";
        addColBtn.textContent = "+";
        th.appendChild(addColBtn);

        const removeColBtn = document.createElement('button');
        removeColBtn.onclick = removeColumn;
        removeColBtn.className = "btn btn-link small-btn p-0";
        removeColBtn.textContent = "–";
        th.appendChild(removeColBtn);

        headerRow.appendChild(th);
    });

    // Clear existing table body rows
    tableBody.innerHTML = '';

    // Rebuild table rows based on planData.rows
    planData.rows.forEach(rowData => {
        const tr = document.createElement('tr');
        // First cell: Set label
        const tdSet = document.createElement('td');
        tdSet.textContent = rowData.set;
        tr.appendChild(tdSet);
        // Create a cell with an input field for each exercise column
        rowData.data.forEach(cellValue => {
            const td = document.createElement('td');
            const input = document.createElement('input');
            input.type = "text";
            input.placeholder = "Reps/Weight";
            input.value = cellValue;
            td.appendChild(input);
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

// Create a default table (1 row, 1 column) with a blank entry for a new plan
function createDefaultTable() {
    const headerRow = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');

    // Clear table header and body
    headerRow.innerHTML = '';
    tableBody.innerHTML = '';

    // Create header row: first cell "Set" with buttons, and one exercise column with input field
    const setTh = document.createElement('th');
    setTh.innerHTML = `Set 
      <button onclick="addRow()" class="btn btn-link small-btn p-0">+</button>
      <button onclick="removeRow()" class="btn btn-link small-btn p-0">–</button>`;
    headerRow.appendChild(setTh);

    const exerciseTh = document.createElement('th');
    const exerciseInput = document.createElement('input');
    exerciseInput.type = "text";
    exerciseInput.placeholder = "Exercise name";
    exerciseInput.value = "Exercise 1";
    exerciseInput.style.border = "none";
    exerciseInput.style.textAlign = "center";
    exerciseTh.appendChild(exerciseInput);
    exerciseTh.innerHTML += ` 
      <button onclick="addColumn()" class="btn btn-link small-btn p-0">+</button>
      <button onclick="removeColumn()" class="btn btn-link small-btn p-0">–</button>`;
    headerRow.appendChild(exerciseTh);

    // Create one row with "Set 1" and one input cell
    const tr = document.createElement('tr');
    const setTd = document.createElement('td');
    setTd.textContent = 'Set 1';
    tr.appendChild(setTd);

    const inputTd = document.createElement('td');
    inputTd.innerHTML = '<input type="text" placeholder="Reps/Weight">';
    tr.appendChild(inputTd);

    tableBody.appendChild(tr);
}

// Add a new column (exercise) to the table with an input header field
function addColumn() {
    const headerRow = document.getElementById('tableHeader');
    const currentCols = headerRow.children.length - 1; // number of exercise columns (skip "Set" column)
    const newColIndex = currentCols + 1;

    const newTh = document.createElement('th');
    // Create an input field for the new exercise name
    const input = document.createElement('input');
    input.type = "text";
    input.placeholder = "Exercise name";
    input.value = `Exercise ${newColIndex}`;
    input.style.border = "none";
    input.style.textAlign = "center";
    newTh.appendChild(input);
    newTh.innerHTML += ` 
      <button onclick="addColumn()" class="btn btn-link small-btn p-0">+</button>
      <button onclick="removeColumn()" class="btn btn-link small-btn p-0">–</button>`;
    headerRow.appendChild(newTh);

    // Add a new cell with an input field to each row in tbody
    const rows = document.getElementById('tableBody').rows;
    for (let i = 0; i < rows.length; i++) {
        const newCell = document.createElement('td');
        newCell.innerHTML = '<input type="text" placeholder="Reps/Weight">';
        rows[i].appendChild(newCell);
    }
}

// Remove the last exercise column (if more than 1 exists)
function removeColumn() {
    const headerRow = document.getElementById('tableHeader');
    if (headerRow.children.length > 2) { // ensure at least one exercise column remains
        headerRow.removeChild(headerRow.lastElementChild);
        const rows = document.getElementById('tableBody').rows;
        for (let i = 0; i < rows.length; i++) {
            rows[i].removeChild(rows[i].lastElementChild);
        }
    } else {
        alert("At least one exercise column must remain.");
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

    if (!routine || !day) {
        alert("Please select both a routine and a day.");
        return;
    }

    // Collect exercise headers from the table (skip the first cell holding "Set")
    const headerRow = document.getElementById('tableHeader');
    const headers = [];
    for (let i = 1; i < headerRow.children.length; i++) {
        // Expect an input field in each header cell
        const input = headerRow.children[i].querySelector('input');
        headers.push(input ? input.value.trim() : '');
    }

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
            body: JSON.stringify({ userId, routine, day, planJson })
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
  
    // Optionally, you may want to load the latest plan using defaults.
    // If you want the coach to choose manually when there is no plan,
    // you can skip the automatic API call here.
    // For this example, we'll try loading with default values:
    const defaultRoutine = "Push Pull Legs";
    const defaultDay = "Push";
    
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

    document.dispatchEvent(new CustomEvent("coachPlanLoaded"));
  });


  