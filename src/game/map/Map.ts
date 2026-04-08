// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Camera }     from './Camera'
import { Tileset }    from './Tileset'
import { Res }        from '../resources/Res'
import { PathFinder } from '../pathfinding/PathFinder'
import { Mouse }      from '../input/Mouse'
import { ResourceManager } from '../resources/ResourceManager'

const MAX_LAYERS = 8
const INFO_LAYER = 8

/// Isometric TMX map. Loads tilesets and layers asynchronously via fetch + DOMParser.
export class Map {

    static readonly Constants = {
        maxLayersCount: MAX_LAYERS,
        infoLayer:      INFO_LAYER,
        visibleTile:    1,
    }

    private mapData:    number[][][] = []   // [layer][col][row]
    private layerNames: Record<string, number> = {}
    private mapLoaded = false
    private maxLayers = 0

    height = 0
    width  = 0
    private physicalHeight = 0
    private physicalWidth  = 0

    tileWidth  = 0
    tileHeight = 0
    physicalTileWidth  = 0
    physicalTileHeight = 0

    tilesets: (Tileset | null)[] = new Array(Res.TLS_COUNT).fill(null)
    private tilesetCount = 0

    tileUnderMouse:      { x: number; y: number } = { x: 0, y: 0 }
    smallTileUnderMouse: { x: number; y: number } = { x: 0, y: 0 }

    physicalTilesLayer: number[][] = []
    visibleTilesLayer:  number[][] = []

    private readonly camera: Camera

    get physicalMapHeight(): number { return this.physicalHeight }
    get physicalMapWidth():  number { return this.physicalWidth  }

    get unitsLayer():       number[][] { return this.mapData[this.layerIdx.playerUnits]         ?? [] }
    get obstaclesLayer():   number[][] { return this.mapData[this.layerIdx.obstacles]           ?? [] }
    get buildingsLayer():   number[][] { return this.mapData[this.layerIdx.invalidatedPositions] ?? [] }
    get terrainLayer():     number[][] { return this.mapData[this.layerIdx.terrain]             ?? [] }
    get layers() { return this.layerIdx }

    private layerIdx = { terrain: 0, obstacles: 0, playerUnits: 0, invalidatedPositions: 0 }

    constructor(camera: Camera) {
        this.camera = camera
    }

    async load(resJson: any, mapId: number): Promise<void> {
        const mapIdx = mapId - Res.TLS_COUNT  // local index within the mapas array
        const mapUrl = `${import.meta.env.BASE_URL}data/${resJson.escenarios.mapas[mapIdx]}`
        if (!mapUrl) throw new Error(`Map: no path for map id ${mapId}`)

        this.tilesetCount = 0
        this.maxLayers    = 0
        this.mapData      = []
        this.layerNames   = {}

        await this.readMapInfo(mapUrl, resJson)
        await this.readTilesets(mapUrl, resJson)
        await this.readLayers(mapUrl)
        this.loadLayerInfo()

        this.mapLoaded = true
    }

    drawLayer(video: any, layer: number): boolean {
        if (layer < 0 || layer >= this.maxLayers || !this.mapLoaded) return false

        const oldClip = video.getClip()
        video.setClip(this.camera.startX, this.camera.startY, this.camera.width, this.camera.height)

        let toggle = true
        const p = this.calcFirstTile(this.camera.x, this.camera.y)
        let startCol = p.x, startRow = p.y

        let startPosX = this.camera.startX + (((startCol - startRow) * this.tileWidth)  >> 1) + this.camera.x
        let startPosY = this.camera.startY + (((startCol + startRow) * this.tileHeight) >> 1) + this.camera.y

        while (startPosY <= this.camera.height + this.camera.startY) {
            let tileX = 0
            let i = startCol, j = startRow
            while ((tileX * this.tileWidth + startPosX) <= this.camera.startX + this.camera.width && j >= 0) {
                if (i < this.height && i >= 0 && j < this.width && j >= 0) {
                    const tileId = this.mapData[layer]?.[i]?.[j] ?? 0
                    if (tileId !== 0) {
                        const ts = this.getTileset(tileId)
                        if (ts) {
                            const localId = tileId - ts.firstGid
                            const r = ts.getTileRect(localId)
                            video.draw(ts.image, r.x, r.y, r.w, r.h, tileX * this.tileWidth + startPosX, startPosY)
                        }
                    }
                }
                tileX++; i++; j--
            }

            startPosY += this.tileHeight >> 1
            if (toggle) { startCol++; startPosX += this.tileWidth >> 1; toggle = false }
            else        { startRow++; startPosX -= this.tileWidth >> 1; toggle = true  }
        }

        video.setClip(oldClip.x, oldClip.y, oldClip.w, oldClip.h)
        return true
    }

    drawSmallTile(video: any, i: number, j: number, semiTransparent: boolean): void {
        if (i < 0 || j < 0 || i >= this.physicalHeight || j >= this.physicalWidth) return
        const posX = this.camera.startX + (((i - j) * this.tileWidth  / 2) >> 1) + this.camera.x + this.tileWidth  / 4
        const posY = this.camera.startY + (((i + j) * this.tileHeight / 2) >> 1) + this.camera.y
        if (semiTransparent) {
            const grey = ResourceManager.shared.getImageSync(Res.IMG_TILE_GRIS)
            video.draw(grey, posX, posY, 128, 0)
        }
    }

    update(): void {
        if (!this.mapLoaded) return
        const mx = Math.trunc(Mouse.shared.x)
        const my = Math.trunc(Mouse.shared.y)
        const cam = this.camera

        if (mx < cam.border && cam.x + cam.speed <= (this.width * this.tileWidth) / 2) {
            const p = this.calcFirstTile(cam.x, cam.y)
            if (p.x < -13) cam.y -= cam.speed / 2
            else {
                const p2 = this.calcFirstTile(cam.x, cam.y - cam.height)
                if (p2.y > this.height + 13) cam.y += cam.speed / 2
            }
            cam.x += cam.speed
        }

        if (my > cam.height - cam.border &&
            cam.y - cam.speed >= cam.height - this.height * this.tileHeight &&
            cam.y - cam.speed <= 0) {
            const p = this.calcFirstTile(cam.x, cam.y - cam.height)
            if (p.y > this.height + 13) { cam.y -= cam.speed / 2; cam.x -= cam.speed }
            else {
                const p2 = this.calcFirstTile(cam.x - cam.width, cam.y - cam.height)
                if (p2.x > this.width + 13) { cam.y -= cam.speed / 2; cam.x += cam.speed }
                else cam.y -= cam.speed
            }
        }

        if (my < cam.border && cam.y + cam.speed <= 0) {
            const p = this.calcFirstTile(cam.x, cam.y)
            if (p.x < -13) { cam.x -= cam.speed; cam.y += cam.speed / 2 }
            else {
                const p2 = this.calcFirstTile(cam.x - cam.width, cam.y)
                if (p2.y < -13) { cam.x += cam.speed; cam.y += cam.speed / 2 }
                else cam.y += cam.speed
            }
        }

        if (mx > cam.width - cam.border) {
            const p = this.calcFirstTile(cam.x - cam.width, cam.y)
            if ((cam.x - cam.width - cam.speed + this.tileWidth) >= -(this.width * this.tileWidth) / 2 ||
                (cam.x - cam.speed) > 0) {
                if (p.y < -13) cam.y -= cam.speed / 2
                else {
                    const p2 = this.calcFirstTile(cam.x - cam.width, cam.y - cam.height)
                    if (p2.x > this.height + 13) cam.y += cam.speed / 2
                }
                cam.x -= cam.speed
            }
        }

        this.updateMouseCoords()
    }

    getTileset(tileId: number): Tileset | null {
        let result: Tileset | null = null
        for (let i = 0; i < this.tilesetCount; i++) {
            const ts = this.tilesets[i]
            if (ts && tileId >= ts.firstGid) result = ts
        }
        return result
    }

    isWalkable(x: number, y: number): boolean {
        if (x < 0 || y < 0 || x >= this.width * 2 || y >= this.height * 2) return false
        if (x >= this.physicalTilesLayer.length) return false
        if (y >= this.physicalTilesLayer[x].length) return false
        const id = this.physicalTilesLayer[x][y]
        return id === Res.TLS_PASTO || id === Res.TLS_TIERRA
    }

    getLineOfSightPosition(x1: number, x2: number, y1: number, y2: number): { x: number; y: number } {
        let col = x1, row = y1
        const rs = this.getRowSlope(x1, x2, y1, y2)
        const cs = this.getColSlope(x1, x2, y1, y2)
        if (Math.abs(rs) === 1) {
            while (Math.trunc(row) !== y2) {
                if (this.isWalkable(Math.trunc(col), Math.trunc(row))) return { x: Math.trunc(col), y: Math.trunc(row) }
                row += rs; col += cs
            }
        } else {
            while (Math.trunc(col) !== x2) {
                if (this.isWalkable(Math.trunc(col), Math.trunc(row))) return { x: Math.trunc(col), y: Math.trunc(row) }
                row += rs; col += cs
            }
        }
        return { x: -1, y: -1 }
    }

    invalidateTile(x: number, y: number): void {
        if (x < 0 || y < 0 || x + 1 >= this.width * 2 || y + 1 >= this.height * 2) return
        const v = Res.TLS_ARBOLES
        this.physicalTilesLayer[x][y]         = v
        this.physicalTilesLayer[x + 1][y]     = v
        this.physicalTilesLayer[x + 1][y + 1] = v
        this.physicalTilesLayer[x][y + 1]     = v
    }

    // MARK: - Private

    private calcFirstTile(x: number, y: number): { x: number; y: number } {
        const a = this.tileHeight > 0 ? -y / this.tileHeight : 0
        let   b = this.tileWidth  > 0 ?  x / this.tileWidth  : 0
        if (x > 0) b += 1
        return { x: Math.trunc(a - b) - 2, y: Math.trunc(a + b) - 1 }
    }

    private updateMouseCoords(): void {
        if (!this.mapLoaded) return
        const p = this.tileFromXY(Math.trunc(Mouse.shared.x), Math.trunc(Mouse.shared.y))
        this.tileUnderMouse = p
    }

    private tileFromXY(x: number, y: number): { x: number; y: number } {
        const cam = this.camera
        if (this.tileHeight === 0 || this.tileWidth === 0) return { x: 0, y: 0 }
        const a = Math.trunc((y - cam.y - cam.startY) / this.tileHeight)
        const b = x - cam.x > 0
            ? Math.trunc((x - cam.x - cam.startX) / this.tileWidth)
            : Math.trunc((x - cam.x - cam.startX - this.tileWidth) / this.tileWidth)
        const aF = Math.trunc((y - cam.y - cam.startY) / this.physicalTileHeight)
        const bF = x - cam.x > 0
            ? Math.trunc((x - cam.x - cam.startX) / this.physicalTileWidth)
            : Math.trunc((x - cam.x - cam.startX - this.physicalTileWidth) / this.physicalTileWidth)
        this.smallTileUnderMouse = { x: aF + bF, y: aF - bF }
        return { x: a + b, y: a - b }
    }

    private getRowSlope(x1: number, x2: number, y1: number, y2: number): number {
        if (Math.abs(y2 - y1) > Math.abs(x2 - x1)) return y2 > y1 ? 1 : -1
        const d = Math.abs(y2 - y1) / Math.abs(x2 - x1)
        return d * (y2 > y1 ? 1 : -1)
    }

    private getColSlope(x1: number, x2: number, y1: number, y2: number): number {
        if (Math.abs(x2 - x1) > Math.abs(y2 - y1)) return x2 > x1 ? 1 : -1
        const d = Math.abs(x2 - x1) / Math.abs(y2 - y1)
        return d * (x2 > x1 ? 1 : -1)
    }

    // MARK: - TMX loading (async)

    private async readMapInfo(mapUrl: string, _resJson: any): Promise<void> {
        const resp = await fetch(mapUrl)
        if (!resp.ok) throw new Error(`Map: cannot load ${mapUrl}`)
        const text = await resp.text()
        const doc  = new DOMParser().parseFromString(text, 'application/xml')

        const mapEl = doc.querySelector('map')
        if (!mapEl || mapEl.getAttribute('orientation') !== 'isometric') {
            throw new Error('Map: not an isometric map')
        }

        this.width  = parseInt(mapEl.getAttribute('width')     ?? '0', 10)
        this.height = parseInt(mapEl.getAttribute('height')    ?? '0', 10)
        this.tileWidth  = parseInt(mapEl.getAttribute('tilewidth')  ?? '0', 10)
        this.tileHeight = parseInt(mapEl.getAttribute('tileheight') ?? '0', 10)
        this.physicalWidth  = this.width  * 2
        this.physicalHeight = this.height * 2
        this.physicalTileWidth  = this.tileWidth  / 2
        this.physicalTileHeight = this.tileHeight / 2

        let tileI = 0, tileJ = 0
        for (const prop of Array.from(doc.querySelectorAll('properties > property'))) {
            const name = prop.getAttribute('name') ?? ''
            const val  = parseInt(prop.getAttribute('value') ?? '0', 10)
            if (name === 'CamaraTileInicialI') tileI = val
            if (name === 'CamaraTileInicialJ') tileJ = val
        }

        this.camera.x = ((tileJ - tileI) * this.tileWidth)  >> 1
        this.camera.y = -((tileJ + tileI) * this.tileHeight) >> 1
    }

    private async readTilesets(mapUrl: string, _resJson: any): Promise<void> {
        const base = mapUrl.substring(0, mapUrl.lastIndexOf('/') + 1)
        const resp = await fetch(mapUrl)
        if (!resp.ok) return
        const text = await resp.text()
        const doc  = new DOMParser().parseFromString(text, 'application/xml')

        for (const el of Array.from(doc.querySelectorAll('tileset'))) {
            const src = el.getAttribute('source')
            if (!src) continue
            const gid = parseInt(el.getAttribute('firstgid') ?? '0', 10)
            // Resolve URL: prefer base-relative, fall back to /data/escenarios/
            let tsUrl = base + src
            const ts = new Tileset()
            ts.firstGid = gid
            try {
                await ts.load(tsUrl)
            } catch {
                tsUrl = `${import.meta.env.BASE_URL}data/escenarios/${src.split('/').pop()}`
                try { await ts.load(tsUrl) } catch { continue }
            }
            this.addTileset(ts)
        }
    }

    private async readLayers(mapUrl: string): Promise<void> {
        const resp = await fetch(mapUrl)
        if (!resp.ok) return
        const text = await resp.text()
        const doc  = new DOMParser().parseFromString(text, 'application/xml')

        for (const layerEl of Array.from(doc.querySelectorAll('layer'))) {
            const name = layerEl.getAttribute('name') ?? ''
            const dataEl = layerEl.querySelector('data')
            if (!dataEl || dataEl.getAttribute('encoding') !== 'base64') continue

            const raw     = dataEl.textContent?.trim() ?? ''
            const decoded = this.decodeBase64(raw)
            if (!decoded) continue

            const tiles: number[][] = Array.from({ length: this.width }, () => new Array(this.height).fill(0))
            let idx = 0
            for (let j = 0; j < this.height; j++) {
                for (let i = 0; i < this.width; i++) {
                    if (idx + 3 < decoded.length) {
                        const id = decoded[idx] | (decoded[idx+1] << 8) | (decoded[idx+2] << 16) | (decoded[idx+3] << 24)
                        tiles[i][j] = id & 0x1FFF
                    }
                    idx += 4
                }
            }

            const layerIndex = this.maxLayers
            this.addLayerName(name, layerIndex)
            this.addLayer(tiles)
        }
    }

    private decodeBase64(b64: string): Uint8Array | null {
        try {
            const bin = atob(b64)
            const arr = new Uint8Array(bin.length)
            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
            return arr
        } catch { return null }
    }

    private loadLayerInfo(): void {
        // Extend mapData to include info layer
        while (this.mapData.length <= INFO_LAYER) {
            this.mapData.push(Array.from({ length: this.width }, () => new Array(this.height).fill(0)))
        }

        this.physicalTilesLayer = Array.from({ length: this.width * 2 }, () => new Array(this.height * 2).fill(0))
        this.visibleTilesLayer  = Array.from({ length: this.width * 2 }, () => new Array(this.height * 2).fill(0))

        for (let layer = 0; layer < this.maxLayers; layer++) {
            for (let i = 0; i < this.width; i++) {
                for (let j = 0; j < this.height; j++) {
                    const tileId = this.mapData[layer]?.[i]?.[j] ?? 0
                    const ts = this.getTileset(tileId)
                    if (!ts || ts.id === Res.TLS_UNIDADES) continue
                    const tsId = ts.id
                    this.mapData[INFO_LAYER][i][j] = tsId
                    const ci = i * 2, cj = j * 2
                    if (ci + 1 < this.physicalTilesLayer.length && cj + 1 < this.physicalTilesLayer[ci].length) {
                        this.physicalTilesLayer[ci][cj]         = tsId
                        this.physicalTilesLayer[ci][cj + 1]     = tsId
                        this.physicalTilesLayer[ci + 1][cj]     = tsId
                        this.physicalTilesLayer[ci + 1][cj + 1] = tsId
                    }
                }
            }
        }

        PathFinder.shared.loadMap(this)
    }

    private addLayerName(name: string, index: number): void {
        this.layerNames[name] = index
        switch (name.trim().toLowerCase()) {
            case 'obstaculos':          this.layerIdx.obstacles = index;             break
            case 'terreno':             this.layerIdx.terrain   = index;             break
            case 'unidades':            this.layerIdx.playerUnits = index;           break
            case 'posicion invalidada': this.layerIdx.invalidatedPositions = index;  break
        }
    }

    private addLayer(layerData: number[][]): void {
        if (this.maxLayers >= MAX_LAYERS) return
        while (this.mapData.length <= this.maxLayers) {
            this.mapData.push(Array.from({ length: this.width }, () => new Array(this.height).fill(0)))
        }
        this.mapData[this.maxLayers] = layerData
        this.maxLayers++
    }

    private addTileset(ts: Tileset): void {
        if (this.tilesetCount >= this.tilesets.length) return
        this.tilesets[this.tilesetCount] = ts
        this.tilesetCount++
    }
}
