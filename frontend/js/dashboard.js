// ---------- CleanTrack Dashboard JS ----------

// Base URL for backend
const BASE_URL = "http://127.0.0.1:5000/api/complaints";

// Get logged-in user and role
const user = JSON.parse(localStorage.getItem("user"));
const role = localStorage.getItem("role");

// Redirect if not logged in
if (!user || !role) {
  alert("Please login first!");
  window.location.href = "index.html";
}

// 🎨 APPLY THEME BASED ON ROLE
if (role === 'authority') {
    document.body.classList.remove('consumer-theme');
    document.body.classList.add('authority-theme');
} else {
    document.body.classList.add('consumer-theme');
}

// Show welcome message
document.getElementById("welcome").innerText = `Welcome, ${user.Name || user.officer_name}`;

// Show dashboard sections based on role
if (role === "consumer") {
  document.getElementById("consumerView").classList.remove("d-none");
  loadConsumerComplaints();
  loadDeletedComplaints();    
 
} else {
  document.getElementById("authorityView").classList.remove("d-none");
  loadAuthorityComplaints();
  loadAuthorityFeedback();
}

// ------------------------------------------------------
// 🧾 CONSUMER DASHBOARD FUNCTIONS
// ------------------------------------------------------

// Load consumer complaints
async function loadConsumerComplaints() {
  try {
    const res = await fetch(`${BASE_URL}/consumer/${user.consumer_id}`);
    const complaints = await res.json();
    
    // Safety check for 500 error (Fixes TypeError)
    if (!Array.isArray(complaints)) {
      console.error("Invalid data received from server:", complaints);
      document.getElementById("consumerComplaints").innerHTML = 
        '<tr><td colspan="4" class="text-center text-danger">Error loading complaints. Check console for server details.</td></tr>';
      return;
    }

    const tbody = document.getElementById("consumerComplaints");
    tbody.innerHTML = "";

    for (const c of complaints) {
      const hasFeedback = await checkFeedbackExists(c.complaint_id);
      
      let viewBtn;
      if (c.status === "Completed") {
          viewBtn = `<button class="btn btn-sm btn-outline-success" onclick="viewProof(${c.complaint_id}, ${hasFeedback})">View Proof</button>`;
      } else if (c.status === "Assigned") {
          viewBtn = `<span class="text-warning">Assigned</span>`;
      } else {
          viewBtn = `<span class="text-muted">${c.status}</span>`;
      }
      
      // Display authority_id in the Authority column (and fallback name)
      let authorityDisplay = "-";
      if (c.authority_id) {
          authorityDisplay = `ID: **${c.authority_id}**`; 
          if (c.authority_name) {
              authorityDisplay += `<br>(${c.authority_name})`;
          }
      }

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${c.complaint_id}</td>
        <td>${c.description}</td>
        <td>${viewBtn}</td>
        <td>${authorityDisplay}</td> 
        <td>
    <button class="btn btn-danger btn-sm" onclick="deleteComplaint(${c.complaint_id})">
      Delete
    </button>
  </td>
      `;
      tbody.appendChild(row);
    }
  } catch (err) {
    console.error("Error loading consumer complaints:", err);
  }
}

// Check if feedback exists for complaint
async function checkFeedbackExists(complaint_id) {
  try {
    const res = await fetch(`${BASE_URL}/feedback/check/${complaint_id}/${user.consumer_id}`);
    const data = await res.json();
    return data.exists; 
  } catch {
    return false;
  }
}

// File new complaint
document.getElementById("complaintForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const description = document.getElementById("description").value;
  const locality_id = document.getElementById("locality_id").value;

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      consumer_id: user.consumer_id,
      locality_id,
      description,
    }),
  });

  const data = await res.json();
  alert(data.message);
  e.target.reset();
  loadConsumerComplaints();
});

// ------------------------------------------------------
// 💬 COMMENTS / REACT TO NEARBY ISSUES
// ------------------------------------------------------

document.getElementById("reactBtn")?.addEventListener("click", async () => {
  const section = document.getElementById("nearbySection");
  section.classList.toggle("d-none");
  if (!section.classList.contains("d-none")) await loadAllComplaints();
});

// Load nearby complaints
async function loadAllComplaints() {
  const consumerLocalityId = user.locality_id; 

  if (!consumerLocalityId) {
    document.getElementById("allComplaints").innerHTML = '<tr><td colspan="6" class="text-center text-danger">Locality ID missing for user.</td></tr>';
    return;
  }
    
  try {
    const res = await fetch(`${BASE_URL}/nearby/${consumerLocalityId}/${user.consumer_id}`);
    const complaints = await res.json();
    const tbody = document.getElementById("allComplaints");
    tbody.innerHTML = "";

    if (complaints.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-info">No other nearby complaints found in your locality (ID: ' + consumerLocalityId + ').</td></tr>';
        return;
    }

    complaints.forEach((c) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${c.complaint_id}</td>
        <td>${c.locality_id}</td>
        <td>${c.description}</td>
        <td>${c.consumer_name}</td>
        <td>${c.status}</td>
        <td><button class="btn btn-sm btn-outline-secondary" onclick="openComments(${c.complaint_id})">💬 Comments</button></td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading nearby complaints:", err);
    document.getElementById("allComplaints").innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading nearby complaints. Check console for details.</td></tr>';
  }
}

// Open comments modal
window.openComments = async (complaint_id) => {
  document.getElementById("commentComplaintId").innerText = complaint_id;
  document.getElementById("submitComment").dataset.id = complaint_id;
  await loadComments(complaint_id);
  new bootstrap.Modal(document.getElementById("commentModal")).show();
};

// Load comments
async function loadComments(complaint_id) {
  try {
    const res = await fetch(`${BASE_URL}/comments/${complaint_id}`);
    const comments = await res.json();
    const div = document.getElementById("commentsList");
    div.innerHTML = comments.length
      ? comments
          .map(
            (c) => `
            <p><strong>${c.commenter_name}:</strong> ${c.comment_text}
            <br><small class="text-muted">${new Date(c.created_at).toLocaleString()}</small></p><hr>`
          )
          .join("")
      : "<p class='text-muted'>No comments yet.</p>";
  } catch (err) {
    console.error("Error loading comments:", err);
  }
}

// Add comment
document.getElementById("submitComment")?.addEventListener("click", async () => {
  const complaint_id = document.getElementById("submitComment").dataset.id;
  const comment_text = document.getElementById("commentText").value.trim();
  if (!comment_text) return alert("Please write something first!");

  const res = await fetch(`${BASE_URL}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      consumer_id: user.consumer_id,
      complaint_id,
      comment_text,
    }),
  });

  const data = await res.json();
  alert(data.message);
  document.getElementById("commentText").value = "";
  await loadComments(complaint_id);
});

// ------------------------------------------------------
// 📸 PROOF + FEEDBACK
// ------------------------------------------------------

// View proof modal (consumer)
window.viewProof = async (complaint_id, hasFeedback) => {
    console.log("Opening proof for complaint:", complaint_id);
  
    try {
      const res = await fetch(`${BASE_URL}/proof/${complaint_id}`);
      const proof = await res.json();
  
      document.getElementById("proofNgo").innerText = proof.ngo_name || "N/A";
      
      document.getElementById("proofImageDisplay").src = proof.file_path
        ? `http://127.0.0.1:5000${proof.file_path}`
        : "";
  
      const feedbackSection = document.getElementById("feedbackSection");
      if (!feedbackSection) {
        console.error("❌ feedbackSection not found in DOM!");
        return;
      }
  
      // Hide feedback if already submitted
      if (hasFeedback) {
        feedbackSection.classList.add("d-none");
      } else {
        feedbackSection.classList.remove("d-none");
        document.getElementById("submitFeedback").dataset.id = complaint_id;
        document.getElementById("rating").value = '';
        document.getElementById("review").value = '';
      }
  
      new bootstrap.Modal(document.getElementById("proofModal")).show();
    } catch (err) {
      console.error("Error opening proof:", err);
      alert("Unable to load proof details.");
    }
  };


// Submit Feedback
document.getElementById("submitFeedback")?.addEventListener("click", async () => {
    const complaint_id = document.getElementById("submitFeedback").dataset.id;
    const rating = document.getElementById("rating").value;
    const review = document.getElementById("review").value;

    if (!rating || rating < 1 || rating > 5) return alert("Please provide a rating between 1 and 5.");

    const payload = {
        consumer_id: user.consumer_id,
        complaint_id: complaint_id,
        rating: rating,
        review: review, 
    };

    try {
        const res = await fetch(`${BASE_URL}/feedback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if(res.ok) {
          alert(data.message);
          loadConsumerComplaints(); 
          loadNotifications(); 
          bootstrap.Modal.getInstance(document.getElementById("proofModal")).hide();
        } else {
          alert(data.message || "Failed to submit feedback.");
        }
    } catch (err) {
        console.error("Error submitting feedback:", err);
        alert("Network error: Failed to submit feedback.");
    }
});

async function deleteComplaint(complaint_id) {
  if (!confirm("Are you sure you want to delete this complaint?")) return;

  const user = JSON.parse(localStorage.getItem("user"));

  const res = await fetch(
    `http://127.0.0.1:5000/api/complaints/delete/${complaint_id}/${user.consumer_id}`,
    { method: "DELETE" }
  );

  const data = await res.json();

  if (res.ok) {
    alert("Complaint deleted!");
    location.reload(); // refresh dashboard
  } else {
    alert(data.message || "Failed to delete complaint.");
  }
}

  

// ------------------------------------------------------
// 🧍 AUTHORITY DASHBOARD FUNCTIONS
// ------------------------------------------------------

async function loadAuthorityComplaints() {
  try {
    // Fetch ALL complaints and filter on frontend for required groups
    const res = await fetch(`${BASE_URL}/authority/all`); 
    const complaints = await res.json();
    const tbody = document.getElementById("authorityComplaints");
    tbody.innerHTML = "";

    const authorityId = user.authority_id;

    // 1. Group complaints into categories in the desired order
    const groups = {
        Pending: [],
        Assigned: [], // Assigned to ME
        Completed: [] // Completed by ME
    };
    
    // Distribute complaints based on their status and assignment
    complaints.forEach(c => {
        if (c.status === "Pending") {
            // Pending complaints are visible to ALL authorities
            groups.Pending.push(c);
        } 
        // FIX: Check if the authority_id matches the logged-in user's ID
        else if (c.status === "Assigned" && c.authority_id == authorityId) { 
            groups.Assigned.push(c);
        } else if (c.status === "Completed" && c.authority_id == authorityId) {
            groups.Completed.push(c);
        }
    });

    // 2. Iterate through groups in the desired order and append to the table
    ['Pending', 'Assigned', 'Completed'].forEach(status => {
        let title = status;
        if (status === 'Assigned') title = 'Assigned to Me';
        if (status === 'Completed') title = 'Completed by Me';

        // Add a section header row for visual grouping
        const headerRow = document.createElement("tr");
        headerRow.innerHTML = `<td colspan="4" class="table-info"><h5>${title} Complaints (${groups[status].length})</h5></td>`;
        tbody.appendChild(headerRow);

        if (groups[status].length === 0) {
            const emptyRow = document.createElement("tr");
            emptyRow.innerHTML = `<td colspan="4" class="text-muted text-center">No ${title.toLowerCase()} complaints.</td>`;
            tbody.appendChild(emptyRow);
            return; 
        }

        // Add the complaint rows
        groups[status].forEach((c) => {
            let actionCell = "";
            if (c.status === "Pending") {
                actionCell = `<button class="btn btn-sm btn-outline-primary" onclick="assignToMe(${c.complaint_id})">Assign to Me</button>`;
            } else if (c.status === "Assigned") {
                actionCell = `<button class="btn btn-sm btn-outline-success" onclick="openCompleteModal(${c.complaint_id})">Mark Completed</button>`;
            } else if (c.status === "Completed") {
                actionCell = `<span class="text-success">Completed</span>`;
            }

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${c.complaint_id}</td>
                <td>${c.description} (By: ${c.consumer_name})</td>
                <td>${c.status}</td>
                <td>
                    ${actionCell}
                    <button class="btn btn-sm btn-outline-secondary mt-1" onclick="openComments(${c.complaint_id})">💬 View Comments</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    });

  } catch (err) {
    console.error("Error loading authority complaints:", err);
  }
}

// Assign complaint to current authority
window.assignToMe = async (complaint_id) => {
    if (!confirm("Are you sure you want to assign this complaint to yourself?")) return;
    
    try {
        const res = await fetch(`${BASE_URL}/assign/${complaint_id}/${user.authority_id}`, {
            method: "POST"
        });
        const data = await res.json();
        alert(data.message);
        loadAuthorityComplaints(); 
        loadNotifications(); 
        loadConsumerComplaints(); 
    } catch(err) {
        console.error("Error assigning complaint:", err);
        alert("Failed to assign complaint.");
    }
}


// Open completion modal
window.openCompleteModal = (complaint_id) => {
  document.getElementById("completeComplaintId").value = complaint_id;
  new bootstrap.Modal(document.getElementById("completeModal")).show();
};

// Submit completion proof
document.getElementById("completeForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const complaint_id = document.getElementById("completeComplaintId").value;
  
  const ngo_name = document.getElementById("ngoName").value;
  const file = document.getElementById("proofImage").files[0];

  const formData = new FormData();
  formData.append("ngo_name", ngo_name);
  formData.append("proof_image", file);

  const res = await fetch(`${BASE_URL}/complete/${complaint_id}`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  alert(data.message);
  loadAuthorityComplaints();
  loadConsumerComplaints(); 
  loadNotifications(); 
  bootstrap.Modal.getInstance(document.getElementById("completeModal")).hide();
});

// ------------------------------------------------------
// ⭐ FEEDBACK SUMMARY FOR AUTHORITY
// ------------------------------------------------------

async function loadAuthorityFeedback() {
  try {
    const res = await fetch(`${BASE_URL}/feedback/authority/${user.authority_id}`);
    const feedbacks = await res.json();
    if (feedbacks.length === 0) return;

    const section = document.createElement("section");
    section.classList.add("mt-5");
    section.innerHTML = `
      <h4>⭐ Feedback from Consumers</h4>
      <table class="table table-bordered bg-white shadow-sm mt-3">
        <thead class="table-info">
          <tr><th>Complaint ID</th><th>Consumer</th><th>Rating</th><th>Review</th></tr>
        </thead>
        <tbody>
          ${feedbacks
            .map(
              (f) =>
                `<tr><td>${f.complaint_id}</td><td>${f.consumer_name}</td><td>${f.Rating}</td><td>${f.Review_Test || ""}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>`;
    document.getElementById("authorityView").appendChild(section);
  } catch (err) {
    console.error("Error loading feedback:", err);
  }
}

// ------------------------------------------------------
// 🔔 NOTIFICATION FUNCTIONS
// ------------------------------------------------------

const notificationList = document.getElementById("notificationList");
const notificationCount = document.getElementById("notificationCount");

async function loadNotifications() {
  const userId = role === 'consumer' ? user.consumer_id : user.authority_id;
  
  if (!userId) return;

  try {
    const res = await fetch(`${BASE_URL}/notifications/${role}/${userId}`);
    const notifications = await res.json();
    
    // Update the list
    notificationList.innerHTML = '<li class="dropdown-header">Latest Notifications</li>';
    
    if (notifications.length === 0) {
      notificationList.innerHTML += '<li><a class="dropdown-item text-muted" href="#">No new notifications.</a></li>';
      notificationCount.classList.add("d-none");
    } else {
      notifications.forEach(n => {
        const time = new Date(n.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        notificationList.innerHTML += `
          <li>
            <a class="dropdown-item" href="#">
              ${n.message} 
              <br><small class="text-muted">${time}</small>
            </a>
          </li>
          <li><hr class="dropdown-divider"></li>
        `;
      });
      
      notificationCount.textContent = notifications.length;
      notificationCount.classList.remove("d-none");
    }
  } catch (err) {
    console.error("Error loading notifications:", err);
  }
}

// Reset Notification Counter on click
window.resetNotificationCount = function() {
    notificationCount.classList.add("d-none");
    // Ideally, you would also mark these notifications as read in the database here.
}

// Initial load of notifications
loadNotifications();


// ------------------------------------------------------
// 🚪 LOGOUT
// ------------------------------------------------------
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "index.html";
});

async function loadDeletedComplaints() {
  try {
    const res = await fetch(`${BASE_URL}/history/${user.consumer_id}`);
    const logs = await res.json();
    const tbody = document.getElementById("deletedComplaints");
    tbody.innerHTML = "";

    if (logs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="text-center text-muted">
            No deleted complaints found.
          </td>
        </tr>`;
      return;
    }

    logs.forEach(log => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${log.complaint_id}</td>
        <td>${log.description}</td>
        <td>${new Date(log.deleted_at).toLocaleString()}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading deleted complaints:", err);
  }
}



