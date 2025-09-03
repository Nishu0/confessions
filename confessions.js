// DOM Elements
const postBtn = document.getElementById('postBtn');
const confessionModal = document.getElementById('confessionModal');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const confessionText = document.getElementById('confessionText');
const submitBtn = document.getElementById('submitBtn');
const charCount = document.getElementById('charCount');
const confessionsList = document.getElementById('confessionsList');
const confessionCount = document.getElementById('confessionCount');

// Confessions array to store all confessions
let confessions = [];

// Load confessions from localStorage on page load
document.addEventListener('DOMContentLoaded', () => {
    // Clear any existing confessions from localStorage to start fresh
    localStorage.removeItem('spicyConfessions');
    confessions = [];
    renderConfessions();
    updateConfessionCount();
});

// Modal functionality
postBtn.addEventListener('click', () => {
    openModal();
});

closeModal.addEventListener('click', () => {
    closeModalFunc();
});

cancelBtn.addEventListener('click', () => {
    closeModalFunc();
});

// Close modal when clicking outside
confessionModal.addEventListener('click', (e) => {
    if (e.target === confessionModal) {
        closeModalFunc();
    }
});

// Character count functionality
confessionText.addEventListener('input', () => {
    const length = confessionText.value.length;
    charCount.textContent = length;
    
    // Disable submit button if text is empty
    submitBtn.disabled = length === 0;
    
    // Change color when approaching limit
    if (length > 450) {
        charCount.style.color = '#ff6b6b';
    } else if (length > 400) {
        charCount.style.color = '#ffa500';
    } else {
        charCount.style.color = '#666';
    }
});

// Submit confession
submitBtn.addEventListener('click', () => {
    const text = confessionText.value.trim();
    if (text) {
        addConfession(text);
        closeModalFunc();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (confessionModal.style.display === 'block') {
            const text = confessionText.value.trim();
            if (text) {
                addConfession(text);
                closeModalFunc();
            }
        }
    }
    
    // Escape to close modal
    if (e.key === 'Escape' && confessionModal.style.display === 'block') {
        closeModalFunc();
    }
});

// Functions
function openModal() {
    confessionModal.style.display = 'block';
    confessionText.focus();
    confessionText.value = '';
    charCount.textContent = '0';
    submitBtn.disabled = true;
    
    // Add body scroll lock
    document.body.style.overflow = 'hidden';
}

function closeModalFunc() {
    confessionModal.style.display = 'none';
    confessionText.value = '';
    charCount.textContent = '0';
    
    // Remove body scroll lock
    document.body.style.overflow = 'auto';
}

function addConfession(text) {
    const confession = {
        id: Date.now(),
        text: text,
        timestamp: new Date(),
        likes: 0
    };
    
    // Add to beginning of array (newest first)
    confessions.unshift(confession);
    
    // Save to localStorage
    saveConfessions();
    
    // Update UI
    renderConfessions();
    updateConfessionCount();
    
    // Show success animation
    showSuccessAnimation();
}

function renderConfessions() {
    confessionsList.innerHTML = '';
    
    if (confessions.length === 0) {
        confessionsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💭</div>
                <h3>No confessions yet</h3>
                <p>Be the first to share a spicy confession!</p>
            </div>
        `;
        return;
    }
    
    confessions.forEach(confession => {
        const confessionCard = createConfessionCard(confession);
        confessionsList.appendChild(confessionCard);
    });
}

function createConfessionCard(confession) {
    const card = document.createElement('div');
    card.className = 'confession-card';
    card.dataset.id = confession.id;
    
    const timeAgo = getTimeAgo(confession.timestamp);
    
    card.innerHTML = `
        <div class="confession-text">${escapeHtml(confession.text)}</div>
        <div class="confession-meta">
            <div class="confession-time">${timeAgo}</div>
            <div class="confession-actions">
                <button class="like-btn" onclick="toggleLike(${confession.id})">
                    <span class="like-icon">${confession.liked ? '❤️' : '🤍'}</span>
                    <span class="like-count">${confession.likes}</span>
                </button>
            </div>
        </div>
    `;
    
    return card;
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function toggleLike(confessionId) {
    const confession = confessions.find(c => c.id === confessionId);
    if (confession) {
        confession.liked = !confession.liked;
        confession.likes += confession.liked ? 1 : -1;
        saveConfessions();
        renderConfessions();
    }
}

function updateConfessionCount() {
    confessionCount.textContent = confessions.length;
}

function saveConfessions() {
    localStorage.setItem('spicyConfessions', JSON.stringify(confessions));
}

function loadConfessions() {
    const saved = localStorage.getItem('spicyConfessions');
    if (saved) {
        confessions = JSON.parse(saved);
        renderConfessions();
    }
}

function showSuccessAnimation() {
    // Create a temporary success message
    const successMsg = document.createElement('div');
    successMsg.className = 'success-message';
    successMsg.textContent = '🔥 Confession posted! 🔥';
    successMsg.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(45deg, #ff6b6b, #ff8e8e);
        color: white;
        padding: 15px 25px;
        border-radius: 25px;
        font-weight: 600;
        z-index: 2000;
        animation: successPop 2s ease-out forwards;
    `;
    
    document.body.appendChild(successMsg);
    
    // Remove after animation
    setTimeout(() => {
        document.body.removeChild(successMsg);
    }, 2000);
}

// Add success animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes successPop {
        0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
        }
        50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.1);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1);
        }
    }
    
    .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #666;
    }
    
    .empty-icon {
        font-size: 3rem;
        margin-bottom: 15px;
    }
    
    .empty-state h3 {
        margin-bottom: 10px;
        color: #333;
    }
    
    .like-btn {
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 5px 10px;
        border-radius: 15px;
        transition: background-color 0.3s ease;
    }
    
    .like-btn:hover {
        background-color: rgba(255, 107, 107, 0.1);
    }
    
    .like-icon {
        font-size: 1.1rem;
    }
    
    .like-count {
        font-size: 0.9rem;
        color: #666;
    }
`;
document.head.appendChild(style);


