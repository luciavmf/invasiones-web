// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { MapObject } from './MapObject'
import { Res } from '../resources/Res'
import type { Tileset } from '../map/Tileset'
import type { Video }   from '../rendering/Video'

/// A static obstacle on the map (tree, building, rock, etc.).
export class Obstacle extends MapObject {

    private index:      number
    private isBuilding: boolean

    constructor(index: number, i: number, j: number, tileset: Tileset) {
        super()
        this.index      = index
        this.isBuilding = false

        this.frameHeight = tileset.tileHeight
        this.frameWidth  = tileset.tileWidth

        this.physicalTilePos = { x: i, y: j }
        this.image = tileset.image

        const p = this.tileToWorld(i, j)
        this.worldPos = p

        if (tileset.id === Res.TLS_EDIFICIOS ||
            tileset.id === Res.TLS_ENFERMERIA ||
            tileset.id === Res.TLS_FUERTE) {
            this.isBuilding = true
        }

        if (tileset.id === Res.TLS_DEBUG) {
            this.image = null
        }

        this.updateScreenPos()
    }

    override update(): boolean {
        this.updateScreenPos()
        return false
    }

    override draw(video: Video): void {
        if (!this.image || !MapObject.map) return
        const map = MapObject.map
        const srcX = this.index * this.frameWidth
        const srcW = this.frameWidth, srcH = this.frameHeight
        if (this.isBuilding) {
            video.draw(this.image, srcX, 0, srcW, srcH,
                this.x,
                this.y - this.frameHeight + map.tileHeight / 2)
        } else {
            video.draw(this.image, srcX, 0, srcW, srcH,
                this.x - this.frameWidth  / 2 + map.tileWidth  / 2,
                this.y - this.frameHeight     + map.tileHeight  / 2)
        }
    }
}
