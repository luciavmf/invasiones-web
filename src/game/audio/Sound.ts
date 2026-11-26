// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.

/// A sound effect, by its position in the `sonidos.sfx` list of `data/res.json`.
/// Named as in the macOS port (SoundID in Sound.swift).
export const SoundID = {
    splash:        0,
    patricioShot:  1,
    britishShot:   2,
    patricioDeath: 3,
    battle:        4,
} as const
export type SoundID = typeof SoundID[keyof typeof SoundID]

/// The number of sound effects.
export const soundCount = Object.keys(SoundID).length

/// Plays sound effects. `Sound` provides it in the game; tests use a fake that records calls.
export interface SoundPlayer {
    play(id: SoundID, loop?: number): void
}

/// Singleton for playing sound effects and background music via HTMLAudioElement.
export class Sound implements SoundPlayer {

    static readonly shared = new Sound()

    private sfx: (HTMLAudioElement | null)[] = new Array(soundCount).fill(null)

    private constructor() {}

    async loadAllSounds(): Promise<void> {
        const base = import.meta.env.BASE_URL + 'data/sonidos/'
        const paths = [
            base + 'otheme.ogg',
            base + 'disparo_2.wav',
            base + 'disparo_1.wav',
            base + 'patricio_muerto.wav',
            base + 'TOS-rbattle.ogg',
        ]
        for (let i = 0; i < soundCount; i++) {
            const audio = new Audio(paths[i])
            audio.preload = 'auto'
            this.sfx[i] = audio
        }
    }

    play(id: SoundID, loop = 0): void {
        const audio = this.sfx[id]
        if (!audio) return
        audio.loop = loop === -1
        audio.currentTime = 0
        audio.play().catch(() => { /* autoplay may be blocked until user gesture */ })
    }

    stop(id: number): void {
        if (id === -1) {
            this.sfx.forEach(a => { if (a) { a.pause(); a.currentTime = 0 } })
            return
        }
        const audio = this.sfx[id]
        if (audio) { audio.pause(); audio.currentTime = 0 }
    }

    pause(id: number): void {
        if (id === -1) { this.sfx.forEach(a => a?.pause()); return }
        this.sfx[id]?.pause()
    }

    resume(id: number): void {
        if (id === -1) { this.sfx.forEach(a => a?.play()); return }
        this.sfx[id]?.play()
    }

    setVolume(id: number, volume: number): void {
        const v = Math.max(0, Math.min(volume, 128)) / 128
        if (id === -1) { this.sfx.forEach(a => { if (a) a.volume = v }); return }
        const audio = this.sfx[id]
        if (audio) audio.volume = v
    }
}
