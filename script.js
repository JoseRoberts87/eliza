gsap.registerPlugin(ScrollTrigger);

// Create background elements
function createBackground() {
    // Create particles
    const particlesGroup = document.getElementById('particles');
    for (let i = 0; i < 50; i++) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("r", Math.random() * 2 + 1);
        circle.setAttribute("cx", Math.random() * 1200);
        circle.setAttribute("cy", Math.random() * 800);
        circle.setAttribute("fill", "#FF4500");
        circle.setAttribute("opacity", Math.random() * 0.5 + 0.2);
        particlesGroup.appendChild(circle);
    }

    // Create data streams
    const dataStreamsGroup = document.getElementById('data-streams');
    for (let i = 0; i < 15; i++) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const startX = Math.random() * 1200;
        const startY = Math.random() * 800;
        const controlPoint1X = startX + Math.random() * 200;
        const controlPoint2X = startX + Math.random() * 400;
        const endX = startX + 600;

        path.setAttribute("d", `M${startX} ${startY} C ${controlPoint1X} ${startY}, ${controlPoint2X} ${startY}, ${endX} ${startY}`);
        path.setAttribute("stroke", "#FF4500");
        path.setAttribute("stroke-width", "1");
        path.setAttribute("fill", "none");
        path.setAttribute("opacity", "0.3");
        dataStreamsGroup.appendChild(path);
    }
}

// Update the scroll animations
function initScrollAnimations() {
    const steps = document.querySelectorAll('.step');
    const centerX = window.innerWidth / 2 - 150; // Adjust for card width
    const centerY = window.innerHeight / 2 - 100;

    // Position logo in center
    gsap.set("#step1", {
        x: centerX,
        y: centerY,
        opacity: 1,
        scale: 1
    });

    // Create main timeline with reduced scroll sensitivity
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: ".content",
            start: "top top",
            end: "+=600%", // Increase scroll distance for smoother transitions
            scrub: 3, // Increase scrub value for less sensitive scrolling
            pin: true,
            pinSpacing: true
        }
    });

    // Animate main title out first
    tl.to("h1", {
        x: -window.innerWidth,
        opacity: 0,
        duration: 1,
        ease: "power2.inOut"
    });

    tl.to("p", {
        x: window.innerWidth,
        opacity: 0,
        duration: 1,
        ease: "power2.inOut"
    }, "<");

    // Then animate logo
    tl.to("#step1", {
        y: centerY - 100,
        opacity: 0,
        scale: 0.8,
        duration: 2,
        ease: "power2.inOut"
    }, ">");

    // Center-focused card positions
    const positions = [
        { x: centerX, y: centerY },           // Center
        { x: centerX, y: centerY },           // Center
        { x: centerX, y: centerY },           // Center
        { x: centerX, y: centerY },           // Center
        { x: centerX, y: centerY }            // Center
    ];

    // Animate process steps with dynamic movement
    steps.forEach((step, index) => {
        if (index === 0) return; // Skip logo

        // Random starting position off screen
        const startX = Math.random() > 0.5 ? -window.innerWidth - 200 : window.innerWidth + 200;
        const startY = centerY + (Math.random() - 0.5) * 200;

        gsap.set(step, {
            x: startX,
            y: startY,
            opacity: 0,
            scale: 0.8,
            rotation: (Math.random() - 0.5) * 20
        });

        // Animate in to center
        tl.to(step, {
            x: positions[index - 1].x,
            y: positions[index - 1].y,
            opacity: 1,
            scale: 1,
            rotation: 0,
            duration: 4,
            ease: "power2.out"
        }, `>-0.2`);

        // Hold in center briefly
        tl.to(step, {
            x: positions[index - 1].x,
            y: positions[index - 1].y,
            duration: 2
        });

        // Animate out with dynamic movement
        if (index < steps.length - 1) {
            const exitX = Math.random() > 0.5 ? -window.innerWidth - 200 : window.innerWidth + 200;
            const exitY = centerY + (Math.random() - 0.5) * 200;

            tl.to(step, {
                x: exitX,
                y: exitY,
                opacity: 0,
                scale: 0.8,
                rotation: (Math.random() - 0.5) * 45,
                duration: 3,
                ease: "power2.in"
            }, '>1');
        }
    });

    // Remove the final "Get Started" card from view
    gsap.set(".section:last-child", {
        opacity: 0,
        display: "none"
    });

    // Add some parallax to background elements
    gsap.to("#particles circle", {
        scrollTrigger: {
            trigger: ".content",
            start: "top top",
            end: "bottom bottom",
            scrub: 1
        },
        y: "random(-100, 100)",
        x: "random(-100, 100)",
        stagger: {
            amount: 1,
            from: "random"
        }
    });
}

// Update the background animations
function animateBackground() {
    gsap.to("#particles circle", {
        y: "random(-20, 20)",
        x: "random(-20, 20)",
        duration: "random(4, 6)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: {
            amount: 3,
            from: "random"
        }
    });

    // Animate data streams with smoother flow
    gsap.to("#data-streams path", {
        strokeDashoffset: -1000,
        strokeDasharray: "10 20",
        duration: "random(15, 25)",
        repeat: -1,
        ease: "none",
        stagger: {
            amount: 3,
            from: "random"
        }
    });
}

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
    createBackground();
    initScrollAnimations();
    animateBackground();

    // Debug logo loading
    const logoImage = document.querySelector('#step1 image');
    if (logoImage) {
        console.log('Logo path:', logoImage.getAttribute('href'));
        logoImage.addEventListener('error', (e) => console.error('Logo load error:', e));
    }
});