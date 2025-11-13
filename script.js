// ============================================================================
// Main Landing Page - Smooth Animations
// ============================================================================

const state = {
    name: "Yousif Saieb",
    isAnimating: false
};

const elements = {
    heroName: document.getElementById('heroName'),
    contentSection: document.getElementById('contentSection'),
    body: document.body
};

// Smooth name animation
function animateName() {
    const nameContainer = elements.heroName;
    nameContainer.innerHTML = '';
    
    state.name.split('').forEach((letter, index) => {
        const span = document.createElement('span');
        span.className = 'name-letter';
        span.textContent = letter === ' ' ? '\u00A0' : letter;
        span.style.animationDelay = `${index * 0.05}s`;
        nameContainer.appendChild(span);
    });
}

// Show content with smooth transition
function showContent() {
    if (state.isAnimating) return;
    state.isAnimating = true;
    
    const hero = document.querySelector('.hero');
    const content = elements.contentSection;
    
    // Fade out hero
    hero.style.opacity = '0';
    hero.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
        hero.style.display = 'none';
        content.style.display = 'block';
        
        // Trigger fade in
        requestAnimationFrame(() => {
            content.style.opacity = '0';
            content.style.transform = 'translateY(20px)';
            
            requestAnimationFrame(() => {
                content.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                content.style.opacity = '1';
                content.style.transform = 'translateY(0)';
            });
        });
    }, 300);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    animateName();
    
    // Show content after name animation completes
    const animationDuration = state.name.length * 50 + 1000;
    setTimeout(() => {
        showContent();
    }, animationDuration);
});

// Smooth scroll behavior
document.documentElement.style.scrollBehavior = 'smooth';
