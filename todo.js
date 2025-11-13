// ============================================================================
// Task Quest - Gamified To-Do List
// ============================================================================

// State
const state = {
    tasks: JSON.parse(localStorage.getItem('tasks')) || [],
    currentPriority: 'normal',
    currentFilter: 'all',
    stats: JSON.parse(localStorage.getItem('stats')) || {
        completed: 0,
        streak: 0,
        level: 1,
        total: 0,
        lastCompletedDate: null
    }
};

// DOM Elements
const elements = {
    input: document.getElementById('todo-input'),
    addBtn: document.getElementById('add-btn'),
    todoList: document.getElementById('todo-list'),
    emptyState: document.getElementById('empty-state'),
    priorityBtns: document.querySelectorAll('.priority-btn'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    progressFill: document.getElementById('progress-fill'),
    progressPercent: document.getElementById('progress-percent'),
    completedCount: document.getElementById('completed-count'),
    streakCount: document.getElementById('streak-count'),
    level: document.getElementById('level'),
    achievementBadge: document.getElementById('achievement-badge'),
    achievementDesc: document.getElementById('achievement-desc'),
    statsModal: document.getElementById('stats-modal'),
    modalClose: document.getElementById('modal-close'),
    statCompleted: document.getElementById('stat-completed'),
    statStreak: document.getElementById('stat-streak'),
    statLevel: document.getElementById('stat-level'),
    statTotal: document.getElementById('stat-total')
};

// Initialize
function init() {
    loadTasks();
    updateUI();
    setupEventListeners();
    checkStreak();
}

// Event Listeners
function setupEventListeners() {
    elements.addBtn.addEventListener('click', addTask);
    elements.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addTask();
    });

    elements.priorityBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.priorityBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentPriority = btn.dataset.priority;
        });
    });

    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    elements.modalClose.addEventListener('click', () => {
        elements.statsModal.classList.remove('active');
    });

    // Click outside to close modal
    elements.statsModal.addEventListener('click', (e) => {
        if (e.target === elements.statsModal) {
            elements.statsModal.classList.remove('active');
        }
    });

    // Stats bar click to open modal
    document.querySelector('.stats-bar').addEventListener('click', () => {
        updateStatsModal();
        elements.statsModal.classList.add('active');
    });
}

// Add Task
function addTask() {
    const text = elements.input.value.trim();
    if (!text) return;

    const task = {
        id: Date.now(),
        text: text,
        completed: false,
        priority: state.currentPriority,
        createdAt: new Date().toISOString()
    };

    state.tasks.unshift(task);
    state.stats.total++;
    saveData();
    renderTasks();
    updateUI();
    
    elements.input.value = '';
    elements.input.focus();
    
    // Animation
    animateAdd();
}

// Create Task Element
function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item task-item--${task.priority} ${task.completed ? 'completed' : ''}`;
    li.dataset.id = task.id;

    const priorityEmoji = {
        normal: '⚪',
        important: '🟡',
        urgent: '🔴'
    };

    li.innerHTML = `
        <div class="task-content">
            <button class="task-checkbox ${task.completed ? 'checked' : ''}" data-action="toggle">
                ${task.completed ? '✓' : ''}
            </button>
            <span class="task-text">${escapeHtml(task.text)}</span>
            <span class="task-priority">${priorityEmoji[task.priority]}</span>
        </div>
        <button class="task-delete" data-action="delete" aria-label="Delete task">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
        </button>
    `;

    // Event listeners
    li.querySelector('[data-action="toggle"]').addEventListener('click', () => toggleTask(task.id));
    li.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(task.id);
    });

    return li;
}

// Toggle Task
function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    
    if (task.completed) {
        state.stats.completed++;
        checkAchievements();
        updateStreak();
        levelUp();
    } else {
        state.stats.completed = Math.max(0, state.stats.completed - 1);
    }

    saveData();
    renderTasks();
    updateUI();
    animateCompletion(task.completed);
}

// Delete Task
function deleteTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task && task.completed) {
        state.stats.completed = Math.max(0, state.stats.completed - 1);
    }
    
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveData();
    renderTasks();
    updateUI();
}

// Render Tasks
function renderTasks() {
    elements.todoList.innerHTML = '';
    
    let filteredTasks = state.tasks;
    
    if (state.currentFilter === 'active') {
        filteredTasks = state.tasks.filter(t => !t.completed);
    } else if (state.currentFilter === 'completed') {
        filteredTasks = state.tasks.filter(t => t.completed);
    }

    if (filteredTasks.length === 0) {
        elements.emptyState.style.display = 'flex';
    } else {
        elements.emptyState.style.display = 'none';
        filteredTasks.forEach(task => {
            elements.todoList.appendChild(createTaskElement(task));
        });
    }
}

// Update UI
function updateUI() {
    const total = state.tasks.length;
    const completed = state.tasks.filter(t => t.completed).length;
    const progress = total > 0 ? (completed / total) * 100 : 0;

    elements.progressFill.style.width = `${progress}%`;
    elements.progressPercent.textContent = `${Math.round(progress)}%`;
    elements.completedCount.textContent = completed;
    elements.streakCount.textContent = `🔥 ${state.stats.streak}`;
    elements.level.textContent = state.stats.level;
}

// Update Stats Modal
function updateStatsModal() {
    elements.statCompleted.textContent = state.stats.completed;
    elements.statStreak.textContent = state.stats.streak;
    elements.statLevel.textContent = state.stats.level;
    elements.statTotal.textContent = state.stats.total;
}

// Check Streak
function checkStreak() {
    const today = new Date().toDateString();
    const lastDate = state.stats.lastCompletedDate;
    
    if (lastDate === today) {
        // Already completed today
        return;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    if (lastDate === yesterdayStr) {
        // Continue streak
        state.stats.streak++;
    } else if (lastDate !== today && lastDate !== yesterdayStr) {
        // Reset streak
        state.stats.streak = 0;
    }
    
    saveData();
}

// Update Streak
function updateStreak() {
    const today = new Date().toDateString();
    if (state.stats.lastCompletedDate !== today) {
        checkStreak();
        state.stats.lastCompletedDate = today;
        saveData();
    }
}

// Level Up
function levelUp() {
    const newLevel = Math.floor(state.stats.completed / 5) + 1;
    if (newLevel > state.stats.level) {
        state.stats.level = newLevel;
        showAchievement(`Level Up! You're now Level ${newLevel}!`, '🎉');
        saveData();
    }
}

// Check Achievements
function checkAchievements() {
    const completed = state.stats.completed;
    
    if (completed === 1) {
        showAchievement('First Quest Complete!', '🎯');
    } else if (completed === 5) {
        showAchievement('5 Quests Completed!', '⭐');
    } else if (completed === 10) {
        showAchievement('10 Quests Master!', '🏆');
    } else if (completed === 25) {
        showAchievement('25 Quests Legend!', '👑');
    } else if (completed === 50) {
        showAchievement('50 Quests Champion!', '💎');
    } else if (completed === 100) {
        showAchievement('100 Quests GOD MODE!', '🔥');
    }
    
    if (state.stats.streak === 3) {
        showAchievement('3 Day Streak!', '🔥');
    } else if (state.stats.streak === 7) {
        showAchievement('Week Warrior!', '⚡');
    } else if (state.stats.streak === 30) {
        showAchievement('Month Master!', '🌟');
    }
}

// Show Achievement
function showAchievement(text, icon) {
    elements.achievementDesc.textContent = text;
    elements.achievementBadge.querySelector('.achievement-icon').textContent = icon;
    elements.achievementBadge.classList.add('show');
    
    setTimeout(() => {
        elements.achievementBadge.classList.remove('show');
    }, 3000);
}

// Animations
function animateAdd() {
    const firstTask = elements.todoList.firstElementChild;
    if (firstTask) {
        firstTask.style.opacity = '0';
        firstTask.style.transform = 'translateY(-20px)';
        requestAnimationFrame(() => {
            firstTask.style.transition = 'all 0.3s ease';
            firstTask.style.opacity = '1';
            firstTask.style.transform = 'translateY(0)';
        });
    }
}

function animateCompletion(isCompleted) {
    if (isCompleted) {
        // Celebration effect
        createConfetti();
    }
}

function createConfetti() {
    const colors = ['#1db954', '#1ed760', '#ffffff'];
    for (let i = 0; i < 20; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 2000);
    }
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function saveData() {
    localStorage.setItem('tasks', JSON.stringify(state.tasks));
    localStorage.setItem('stats', JSON.stringify(state.stats));
}

function loadTasks() {
    renderTasks();
}

// Initialize on load
init();

