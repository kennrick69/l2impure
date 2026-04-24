/* ============================================
   L2 IMPURE - Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    // === Header Scroll Effect ===
    const header = document.getElementById('header');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // === Play Modal ===
    const playBtn = document.getElementById('playBtn');
    const playModal = document.getElementById('playModal');
    const modalClose = document.getElementById('modalClose');

    if (playBtn && playModal) {
        playBtn.addEventListener('click', function() {
            playModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        modalClose.addEventListener('click', function() {
            playModal.classList.remove('active');
            document.body.style.overflow = '';
        });

        playModal.addEventListener('click', function(e) {
            if (e.target === playModal) {
                playModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    // === Join Play Button (also opens modal) ===
    const joinPlayBtn = document.getElementById('joinPlayBtn');
    if (joinPlayBtn && playModal) {
        joinPlayBtn.addEventListener('click', function(e) {
            e.preventDefault();
            playModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    // === Mobile Menu ===
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const nav = document.querySelector('.nav');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            this.classList.toggle('active');
            nav.classList.toggle('active');
        });
    }

    // === Smooth Scroll ===
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // === Download Tabs ===
    const downloadTabs = document.querySelectorAll('.download-tab');
    
    downloadTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            downloadTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // === Close modal on Escape key ===
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal-overlay.active');
            modals.forEach(modal => {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
    });

    // === Dropdown touch support for mobile ===
    const dropdowns = document.querySelectorAll('.dropdown');
    
    dropdowns.forEach(dropdown => {
        const link = dropdown.querySelector('.nav-link');
        
        link.addEventListener('click', function(e) {
            if (window.innerWidth <= 1024) {
                e.preventDefault();
                dropdown.classList.toggle('active');
            }
        });
    });

    // === Form validation helpers ===
    window.validateEmail = function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    window.validatePassword = function(password) {
        return password.length >= 8;
    };

    // === Show/Hide Password Toggle ===
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('svg');
            
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.add('active');
            } else {
                input.type = 'password';
                this.classList.remove('active');
            }
        });
    });

    // === Notification helper ===
    window.showNotification = function(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    };

    // === Server Status Animation ===
    const statusDots = document.querySelectorAll('.status-dot.online');
    
    statusDots.forEach(dot => {
        dot.style.animation = 'pulse-green 2s infinite';
    });

    console.log('L2 Impure - Site loaded successfully!');
});

// === Utility Functions ===

// Format number with thousand separators
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copiado para a área de transferência!', 'success');
    }).catch(() => {
        showNotification('Erro ao copiar', 'error');
    });
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
