document.addEventListener('DOMContentLoaded', function () {
    // Get a reference to the redirect button and the modal element
    const redirectButton = document.getElementById('redirectButton');
    const modalEl = document.getElementById('redirecttolockers');
  
    // When the button is clicked, wait for the modal to fully hide before redirecting
    redirectButton.addEventListener('click', function () {
      // Listen for the modal to be fully hidden. The { once: true } option ensures the handler runs only once.
      modalEl.addEventListener('hidden.bs.modal', function () {
        window.location.href = 'lockers.html'; // Replace with your target page URL.
      }, { once: true });
    });
  });

  