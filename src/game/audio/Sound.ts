// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Res } from '../resources/Res'

/// Singleton for playing sound effects and background music via HTMLAudioElement.
export class Sound {

    static readonly shared = new Sound()

    private sfx: (HTMLAudioElement | null)[] = new Array(Res.SFX_COUNT).fill(null)

    private constructor() {}

    async loadAllSounds(): Promise<void> {
        const paths = [
            '/data/sonidos/otheme.ogg',
            '/data/sonidos/disparo_2.wav',
            '/data/sonidos/disparo_1.wav',
            '/data/sonidos/patricio_muerto.wav',
            '/data/sonidos/TOS-rbattle.ogg',
        ]
        for (let i = 0; i < Res.SFX_COUNT; i++) {
            const audio = new Audio(paths[i])
            audio.preload = 'auto'
            this.sfx[i] = audio
        }
    }

    play(id: number, loop = 0): void {
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
