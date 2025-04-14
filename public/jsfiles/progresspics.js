// Hide loading overlay when page loads.
window.addEventListener("load", () => {
  const overlay = document.getElementById("loadingOverlay");
  overlay.style.opacity = "0";
  setTimeout(() => { overlay.style.display = "none"; }, 3000);
});

// Navigation functions.
function redirectLockers() {
  location.replace('lockers.html');
}
function redirectTutorials() {
  location.href = 'tutorials.html';
}
function redirectProgressPics() {
  location.href = 'progresspics.html';
}
function redirectLogs() {
  location.href = 'logs.html';
}

// Global object to cache photos once retrieved from the database.
let progressPhotos = {
  front: [],
  rear: [],
  side: []
};

// Replace this user identifier with one drawn from session/authentication.
const userId = localStorage.getItem('userId');; // Example user ID.

// Retrieve photos for a given view from the backend.
async function fetchProgressPhotos(view) {
  try {
    const response = await fetch(`/get-progress-photos?userId=${userId}&view=${view}`);
    if (!response.ok) throw new Error("Network response was not ok.");
    const data = await response.json();
    // Cache the retrieved photos.
    progressPhotos[view] = data.photos || [];
    renderCarouselForView(view);
  } catch (error) {
    console.error("Error fetching progress photos:", error);
  }
}

// Form submission handler for uploading new progress photo.
document.getElementById("progressPicForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const viewSelect = document.getElementById("viewSelect");
  const fileInput = document.getElementById("progressPhoto");
  const selectedView = viewSelect.value;
  const file = fileInput.files[0];

  if (!selectedView || !file) {
    alert("Please select a view and choose a photo to upload.");
    return;
  }

  // For local preview, using FileReader:
  const reader = new FileReader();
  reader.onload = async function(event) {
    const imageUrl = event.target.result;
    // Optionally, send the file to the server via AJAX so it is saved permanently.
    let formData = new FormData();
    formData.append("userId", userId);
    formData.append("view", selectedView);
    formData.append("photo", file);
  
    try {
      const uploadResp = await fetch("/upload-progress-photo", {
        method: "POST",
        body: formData
      });
      const resData = await uploadResp.json();
      if (resData.success) {
        // Use the stored photo path returned by the server.
        progressPhotos[selectedView].push(resData.photoPath);
        renderCarouselForView(selectedView);
        document.getElementById("progressPicForm").reset();
      } else {
        alert("Error uploading photo: " + resData.message);
      }
    } catch (err) {
      console.error("Error uploading photo:", err);
    }
  };
  reader.readAsDataURL(file);
});

// Render the carousel for the selected view.
function renderCarouselForView(view) {
  const carouselInner = document.getElementById("carouselInner");
  carouselInner.innerHTML = "";

  if (progressPhotos[view].length === 0) {
    const defaultSlide = document.createElement("div");
    defaultSlide.classList.add("carousel-item", "active", "fade-in");

    const img = document.createElement("img");
    img.src = "https://via.placeholder.com/800x400?text=No+Photos+Yet";
    img.classList.add("d-block", "w-100");
    img.alt = "No Photos Yet";
    defaultSlide.appendChild(img);

    const caption = document.createElement("div");
    caption.classList.add("carousel-caption", "d-none", "d-md-block");
    caption.innerHTML = `<h5>No ${view.charAt(0).toUpperCase() + view.slice(1)} View Photos Uploaded</h5>`;
    defaultSlide.appendChild(caption);

    carouselInner.appendChild(defaultSlide);
    // Remove the animation class after animation completes (500ms)
    setTimeout(() => { defaultSlide.classList.remove("fade-in"); }, 500);

  } else {
    progressPhotos[view].forEach((imageUrl, index) => {
      const slide = document.createElement("div");
      slide.classList.add("carousel-item", "fade-in");
      if (index === 0) { slide.classList.add("active"); }

      const img = document.createElement("img");
      img.src = imageUrl;
      img.classList.add("d-block", "w-100");
      img.alt = `${view.charAt(0).toUpperCase() + view.slice(1)} View Progress Photo`;
      slide.appendChild(img);

      const caption = document.createElement("div");
      caption.classList.add("carousel-caption", "d-none", "d-md-block");
      caption.innerHTML = `<h5>${view.charAt(0).toUpperCase() + view.slice(1)} View</h5>`;
      slide.appendChild(caption);

      carouselInner.appendChild(slide);
      // Remove the animation class after animation completes (500ms)
      setTimeout(() => { slide.classList.remove("fade-in"); }, 500);
    });
  }
}


// When the user changes the view in the select element, load photos from the database.
document.getElementById("viewSelect").addEventListener("change", function(e) {
  const selectedView = e.target.value;
  // Instead of rendering from local cache, fetch the photos from the server.
  fetchProgressPhotos(selectedView);
});