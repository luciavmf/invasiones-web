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
import type { PointerDevice } from '../input/PointerDevice'
import { PlayerInput } from './PlayerInput'
import type { PlayerIntent } from './PlayerIntent'
import { Video }      from '../rendering/Video'
import { CommandKind } from '../level/Command'
import type { Map }    from '../map/Map'
import type { Camera } from '../map/Camera'
import type { ObjectTable } from '../level/ObjectTable'
import type { Hud }    from '../level/Hud'
import type { Video as VideoType } from '../rendering/Video'
import { AnimationID } from '../resources/AnimationID'
import { ImageID } from '../resources/ImageID'
import { TileKind, TilesetID } from '../map/TilesetID'
import { UnitType } from '../resources/UnitType'

/// The player-controlled Argentine faction.
export class ArgentineTeam extends Player {

    private unitUnderPointer: Unit | null = null
    private readonly input: PlayerInput
    private count_         = 99999
    private arrowObj: MapObject | null  = null
    private orientationArrow: Animation | null = null
    private commandTargetPos = { x: 0, y: 0 }
    private arrowPos         = { x: 0, y: 0 }
    private unitToFindIdx    = 0
    private readonly arrowMaxCount = 100

    constructor(map: Map, camera: Camera, objectsToDraw: ObjectTable, hud: Hud,
                pointer: PointerDevice = Mouse.shared) {
        super(map, camera, objectsToDraw, hud)
        this.input = new PlayerInput(map, pointer)
        this.faction = 'argentine'

        const anims = ResourceManager.shared.animations
        if (AnimationID.rings < anims.length && anims[AnimationID.rings]) {
            this.ring = new AnimObject(anims[AnimationID.rings]!.clone(), 0, 0, this.battlefield)
        }
        if (AnimationID.guideArrow < anims.length && anims[AnimationID.guideArrow]) {
            const anim = anims[AnimationID.guideArrow]!.clone()
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
        this.arrowObj = new MapObject(this.battlefield,
            ResourceManager.shared.getImageSync(ImageID.arrow), 0, 0)
        this.count_ = 99999

        const unitsTileset = this.map.tilesets
            .filter(ts => ts !== null)
            .find(ts => ts!.id === TilesetID.units)
        if (!unitsTileset) return

        this.units = []
        for (let i = 0; i < this.map.width; i++) {
            for (let j = 0; j < this.map.height; j++) {
                const tileId = this.map.unitsLayer[i]?.[j] ?? 0
                if (!tileId) continue
                const localId = tileId - unitsTileset.firstGid
                const tile    = unitsTileset.tiles[localId]
                if (!tile || tile.kind !== TileKind.patricio) continue

                const list = this.placeUnits(UnitType.patricio, tile.count, i << 1, j << 1)
                if (list.length > 1) {
                    if (!this.groups) this.groups = []
                    this.groups.push(new Group(list))
                }
            }
        }
    }

    /// Draws the destination arrow of the last move order (for 100 frames), the objective
    /// ring, the object to take and the fires. As in the original, they're drawn with the
    /// units, so the fog and the HUD cover them, and the arrow's frames are counted here.
    drawMarkers(video: VideoType): void {
        if (this.stateValue !== 'game') return
        if (this.count_ < this.arrowMaxCount) this.arrowObj?.draw(video)
        this.count_++

        this.ring?.draw(video)
        this.objectToTake?.draw(video)
        this.fireEffects?.forEach(f => f.draw(video))
    }

    /// Draws the arrow at the edge of the screen pointing at the objective, when it's off-screen.
    drawOrientationArrow(video: VideoType): void {
        if (this.stateValue !== 'game') return
        if (!this.command || !this.orientationArrow) return
        if (this.isObjectiveVisible()) return
        this.orientationArrow.draw(video, this.arrowPos.x, this.arrowPos.y, 0)
    }

    getPaintCoordinates(): { x: number; y: number; w: number; h: number } {
        const cam = this.camera
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

        const { x, y } = this.input.position
        this.unitUnderPointer = this.unitAt(x, y)
        this.selectedUnits    = []

        const selection = this.input.dragSelection()
        if (selection) this.handle(selection)
        this.updateUnits()
        this.input.clickIntents(this.unitUnderPointer, this.hasSelection).forEach(i => this.handle(i))

        const hadSelection = this.hasSelection
        if (this.selectedUnit?.isDead()) this.clearSelection()
        this.input.show(this.input.cursor(this.unitUnderPointer, hadSelection, this.selectionNeedsHealing))

        this.fireEffects?.forEach(f => f.update())
        this.updateGroups()
        this.updateObjectives()
        this.removeDeadUnits()
        this.arrowObj?.update()
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

    /// The unit drawn at a screen point, searching the visible tiles in drawing order.
    unitAt(x: number, y: number): Unit | null {
        const rect = this.getPaintCoordinates()
        let startCol = rect.x, startRow = rect.y
        let tileY = 0, toggle = true

        while (tileY <= rect.h) {
            let tileX = 0, i = startCol, j = startRow
            while (tileX <= rect.w && j >= 0) {
                if (i >= 0 && i < this.map.physicalMapHeight && j < this.map.physicalMapWidth) {
                    const obj = this.objectsToDraw.table[i]?.[j]
                    if (obj instanceof Unit && obj.isUnder(x, y)) return obj
                }
                tileX++; i++; j--
            }
            tileY++
            if (toggle) { startCol++; toggle = false }
            else        { startRow++; toggle = true  }
        }
        return null
    }

    /// Carries out one request from the player.
    handle(intent: PlayerIntent): void {
        switch (intent.kind) {
            case 'selectInRect': {
                if (this.selectedUnit || this.selectedGroup) return
                for (const u of this.units) {
                    if (u.faction === 'argentine') u.selectIfInRect(intent.x, intent.y, intent.w, intent.h)
                }
                this.collectSelectedUnits()
                this.createGroups()
                break
            }
            case 'select': {
                const unit = intent.unit
                if (unit.faction !== 'argentine') return
                this.clearSelection()
                unit.isSelected = true
                this.hud.selectedUnit = unit
                this.selectedUnit = unit
                // A unit picked out of a group leaves it.
                if (unit.belongsToGroup) { unit.myGroup?.removeUnit(unit); unit.leaveGroup() }
                break
            }
            case 'deselect':
                this.selectedUnits.forEach(u => u.isSelected = false)
                this.clearSelection()
                break
            case 'move':
                if (this.selectedGroup) this.selectedGroup.move(intent.x, intent.y)
                else this.selectedUnit?.move(intent.x, intent.y)
                this.count_ = 0
                this.arrowObj?.setTilePosition(intent.x, intent.y)
                break
            case 'attack':
                if (this.selectedGroup) this.selectedGroup.attack(intent.enemy)
                else this.selectedUnit?.attack(intent.enemy)
                break
            case 'heal': {
                const sg = this.selectedGroup, su = this.selectedUnit
                if (sg && sg.health < sg.resistancePoints) sg.heal(intent.x, intent.y)
                else if (su && su.health < su.resistancePoints) su.heal(intent.x, intent.y)
                break
            }
        }
    }

    /// Whether a unit or group is selected.
    get hasSelection(): boolean { return this.selectedUnit !== null || this.selectedGroup !== null }

    /// Whether the selected unit or group has lost health, so it can be sent to heal.
    get selectionNeedsHealing(): boolean {
        return (this.selectedUnit ? this.selectedUnit.health < this.selectedUnit.resistancePoints : false)
            || (this.selectedGroup ? this.selectedGroup.health < this.selectedGroup.resistancePoints : false)
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

    private updateObjectives(): void {
        if (!this.someoneCompletedOrder) return
        if (this.command?.id === CommandKind.takeObject) this.objectToTake = null
        this.setNextCommand()
        if (!this.command) this.objectiveCompleted = true
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
