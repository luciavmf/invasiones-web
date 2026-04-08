// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { MapObject } from './MapObject'
import { Animation } from '../sprites/Animation'
import type { Video } from '../rendering/Video'

/// Animated object positioned on a map tile (fire effects, rings, etc.).
export class AnimObject extends MapObject {

    readonly animation: Animation

    constructor(anim: Animation, i: number, j: number) {
        super()
        this.animation = anim

        this.physicalTilePos = { x: i, y: j }
        const p = this.tileToWorld(i, j)
        this.worldPos = p

        // init() may have already been called (cloned from preloaded animation)
        if (anim.frameCount === 0) anim.init()
        anim.setAnimation(0)
        this.updateScreenPos()

        this.worldPos.x -= anim.offsets.x
        this.worldPos.y -= anim.offsets.y

        anim.play()
        anim.loop = true
    }

    override update(): boolean {
        super.update()
        this.animation.update()
        return false
    }

    override draw(video: Video): void {
        if (!MapObject.map) return
        if (this.worldPos.x === -1 || this.worldPos.y === -1) return
        const map = MapObject.map
        this.animation.draw(video, this.x + map.tileWidth / 2, this.y + map.tileHeight / 2, 0)
    }

    setAnimation(anim: number): void { this.animation.setAnimation(anim) }

    setPosition(i: number, j: number): void {
        this.physicalTilePos = { x: i, y: j }
        const p = this.tileToWorld(i, j)
        this.worldPos = p
        this.worldPos.x -= this.animation.offsets.x
        this.worldPos.y -= this.animation.offsets.y
        this.updateScreenPos()
    }
}
