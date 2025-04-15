async function AvailableLockers() {
    try {
        const response = await fetch('/usercred');
        const data = await response.json();
        generateLockers(data);
        AttachLockerEventsandCheckCreds(data);
    } catch (error) {
        console.error("Error fetching locker data:", error);
    }
}
localStorage.clear();
sessionStorage.clear();

// Generate lockers dynamically
async function generateLockers(data) {
    const lockerGrid = document.querySelector('.locker-grid');
    let html = '';
    for (let i = 1; i <= 25; i++) {
        const lockerData = data.find(item => item.locker_id == i);
        let status, overlayContent;
        if (lockerData) {
            status = 'occupied';
            overlayContent = `
                <img src="lockimages/icon30green.png" alt="Occupied Locker">
                <div>Enter your credentials</div>
            `;
        } else {
            status = 'available';
            overlayContent = `
                <img src="lockimages/icon30red.png" alt="Available Locker">
                <div>Contact us to get this locker</div>
            `;
        }

        html += `<button class="locker" data-status="${status}" data-locker="${i}"`;
        if (lockerData) {
            html += ` data-userid="${lockerData.user_id}" data-password="${lockerData.locker_password}"`;
        }
        html += `>
            ${i}
            <div class="locker-overlay">${overlayContent}</div>
        </button>`;
    }
    lockerGrid.innerHTML = html;
}

// Attach event listeners for lockers & credential validation
function AttachLockerEventsandCheckCreds(data) {
    document.querySelectorAll('.locker[data-status="occupied"]').forEach(locker => {
        locker.addEventListener('click', function () {
            document.getElementById('selectedLocker').value = this.getAttribute('data-locker');
            const modal = new bootstrap.Modal(document.getElementById('credentialModal'));
            modal.show();
        });
    });

    document.getElementById('credentialForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const userId = document.getElementById('userId').value.trim();
        const password = document.getElementById('password').value.trim();
        const selectedLocker = document.getElementById('selectedLocker').value;

        // Find the matching locker data
        const lockerData = data.find(item =>
            item.locker_id == selectedLocker &&
            item.user_id == userId &&
            item.locker_password == password
        );
     
        if (lockerData) {
            localStorage.setItem('userId', lockerData.user_id);
            showSuccessModal(selectedLocker, userId);
        } else {
            showErrorModal();
        }

        // Clear form fields after submission
        document.getElementById('userId').value = '';
        document.getElementById('password').value = '';
    });
}

// Show success modal and redirect after delay
async function showSuccessModal(locker, user) {
    const successModalEl = document.getElementById('successModal');
    const successModal = new bootstrap.Modal(successModalEl);
        successModal.show();
        setTimeout(() => {
            window.location.href = 'logs.html';
            }, 500);
    
}

// Show error modal for incorrect credentials
function showErrorModal() {
    const errorModalEl = document.getElementById('errorModal');
    const errorModal = new bootstrap.Modal(errorModalEl);
    errorModal.show();
}

// Initialize lockers on page load
document.addEventListener('DOMContentLoaded',()=>{ 
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) {
      overlay.style.opacity = 0;
      setTimeout(() => overlay.style.display = "none", 1200); // allow fade effect
    }
    AvailableLockers()

});

window.addEventListener('pageshow', function (event) {
    const successModalEl = document.getElementById('successModal');
    const formmodal = document.getElementById('credentialModal');
    if (successModalEl) {
        const modalInstance = bootstrap.Modal.getInstance(successModalEl) || new bootstrap.Modal(successModalEl);
        
        modalInstance.hide();

    }
    if (formmodal) {
        const modalInstance1 = bootstrap.Modal.getInstance(formmodal) || new bootstrap.Modal(formmodal);
        modalInstance1.hide();
    }
});