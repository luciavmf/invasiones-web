// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { MapObject } from './MapObject'
import type { Tileset } from '../map/Tileset'
import type { Video }   from '../rendering/Video'
import { TilesetID } from '../map/TilesetID'
import type { Battlefield } from './Battlefield'

/// A static obstacle on the map (tree, building, rock, etc.).
export class Obstacle extends MapObject {

    private index:      number
    private isBuilding: boolean

    constructor(index: number, i: number, j: number, tileset: Tileset, battlefield: Battlefield) {
        super(battlefield)
        this.index      = index
        this.isBuilding = false

        this.frameHeight = tileset.tileHeight
        this.frameWidth  = tileset.tileWidth

        this.physicalTilePos = { x: i, y: j }
        this.image = tileset.image

        const p = this.tileToWorld(i, j)
        this.worldPos = p

        if (tileset.id === TilesetID.buildings ||
            tileset.id === TilesetID.infirmary ||
            tileset.id === TilesetID.fort) {
            this.isBuilding = true
        }

        if (tileset.id === TilesetID.debug) {
            this.image = null
        }

        this.updateScreenPos()
    }

    override update(): boolean {
        this.updateScreenPos()
        return false
    }

    override draw(video: Video): void {
        const map = this.battlefield?.map
        if (!this.image || !map) return
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
