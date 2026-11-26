// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import type { Surface } from '../rendering/Surface'
import type { Battlefield } from './Battlefield'
import type { Video }   from '../rendering/Video'

/// Base class for all drawable map objects (obstacles, units, animations).
export class MapObject {

    /// The map and camera the object is placed on.
    readonly battlefield: Battlefield | null

    image:         Surface | null = null
    worldPos:      { x: number; y: number } = { x: 0, y: 0 }
    physicalTilePos: { x: number; y: number } = { x: 0, y: 0 }
    previousTile:  { x: number; y: number } = { x: 0, y: 0 }
    frameWidth  = 0
    frameHeight = 0
    x = 0
    y = 0

    /// Creates an object placed on `battlefield`, showing `sup` at tile (i, j) when given.
    constructor(battlefield: Battlefield | null, sup?: Surface | null, i?: number, j?: number) {
        this.battlefield = battlefield
        if (sup !== undefined) {
            this.image = sup ?? null
            if (sup) { this.frameHeight = sup.height; this.frameWidth = sup.width }
            const ti = i ?? 0, tj = j ?? 0
            this.physicalTilePos = { x: ti, y: tj }
            const p = this.tileToWorld(ti, tj)
            this.worldPos = p
        }
    }

    update(): boolean {
        this.updateScreenPos()
        return false
    }

    updateScreenPos(): void {
        const cam = this.battlefield?.camera
        if (!cam) return
        this.x = cam.startX + this.worldPos.x + cam.x
        this.y = cam.startY + this.worldPos.y + cam.y
    }

    draw(video: Video): void {
        const map = this.battlefield?.map
        if (!this.image || !map) return
        video.draw(
            this.image,
            this.x - this.frameWidth  / 2 + map.tileWidth  / 2,
            this.y - this.frameHeight + map.tileHeight / 4,
            0,
        )
    }

    tileToWorld(i: number, j: number): { x: number; y: number } {
        const map = this.battlefield?.map
        if (!map) return { x: 0, y: 0 }
        const x = ((i - j) * map.tileWidth  / 2) >> 1
        const y = ((i + j) * map.tileHeight / 2) >> 1
        return { x, y }
    }

    setTilePosition(i: number, j: number): void {
        this.physicalTilePos = { x: i, y: j }
        this.worldPos = this.tileToWorld(i, j)
        this.updateScreenPos()
    }

    initializeXY(): void {
        this.worldPos = this.tileToWorld(this.physicalTilePos.x, this.physicalTilePos.y)
        this.updateScreenPos()
    }
}
