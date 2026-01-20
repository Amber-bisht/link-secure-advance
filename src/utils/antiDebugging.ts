/**
 * Anti-Debugging and Anti-Inspection Utilities
 * Prevents common ways of inspecting the page and using developer tools
 */

export function initAntiInspect() {
    if (typeof window === 'undefined') return;

    // Only enable in production
    const isProduction = (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env.NODE_ENV === 'production');
    if (!isProduction) return;

    const redirectToSafety = () => {
        if (typeof window === 'undefined') return;
        try {
            // Use replace to prevent "back" button from returning to the same page
            if (document.referrer && !document.referrer.includes(window.location.hostname)) {
                window.location.replace(document.referrer);
            } else {
                window.location.replace('https://www.google.com');
            }
        } catch (e) {
            window.location.replace('https://www.google.com');
        }
    };

    // 1. Aggressive recursion-based debugger loop
    const startAggressiveDebugger = () => {
        const blocker = function () {
            const start = performance.now();
            (function () { }).constructor("debugger")();
            const end = performance.now();

            // If it took longer than 100ms, DevTools is definitely open
            if (end - start > 100) {
                redirectToSafety();
            }
            setTimeout(blocker, 100);
        };
        blocker();
    };

    // 2. Window resize monitor (for docked DevTools)
    window.addEventListener('resize', () => {
        const threshold = 160;
        if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
            redirectToSafety();
        }
    });

    // 3. Disable right-click
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // 4. Disable shortcuts
    document.addEventListener('keydown', (e) => {
        const isInspect = (e.key === 'F12') ||
            ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
            ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') ||
            ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's');

        if (isInspect) {
            e.preventDefault();
            redirectToSafety();
        }
    });

    // Start detection
    startAggressiveDebugger();

    return () => {
        // No cleanup for aggressive mode
    };
}
