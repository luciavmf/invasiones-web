// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Player }     from './Player'
import { Group }      from './Group'
import { Unit }       from './Unit'
import { AnimObject } from '../level/AnimObject'
import { MapObject }  from '../level/MapObject'
import { Animation }  from '../sprites/Animation'
import { ResourceManager } from '../resources/ResourceManager'
import { Mouse }      from '../input/Mouse'
import { Res }        from '../resources/Res'
import { Video }      from '../rendering/Video'
import { CommandKind } from '../level/Command'
import type { Map }    from '../map/Map'
import type { Camera } from '../map/Camera'
import type { ObjectTable } from '../level/ObjectTable'
import type { Hud }    from '../level/Hud'
import type { Video as VideoType } from '../rendering/Video'

/// The player-controlled Argentine faction.
export class ArgentineTeam extends Player {

    private unitUnderMouse: Unit | null = null
    private count_         = 99999
    private arrowObj: MapObject | null  = null
    private orientationArrow: Animation | null = null
    private commandTargetPos = { x: 0, y: 0 }
    private arrowPos         = { x: 0, y: 0 }
    private unitToFindIdx    = 0
    private readonly arrowMaxCount = 100

    constructor(map: Map, camera: Camera, objectsToDraw: ObjectTable, hud: Hud) {
        super(map, camera, objectsToDraw, hud)
        this.faction = 'argentine'
        Group.map    = map

        const anims = ResourceManager.shared.animations
        if (Res.ANIM_AROS < anims.length && anims[Res.ANIM_AROS]) {
            this.ring = new AnimObject(anims[Res.ANIM_AROS]!.clone(), 0, 0)
        }
        if (Res.ANIM_FLECHA_GUIA < anims.length && anims[Res.ANIM_FLECHA_GUIA]) {
            const anim = anims[Res.ANIM_FLECHA_GUIA]!.clone()
            anim.init()
            this.orientationArrow = anim
        }
    }

    override update(): void {
        switch (this.stateValue) {
            case 'start':   this.stateValue = 'loading'; break
            case 'loading': this.stateValue = 'game';    break
            case 'game':    this.updateGameplayState();  break
        }
    }

    override async loadUnits(_levelIndex: number): Promise<void> {
        this.arrowObj = new MapObject(
            ResourceManager.shared.getImageSync(Res.IMG_FLECHA), 0, 0)
        this.count_ = 99999

        const unitsTileset = this.map.tilesets
            .filter(ts => ts !== null)
            .find(ts => ts!.id === Res.TLS_UNIDADES)
        if (!unitsTileset) return

        this.units = []
        for (let i = 0; i < this.map.width; i++) {
            for (let j = 0; j < this.map.height; j++) {
                const tileId = this.map.unitsLayer[i]?.[j] ?? 0
                if (!tileId) continue
                const localId = tileId - unitsTileset.firstGid
                const tile    = unitsTileset.tiles[localId]
                if (!tile || tile.id !== Res.TILE_UNIDADES_ID_PATRICIO) continue

                const list = this.placeUnits(Res.UNIDAD_PATRICIO, tile.count, i << 1, j << 1)
                if (list.length > 1) {
                    if (!this.groups) this.groups = []
                    this.groups.push(new Group(list))
                }
            }
        }
    }

    drawOrientationArrow(video: VideoType): void {
        if (this.stateValue !== 'game') return
        this.ring?.draw(video)
        this.objectToTake?.draw(video)
        this.fireEffects?.forEach(f => f.draw(video))

        if (this.count_ < this.arrowMaxCount) this.arrowObj?.draw(video)

        if (!this.command || !this.orientationArrow) return
        if (this.isObjectiveVisible()) return
        this.orientationArrow.draw(video, this.arrowPos.x, this.arrowPos.y, 0)
    }

    getPaintCoordinates(): { x: number; y: number; w: number; h: number } {
        const cam = MapObject.camera
        if (!cam) return { x: 0, y: 0, w: this.map.physicalMapHeight, h: this.map.physicalMapWidth }
        const p  = this.calcFirstTile(cam.x, cam.y)
        const tw = this.map.physicalTileWidth  > 0 ? this.map.physicalTileWidth  : 1
        const th = this.map.physicalTileHeight > 0 ? this.map.physicalTileHeight : 1
        const w  = Math.trunc((cam.width  - cam.startX) / tw) + 23
        const h  = Math.trunc((cam.height - cam.startY) / th) * 2 + 78
        return { x: p.x - 15, y: p.y - 5, w, h }
    }

    selectNextUnit(): void {
        if (this.units.length === 0) return
        const u = this.units[this.unitToFindIdx]
        this.camera.x =  (((u.physicalTilePos.y - u.physicalTilePos.x) * this.map.physicalTileWidth)  >> 1) + Video.width  / 2
        this.camera.y = ((-(u.physicalTilePos.y + u.physicalTilePos.x) * this.map.physicalTileHeight) >> 1) + Video.height / 2

        if (this.selectedUnit) this.selectedUnit.isSelected = false
        if (this.selectedGroup) this.selectedGroup.isSelected = false

        this.selectedUnit = u
        u.isSelected = true
        this.hud.selectedUnit = u
        this.unitToFindIdx++
        if (this.unitToFindIdx >= this.units.length) this.unitToFindIdx = 0
    }

    private updateGameplayState(): void {
        this.updateOrientationArrow()
        this.objectToTake?.update()
        this.ring?.update()

        this.unitUnderMouse = this.getUnitUnderMouse()
        this.selectedUnits  = []

        this.selectUnitsInDragRect()
        this.updateUnits()
        this.createGroups()
        this.checkUnitOrders()
        this.updateCursor()

        this.fireEffects?.forEach(f => f.update())
        this.updateGroups()
        this.updateObjectives()
        this.removeDeadUnits()
        this.arrowObj?.update()
        this.count_++
    }

    private updateOrientationArrow(): void {
        if (!this.command || !this.orientationArrow) return
        const ord = this.command
        this.commandTargetPos.x = (((ord.point.x - ord.point.y) * this.map.tileWidth / 2) >> 1) + this.camera.startX + this.camera.x
        this.commandTargetPos.y = (((ord.point.x + ord.point.y) * this.map.tileHeight / 2) >> 1) + this.camera.startY + this.camera.y

        if (this.isObjectiveVisible()) return

        const cx = Video.width  / 2
        const cy = Video.height / 2
        const a  = this.commandTargetPos.y - cy
        const b  = this.commandTargetPos.x - cx
        let degrees = Math.atan(a / b) * 180 / Math.PI
        if (a < 0 && b > 0)  degrees = -degrees
        if (a >= 0 && b < 0) degrees = 180 - degrees
        if (a < 0  && b < 0) degrees = 180 - degrees
        if (a > 0  && b >= 0) degrees = 360 - degrees

        const factor = 360 / 8, half = 360 / 16
        let dir = 0
        if ((degrees >= 0 && degrees < half) || degrees > 360 - half) dir = 2          // east
        else if (degrees >= half             && degrees < half + factor)   dir = 1      // NE
        else if (degrees >= half + factor    && degrees < half + factor*2) dir = 0      // N
        else if (degrees >= half + factor*2  && degrees < half + factor*3) dir = 7      // NW
        else if (degrees >= half + factor*3  && degrees < half + factor*4) dir = 6      // W
        else if (degrees >= half + factor*4  && degrees < half + factor*5) dir = 5      // SW
        else if (degrees >= half + factor*5  && degrees < half + factor*6) dir = 4      // S
        else dir = 3                                                                     // SE

        const offset = -20
        const fw = this.orientationArrow.frameWidth
        const fh = this.orientationArrow.frameHeight

        if (this.commandTargetPos.x > this.camera.startX && this.commandTargetPos.x < this.camera.width - fw + offset)
            this.arrowPos.x = this.commandTargetPos.x
        else if (this.commandTargetPos.x <= this.camera.startX) this.arrowPos.x = -offset
        else this.arrowPos.x = this.camera.width - fw + offset

        if (this.commandTargetPos.y > this.camera.startY && this.commandTargetPos.y < this.camera.height - fh + offset)
            this.arrowPos.y = this.commandTargetPos.y
        else if (this.commandTargetPos.y <= this.camera.startY) this.arrowPos.y = -offset
        else this.arrowPos.y = this.camera.height - fh + offset

        this.orientationArrow.setAnimation(dir)
    }

    private isObjectiveVisible(): boolean {
        return this.commandTargetPos.x > this.camera.startX &&
               this.commandTargetPos.x < this.camera.width  &&
               this.commandTargetPos.y > this.camera.startY &&
               this.commandTargetPos.y < this.camera.height
    }

    private getUnitUnderMouse(): Unit | null {
        const rect = this.getPaintCoordinates()
        let startCol = rect.x, startRow = rect.y
        let tileY = 0, toggle = true

        while (tileY <= rect.h) {
            let tileX = 0, i = startCol, j = startRow
            while (tileX <= rect.w && j >= 0) {
                if (i >= 0 && i < this.map.physicalMapHeight && j < this.map.physicalMapWidth) {
                    const obj = this.objectsToDraw.tabla[i]?.[j]
                    if (obj instanceof Unit && obj.isUnderMouse()) return obj
                }
                tileX++; i++; j--
            }
            tileY++
            if (toggle) { startCol++; toggle = false }
            else        { startRow++; toggle = true  }
        }
        return null
    }

    private checkUnitOrders(): void {
        const lb = Mouse.Constants.leftButton
        const rb = Mouse.Constants.rightButton

        if (Mouse.shared.pressedButtons.has(lb)) {
            const um = this.unitUnderMouse
            if (um && um.faction === 'argentine') {
                const dr = Mouse.shared.dragRect
                const isDragging = Mouse.shared.isDragging() && dr.width >= 4 && dr.height >= 4
                if (!isDragging) {
                    this.clearSelection()
                    um.isSelected = true
                    this.hud.selectedUnit = um
                    this.selectedUnit = um
                    if (um.belongsToGroup) { um.myGroup?.removeUnit(um); um.leaveGroup() }
                    Mouse.shared.releaseButton(lb)
                }
            }
        }

        if (!this.selectedUnit && !this.selectedGroup) return

        if (Mouse.shared.pressedButtons.has(rb)) {
            Mouse.shared.releaseButton(rb)
            const tile = this.map.smallTileUnderMouse

            if (this.map.isWalkable(tile.x, tile.y)) {
                const um = this.unitUnderMouse
                if (um && um.faction === 'enemy' && !um.isDead()) {
                    if (this.selectedGroup) this.selectedGroup.attack(um)
                    else this.selectedUnit?.attack(um)
                } else {
                    if (this.selectedGroup) this.selectedGroup.move(tile.x, tile.y)
                    else this.selectedUnit?.move(tile.x, tile.y)
                    this.count_ = 0
                    this.arrowObj?.setTilePosition(tile.x, tile.y)
                }
            } else {
                const tum = this.map.tileUnderMouse
                if (tum.y >= this.map.height || tum.y < 0 || tum.x >= this.map.width || tum.x < 0) return
                const btId = this.map.buildingsLayer[tum.x]?.[tum.y] ?? 0
                if (!btId) return
                const ts = this.map.getTileset(btId)
                if (!ts) return
                const localId = btId - ts.firstGid
                const tp = ts.tiles[localId]
                if (!tp || ts.id !== Res.TLS_INVALIDADO || tp.id !== Res.TILE_INVALIDADOS_ID_ENFERMERIA) return

                const sg = this.selectedGroup, su = this.selectedUnit
                if (sg && sg.health < sg.resistancePoints) sg.heal(tile.x, tile.y)
                else if (su && su.health < su.resistancePoints) su.heal(tile.x, tile.y)
            }
        }

        if (Mouse.shared.pressedButtons.has(lb)) {
            const dr = Mouse.shared.dragRect
            const isDragging = Mouse.shared.isDragging() && dr.width >= 4 && dr.height >= 4
            if (!isDragging) {
                this.selectedUnits.forEach(u => u.isSelected = false)
                this.clearSelection()
            }
        }
    }

    private createGroups(): void {
        if (this.selectedUnits.length === 0) return
        if (this.selectedGroup || this.selectedUnit) return

        if (this.selectedUnits.length > 1) {
            if (!this.groups) this.groups = []
            for (const u of this.selectedUnits) {
                if (u.belongsToGroup) { u.myGroup?.removeUnit(u); u.leaveGroup() }
            }
            const g = new Group(this.selectedUnits)
            g.isSelected = true
            this.selectedGroup = g
            this.groups.push(g)
        } else {
            this.selectedUnit = this.selectedUnits[0]
        }
    }

    private updateGroups(): void {
        if (!this.groups || this.groups.length === 0) return
        const toRemove: Group[] = []

        for (const g of this.groups) {
            g.update()
            if (g.currentState === 'waitingCommand' && !g.isSelected) toRemove.push(g)
            if (g.currentState === 'eliminating') {
                if (g === this.selectedGroup) {
                    this.selectedGroup = null
                    if (g.soldierCount === 1) this.selectedUnit = g.getLastUnit()
                }
                toRemove.push(g)
            }
        }

        for (const g of toRemove) {
            g.dissolve()
            this.groups = this.groups!.filter(x => x !== g)
        }
    }

    private updateCursor(): void {
        Mouse.shared.setCursor(ResourceManager.shared.getImageSync(Res.IMG_CURSOR))

        if (!this.selectedUnit && !this.selectedGroup) return

        if (this.unitUnderMouse?.faction === 'enemy') {
            Mouse.shared.setCursor(ResourceManager.shared.getImageSync(Res.IMG_CURSOR_ESPADA))
        }

        if (this.selectedUnit?.isDead()) this.clearSelection()

        const tum = this.map.tileUnderMouse
        if (tum.y >= this.map.height || tum.y < 0 || tum.x >= this.map.width || tum.x < 0) return
        const btId = this.map.buildingsLayer[tum.x]?.[tum.y] ?? 0
        if (!btId) return
        const ts = this.map.getTileset(btId)
        if (!ts) return
        const localId = btId - ts.firstGid
        const tp = ts.tiles[localId]
        if (!tp || ts.id !== Res.TLS_INVALIDADO || tp.id !== Res.TILE_INVALIDADOS_ID_ENFERMERIA) return

        const needsHeal = (this.selectedUnit ? this.selectedUnit.health < this.selectedUnit.resistancePoints : false)
                       || (this.selectedGroup ? this.selectedGroup.health < this.selectedGroup.resistancePoints : false)
        if (needsHeal) Mouse.shared.setCursor(ResourceManager.shared.getImageSync(Res.IMG_CURSOR_ENFERMERIA))
    }

    private updateObjectives(): void {
        if (!this.someoneCompletedOrder) return
        if (this.command?.id === CommandKind.takeObject) this.objectToTake = null
        this.setNextCommand()
        if (!this.command) this.objectiveCompleted = true
    }

    private selectUnitsInDragRect(): void {
        if (!Mouse.shared.didFinishDragging()) return
        const dr = Mouse.shared.dragRect
        if (dr.width < 4 || dr.height < 4) return
        if (this.selectedUnit || this.selectedGroup) return

        for (const u of this.units) {
            if (u.faction === 'argentine') {
                u.selectIfInRect(Math.trunc(dr.x), Math.trunc(dr.y), Math.trunc(dr.width), Math.trunc(dr.height))
            }
        }
    }

    private calcFirstTile(x: number, y: number): { x: number; y: number } {
        const th = this.map.tileHeight > 0 ? this.map.tileHeight / 2 : 1
        const tw = this.map.tileWidth  > 0 ? this.map.tileWidth  / 2 : 1
        const a  = -y / th
        let b    =  x / tw
        if (x > 0) b += 1
        return { x: Math.trunc(a - b) - 4, y: Math.trunc(a + b) - 2 }
    }
}
