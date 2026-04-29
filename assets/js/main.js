// General main functionality
document.addEventListener("DOMContentLoaded", () => {
    // Add page transition listener to links
    const links = document.querySelectorAll('a[href]:not([target="_blank"]):not([href^="#"]):not([href^="mailto:"]):not([href^="tel:"])');
    links.forEach(link => {
        link.addEventListener('click', e => {
            if (link.hostname !== window.location.hostname) return;
            e.preventDefault();
            const target = link.href;
            gsap.to("body", {
                opacity: 0,
                duration: 0.4,
                ease: "power2.inOut",
                onComplete: () => {
                    window.location = target;
                }
            });
        });
    });
});

// Google Analytics WhatsApp Event Tracking
document.addEventListener("DOMContentLoaded", () => {
    document.querySelector('.whatsapp-btn')?.addEventListener('click', () => {
        if (typeof gtag === 'function') {
            gtag('event', 'whatsapp_click', { event_category: 'engagement' });
        }
    });
});
