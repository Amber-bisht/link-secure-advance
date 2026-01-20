/**
 * Anti-Debugging and Anti-Inspection Utilities
 * Prevents common ways of inspecting the page and using developer tools
 */

export function initAntiInspect() {
    if (typeof window === 'undefined') return;

    // 1. Disable right-click
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // 2. Disable common shortcuts
    document.addEventListener('keydown', (e) => {
        // F12
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }

        // Ctrl/Cmd + Shift + I/J/C
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
            e.preventDefault();
            return false;
        }

        // Ctrl/Cmd + U (View Source)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
            e.preventDefault();
            return false;
        }

        // Ctrl/Cmd + S (Save Page)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            return false;
        }
    });

    // 3. Debugger Loop (Detects DevTools)
    const debuggerLoop = () => {
        try {
            (function () {
                (function a() {
                    try {
                        (function b(i) {
                            if (("" + i / i).length !== 1 || i % 20 === 0) {
                                (function () { }).constructor("debugger")();
                            } else {
                                debugger;
                            }
                            b(++i);
                        })(0);
                    } catch (e) {
                        setTimeout(a, 50);
                    }
                })();
            })();
        } catch (e) { }
    };

    // More aggressive debugger loop
    const startAggressiveDebugger = () => {
        setInterval(() => {
            const before = new Date().getTime();
            debugger;
            const after = new Date().getTime();
            if (after - before > 100) {
                // DevTools likely open, could redirect or refresh
                // window.location.reload();
            }
        }, 100);
    };

    // Use a simpler but effective debugger trap
    setInterval(() => {
        (function () {
            return false;
        })["constructor"]("debugger")["call"]();
    }, 100);

    return () => {
        // Cleanup if needed (unlikely for these pages)
    };
}
