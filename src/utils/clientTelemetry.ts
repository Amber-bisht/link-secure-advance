/**
 * Client Telemetry - Behavioral Data Collection for Bot Detection
 * 
 * Phase C Security Enhancement:
 * Collects mouse movements, keystroke timings, and scroll patterns
 * to detect automated behavior on the client side.
 * 
 * Usage:
 *   const telemetry = new ClientTelemetry();
 *   telemetry.start();
 *   // ... user interacts with captcha ...
 *   const data = telemetry.stop();
 *   // Send data.behaviorData with captcha verification request
 */

export interface MouseEvent {
    x: number;
    y: number;
    timestamp: number;
    type: 'move' | 'click' | 'scroll';
}

export interface KeyboardEvent {
    key: string;
    timestamp: number;
    type: 'down' | 'up';
}

export interface ScrollEvent {
    y: number;
    timestamp: number;
}

export interface TelemetryData {
    mouseEvents: MouseEvent[];
    keyboardEvents: KeyboardEvent[];
    scrollEvents: ScrollEvent[];
    startTime: number;
    endTime: number;
    totalTime: number;
    focusLostCount: number;
    windowSize: { width: number; height: number };
}

export class ClientTelemetry {
    private mouseEvents: MouseEvent[] = [];
    private keyboardEvents: KeyboardEvent[] = [];
    private scrollEvents: ScrollEvent[] = [];
    private startTime: number = 0;
    private focusLostCount: number = 0;
    private isActive: boolean = false;
    private listeners: { type: string; handler: EventListener }[] = [];

    // Limits to prevent memory issues
    private readonly MAX_MOUSE_EVENTS = 500;
    private readonly MAX_KEYBOARD_EVENTS = 200;
    private readonly MAX_SCROLL_EVENTS = 100;
    private readonly MOUSE_SAMPLE_RATE = 50; // ms between samples
    private lastMouseTime: number = 0;

    /**
     * Start collecting telemetry data
     */
    start(): void {
        if (this.isActive) return;

        this.reset();
        this.startTime = Date.now();
        this.isActive = true;

        // Mouse movement (throttled)
        this.addListener('mousemove', (e: Event) => {
            const mouseEvent = e as globalThis.MouseEvent;
            const now = Date.now();
            if (now - this.lastMouseTime < this.MOUSE_SAMPLE_RATE) return;
            this.lastMouseTime = now;

            if (this.mouseEvents.length < this.MAX_MOUSE_EVENTS) {
                this.mouseEvents.push({
                    x: mouseEvent.clientX,
                    y: mouseEvent.clientY,
                    timestamp: now,
                    type: 'move',
                });
            }
        });

        // Mouse clicks
        this.addListener('click', (e: Event) => {
            const mouseEvent = e as globalThis.MouseEvent;
            if (this.mouseEvents.length < this.MAX_MOUSE_EVENTS) {
                this.mouseEvents.push({
                    x: mouseEvent.clientX,
                    y: mouseEvent.clientY,
                    timestamp: Date.now(),
                    type: 'click',
                });
            }
        });

        // Keyboard events
        this.addListener('keydown', (e: Event) => {
            const keyEvent = e as globalThis.KeyboardEvent;
            if (this.keyboardEvents.length < this.MAX_KEYBOARD_EVENTS) {
                this.keyboardEvents.push({
                    key: this.sanitizeKey(keyEvent.key),
                    timestamp: Date.now(),
                    type: 'down',
                });
            }
        });

        this.addListener('keyup', (e: Event) => {
            const keyEvent = e as globalThis.KeyboardEvent;
            if (this.keyboardEvents.length < this.MAX_KEYBOARD_EVENTS) {
                this.keyboardEvents.push({
                    key: this.sanitizeKey(keyEvent.key),
                    timestamp: Date.now(),
                    type: 'up',
                });
            }
        });

        // Scroll events
        this.addListener('scroll', () => {
            if (this.scrollEvents.length < this.MAX_SCROLL_EVENTS) {
                this.scrollEvents.push({
                    y: window.scrollY,
                    timestamp: Date.now(),
                });
            }
        });

        // Focus tracking
        this.addListener('blur', () => {
            this.focusLostCount++;
        });
    }

    /**
     * Stop collecting and return telemetry data
     */
    stop(): TelemetryData {
        this.isActive = false;
        const endTime = Date.now();

        // Remove all listeners
        for (const { type, handler } of this.listeners) {
            window.removeEventListener(type, handler);
        }
        this.listeners = [];

        return {
            mouseEvents: this.mouseEvents,
            keyboardEvents: this.keyboardEvents,
            scrollEvents: this.scrollEvents,
            startTime: this.startTime,
            endTime,
            totalTime: endTime - this.startTime,
            focusLostCount: this.focusLostCount,
            windowSize: {
                width: window.innerWidth,
                height: window.innerHeight,
            },
        };
    }

    /**
     * Get current data without stopping
     */
    getData(): TelemetryData {
        const now = Date.now();
        return {
            mouseEvents: [...this.mouseEvents],
            keyboardEvents: [...this.keyboardEvents],
            scrollEvents: [...this.scrollEvents],
            startTime: this.startTime,
            endTime: now,
            totalTime: now - this.startTime,
            focusLostCount: this.focusLostCount,
            windowSize: {
                width: window.innerWidth,
                height: window.innerHeight,
            },
        };
    }

    /**
     * Reset all collected data
     */
    reset(): void {
        this.mouseEvents = [];
        this.keyboardEvents = [];
        this.scrollEvents = [];
        this.startTime = 0;
        this.focusLostCount = 0;
        this.lastMouseTime = 0;
    }

    /**
     * Add event listener and track for cleanup
     */
    private addListener(type: string, handler: EventListener): void {
        window.addEventListener(type, handler);
        this.listeners.push({ type, handler });
    }

    /**
     * Sanitize key to prevent sensitive data collection
     */
    private sanitizeKey(key: string): string {
        // Don't record actual key values for privacy
        // Just record if it's a regular key, special key, etc.
        if (key.length === 1) {
            if (/[a-zA-Z]/.test(key)) return 'alpha';
            if (/[0-9]/.test(key)) return 'digit';
            return 'symbol';
        }

        // Allow these specific keys
        const allowedKeys = [
            'Backspace', 'Delete', 'Enter', 'Tab', 'Escape',
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'Shift', 'Control', 'Alt', 'Meta', 'Space',
        ];

        return allowedKeys.includes(key) ? key : 'other';
    }

    /**
     * Calculate quick behavioral score on client side
     * This is a preliminary check before server-side analysis
     */
    calculateQuickScore(): { score: number; suspicious: boolean } {
        const now = Date.now();
        const totalTime = now - this.startTime;
        let score = 0;

        // Too fast
        if (totalTime < 1000) score += 30;
        else if (totalTime < 2000) score += 15;

        // No mouse movement
        if (this.mouseEvents.length < 3) score += 20;

        // No keyboard events when expected
        if (this.keyboardEvents.length === 0) score += 10;

        // Focus was lost many times
        if (this.focusLostCount > 3) score += 10;

        return {
            score: Math.min(score, 100),
            suspicious: score >= 40,
        };
    }
}

/**
 * Singleton instance for easy use
 */
let telemetryInstance: ClientTelemetry | null = null;

export function getTelemetry(): ClientTelemetry {
    if (!telemetryInstance) {
        telemetryInstance = new ClientTelemetry();
    }
    return telemetryInstance;
}

/**
 * Format telemetry data for API request
 */
export function formatBehaviorData(data: TelemetryData): object {
    return {
        mouseEvents: data.mouseEvents,
        keyboardEvents: data.keyboardEvents,
        scrollEvents: data.scrollEvents,
        metadata: {
            totalTime: data.totalTime,
            focusLostCount: data.focusLostCount,
            windowSize: data.windowSize,
        },
    };
}
