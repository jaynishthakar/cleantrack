// ✅ API base URL
const API_URL = "http://127.0.0.1:5000/api/auth";

// --- ELEMENT REFERENCES ---
const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");
const roleSelect = document.getElementById("signup_role");
const consumerFields = document.getElementById("consumerFields");
const authorityFields = document.getElementById("authorityFields");

// --- HELPER: Toggle required fields based on selected role ---
function toggleRequiredFields(role) {
  // Remove all required attributes first
  document.querySelectorAll("#signupForm input").forEach(input => {
    input.removeAttribute("required");
  });

  // Add required attributes for visible inputs only
  const visibleInputs = document.querySelectorAll(`#${role}Fields input`);
  visibleInputs.forEach(input => input.setAttribute("required", "true"));
}

// --- ROLE SELECTION HANDLER ---
roleSelect.addEventListener("change", () => {
  const role = roleSelect.value;
  consumerFields.classList.toggle("d-none", role !== "consumer");
  authorityFields.classList.toggle("d-none", role !== "authority");
  toggleRequiredFields(role);
});

// --- SIGNUP HANDLER ---
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const role = roleSelect.value;
  if (!role) {
    alert("Please select a role first!");
    return;
  }

  let user = { role };

  if (role === "consumer") {
    user = {
      ...user,
      name: document.getElementById("c_name").value,
      email: document.getElementById("c_email").value,
      phone_no: document.getElementById("c_phone").value,
      address: document.getElementById("c_address").value,
      locality_id: document.getElementById("c_locality").value,
      login_id: document.getElementById("c_login").value,
      password: document.getElementById("c_password").value
    };
  } else if (role === "authority") {
    user = {
      ...user,
      name: document.getElementById("a_name").value,
      email: document.getElementById("a_email").value,
      phone_no: document.getElementById("a_phone").value,
      address: document.getElementById("a_address").value,
      login_id: document.getElementById("a_login").value,
      password: document.getElementById("a_password").value
    };
  }

  console.log("📤 Sending signup request:", user);

  try {
    const res = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user)
    });

    console.log("📥 Got response:", res);
    const result = await res.json();
    console.log("✅ Parsed result:", result);

    if (res.ok) {
      alert(result.message || "Account created successfully!");
      signupForm.reset();
      consumerFields.classList.add("d-none");
      authorityFields.classList.add("d-none");
      roleSelect.value = "";
    } else {
      alert(result.error || "Signup failed.");
    }
  } catch (err) {
    console.error("❌ Signup failed:", err);
    alert("Network or server error. Check console and backend terminal.");
  }
});

// --- LOGIN HANDLER ---
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const creds = {
    login_id: document.getElementById("loginId").value,
    password: document.getElementById("password").value,
    role: document.getElementById("role").value
  };

  console.log("🔑 Sending login request:", creds);

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds)
    });

    const result = await res.json();
    console.log("✅ Login result:", result);

    if (res.ok && result.user) {
      alert("Login successful!");

      // Save user info for dashboard
      localStorage.setItem("user", JSON.stringify(result.user));
      localStorage.setItem("role", result.role);

      // Redirect based on role
      if (result.role === "consumer") {
        window.location.href = "dashboard.html";
      } else if (result.role === "authority") {
        window.location.href = "dashboard.html";
      }
    } else {
      alert(result.error || "Invalid credentials. Try again.");
    }
  } catch (err) {
    console.error("❌ Login failed:", err);
    alert("Network or server error. See console.");
  }
});
