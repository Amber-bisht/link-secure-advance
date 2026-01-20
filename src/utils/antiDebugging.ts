/**
 * Anti-Debugging and Anti-Inspection Utilities
 * Prevents common ways of inspecting the page and using developer tools
 */

export function initAntiInspect() {
    if (typeof window === 'undefined') return;

    // Only enable in production
    const isProduction = (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env.NODE_ENV === 'production');
    if (!isProduction) {
        return;
    }

    const redirectToSafety = () => {
        // Clear interval to prevent infinite redirects
        if ((window as any)._antiInspectInterval) {
            clearInterval((window as any)._antiInspectInterval);
        }

        if (document.referrer && !document.referrer.includes(window.location.hostname)) {
            window.location.href = document.referrer;
        } else {
            window.location.href = 'https://www.google.com';
        }
    };

    // Detect docked DevTools by monitoring window size
    window.addEventListener('resize', () => {
        const threshold = 160;
        const widthDiff = window.outerWidth - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;

        if (widthDiff > threshold || heightDiff > threshold) {
            redirectToSafety();
        }
    });

    // 1. Disable right-click
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // 2. Disable common shortcuts
    document.addEventListener('keydown', (e) => {
        // F12
        if (e.key === 'F12') {
            e.preventDefault();
            redirectToSafety();
            return false;
        }

        // Ctrl/Cmd + Shift + I/J/C
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
            e.preventDefault();
            redirectToSafety();
            return false;
        }

        // Ctrl/Cmd + U (View Source)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
            e.preventDefault();
            redirectToSafety();
            return false;
        }

        // Ctrl/Cmd + S (Save Page)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            redirectToSafety();
            return false;
        }
    });

    // 3. Detect DevTools via debugger timing
    const detectDevTools = () => {
        const start = performance.now();
        // This will only pause if DevTools is open
        (function () { }).constructor("debugger")();
        const end = performance.now();

        // If it took longer than 50ms, the debugger likely paused execution
        if (end - start > 50) {
            redirectToSafety();
        }
    };

    // Constant monitoring
    const monitoringInterval = setInterval(detectDevTools, 1000);
    (window as any)._antiInspectInterval = monitoringInterval;

    return () => {
        clearInterval(monitoringInterval);
        delete (window as any)._antiInspectInterval;
    };
}
