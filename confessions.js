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

// Supabase client
let supabase;

// Confessions array to store all confessions
let confessions = [];
let userLikes = new Set(); // Track user's likes
let userIdentifier = null; // Anonymous user identifier

// Initialize Supabase and load confessions
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Supabase client
    if (window.SUPABASE_CONFIG) {
        supabase = window.supabase.createClient(
            window.SUPABASE_CONFIG.url, 
            window.SUPABASE_CONFIG.anonKey
        );
    } else {
        console.error('Supabase configuration not found');
        return;
    }

    // Generate or retrieve user identifier for anonymous likes
    userIdentifier = localStorage.getItem('spicy_user_id') || generateUserIdentifier();
    localStorage.setItem('spicy_user_id', userIdentifier);

    // Load confessions and user likes
    await loadConfessions();
    await loadUserLikes();
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
submitBtn.addEventListener('click', async () => {
    const text = confessionText.value.trim();
    if (text) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';
        
        const success = await addConfession(text);
        if (success) {
            closeModalFunc();
            showSuccessAnimation();
        } else {
            showErrorAnimation();
        }
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post Confession';
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', async (e) => {
    // Ctrl/Cmd + Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (confessionModal.style.display === 'block') {
            const text = confessionText.value.trim();
            if (text && !submitBtn.disabled) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Posting...';
                
                const success = await addConfession(text);
                if (success) {
                    closeModalFunc();
                    showSuccessAnimation();
                } else {
                    showErrorAnimation();
                }
                
                submitBtn.disabled = false;
                submitBtn.textContent = 'Post Confession';
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

async function addConfession(text) {
    try {
        const { data, error } = await supabase
            .from('confessions')
            .insert([
                {
                    text: text,
                    is_anonymous: true
                }
            ])
            .select();

        if (error) {
            console.error('Error adding confession:', error);
            return false;
        }

        // Reload confessions to get the updated list
        await loadConfessions();
        return true;
    } catch (error) {
        console.error('Error adding confession:', error);
        return false;
    }
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
    
    const timeAgo = getTimeAgo(confession.created_at);
    const isLiked = userLikes.has(confession.id.toString());
    
    card.innerHTML = `
        <div class="confession-text">${escapeHtml(confession.text)}</div>
        <div class="confession-meta">
            <div class="confession-time">${timeAgo}</div>
            <div class="confession-actions">
                <button class="like-btn" onclick="toggleLike(${confession.id})">
                    <span class="like-icon">${isLiked ? '❤️' : '🤍'}</span>
                    <span class="like-count">${confession.like_count}</span>
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

async function toggleLike(confessionId) {
    try {
        const isCurrentlyLiked = userLikes.has(confessionId.toString());
        
        if (isCurrentlyLiked) {
            // Remove like
            const { error } = await supabase
                .from('confession_likes')
                .delete()
                .eq('confession_id', confessionId)
                .eq('user_identifier', userIdentifier);
                
            if (error) {
                console.error('Error removing like:', error);
                return;
            }
            
            userLikes.delete(confessionId.toString());
        } else {
            // Add like
            const { error } = await supabase
                .from('confession_likes')
                .insert([
                    {
                        confession_id: confessionId,
                        user_identifier: userIdentifier
                    }
                ]);
                
            if (error) {
                console.error('Error adding like:', error);
                return;
            }
            
            userLikes.add(confessionId.toString());
        }
        
        // Reload confessions to get updated like counts
        await loadConfessions();
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

function updateConfessionCount() {
    confessionCount.textContent = confessions.length;
}

// Generate anonymous user identifier
function generateUserIdentifier() {
    return 'anon_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
}

// Load confessions from Supabase
async function loadConfessions() {
    try {
        const { data, error } = await supabase
            .from('confessions_with_metadata')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50); // Limit to latest 50 confessions

        if (error) {
            console.error('Error loading confessions:', error);
            return;
        }

        confessions = data || [];
        renderConfessions();
        updateConfessionCount();
    } catch (error) {
        console.error('Error loading confessions:', error);
    }
}

// Load user's likes from Supabase
async function loadUserLikes() {
    try {
        const { data, error } = await supabase
            .from('confession_likes')
            .select('confession_id')
            .eq('user_identifier', userIdentifier);

        if (error) {
            console.error('Error loading user likes:', error);
            return;
        }

        userLikes.clear();
        data?.forEach(like => {
            userLikes.add(like.confession_id.toString());
        });
        
        // Re-render confessions to update like states
        renderConfessions();
    } catch (error) {
        console.error('Error loading user likes:', error);
    }
}

function showSuccessAnimation() {
    showToast('🔥 Confession posted! 🔥', 'success');
}

function showErrorAnimation() {
    showToast('❌ Failed to post confession. Please try again.', 'error');
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.textContent = message;
    
    const bgColor = type === 'success' 
        ? 'linear-gradient(45deg, #ff6b6b, #ff8e8e)' 
        : 'linear-gradient(45deg, #e74c3c, #c0392b)';
    
    toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${bgColor};
        color: white;
        padding: 15px 25px;
        border-radius: 25px;
        font-weight: 600;
        z-index: 2000;
        animation: toastPop 3s ease-out forwards;
    `;
    
    document.body.appendChild(toast);
    
    // Remove after animation
    setTimeout(() => {
        if (document.body.contains(toast)) {
            document.body.removeChild(toast);
        }
    }, 3000);
}

// Add toast animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes toastPop {
        0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
        }
        15% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.1);
        }
        85% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
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


