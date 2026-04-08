// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Unit }       from './Unit'
import { Group }      from './Group'
import { Command, CommandKind } from '../level/Command'
import { ObjectTable } from '../level/ObjectTable'
import { Objective }  from '../level/Objective'
import { MapObject }  from '../level/MapObject'
import { AnimObject } from '../level/AnimObject'
import { Map }        from '../map/Map'
import type { Camera } from '../map/Camera'
import type { Hud }   from '../level/Hud'

export type Faction = 'enemy' | 'argentine'

/// Abstract base class for both game factions.
export class Player {

    protected objectiveCompleted = false
    faction: Faction = 'argentine'
    protected someoneCompletedOrder = false
    ring: AnimObject | null = null

    hud: Hud
    units: Unit[] = []
    objectsToDraw: ObjectTable
    map: Map
    groups: Group[] | null = null
    stateValue: 'start' | 'loading' | 'game' = 'start'
    camera: Camera
    selectedUnits: Unit[] = []
    protected deadUnits: Unit[] | null = null
    protected visibleUnits: Unit[] | null = null
    protected collidingUnits: Unit[] | null = null
    selectedUnit: Unit | null = null
    selectedGroup: Group | null = null
    protected objective: Objective | null = null
    protected command: Command | null = null
    objectToTake: MapObject | null = null
    fireEffects: AnimObject[] | null = null

    get unitCount(): number { return this.units.length }

    constructor(map: Map, camera: Camera, objectsToDraw: ObjectTable, hud: Hud) {
        this.map          = map
        this.camera       = camera
        this.objectsToDraw = objectsToDraw
        this.hud          = hud
    }

    update(): void { throw new Error('update() must be overridden') }
    async loadUnits(_levelIndex: number): Promise<void> { throw new Error('loadUnits() must be overridden') }

    completedObjective(): boolean { return this.objectiveCompleted }

    setObjective(obj: Objective | null): void {
        this.objective          = obj
        this.objectiveCompleted = false
        this.command = obj?.nextCommand() ?? null

        if (this.command) {
            if (this.command.id === CommandKind.takeObject && this.command.image) {
                this.objectToTake = new MapObject(this.command.image, this.command.point.x, this.command.point.y)
            }
            if (this.ring) this.ring.setPosition(this.command.point.x, this.command.point.y)
        }
        this.units.forEach(u => u.setObjectiveCommand(this.command))
    }

    setNextCommand(): void {
        this.someoneCompletedOrder = false
        this.command = this.objective?.nextCommand() ?? null

        if (!this.command) {
            this.objectiveCompleted = true
            return
        }

        while (this.command && this.command.id === CommandKind.trigger) {
            if (this.command.animation) {
                if (!this.fireEffects) this.fireEffects = []
                const anim = this.command.animation
                this.fireEffects.push(anim)
                this.map.invalidateTile(anim.physicalTilePos.x, anim.physicalTilePos.y)
            }
            this.command = this.objective?.nextCommand() ?? null
            if (!this.command) { this.objectiveCompleted = true }
        }

        if (this.command && this.ring) {
            this.ring.setPosition(this.command.point.x, this.command.point.y)
        }
        this.units.forEach(u => u.setObjectiveCommand(this.command))
    }

    updateUnits(): void {
        this.deadUnits = null
        const checkSelection = !this.selectedUnit && !this.selectedGroup

        for (const unit of this.units) {
            this.updateAndMoveUnit(unit)

            if (checkSelection && unit.isSelected) {
                if (this.selectedUnits.length < 6) {
                    this.hud.selectedUnit = unit
                    this.selectedUnits.push(unit)
                } else {
                    unit.isSelected = false
                }
            }

            this.visibleUnits = this.getVisibleUnitsAndTiles(unit)

            if (unit.isMoving()) this.checkCollisions(unit)

            if (unit.currentState === 'idle' || unit.currentState === 'patrolling') {
                this.attackVisibleUnits(unit)
            }

            if (unit.currentState === 'dead') {
                if (!this.deadUnits) this.deadUnits = []
                this.deadUnits.push(unit)
            }

            if (unit.completedOrder) this.someoneCompletedOrder = true
        }

        // Check KILL order
        if (this.command?.id === CommandKind.kill) {
            this.someoneCompletedOrder = true
            const ord = this.command
            const iS = ord.point.x - ord.width, iE = ord.point.x + ord.width
            const jS = ord.point.y - ord.width, jE = ord.point.y + ord.width
            for (let i = iS; i < iE; i++) {
                for (let j = jS; j < jE; j++) {
                    if (i < 0 || j < 0 || i >= this.objectsToDraw.tabla.length) continue
                    if (j >= this.objectsToDraw.tabla[i].length) continue
                    const obj = this.objectsToDraw.tabla[i][j]
                    if (obj instanceof Unit && obj.faction === 'enemy') {
                        this.someoneCompletedOrder = false
                    }
                }
            }
        }
    }

    removeDeadUnits(): void {
        if (!this.deadUnits) return
        for (const dead of this.deadUnits) {
            const ti = dead.physicalTilePos.x, tj = dead.physicalTilePos.y
            if (ti < this.objectsToDraw.tabla.length && tj < this.objectsToDraw.tabla[ti].length) {
                if (this.objectsToDraw.tabla[ti][tj] === dead) this.objectsToDraw.tabla[ti][tj] = null
            }
            this.units = this.units.filter(u => u !== dead)
        }
    }

    getVisibleUnitsAndTiles(unit: Unit): Unit[] | null {
        let visible: Unit[] | null = null
        const iS = Math.max(0, unit.physicalTilePos.x - Unit.Constants.maxVisibility)
        const jS = Math.max(0, unit.physicalTilePos.y - Unit.Constants.maxVisibility)
        const iE = Math.min(this.map.physicalMapHeight, unit.physicalTilePos.x + Unit.Constants.maxVisibility)
        const jE = Math.min(this.map.physicalMapWidth,  unit.physicalTilePos.y + Unit.Constants.maxVisibility)
        const onScreen = unit.isOnScreen()

        for (let i = iS; i < iE; i++) {
            for (let j = jS; j < jE; j++) {
                if (unit.calculateDistance(i, j) > unit.visibility) continue
                if (i < this.objectsToDraw.tabla.length && j < this.objectsToDraw.tabla[i].length) {
                    const other = this.objectsToDraw.tabla[i][j]
                    if (other instanceof Unit && other !== unit) {
                        if (!visible) visible = []
                        visible.push(other)
                    }
                }
                if (onScreen && unit.faction === 'argentine') {
                    this.map.visibleTilesLayer[i][j] = Map.Constants.visibleTile
                }
            }
        }
        return visible
    }

    clearSelection(): void {
        if (this.selectedGroup) this.selectedGroup.isSelected = false
        if (this.selectedUnit)  this.selectedUnit.isSelected  = false
        this.hud.selectedUnit = null
        this.selectedGroup = null
        this.selectedUnit  = null
    }

    placeUnits(type: number, count: number, x: number, y: number): Unit[] {
        if (count <= 0) return []
        const group: Unit[] = []
        let i = 0, j = 0, inc = 2, dir = 1, placed = 0

        while (placed < count) {
            if (this.map.isWalkable(x + i, y + j)) {
                const u = this.placeUnitInternal(type, x + i, y + j)
                if (u) group.push(u)
                placed++
            }
            switch (dir) {
                case 1: i += 2; if (i === inc)  dir = 2; break
                case 2: j += 2; if (j === inc)  dir = 3; break
                case 3: i -= 2; if (i === -inc) dir = 0; break
                case 0: j -= 2; if (j === -inc) { dir = 1; inc += 2 } break
            }
        }
        return group
    }

    private placeUnitInternal(type: number, i: number, j: number): Unit | null {
        if (!this.map.isWalkable(i, j)) return null
        const u = new Unit(type)
        u.physicalTilePos = { x: i, y: j }
        u.previousTile    = { x: i, y: j }
        u.initializeXY()
        u.faction = this.faction

        this.units.push(u)
        if (i < this.objectsToDraw.tabla.length && j < this.objectsToDraw.tabla[i].length) {
            this.objectsToDraw.tabla[i][j] = u
        }
        return u
    }

    private updateAndMoveUnit(unit: Unit): void {
        const moved = unit.update()
        if (moved) {
            const pi = unit.previousTile.x, pj = unit.previousTile.y
            if (pi < this.objectsToDraw.tabla.length && pj < this.objectsToDraw.tabla[pi].length) {
                if (this.objectsToDraw.tabla[pi][pj] === unit) this.objectsToDraw.tabla[pi][pj] = null
            }
            const ni = unit.physicalTilePos.x, nj = unit.physicalTilePos.y
            if (ni < this.objectsToDraw.tabla.length && nj < this.objectsToDraw.tabla[ni].length) {
                this.objectsToDraw.tabla[ni][nj] = unit
            }
        }
    }

    private checkCollisions(unit: Unit): void {
        const nearby = this.getUnitsToCollide(unit)
        for (const other of nearby ?? []) {
            if (unit.hasCollision(other)) unit.evadeUnit(other, this.visibleUnits)
        }
    }

    private getUnitsToCollide(unit: Unit): Unit[] | null {
        const r = Unit.Constants.collisionCheckDistance
        const iS = Math.max(0, unit.physicalTilePos.x - r)
        const jS = Math.max(0, unit.physicalTilePos.y - r)
        const iE = Math.min(this.map.physicalMapHeight, unit.physicalTilePos.x + r)
        const jE = Math.min(this.map.physicalMapWidth,  unit.physicalTilePos.y + r)
        let nearby: Unit[] | null = null

        for (let i = iS; i < iE; i++) {
            for (let j = jS; j < jE; j++) {
                if (i >= this.objectsToDraw.tabla.length || j >= this.objectsToDraw.tabla[i].length) continue
                const other = this.objectsToDraw.tabla[i][j]
                if (other instanceof Unit && other !== unit) {
                    if (other.calculateDistance(unit.physicalTilePos.x, unit.physicalTilePos.y) <= r) {
                        if (!nearby) nearby = []
                        nearby.push(other)
                    }
                }
            }
        }
        return nearby
    }

    private attackVisibleUnits(unit: Unit): void {
        for (const enemy of this.visibleUnits ?? []) {
            if (enemy.faction !== this.faction && !enemy.isDead()) {
                unit.attack(enemy)
            }
        }
    }
}

