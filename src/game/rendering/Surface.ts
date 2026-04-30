// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import * as PIXI from 'pixi.js'

/// Wrapper over a PixiJS texture, mirroring the SDL_Surface-based Superficie class.
/// Supports anchor-point-based positioning, sub-texture clipping, and per-surface alpha.
export class Surface {

    // Anchor flags (bitmask)
    static readonly centerHorizontal = 1
    static readonly centerVertical   = 2

    texture: PIXI.Texture | null = null

    /// Active sub-texture after setClip (null = use full texture).
    currentTexture: PIXI.Texture | null = null

    /// Alpha 0.0–1.0.
    currentAlpha = 1.0

    /// Cache of sub-region textures keyed by `${x},${y},${w},${h}`. Reuses a
    /// single PIXI.Texture per sub-rect across frames so animation playback and
    /// tile rendering don't churn GPU resources.
    private subTextureCache = new Map<string, PIXI.Texture>()

    get width():      number { return this.texture?.width  ?? 0 }
    get height():     number { return this.texture?.height ?? 0 }
    get clipWidth():  number { return (this.currentTexture ?? this.texture)?.width  ?? 0 }
    get clipHeight(): number { return (this.currentTexture ?? this.texture)?.height ?? 0 }

    constructor(texture: PIXI.Texture) {
        this.texture = texture
    }

    setAlpha(alpha: number): void {
        this.currentAlpha = Math.max(0, Math.min(alpha, 255)) / 255
    }

    /// Sets the active sub-texture (equivalent to SDL_SetClipRect).
    /// x, y: clip origin in the full texture (top-left). w, h: clip size.
    setClip(x: number, y: number, w: number, h: number): void {
        const tex = this.getSubTexture(x, y, w, h)
        if (tex) this.currentTexture = tex
    }

    clearClip(): void {
        this.currentTexture = null
    }

    /// Returns (and caches) a sub-region texture sharing this surface's source.
    getSubTexture(x: number, y: number, w: number, h: number): PIXI.Texture | null {
        if (!this.texture || w <= 0 || h <= 0) return null
        const key = `${x},${y},${w},${h}`
        let cached = this.subTextureCache.get(key)
        if (!cached) {
            cached = new PIXI.Texture({
                source: this.texture.source,
                frame:  new PIXI.Rectangle(x, y, w, h),
            })
            this.subTextureCache.set(key, cached)
        }
        return cached
    }

    /// Returns the texture to draw (clip if active, otherwise full texture).
    get activeTex(): PIXI.Texture | null {
        return this.currentTexture ?? this.texture
    }
}
