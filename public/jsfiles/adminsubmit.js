async function SubmitUserData() {
    const name = document.getElementById("name").value.trim();
    const surname = document.getElementById("surname").value.trim();
    const lockerNumber = document.getElementById("lockerNumber").value.trim();

    // Check if fields are empty
    if (name === "" || surname === "" || lockerNumber === "") {
        alert("Please fill in all fields.");
        return;
    }


    // Fetch available lockers
    const response = await fetch('/lockernum');
    const data1 = await response.json();
    const ids = data1.map(item => item.locker_id);

    // Check if the chosen locker is available
    let matchFound = false; 
    for (let i = 0; i < ids.length; i++) {
        if (ids[i] == lockerNumber) {
            matchFound = true;  
            break;  
        }
    }
    console.log(matchFound);
    if (matchFound) {
        // Locker is not available, show hidden modal
        var successModal = new bootstrap.Modal(document.getElementById('successModal'));
        successModal.show();
    } else {
        // Locker is available, submit user data to the server
        const data = {name,surname,lockerNumber};
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        };

        // Sending data to the server
        try {
            fetch('/submituser', options);
        } catch (error) {
            console.error("Error:", error);
            alert("Network error. Please try again.");
        }
    }
}