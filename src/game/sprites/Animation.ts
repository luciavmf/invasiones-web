// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import * as PIXI from 'pixi.js'
import { Surface } from '../rendering/Surface'
import { Video } from '../rendering/Video'
import type { Video as VideoType } from '../rendering/Video'

/// Animation frame controller over a sprite sheet.
/// Frames are arranged in columns (X axis), animation rows on the Y axis.
export class Animation {

    currentAnimation: number
    frameWidth:  number
    frameHeight: number
    frameCount   = 0
    animationCount = 0
    loop         = true
    image:       Surface | null = null
    isPlaying    = false
    animDone     = false
    offsets:     { x: number; y: number }

    private ticks:        number
    private currentTicks  = 0
    private _currentFrame = 0

    get currentFrame(): number { return this._currentFrame }

    constructor(
        currentAnimation: number,
        _imagePath: string,
        ticks: number,
        frameWidth: number,
        frameHeight: number,
        offsetX = 0,
        offsetY = 0,
    ) {
        this.currentAnimation = currentAnimation
        this.ticks       = ticks
        this.frameWidth  = frameWidth
        this.frameHeight = frameHeight
        this.offsets     = { x: offsetX, y: offsetY }
    }

    /// Call after setting this.image to compute frame/animation counts and set initial clip.
    init(): void {
        if (!this.image) return
        const w = this.image.width
        const h = this.image.height
        if (this.frameWidth  === 0) this.frameWidth  = w
        if (this.frameHeight === 0) this.frameHeight = h
        this.frameCount     = this.frameWidth  > 0 ? Math.floor(w / this.frameWidth)  : 1
        this.animationCount = this.frameHeight > 0 ? Math.floor(h / this.frameHeight) : 1
        this.image.setClip(0, this.currentAnimation * this.frameHeight, this.frameWidth, this.frameHeight)
    }

    play():  void { this.isPlaying = true  }
    stop():  void { this.isPlaying = false }

    isAnimationDone(): boolean { return this.animDone }

    setFrame(p: number): void {
        if (p < 0 || p >= this.frameCount) return
        this._currentFrame = p
        this.image?.setClip(
            this._currentFrame * this.frameWidth,
            this.currentAnimation * this.frameHeight,
            this.frameWidth, this.frameHeight,
        )
    }

    setAnimation(anim: number): boolean {
        if (anim === this.currentAnimation) return false
        if (this.animationCount <= 0 || anim < 0 || anim >= this.animationCount) return false
        this.currentAnimation = anim
        this._currentFrame = 0
        this.image?.setClip(0, anim * this.frameHeight, this.frameWidth, this.frameHeight)
        this.animDone = false
        return true
    }

    update(): void {
        if (!this.isPlaying) return

        this.currentTicks++
        if (this.currentTicks >= this.ticks) {
            if (this._currentFrame >= this.frameCount) {
                if (this.loop) {
                    this._currentFrame = 0
                } else {
                    this.isPlaying = false
                    this.animDone  = true
                }
            }
            this.image?.setClip(
                this._currentFrame * this.frameWidth,
                this.currentAnimation * this.frameHeight,
                this.frameWidth, this.frameHeight,
            )
            this._currentFrame++
            this.currentTicks = 0
        }
    }

    draw(video: VideoType, x: number, y: number, anchor: number): void {
        let px = x, py = y
        if (anchor & Surface.centerVertical)   py += Video.height / 2 - this.frameHeight / 2
        if (anchor & Surface.centerHorizontal) px += Video.width  / 2 - this.frameWidth  / 2
        video.draw(this.image, px, py, 0)
    }

    /// Returns a deep copy of this animation with an independent Surface instance
    /// (shares the underlying PIXI texture source but has its own clip state).
    clone(): Animation {
        const c = new Animation(
            -1,    // set to -1 so the first setAnimation() call will actually apply the clip
            '',
            this.ticks,
            this.frameWidth,
            this.frameHeight,
            this.offsets.x,
            this.offsets.y,
        )
        // Create a new Surface so each clone has independent clip/currentTexture state.
        // They still share the same GPU texture data via the texture.source reference.
        if (this.image?.texture) {
            c.image = new Surface(new PIXI.Texture({ source: this.image.texture.source }))
        }
        c.frameCount     = this.frameCount
        c.animationCount = this.animationCount
        c.loop           = this.loop
        c.setAnimation(this.currentAnimation)
        return c
    }
}
