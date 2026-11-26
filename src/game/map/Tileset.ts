// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Tile } from './Tile'
import type { Surface } from '../rendering/Surface'
import { ResourceManager } from '../resources/ResourceManager'
import { TilesetID, tilesetIDFromTsxName, tileKindFromProperty } from './TilesetID'

/// Loads and queries a TSX tileset (Tiled format).
export class Tileset {

    firstGid   = 0
    id: TilesetID = TilesetID.debug
    tileWidth  = 0
    tileHeight = 0
    name       = ''
    image: Surface | null = null
    tiles: (Tile | null)[] = []

    private setName(n: string): void {
        this.name = n
        this.id = tilesetIDFromTsxName(n)
    }

    private initTiles(): void {
        if (!this.image || this.tileWidth <= 0 || this.tileHeight <= 0) return
        const count = Math.floor(this.image.height / this.tileHeight) *
                      Math.floor(this.image.width  / this.tileWidth)
        this.tiles = new Array(count).fill(null)
    }

    /// Loads the tileset from the given TSX URL (async, uses fetch + DOMParser).
    async load(url: string): Promise<void> {
        const base = url.substring(0, url.lastIndexOf('/') + 1)
        const resp = await fetch(url)
        if (!resp.ok) throw new Error(`Tileset: failed to load ${url}`)
        const text = await resp.text()
        const doc  = new DOMParser().parseFromString(text, 'application/xml')

        const tsEl = doc.querySelector('tileset')
        if (tsEl) {
            const n = tsEl.getAttribute('name') ?? ''
            this.setName(n)
            this.tileWidth  = parseInt(tsEl.getAttribute('tilewidth')  ?? '0', 10)
            this.tileHeight = parseInt(tsEl.getAttribute('tileheight') ?? '0', 10)
        }

        const imgEl = doc.querySelector('image')
        if (imgEl) {
            const src = imgEl.getAttribute('source') ?? ''
            const imgUrl = base + src
            this.image = await ResourceManager.shared.getImageByPath(imgUrl.replace(import.meta.env.BASE_URL + 'data/', ''))
            this.initTiles()
        }

        for (const tileEl of Array.from(doc.querySelectorAll('tile'))) {
            const idStr = tileEl.getAttribute('id')
            if (!idStr) continue
            const idx = parseInt(idStr, 10)
            if (idx < 0 || idx >= this.tiles.length) continue
            const tile = new Tile()
            this.tiles[idx] = tile

            for (const prop of Array.from(tileEl.querySelectorAll('property'))) {
                const propName  = (prop.getAttribute('name')  ?? '').toLowerCase()
                const propValue =  prop.getAttribute('value') ?? ''
                if (propName === 'id' || propName === 'unidad') {
                    tile.kind = tileKindFromProperty(propValue)
                } else if (propName === 'cantidad') {
                    tile.count = parseInt(propValue, 10) || 0
                }
            }
        }
    }

    /// Returns the (x, y, w, h) source rect within the tileset image for a given local tile id.
    getTileRect(tileId: number): { x: number; y: number; w: number; h: number } {
        if (!this.image || this.tileWidth <= 0 || this.tileHeight <= 0) return { x: 0, y: 0, w: 0, h: 0 }
        const cols = Math.floor(this.image.width / this.tileWidth)
        const col  = cols > 0 ? tileId % cols : 0
        const row  = cols > 0 ? Math.floor(tileId / cols) : 0
        return { x: col * this.tileWidth, y: row * this.tileHeight, w: this.tileWidth, h: this.tileHeight }
    }
}
