// Hide the loading overlay when window loads.
window.addEventListener("load", () => {
    const overlay = document.getElementById("loadingOverlay");
    overlay.style.opacity = "0";
    setTimeout(() => { overlay.style.display = "none"; }, 3000);
  });
  
  // Navigation redirection functions.
  function redirectLockers() {
    location.replace('lockers.html');
  }
  function redirectTutorials() {
    location.href = 'tutorials.html';
  }
  function redirectProgressPics() {
    location.href = 'progresspics.html';
  }
  function redirectToDashboard() {
    location.href = 'dashboard.html';
  }
  
  // Admin Upload Form Submission using async/await
  document.getElementById("uploadForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    
    const exercise = document.getElementById("uploadExerciseSelect").value;
    const fileInput = document.getElementById("videoFile");
    const file = fileInput.files[0];
    
    if (!exercise || !file) {
      alert("Please select an exercise and choose a video file to upload.");
      return;
    }
    
    const formData = new FormData();
    formData.append("exercise", exercise);
    formData.append("video", file);
    
    try {
      const response = await fetch('/upload-video', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        alert("Video uploaded successfully.");
        // Optionally update the locally stored mapping immediately:
        videoMapping[exercise] = data.videoUrl;
        // Reset the upload form.
        document.getElementById("uploadForm").reset();
      } else {
        alert("Upload failed: " + data.message);
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      alert("An error occurred during the upload.");
    }
  });
  
  // Global variable to store fetched video mappings.
  let videoMapping = {};
  
  // Fetch video mapping from backend and then attach change listener.
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      // Fetch the video mapping from the backend API.
      const response = await fetch('/get-tutorial-videos');
      const data = await response.json();
      
      // Assume the API returns an object with a "videoMapping" property.
      videoMapping = data.videoMapping;
      
      // Get references to the exercise select dropdown and video elements.
      const exerciseSelect = document.getElementById('exerciseSelect');
      const tutorialVideo = document.getElementById('tutorialVideo');
      const videoSource = document.getElementById('videoSource');
  
      // Attach event listener to the exercise dropdown.
      exerciseSelect.addEventListener('change', () => {
        const selectedExercise = exerciseSelect.value;
        if (videoMapping[selectedExercise]) {
          videoSource.src = videoMapping[selectedExercise];
          tutorialVideo.load();
          tutorialVideo.play();
        } else {
          videoSource.src = "";
          tutorialVideo.pause();
        }
      });
    } catch (error) {
      console.error("Error fetching video mapping:", error);
    }
  });
  