// ========================
// stats.js
// ========================

// Show the Bootstrap offcanvas for Stats and update the bodyweight progress.
function showStatsOffcanvas() {
  const offcanvasEl = document.getElementById('statsOffcanvas');
  const bsOffcanvas = new bootstrap.Offcanvas(offcanvasEl);
  bsOffcanvas.show();
  updateBodyweightProgress();
}

// Dummy function to get the logged-in user's ID.
// Replace with your actual authentication retrieval logic.
function getUserID() {
  return localStorage.getItem('userId');
}

// ------------------------
// Goal Form & Goals Logic
// ------------------------

// When the page loads, fetch any existing user goals.
document.addEventListener("DOMContentLoaded", async () => {
  await fetchUserGoals();
});

// Fetch user goals from the backend.
async function fetchUserGoals() {
  const userId = getUserID();
  try {
    const response = await fetch(`/api/userGoals?userId=${userId}`);
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (data && data.goal) {
      populateGoalForm(data.goal);
      disableSaveButton();
    }
  } catch (error) {
    console.error("Error fetching user goals:", error);
  }
}

// Populate the goal form with data.
function populateGoalForm(goal) {
  document.getElementById("exerciseGoal").value = goal.exercise_goal;
  document.getElementById("weightGoal").value = goal.target_weight;
  document.getElementById("repsGoal").value = goal.target_reps;
  document.getElementById("bodyweightGoal").value = goal.desired_bodyweight;
  disableGoalInputs();
}

// Disable all inputs in the goal form.
function disableGoalInputs() {
  const inputs = document.querySelectorAll("#goalForm input, #goalForm select");
  inputs.forEach(input => input.disabled = true);
}

// Enable all inputs in the goal form.
function enableGoalInputs() {
  const inputs = document.querySelectorAll("#goalForm input, #goalForm select");
  inputs.forEach(input => input.disabled = false);
}

// Disable/Enable the Save Goals button.
function disableSaveButton() {
  document.getElementById("saveGoalsBtn").disabled = true;
}
function enableSaveButton() {
  document.getElementById("saveGoalsBtn").disabled = false;
}

// Called when the user clicks the "Edit Goals" button.
function enableGoals() {
  enableGoalInputs();
  enableSaveButton();
}

// Handle the goal form submission.
document.getElementById("goalForm").addEventListener("submit", async function(event) {
  event.preventDefault(); // Prevent default form submission

  const userId = getUserID();
  const exerciseGoal = document.getElementById("exerciseGoal").value;
  const targetWeight = document.getElementById("weightGoal").value;
  const targetReps = document.getElementById("repsGoal").value;
  const desiredBodyweight = document.getElementById("bodyweightGoal").value;
  // Capture the current date in YYYY-MM-DD format.
  const goalDate = new Date().toISOString().slice(0, 10);

  const goalData = {
    user_id: userId,
    exercise_goal: exerciseGoal,
    target_weight: targetWeight,
    target_reps: targetReps,
    desired_bodyweight: desiredBodyweight,
    goal_date: goalDate
  };

  try {
    const response = await fetch("/api/userGoals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goalData)
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Goals saved:", data);
    disableGoalInputs();
    disableSaveButton();
  } catch (error) {
    console.error("Error saving goals:", error);
  }
});

// ------------------------
// Bodyweight Progress Logic
// ------------------------
async function updateBodyweightProgress() {
  const userId = getUserID();
  console.log(`updateBodyweightProgress() called for userId: ${userId}`);

  try {
    const response = await fetch(`/api/userBodyweightWeekly?userId=${userId}`);
    console.log('Raw response from /api/userBodyweightWeekly:', response);

    if (!response.ok) {
      throw new Error('Failed to fetch weekly bodyweight averages.');
    }

    const data = await response.json();
    console.log('Data received from backend:', data);

    const { weeklyAverages, currentWeek } = data;

    // Locate the label element for "Bodyweight Progress"
    let bwLabel;
    document.querySelectorAll("label.form-label").forEach(label => {
      if (label.textContent.trim().startsWith("Bodyweight Progress")) {
        bwLabel = label;
      }
    });

    // When there are no records, show the beginner message.
    if ((!weeklyAverages || weeklyAverages.length === 0) && !currentWeek) {
      if (bwLabel) {
        bwLabel.textContent = "Bodyweight Progress (Begin Tracking to see your progress)";
      }
      const bodyweightProgressBar = document.querySelector('#progressBars .progress-bar.bg-success');
      bodyweightProgressBar.style.width = "0%";
      bodyweightProgressBar.setAttribute('aria-valuenow', 0);
      bodyweightProgressBar.textContent = "0%";

      // Also remove any existing chart.
      if (bodyweightChartInstance) {
        bodyweightChartInstance.destroy();
        bodyweightChartInstance = null;
      }
      return;
    }

    // Build the week/day text.
    let weekText = "";
    if (currentWeek) {
      const weekIndex = currentWeek.week_index; // Zero-based index.
      const dayCount = currentWeek.count;         // Number of entries in the current week.
      weekText = `Week: ${weekIndex + 1} / Day: ${dayCount} out of 7`;
    } else if (weeklyAverages && weeklyAverages.length > 0) {
      weekText = `W${weeklyAverages.length} Completed`;
    }

    if (bwLabel) {
      bwLabel.textContent = `Bodyweight Progress (${weekText})`;
    }

    // Determine starting and current weekly averages.
    let startingBodyweight = (weeklyAverages && weeklyAverages.length > 0)
      ? weeklyAverages[0].average_bodyweight
      : null;
    let currentWeeklyAverage = (weeklyAverages && weeklyAverages.length > 0)
      ? weeklyAverages[weeklyAverages.length - 1].average_bodyweight
      : startingBodyweight;
    if (!startingBodyweight) startingBodyweight = currentWeeklyAverage;

    console.log(`Starting Bodyweight: ${startingBodyweight}, Current Weekly Average: ${currentWeeklyAverage}`);

    const targetBodyweight = parseFloat(document.getElementById("bodyweightGoal").value);
    console.log(`Target Bodyweight: ${targetBodyweight}`);

    if (!startingBodyweight || !targetBodyweight || startingBodyweight === targetBodyweight) {
      console.log('Invalid starting or target bodyweight. Aborting update.');
      return;
    }

    let progress;
    if (startingBodyweight > targetBodyweight) {
      // For weight loss.
      progress = ((startingBodyweight - currentWeeklyAverage) / (startingBodyweight - targetBodyweight)) * 100;
    } else {
      // For weight gain.
      progress = ((currentWeeklyAverage - startingBodyweight) / (targetBodyweight - startingBodyweight)) * 100;
    }
    progress = Math.min(Math.round(progress), 100);
    console.log(`Calculated progress: ${progress}%`);

    // Animate the progress bar: reset it to 0 then update to the new value.
    const bodyweightProgressBar = document.querySelector('#progressBars .progress-bar.bg-success');
    bodyweightProgressBar.style.width = "0%";
    bodyweightProgressBar.setAttribute('aria-valuenow', 0);
    bodyweightProgressBar.textContent = "0%";
    setTimeout(() => {
      bodyweightProgressBar.style.width = `${progress}%`;
      bodyweightProgressBar.setAttribute('aria-valuenow', progress);
      bodyweightProgressBar.textContent = `${progress}%`;
    }, 100); // Adjust delay as needed

    console.log('Bodyweight progress bar updated with animation.');

    // In addition to the weekly average chart, if there are more than 7 records,
    // update the full bodyweight chart (plot every record).
    updateFullBodyweightChart();
  } catch (error) {
    console.error("Error updating bodyweight progress:", error);
  }
}

// Global variable to hold the Chart instance.
let bodyweightChartInstance = null;

// Function to update/create the chart that plots every bodyweight record.
// This chart is created only if there are more than 7 records.
async function updateFullBodyweightChart() {
  const userId = getUserID();
  try {
    const response = await fetch(`/api/userBodyweights?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch bodyweight records.');
    }
    const data = await response.json();
    const records = data.bodyweights;
    console.log('Full bodyweight records:', records);
    if (!records || records.length <= 7) {
      // If fewer than 7 records, destroy any existing chart.
      if (bodyweightChartInstance) {
        bodyweightChartInstance.destroy();
        bodyweightChartInstance = null;
      }
      return;
    }
    
    // Prepare labels and data.
    // Here, we use the record date (formatted as MM/DD) for the x-axis.
    const labels = records.map(record => {
      const date = new Date(record.created_at);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const dataValues = records.map(record => parseFloat(record.bodyweight));

    const ctx = document.getElementById('bodyweightChart').getContext('2d');

    if (bodyweightChartInstance) {
      // Update existing chart.
      bodyweightChartInstance.data.labels = labels;
      bodyweightChartInstance.data.datasets[0].data = dataValues;
      bodyweightChartInstance.update();
    } else {
      // Create a new chart.
      bodyweightChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Bodyweight',
            data: dataValues,
            fill: false,
            borderColor: '#26a69a', // Modern teal color.
            backgroundColor: '#26a69a',
            tension: 0.1
          }]
        },
        options: {
          scales: {
            x: {
              title: {
                display: true,
                text: 'Date'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Bodyweight (Kg)'
              }
            }
          }
        }
      });
    }
  } catch (error) {
    console.error("Error updating full bodyweight chart:", error);
  }
}