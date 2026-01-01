// ============== DATA ==============
let currentStudent = null;
let students = JSON.parse(localStorage.getItem("students") || "[]");

// Dashboard data
let todayDateKey = new Date().toISOString().slice(0, 10);
let todayStudySeconds = 0;
let distractionCount = 0;

// Timer
let sessionActive = false;
let sessionSeconds = 0;
let timerInterval = null;

// Distraction detection
let isDistracted = false;

// ============== HELPERS ==============
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

function saveStudents() {
  localStorage.setItem("students", JSON.stringify(students));
}

function formatTime(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function loadTodayFromStorage() {
  const key = `study_${todayDateKey}`;
  const val = JSON.parse(localStorage.getItem(key) || "null");
  if (val && val.studentId === currentStudent?.id) {
    todayStudySeconds = val.seconds || 0;
    distractionCount = val.distractions || 0;
  } else {
    todayStudySeconds = 0;
    distractionCount = 0;
  }
}

function saveTodayToStorage() {
  if (!currentStudent) return;
  const key = `study_${todayDateKey}`;
  const payload = {
    studentId: currentStudent.id,
    seconds: todayStudySeconds,
    distractions: distractionCount
  };
  localStorage.setItem(key, JSON.stringify(payload));
}

function updateDashboardUI() {
  document.getElementById("today-mins").textContent = Math.floor(
    todayStudySeconds / 60
  );
  document.getElementById("distractions-count").textContent = distractionCount;
  document.getElementById("timer-display").textContent = formatTime(
    sessionSeconds
  );
}

function updateFocusStatus() {
  const el = document.getElementById("focus-status");
  if (isDistracted) {
    el.textContent = "Distracted";
    el.classList.remove("focused");
    el.classList.add("distracted");
  } else {
    el.textContent = "Focused";
    el.classList.remove("distracted");
    el.classList.add("focused");
  }
}

async function playAlertSound() {
  try {
    const audio = document.getElementById("alertSound");
    await audio.play();
  } catch (err) {
    console.warn("Audio blocked by browser until user interaction", err);
  }
}

// ============== AUTH ==============
function signup(name, email, pass) {
  if (!name || !email || !pass) {
    alert("Please fill all sign up fields");
    return;
  }
  if (students.find(s => s.email === email)) {
    alert("Email already exists");
    return;
  }
  const newStudent = {
    id: Date.now().toString(),
    name,
    email,
    pass
  };
  students.push(newStudent);
  saveStudents();
  alert("Account created, logged in!");
  onLoginSuccess(newStudent);
}

function login(email, pass) {
  const student = students.find(
    s => s.email === email && s.pass === pass
  );
  if (!student) {
    alert("Wrong email or password");
    return;
  }
  onLoginSuccess(student);
}

function onLoginSuccess(student) {
  currentStudent = student;
  localStorage.setItem("currentStudentId", student.id);
  document.getElementById("user-name").textContent = student.name;
  resetSession();
  loadTodayFromStorage();
  updateDashboardUI();
  showScreen("home");
}

function logout() {
  currentStudent = null;
  localStorage.removeItem("currentStudentId");
  resetSession();
  showScreen("auth-screen");
}

// استرجاع لو في حد كان لوج إن
(function restoreLogin() {
  const id = localStorage.getItem("currentStudentId");
  if (!id) return;
  const student = students.find(s => s.id === id);
  if (student) onLoginSuccess(student);
})();

// ============== TIMER ==============
function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    if (!sessionActive) return;
    if (!isDistracted) {
      sessionSeconds++;
      todayStudySeconds++;
      updateDashboardUI();
      saveTodayToStorage();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetSession() {
  sessionActive = false;
  sessionSeconds = 0;
  isDistracted = false;
  updateFocusStatus();
  updateDashboardUI();
  stopTimer();
}

// ============== DISTRACTION LOGIC ==============
// مثال بسيط: أي حركة ماوس سريعة خلال السيشن نعتبرها تشتت واحد
let lastMouseMoveTime = 0;
let lastDistractionState = false;

function setDistracted() {
  if (!isDistracted) {
    isDistracted = true;
    distractionCount += 1;
    updateFocusStatus();
    updateDashboardUI();
    saveTodayToStorage();
    playAlertSound();
  }
}

function setFocused() {
  if (isDistracted) {
    isDistracted = false;
    updateFocusStatus();
  }
}

// idle: لو الطالب ساب الماوس والكيبورد شوية نعتبره مركز
let idleTimeout = null;
function markIdleFocused() {
  if (!sessionActive) return;
  setFocused();
}
function resetIdleTimer() {
  if (idleTimeout) clearTimeout(idleTimeout);
  idleTimeout = setTimeout(markIdleFocused, 5000); // 5 ثواني من غير حركة => نعتبره مركز
}

document.addEventListener("mousemove", e => {
  if (!sessionActive) return;
  const now = Date.now();
  const diff = now - lastMouseMoveTime;

  // حركة كتير وراء بعض => نعتبرها تشتت واحد
  if (diff < 300) {
    setDistracted();
  }
  lastMouseMoveTime = now;
  resetIdleTimer();
});

document.addEventListener("keydown", () => {
  if (!sessionActive) return;
  resetIdleTimer();
});

// ============== BUTTON HANDLERS ==============
document.getElementById("signup-btn").addEventListener("click", () => {
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const pass = document.getElementById("signup-pass").value.trim();
  signup(name, email, pass);
});

document.getElementById("login-btn").addEventListener("click", () => {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-pass").value.trim();
  login(email, pass);
});

document.getElementById("logout-btn").addEventListener("click", () => {
  logout();
});

document.getElementById("study-now-btn").addEventListener("click", () => {
  if (!currentStudent) {
    alert("Please login first");
    showScreen("auth-screen");
    return;
  }
  if (!sessionActive) {
    sessionActive = true;
    isDistracted = false;
    updateFocusStatus();
    startTimer();
  }
});

document.getElementById("end-session-btn").addEventListener("click", () => {
  if (!sessionActive) return;
  sessionActive = false;
  stopTimer();
  alert(`Session ended. You studied ${formatTime(sessionSeconds)}.`);
  resetSession();
});

// بداية: لو مفيش يوزر، خليها على auth-screen
if (!currentStudent) {
  showScreen("auth-screen");
}
