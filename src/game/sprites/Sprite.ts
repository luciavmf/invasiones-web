// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Animation } from './Animation'
import type { Video } from '../rendering/Video'

/// Container of animations for a game sprite.
/// Manages an indexed array of Animation and delegates to the active one.
export class Sprite {

    animations: (Animation | null)[] = []
    private currentAnim:   Animation | null = null
    private currentAnimId  = -1

    constructor() {}

    get loop():           boolean { return this.currentAnim?.loop         ?? false }
    set loop(v: boolean)          { if (this.currentAnim) this.currentAnim.loop = v }
    get frameWidth():     number  { return this.currentAnim?.frameWidth   ?? 0 }
    get frameHeight():    number  { return this.currentAnim?.frameHeight  ?? 0 }
    get frameCount():     number  { return this.currentAnim?.frameCount   ?? 0 }
    get currentFrame():   number  { return this.currentAnim?.currentFrame ?? 0 }
    get currentAnimation(): number { return this.currentAnim?.currentAnimation ?? 0 }
    get offsets(): { x: number; y: number } { return this.currentAnim?.offsets ?? { x: 0, y: 0 } }

    reserveSlots(count: number): void {
        this.animations = new Array(count).fill(null)
    }

    addAnimation(i: number, anim: Animation): boolean {
        if (i >= this.animations.length) return false
        this.animations[i] = anim
        return true
    }

    load(): void {
        for (const anim of this.animations) {
            if (anim) anim.init()
        }
        this.currentAnim = this.animations.find(a => a !== null) ?? null
    }

    setAnimation(anim: number): boolean {
        if (anim === this.currentAnimId) return false
        this.currentAnimId = anim

        let offset = 0, prevCount = 0
        for (const animObj of this.animations) {
            if (!animObj) continue
            if (anim >= prevCount && anim - prevCount < animObj.animationCount) {
                this.currentAnim = animObj
                offset = prevCount
            }
            prevCount += animObj.animationCount
        }

        this.currentAnim?.setAnimation(anim - offset)
        return true
    }

    update():  void { this.currentAnim?.update() }
    play():    void { this.currentAnim?.play()   }
    stop():    void { this.currentAnim?.stop()   }
    setFrame(p: number): void { this.currentAnim?.setFrame(p) }
    isAnimationDone(): boolean { return this.currentAnim?.isAnimationDone() ?? false }

    draw(video: Video, x: number, y: number): void {
        if (!this.currentAnim?.image) return
        video.draw(this.currentAnim.image, x, y, 0)
    }

    /// Returns a deep copy of this Sprite (clones all contained animations).
    clone(): Sprite {
        const s = new Sprite()
        s.animations = this.animations.map(a => a ? a.clone() : null)
        return s
    }
}
