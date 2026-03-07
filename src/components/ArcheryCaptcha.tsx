"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, RefreshCw, Target, MousePointer2 } from "lucide-react";

interface ArcheryCaptchaProps {
    isOpen: boolean;
    onVerified: (token: string) => void;
    onClose: () => void;
    onError: (error: string) => void;
    challengeNonce?: string;
}

interface GameState {
    state: 'aiming' | 'shooting' | 'hit' | 'miss';
    angle: number;
    power: number;
    arrowX: number;
    arrowY: number;
    velX: number;
    velY: number;
    targetX: number;
    targetY: number;
    attempts: number;
    maxAttempts: number;
    mouseMovements: number;
    startTime: number;
    trail: { x: number; y: number }[];
    flashAlpha: number;
    flashColor: string;
    particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[];
}

const CANVAS_W = 400;
const CANVAS_H = 280;
const BOW_X = 55;
const BOW_Y = 160;
const MAX_ATTEMPTS = 5;
const TARGET_RADIUS = 28;
const HIT_RADIUS = 32;

function createInitialGameState(): GameState {
    return {
        state: 'aiming',
        angle: 0,
        power: 0,
        arrowX: BOW_X,
        arrowY: BOW_Y,
        velX: 0,
        velY: 0,
        targetX: 240 + Math.random() * 80,
        targetY: 70 + Math.random() * 140,
        attempts: 0,
        maxAttempts: MAX_ATTEMPTS,
        mouseMovements: 0,
        startTime: Date.now(),
        trail: [],
        flashAlpha: 0,
        flashColor: '',
        particles: [],
    };
}

export default function ArcheryCaptcha({
    isOpen,
    onVerified,
    onClose,
    onError,
    challengeNonce,
}: ArcheryCaptchaProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gsRef = useRef<GameState>(createInitialGameState());
    const animRef = useRef<number>(0);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [, forceUpdate] = useState(0);
    const rerender = useCallback(() => forceUpdate(c => c + 1), []);
    const [mounted, setMounted] = useState(false);

    // ─── Drawing ────────────────────────────────────────────────────────
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const gs = gsRef.current;

        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H - 40);
        sky.addColorStop(0, '#0f0a2e');
        sky.addColorStop(0.5, '#1a1145');
        sky.addColorStop(1, '#2d1b69');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H - 40);

        // Stars
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        const starSeeds = [23, 67, 102, 189, 234, 56, 145, 178, 300, 350, 12, 89, 267, 310, 45];
        for (const s of starSeeds) {
            const sx = (s * 7 + 13) % CANVAS_W;
            const sy = (s * 3 + 7) % (CANVAS_H - 60);
            ctx.fillRect(sx, sy, 1.5, 1.5);
        }

        // Grass
        const grass = ctx.createLinearGradient(0, CANVAS_H - 40, 0, CANVAS_H);
        grass.addColorStop(0, '#1a4a1a');
        grass.addColorStop(1, '#0d2d0d');
        ctx.fillStyle = grass;
        ctx.fillRect(0, CANVAS_H - 40, CANVAS_W, 40);

        // Grass blades
        ctx.strokeStyle = '#2a6a2a';
        ctx.lineWidth = 1;
        for (let i = 0; i < CANVAS_W; i += 8) {
            const h = 5 + (i * 7 % 11);
            ctx.beginPath();
            ctx.moveTo(i, CANVAS_H - 40);
            ctx.lineTo(i + 2, CANVAS_H - 40 - h);
            ctx.stroke();
        }

        // ─── Target ─────────────────────────────────
        const tx = gs.targetX, ty = gs.targetY;

        // Target stand
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tx, ty + TARGET_RADIUS);
        ctx.lineTo(tx - 10, CANVAS_H - 40);
        ctx.moveTo(tx, ty + TARGET_RADIUS);
        ctx.lineTo(tx + 10, CANVAS_H - 40);
        ctx.stroke();

        // Target rings
        const rings = [
            { r: TARGET_RADIUS, c: '#ef4444' },
            { r: 20, c: '#ffffff' },
            { r: 13, c: '#ef4444' },
            { r: 7, c: '#ffffff' },
            { r: 3, c: '#ef4444' },
        ];
        for (const ring of rings) {
            ctx.beginPath();
            ctx.arc(tx, ty, ring.r, 0, Math.PI * 2);
            ctx.fillStyle = ring.c;
            ctx.fill();
        }

        // ─── Bow ────────────────────────────────────
        ctx.save();
        ctx.translate(BOW_X, BOW_Y);
        ctx.rotate(gs.angle);

        // Bow limbs (outer)
        ctx.beginPath();
        ctx.arc(0, 0, 32, -Math.PI / 2, Math.PI / 2);
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Inner limb
        ctx.beginPath();
        ctx.arc(0, 0, 28, -Math.PI / 2, Math.PI / 2);
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Bow string
        const pullBack = gs.power * 0.4;
        ctx.beginPath();
        ctx.moveTo(0, -32);
        ctx.lineTo(-pullBack, 0);
        ctx.lineTo(0, 32);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Grip
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#7c3aed';
        ctx.fill();

        // Arrow on bow (when aiming)
        if (gs.state === 'aiming' && gs.power > 5) {
            ctx.beginPath();
            ctx.moveTo(-pullBack, 0);
            ctx.lineTo(35 - pullBack, 0);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Arrowhead on bow
            ctx.beginPath();
            ctx.moveTo(35 - pullBack, 0);
            ctx.lineTo(29 - pullBack, -3);
            ctx.lineTo(29 - pullBack, 3);
            ctx.closePath();
            ctx.fillStyle = '#fbbf24';
            ctx.fill();
        }

        ctx.restore();

        // ─── Power bar ─────────────────────────────
        if (gs.state === 'aiming') {
            const barX = 16, barY = 50, barW = 8, barH = 160;
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 4);
            ctx.fill();
            ctx.stroke();

            const fillH = (gs.power / 80) * barH;
            const barGrad = ctx.createLinearGradient(0, barY + barH - fillH, 0, barY + barH);
            barGrad.addColorStop(0, '#22c55e');
            barGrad.addColorStop(0.6, '#eab308');
            barGrad.addColorStop(1, '#ef4444');
            ctx.fillStyle = barGrad;
            ctx.fillRect(barX, barY + barH - fillH, barW, fillH);

            // Power label
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.round((gs.power / 80) * 100)}%`, barX + barW / 2, barY + barH + 14);
        }

        // ─── Flying Arrow + Trail ───────────────────
        if (gs.state === 'shooting' || gs.state === 'hit') {
            // Trail
            for (let i = 0; i < gs.trail.length; i++) {
                const alpha = (i / gs.trail.length) * 0.5;
                ctx.beginPath();
                ctx.arc(gs.trail[i].x, gs.trail[i].y, 1.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(168,85,247,${alpha})`;
                ctx.fill();
            }

            // Arrow body
            ctx.save();
            ctx.translate(gs.arrowX, gs.arrowY);
            const flyAngle = Math.atan2(gs.velY, gs.velX);
            ctx.rotate(flyAngle);

            // Shaft
            ctx.beginPath();
            ctx.moveTo(-18, 0);
            ctx.lineTo(12, 0);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Arrowhead
            ctx.beginPath();
            ctx.moveTo(12, 0);
            ctx.lineTo(6, -4);
            ctx.lineTo(6, 4);
            ctx.closePath();
            ctx.fillStyle = '#fbbf24';
            ctx.fill();

            // Fletching
            ctx.beginPath();
            ctx.moveTo(-18, 0);
            ctx.lineTo(-22, -4);
            ctx.lineTo(-14, 0);
            ctx.lineTo(-22, 4);
            ctx.closePath();
            ctx.fillStyle = '#ef4444';
            ctx.fill();

            ctx.restore();
        }

        // ─── Particles ──────────────────────────────
        for (const p of gs.particles) {
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2 + p.life * 2, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // ─── Flash overlay ──────────────────────────
        if (gs.flashAlpha > 0) {
            ctx.fillStyle = gs.flashColor.replace(')', `,${gs.flashAlpha})`).replace('rgb', 'rgba');
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // ─── Hit/Miss text ──────────────────────────
        if (gs.state === 'hit') {
            ctx.save();
            ctx.font = 'bold 28px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#22c55e';
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 20;
            ctx.fillText('✓ Bullseye!', CANVAS_W / 2, CANVAS_H / 2 - 10);
            ctx.restore();
        } else if (gs.state === 'miss') {
            ctx.save();
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 15;
            ctx.fillText('✗ Missed!', CANVAS_W / 2, CANVAS_H / 2 - 10);
            ctx.restore();
        }
    }, []);

    // ─── Game loop ──────────────────────────────────────────────────────
    const gameLoop = useCallback(() => {
        const gs = gsRef.current;

        if (gs.state === 'shooting') {
            gs.arrowX += gs.velX;
            gs.arrowY += gs.velY;
            gs.velY += 0.14; // gravity

            // Trail
            gs.trail.push({ x: gs.arrowX, y: gs.arrowY });
            if (gs.trail.length > 12) gs.trail.shift();

            // Hit check
            const dist = Math.hypot(gs.arrowX - gs.targetX, gs.arrowY - gs.targetY);
            if (dist < HIT_RADIUS) {
                gs.state = 'hit';
                gs.flashAlpha = 0.3;
                gs.flashColor = 'rgb(34,197,94)';

                // Spawn particles
                for (let i = 0; i < 20; i++) {
                    gs.particles.push({
                        x: gs.targetX,
                        y: gs.targetY,
                        vx: (Math.random() - 0.5) * 6,
                        vy: (Math.random() - 0.5) * 6,
                        life: 1,
                        color: ['#22c55e', '#86efac', '#fbbf24', '#ffffff'][Math.floor(Math.random() * 4)],
                    });
                }

                rerender();

                timeoutRef.current = setTimeout(() => {
                    generateToken();
                }, 1200);

                // Continue drawing for particles
                draw();
                animRef.current = requestAnimationFrame(gameLoop);
                return;
            }

            // Out of bounds
            if (gs.arrowX > CANVAS_W + 20 || gs.arrowY > CANVAS_H + 20 || gs.arrowY < -20 || gs.arrowX < -20) {
                gs.state = 'miss';
                gs.attempts += 1;
                gs.flashAlpha = 0.25;
                gs.flashColor = 'rgb(239,68,68)';
                rerender();

                if (gs.attempts >= gs.maxAttempts) {
                    timeoutRef.current = setTimeout(() => {
                        onError('Too many failed attempts. Please try again.');
                    }, 1500);
                } else {
                    timeoutRef.current = setTimeout(() => {
                        resetShot();
                        rerender();
                    }, 1500);
                }

                draw();
                animRef.current = requestAnimationFrame(gameLoop);
                return;
            }
        }

        // Animate particles
        if (gs.particles.length > 0) {
            gs.particles = gs.particles
                .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.02 }))
                .filter(p => p.life > 0);
        }

        // Fade flash
        if (gs.flashAlpha > 0) {
            gs.flashAlpha = Math.max(0, gs.flashAlpha - 0.01);
        }

        draw();

        // Keep loop running during shooting & hit (for particles)
        if (gs.state === 'shooting' || (gs.state === 'hit' && gs.particles.length > 0) || gs.flashAlpha > 0) {
            animRef.current = requestAnimationFrame(gameLoop);
        }
    }, [draw, rerender, onError]);

    // ─── Reset shot (not full reset) ────────────────────────────────────
    const resetShot = useCallback(() => {
        const gs = gsRef.current;
        gs.state = 'aiming';
        gs.angle = 0;
        gs.power = 0;
        gs.arrowX = BOW_X;
        gs.arrowY = BOW_Y;
        gs.velX = 0;
        gs.velY = 0;
        gs.trail = [];
        gs.flashAlpha = 0;
        gs.particles = [];
        // Re-randomize target
        gs.targetX = 240 + Math.random() * 80;
        gs.targetY = 70 + Math.random() * 140;
        draw();
    }, [draw]);

    // ─── Full init ──────────────────────────────────────────────────────
    const initGame = useCallback(() => {
        gsRef.current = createInitialGameState();
        draw();
        rerender();
    }, [draw, rerender]);

    // ─── Token generation ───────────────────────────────────────────────
    const generateToken = useCallback(async () => {
        const gs = gsRef.current;
        try {
            const payload = {
                ts: Date.now(),
                dur: Date.now() - gs.startTime,
                attempts: gs.attempts + 1,
                moves: gs.mouseMovements,
                v: 'v5_archery',
            };

            const payloadStr = JSON.stringify(payload);
            const encoder = new TextEncoder();

            // Use challenge nonce as key material, or fallback
            const keyData = encoder.encode(challengeNonce || 'v5-archery-captcha-key');
            const keyHash = await crypto.subtle.digest('SHA-256', keyData);
            const key = await crypto.subtle.importKey(
                'raw', keyHash, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
            );

            const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadStr));
            const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

            const payloadB64 = btoa(payloadStr);
            const token = `v5_archery_${payloadB64}.${sigHex}`;

            onVerified(token);
        } catch {
            // Fallback: simpler token
            const ts = Date.now();
            const token = `v5_archery_${ts}_${gs.mouseMovements}_${gs.attempts + 1}`;
            onVerified(token);
        }
    }, [challengeNonce, onVerified]);

    // ─── Mount ──────────────────────────────────────────────────────────
    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (isOpen && mounted) {
            initGame();
        }
        return () => {
            cancelAnimationFrame(animRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isOpen, mounted, initGame]);

    // Visibility change handler
    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden) {
                cancelAnimationFrame(animRef.current);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    // ─── Mouse handlers ─────────────────────────────────────────────────
    const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;

        let clientX, clientY;
        if ('touches' in e) {
            if (e.touches.length === 0) return null;
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    }, []);

    const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const gs = gsRef.current;
        if (gs.state !== 'aiming') return;
        e.preventDefault();

        const coords = getCanvasCoords(e);
        if (!coords) return;

        gs.mouseMovements += 1;

        const dx = coords.x - BOW_X;
        const dy = coords.y - BOW_Y;
        gs.angle = Math.atan2(dy, dx);

        const dist = Math.hypot(dx, dy);
        gs.power = Math.min(dist / 2, 80);

        draw();
        rerender();
    }, [getCanvasCoords, draw, rerender]);

    const fireArrow = useCallback(() => {
        const gs = gsRef.current;
        if (gs.state !== 'aiming') return;
        if (gs.power < 8) return;

        const speed = gs.power / 3;
        gs.velX = Math.cos(gs.angle) * speed;
        gs.velY = Math.sin(gs.angle) * speed;
        gs.arrowX = BOW_X;
        gs.arrowY = BOW_Y;
        gs.trail = [];
        gs.state = 'shooting';

        rerender();
        cancelAnimationFrame(animRef.current);
        animRef.current = requestAnimationFrame(gameLoop);
    }, [gameLoop, rerender]);

    // Document-level mouseup to catch release outside canvas
    useEffect(() => {
        if (!isOpen) return;
        const handleDocMouseUp = () => { fireArrow(); };
        document.addEventListener('mouseup', handleDocMouseUp);
        document.addEventListener('touchend', handleDocMouseUp);
        return () => {
            document.removeEventListener('mouseup', handleDocMouseUp);
            document.removeEventListener('touchend', handleDocMouseUp);
        };
    }, [isOpen, fireArrow]);

    const handlePointerUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        fireArrow();
    }, [fireArrow]);

    const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const gs = gsRef.current;
        if (gs.state !== 'aiming') return;
        const coords = getCanvasCoords(e);
        if (!coords) return;
        const dx = coords.x - BOW_X;
        const dy = coords.y - BOW_Y;
        gs.angle = Math.atan2(dy, dx);
        gs.power = Math.min(Math.hypot(dx, dy) / 2, 80);
        draw();
        rerender();
    }, [getCanvasCoords, draw, rerender]);

    if (!isOpen || !mounted) return null;

    const gs = gsRef.current;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="relative w-full max-w-sm mx-4 bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden p-6">

                <div className="text-center mb-5">
                    <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-purple-500/30">
                        <Target className="text-purple-400 w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Archery Challenge</h3>
                    <p className="text-zinc-500 text-xs mt-1">
                        {gs.state === 'aiming' ? "Aim at the target and release to shoot" :
                            gs.state === 'shooting' ? "Arrow in flight..." :
                                gs.state === 'hit' ? "🎯 Bullseye! Verified!" :
                                    gs.state === 'miss' ? `Missed! ${gs.attempts >= gs.maxAttempts ? 'No attempts left' : 'Try again...'}` :
                                        "Loading..."}
                    </p>
                </div>

                <div className="relative bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden cursor-crosshair select-none"
                    style={{ touchAction: 'none' }}
                >
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_W}
                        height={CANVAS_H}
                        onMouseMove={handlePointerMove}
                        onMouseDown={handlePointerDown}
                        onMouseUp={handlePointerUp}
                        onTouchStart={handlePointerDown}
                        onTouchMove={handlePointerMove}
                        onTouchEnd={handlePointerUp}
                        className="w-full h-auto block"
                    />

                    {gs.state === 'aiming' && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                            <MousePointer2 className="w-3 h-3" />
                            Aim & Release
                        </div>
                    )}
                </div>

                {/* Attempts counter */}
                <div className="mt-3 flex items-center justify-between px-1">
                    <div className="flex gap-1">
                        {Array.from({ length: gs.maxAttempts }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-2 h-2 rounded-full transition-all ${i < gs.attempts
                                    ? 'bg-red-500/80'
                                    : i === gs.attempts && gs.state === 'aiming'
                                        ? 'bg-purple-500 animate-pulse'
                                        : 'bg-zinc-700'
                                    }`}
                            />
                        ))}
                    </div>
                    <span className="text-[10px] text-zinc-600 font-mono">
                        Shot {Math.min(gs.attempts + 1, gs.maxAttempts)}/{gs.maxAttempts}
                    </span>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-900/50 flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-600">
                    <span>V5.0 Archery</span>
                    <button
                        onClick={() => { initGame(); }}
                        className="hover:text-purple-400 flex items-center gap-1 transition-colors"
                    >
                        <RefreshCw className="w-3 h-3" /> Reset
                    </button>
                </div>
            </div>
        </div>
    );
}
