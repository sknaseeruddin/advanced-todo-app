let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let filter = "all";
let draggedIndex = null;
let editingIndex = null;
let lastDeletedTask = null;
let lastDeletedIndex = null;

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function updateTitle() {
  const pending = tasks.filter((task) => !task.done).length;
  document.title = `(${pending}) Tasks Pending`;
}

function highlightText(text, search) {
  if (!search) return text;
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  return text.replace(regex, `<mark>$1</mark>`);
}

if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light-mode");
}

/* Fix old saved tasks automatically */
let updated = false;

tasks = tasks.map((task) => {
  if (!task.id) {
    task.id = Date.now() + Math.random();
    updated = true;
  }

  if (!task.text) {
    task.text = "Untitled Task";
    updated = true;
  }

  if (!task.category) {
    task.category = "General";
    updated = true;
  }

  if (!task.createdAt || task.createdAt === "Not available") {
    task.createdAt = new Date().toLocaleString();
    updated = true;
  }

  if (!task.priority) {
    task.priority = "Low";
    updated = true;
  }

  if (typeof task.done !== "boolean") {
    task.done = false;
    updated = true;
  }

  if (!("dueDate" in task)) {
    task.dueDate = "";
    updated = true;
  }

  if (!("note" in task)) {
    task.note = "";
    updated = true;
  }

  return task;
});

if (updated) {
  saveTasks();
}

function updateProgress() {
  const completed = tasks.filter((task) => task.done).length;
  const pending = tasks.length - completed;
  const percent = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);

  document.getElementById("progressText").textContent = `Progress: ${percent}%`;
  document.getElementById("progressFill").style.width = `${percent}%`;
  document.getElementById("taskStats").textContent = `✅ Completed: ${completed} | ⏳ Pending: ${pending}`;

  const filterButtons = document.querySelectorAll(".filters button");
  if (filterButtons[1]) {
    filterButtons[1].textContent = `Completed (${completed})`;
  }
  if (filterButtons[2]) {
    filterButtons[2].textContent = `Pending (${pending})`;
  }
}

function getStatusBadge(task, today) {
  if (!task.dueDate || task.done) return "";

  if (task.dueDate < today) {
    return `<span class="badge badge-overdue">Overdue</span>`;
  }

  if (task.dueDate === today) {
    return `<span class="badge badge-today">Due Today</span>`;
  }

  return `<span class="badge badge-upcoming">Upcoming</span>`;
}

function renderTasks() {
  const list = document.getElementById("taskList");
  const taskCount = document.getElementById("taskCount");
  const searchValue = document.getElementById("searchInput").value.toLowerCase().trim();
  const today = new Date().toISOString().split("T")[0];

  list.innerHTML = "";

  const filteredTasks = tasks.filter((task) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "done" && task.done) ||
      (filter === "pending" && !task.done);

    const matchesSearch =
      task.text.toLowerCase().includes(searchValue) ||
      task.category.toLowerCase().includes(searchValue) ||
      task.priority.toLowerCase().includes(searchValue) ||
      (task.note && task.note.toLowerCase().includes(searchValue));

    return matchesFilter && matchesSearch;
  });

  taskCount.textContent = `Total Tasks: ${tasks.length}`;
  updateProgress();
  updateTitle();

  if (filteredTasks.length === 0) {
    list.innerHTML = `
      <div class="no-task">
        <h2>📭 No Tasks Found</h2>
        <p>You're all clear or nothing matches your search</p>
      </div>
    `;
    return;
  }

  filteredTasks.forEach((task) => {
    const originalIndex = tasks.findIndex((t) => t.id === task.id);
    const li = document.createElement("li");

    li.className = `task-card ${task.priority.toLowerCase()} ${task.done ? "completed" : ""}`;
    li.setAttribute("draggable", "true");
    li.ondragstart = () => dragStart(originalIndex);
    li.ondragover = (e) => dragOver(e);
    li.ondrop = () => dropTask(originalIndex);
    li.ondblclick = () => toggleTask(originalIndex);

    if (task.dueDate && task.dueDate < today && !task.done) {
      li.classList.add("overdue");
    }

    if (task.dueDate === today && !task.done) {
      li.classList.add("today");
    }

    li.innerHTML = `
      <div class="task-info">
        <h3>${highlightText(task.text, searchValue)}</h3>
        <div class="badges">
          ${getStatusBadge(task, today)}
        </div>
        <p>📅 Due: ${task.dueDate || "No due date"}</p>
        <p>⚡ Priority:
          <span class="priority-badge ${task.priority.toLowerCase()}">
            ${task.priority}
          </span>
        </p>
        <p>📂 Category: ${highlightText(task.category, searchValue)}</p>
        <p>🕒 Created: ${task.createdAt}</p>
        ${task.note ? `<div class="task-note">📝 ${highlightText(task.note, searchValue)}</div>` : ""}
      </div>
      <div class="task-actions">
        <button onclick="toggleTask(${originalIndex})">✔</button>
        <button onclick="editTask(${originalIndex})">✏️</button>
        <button onclick="deleteTask(${originalIndex})">❌</button>
      </div>
    `;

    list.appendChild(li);
  });
}

function addTask() {
  const input = document.getElementById("taskInput");
  const dueDate = document.getElementById("dueDate");
  const priority = document.getElementById("priority");
  const category = document.getElementById("category");
  const taskNote = document.getElementById("taskNote");

  const text = input.value.trim();

  if (text === "") {
    showToast("Please enter a task.");
    input.focus();
    return;
  }

  if (tasks.length >= 50) {
    showToast("Too many tasks! Keep it clean.");
    return;
  }

  document.body.classList.add("loading");

  tasks.push({
    id: Date.now(),
    text: text,
    done: false,
    dueDate: dueDate.value,
    priority: priority.value,
    category: category.value || "General",
    createdAt: new Date().toLocaleString(),
    note: taskNote.value.trim()
  });

  tasks.sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  input.value = "";
  dueDate.value = "";
  priority.value = "Low";
  category.value = "Study";
  taskNote.value = "";

  saveTasks();
  renderTasks();

  setTimeout(() => {
    document.body.classList.remove("loading");
    document.getElementById("taskList").scrollIntoView({
      behavior: "smooth",
      block: "end"
    });
    input.focus();
  }, 300);

  showToast("Task added successfully.");
}

function toggleTask(index) {
  tasks[index].done = !tasks[index].done;
  saveTasks();
  renderTasks();
  showToast(tasks[index].done ? "Task marked completed." : "Task marked pending.");
}

function deleteTask(index) {
  const ok = confirm(`Delete task "${tasks[index].text}"?`);
  if (!ok) return;

  lastDeletedTask = { ...tasks[index] };
  lastDeletedIndex = index;

  const taskCards = document.querySelectorAll(".task-card");
  const card = taskCards[index];

  if (card) {
    card.style.transition = "all 0.25s ease";
    card.style.opacity = "0";
    card.style.transform = "translateX(50px)";
  }

  setTimeout(() => {
    tasks.splice(index, 1);
    saveTasks();
    renderTasks();
    showToast("Task deleted. You can undo.");
  }, 250);
}

function undoDelete() {
  if (!lastDeletedTask) {
    showToast("Nothing to undo.");
    return;
  }

  tasks.splice(lastDeletedIndex, 0, lastDeletedTask);
  saveTasks();
  renderTasks();
  showToast("Deleted task restored.");

  lastDeletedTask = null;
  lastDeletedIndex = null;
}

function editTask(index) {
  editingIndex = index;

  document.getElementById("editTaskInput").value = tasks[index].text || "";
  document.getElementById("editDueDate").value = tasks[index].dueDate || "";
  document.getElementById("editPriority").value = tasks[index].priority || "Low";
  document.getElementById("editCategory").value = tasks[index].category || "General";
  document.getElementById("editTaskNote").value = tasks[index].note || "";

  document.getElementById("editModal").classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("editModal").classList.add("hidden");
  editingIndex = null;
}

function saveEditedTask() {
  if (editingIndex === null) return;

  const newText = document.getElementById("editTaskInput").value.trim();
  const newDueDate = document.getElementById("editDueDate").value;
  const newPriority = document.getElementById("editPriority").value;
  const newCategory = document.getElementById("editCategory").value;
  const newNote = document.getElementById("editTaskNote").value.trim();

  if (!newText) {
    showToast("Task title cannot be empty.");
    return;
  }

  tasks[editingIndex].text = newText;
  tasks[editingIndex].dueDate = newDueDate;
  tasks[editingIndex].priority = newPriority;
  tasks[editingIndex].category = newCategory;
  tasks[editingIndex].note = newNote;

  saveTasks();
  renderTasks();
  closeEditModal();
  showToast("Task updated.");
}

function clearAll() {
  if (confirm("Delete all tasks?")) {
    tasks = [];
    saveTasks();
    renderTasks();
    showToast("All tasks cleared.");
  }
}

function clearCompleted() {
  if (!confirm("Delete all completed tasks?")) return;

  tasks = tasks.filter((task) => !task.done);
  saveTasks();
  renderTasks();
  showToast("Completed tasks cleared.");
}

function filterTasks(type) {
  filter = type;
  renderTasks();
  showToast(`Filter applied: ${type}`);
}

function sortTasks(type) {
  if (type === "date") {
    tasks.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }

  if (type === "priority") {
    const order = { High: 1, Medium: 2, Low: 3 };
    tasks.sort((a, b) => order[a.priority] - order[b.priority]);
  }

  saveTasks();
  renderTasks();
  showToast(`Sorted by ${type}.`);
}

function toggleTheme() {
  document.body.classList.toggle("light-mode");

  if (document.body.classList.contains("light-mode")) {
    localStorage.setItem("theme", "light");
  } else {
    localStorage.setItem("theme", "dark");
  }

  showToast("Theme changed.");
}

function dragStart(index) {
  draggedIndex = index;
}

function dragOver(e) {
  e.preventDefault();
}

function dropTask(index) {
  if (draggedIndex === null || draggedIndex === index) return;

  const draggedTask = tasks[draggedIndex];
  tasks.splice(draggedIndex, 1);
  tasks.splice(index, 0, draggedTask);

  draggedIndex = null;
  saveTasks();
  renderTasks();
  showToast("Task reordered.");
}

function exportTasks() {
  const data = JSON.stringify(tasks, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = "tasks.json";
  link.click();

  showToast("Tasks exported.");
}

function importTasks(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const importedTasks = JSON.parse(e.target.result);

      if (!Array.isArray(importedTasks)) {
        showToast("Invalid JSON file.");
        return;
      }

      tasks = importedTasks.map((task) => ({
        id: task.id || Date.now() + Math.random(),
        text: task.text || "Untitled Task",
        done: typeof task.done === "boolean" ? task.done : false,
        dueDate: task.dueDate || "",
        priority: task.priority || "Low",
        category: task.category || "General",
        createdAt: task.createdAt || new Date().toLocaleString(),
        note: task.note || ""
      }));

      saveTasks();
      renderTasks();
      showToast("Tasks imported successfully.");
    } catch (error) {
      showToast("Import failed. Invalid file.");
    }
  };

  reader.readAsText(file);
  event.target.value = "";
}

document.getElementById("taskInput").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    addTask();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") {
    addTask();
  }
});

renderTasks();