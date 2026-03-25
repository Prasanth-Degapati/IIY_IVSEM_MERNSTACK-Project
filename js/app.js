const API_BASE_URL = 'http://localhost:3000/api/v1';

// --- Utility Functions ---
function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
}

function setAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    };
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: getAuthHeaders()
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (response.status === 401 || response.status === 403) {
            clearAuth();
            window.location.href = 'index.html'; // Redirect to login on token expiry
            return null;
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'API Error');
        }
        return data;
    } catch (error) {
        console.error('API Call Error:', error);
        alert(error.message);
        throw error;
    }
}

// --- Page Initializers ---

document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Route guards
    const token = getToken();
    if (token && (currentPage === 'index.html' || currentPage === 'register.html' || currentPage === '')) {
        window.location.href = 'dashboard.html';
    } else if (!token && currentPage === 'dashboard.html') {
        window.location.href = 'index.html';
    }

    // Initialize specific page logic
    if (currentPage === 'index.html' || currentPage === '') {
        initLoginPage();
    } else if (currentPage === 'register.html') {
        initRegisterPage();
    } else if (currentPage === 'dashboard.html') {
        initDashboardPage();
    }
});

function initLoginPage() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const data = await apiCall('/auth/login', 'POST', { email, password });
            setAuth(data.token, data.user);
            window.location.href = 'dashboard.html';
        } catch (error) {
            // Error handled in apiCall
        }
    });
}

function initRegisterPage() {
    const form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            await apiCall('/auth/register', 'POST', { fullName: name, email, password });
            alert('Registration successful! Please login.');
            window.location.href = 'index.html';
        } catch (error) {
            // Error handled in apiCall
        }
    });
}

function initDashboardPage() {
    const user = getUser();
    if (user) {
        const greeting = document.getElementById('user-greeting');
        if (greeting) greeting.textContent = `Good morning, ${user.name.split(' ')[0]}!`;
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearAuth();
            window.location.href = 'index.html';
        });
    }

    const addTaskForm = document.getElementById('add-task-form');
    if (addTaskForm) {
        addTaskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const titleInput = document.getElementById('new-task-title');
            const title = titleInput.value.trim();
            if (!title) return;

            try {
                // Determine priority randomly or default for now
                const priority = 'medium';
                highlightApiEndpoint('api-post-tasks');
                await apiCall('/tasks', 'POST', { title, priority });
                titleInput.value = '';
                loadTasks(); // Refresh list
            } catch (error) {
                // Expected
            }
        });
    }

    // Initial load
    loadTasks();
}

async function loadTasks() {
    const taskList = document.getElementById('task-list');
    if (!taskList) return;

    try {
        highlightApiEndpoint('api-get-tasks');
        const tasks = await apiCall('/tasks', 'GET');
        renderTasks(tasks, taskList);
    } catch (error) {
        // Expected
    }
}

function renderTasks(tasks, container) {
    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<p class="text-center" style="padding: 2rem; color: var(--text-muted);">No tasks yet. Add one above!</p>';
        return;
    }

    container.innerHTML = ''; // Clear current

    tasks.forEach(task => {
        const el = document.createElement('div');
        el.className = `task-item ${task.status === 'completed' ? 'completed' : ''}`;

        let badgeClass = 'badge-medium';
        if (task.status === 'completed') badgeClass = 'badge-done';
        else if (task.priority === 'high') badgeClass = 'badge-high';
        else if (task.priority === 'low') badgeClass = 'badge-medium'; // we can create a low badge if needed

        const priorityLabel = task.status === 'completed' ? 'Completed' :
            task.priority.charAt(0).toUpperCase() + task.priority.slice(1) + ' Priority';

        el.innerHTML = `
            <label class="custom-checkbox">
                <input type="checkbox" onchange="toggleTaskStatus('${task.id}', '${task.status}')" ${task.status === 'completed' ? 'checked' : ''}>
                <span class="checkmark"></span>
            </label>
            <div class="task-content">
                <div class="task-title">${escapeHTML(task.title)}</div>
                <span class="task-badge ${badgeClass}">${priorityLabel}</span>
            </div>
            <div class="task-actions">
                ${task.status !== 'completed' ? `<button class="btn-icon" title="Edit" onclick="editTask('${task.id}', '${escapeHTML(task.title)}')">✏️</button>` : ''}
                <button class="btn-icon danger" title="Delete" onclick="deleteTask('${task.id}')">🗑️</button>
            </div>
        `;
        container.appendChild(el);
    });
}

// Global functions for inline onclick handlers
window.toggleTaskStatus = async function (id, currentStatus) {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
        highlightApiEndpoint('api-put-tasks');
        await apiCall(`/tasks/${id}`, 'PUT', { status: newStatus });
        loadTasks();
    } catch (error) {
        // Handle error
    }
};

window.deleteTask = async function (id) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
        highlightApiEndpoint('api-delete-tasks');
        await apiCall(`/tasks/${id}`, 'DELETE');
        loadTasks();
    } catch (error) {
        // Handle error
    }
};

window.editTask = async function (id, currentTitle) {
    const newTitle = prompt('Edit task:', currentTitle);
    if (!newTitle || newTitle.trim() === '' || newTitle.trim() === currentTitle) return;

    try {
        highlightApiEndpoint('api-put-tasks');
        await apiCall(`/tasks/${id}`, 'PUT', { title: newTitle.trim() });
        loadTasks();
    } catch (error) {
        // Handle error
    }
};

// --- Visual Feedback Helpers ---
function highlightApiEndpoint(id) {
    const el = document.getElementById(id);
    if (!el) return;

    // Reset any existing animation
    el.style.transition = 'none';
    el.style.backgroundColor = '#e0e7ff'; // Primary light
    el.style.transform = 'scale(1.02)';
    el.style.borderColor = '#4f46e5';

    // Trigger reflow
    void el.offsetWidth;

    // Animate back
    el.style.transition = 'all 0.5s ease-out';
    el.style.backgroundColor = '';
    el.style.transform = '';
    el.style.borderColor = '';
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
}
