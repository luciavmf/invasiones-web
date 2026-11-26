// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { MapObject }    from '../level/MapObject'
import { Command, CommandKind } from '../level/Command'
import { PathFinder }  from '../pathfinding/PathFinder'
import { ResourceManager } from '../resources/ResourceManager'
import { Sound, type SoundPlayer } from '../audio/Sound'
import { Mouse }       from '../input/Mouse'
import { Sprite }      from '../sprites/Sprite'
import { Res }         from '../resources/Res'
import type { Surface } from '../rendering/Surface'
import type { Video }   from '../rendering/Video'
import type { Group }   from './Group'
import { GameColor }   from '../Definitions'

const UnitState = {
    idle: 'idle', moving: 'moving', dying: 'dying',
    attacking: 'attacking', pursuingUnit: 'pursuingUnit',
    dead: 'dead', patrolling: 'patrolling', healing: 'healing',
} as const
type UnitState = typeof UnitState[keyof typeof UnitState]

const Substep = {
    incrementStep: 'incrementStep',
    dodgeUnit:     'dodgeUnit',
    reachStep:     'reachStep',
    completedStep: 'completedStep',
} as const
type Substep = typeof Substep[keyof typeof Substep]

export type UnitFaction = 'enemy' | 'argentine'

/// Represents a single unit (soldier) in the game.
export class Unit extends MapObject {

    static readonly Constants = {
        maxVisibility:          15,
        collisionCheckDistance: 4,
        patrolRandomMin:        8,
        patrolRandomMax:        16,
        minTilesToCompleteMove: 3,
        selectionBarWidth:      20,
        selectionBarY:          -3,
        deathFrameCount:        150,
    }

    private unitType    = 0
    private substate: Substep = Substep.incrementStep
    faction: UnitFaction = 'enemy'
    health          = 100
    resistancePoints = 100
    attackPoints    = 10
    visibility      = 10
    aim             = 5
    private attackRange   = 5
    attackInterval  = 30
    private currentSpeed  = { x: 2, y: 2 }
    private defaultSpeedVec = { x: 2, y: 2 }
    private enemy: Unit | null = null
    private stateValue: UnitState = UnitState.idle
    private nextStateValue: UnitState = UnitState.idle
    private direction = 0   // 0=N,1=NE,2=E,3=SE,4=S,5=SW,6=W,7=NW
    pathToFollow: { i: number; j: number }[] | null = null
    /// Tiles to treat as blocked on the next pathfinder call (set by evadeUnit, consumed by recalcNextStep).
    private dodgeBlockedTiles: { i: number; j: number }[] = []
    private nextTile  = { x: 0, y: 0 }
    private nextStep  = { x: 0, y: 0 }
    isSelected  = false
    private sprite: Sprite | null = null
    private count  = 0
    private targetPos = { x: -1, y: -1 }
    name  = ''
    avatar: Surface | null = null
    private objectiveCommand: Command | null = null
    completedOrder  = false
    private patrolPosition = { x: 0, y: 0 }
    private formationOffset_ = { x: 0, y: 0 }
    private ticksPerRecovery = 50
    private recoveryPoints_  = 20
    /// The state the animation was last chosen for.
    private shownState: UnitState | null = null
    /// Used to compute movement paths. Injectable so tests can use a hand-made grid.
    private readonly pathFinder: PathFinder
    /// Used for shot and death sounds. Injectable so tests can record calls.
    private readonly sound: SoundPlayer
    private group_: Group | null = null
    get currentState(): UnitState { return this.stateValue }
    get range(): number { return this.attackRange }
    get speed(): { x: number; y: number } { return this.currentSpeed }
    get defaultSpeed(): number { return this.defaultSpeedVec.x }
    get formationOffset(): { x: number; y: number } { return this.formationOffset_ }
    set formationOffset(v: { x: number; y: number }) { this.formationOffset_ = v }
    get belongsToGroup(): boolean { return this.group_ !== null }
    get myGroup(): Group | null { return this.group_ }

    /// Creates a unit of the given type with the stats ResourceManager loaded for it.
    /// Tests leave out the type, and pass their own pathfinder and sound.
    constructor(typeId?: number, pathFinder: PathFinder = PathFinder.shared, sound: SoundPlayer = Sound.shared) {
        super()
        this.pathFinder = pathFinder
        this.sound = sound
        if (typeId === undefined) return
        const data = ResourceManager.shared.unitTypeData[typeId]
        if (!data) { console.warn(`Unit: no data for type ${typeId}`); return }
        this.unitType           = typeId
        this.currentSpeed       = { x: data.speed ?? 2, y: data.speed ?? 2 }
        this.defaultSpeedVec    = { x: data.speed ?? 2, y: data.speed ?? 2 }
        this.health             = data.resistance ?? 100
        this.resistancePoints   = data.resistance ?? 100
        this.attackPoints       = data.attack      ?? 10
        this.visibility         = data.visibility  ?? 10
        this.aim                = data.aim         ?? 5
        this.attackRange        = data.range       ?? 5
        this.attackInterval     = data.attackInterval ?? 30
        this.avatar             = data.avatar      ?? null
        this.name               = data.unitName    ?? ''
        this.ticksPerRecovery   = data.recoveryTicks  ?? 50
        this.recoveryPoints_    = data.recoveryPoints ?? 20

        const sprIdx = data.spriteIdx ?? (typeId === Res.UNIDAD_PATRICIO ? Res.SPR_PATRICIO : Res.SPR_INGLES)
        const src = ResourceManager.shared.sprites[sprIdx]
        if (src) this.sprite = src.clone()
    }

    override updateScreenPos(): void {
        const cam = MapObject.camera
        const map = MapObject.map
        if (!cam || !map) return
        this.x = cam.startX + this.worldPos.x + cam.x + map.tileWidth / 2
        this.y = cam.startY + this.worldPos.y + cam.y + map.tileHeight / 4
    }

    override update(): boolean {
        if (this.stateValue === UnitState.dead) return false

        let movedOnMap = false
        this.completedOrder = false

        switch (this.stateValue) {
            case UnitState.idle:         break
            case UnitState.moving:       movedOnMap = this.updateMovingState(); break
            case UnitState.patrolling:   movedOnMap = this.updatePatrollingState(); break
            case UnitState.pursuingUnit: movedOnMap = this.updatePursuingUnitState(); break
            case UnitState.attacking:    this.updateAttackingState(); break
            case UnitState.dying:        this.updateDyingState(); break
            case UnitState.healing:      this.updateHealingState(); break
        }

        this.checkOrderCompleted()
        super.update()
        this.updateAnimation()
        return movedOnMap
    }

    override draw(video: Video): void {
        if (this.isSelected) {
            const frac = this.health / Math.max(this.resistancePoints, 1)
            const bw   = Math.trunc(Unit.Constants.selectionBarWidth * frac)
            const spriteHeight = this.sprite?.frameHeight ?? 0
            const barY = this.y - spriteHeight + Unit.Constants.selectionBarY
            video.setColor(GameColor.green)
            video.fillRect(this.x - Unit.Constants.selectionBarWidth / 2, barY, bw, 3)
            video.setColor(GameColor.red)
            video.fillRect(this.x - Unit.Constants.selectionBarWidth / 2 + bw, barY, Unit.Constants.selectionBarWidth - bw, 3)
        }
        if (this.sprite) {
            this.sprite.draw(video, this.x - this.sprite.frameWidth / 2, this.y - this.sprite.frameHeight)
        }
    }

    // MARK: - Orders

    move(x: number, y: number): void {
        this.setState(UnitState.moving)
        this.nextStateValue = UnitState.idle

        const path = this.pathFinder.findShortestPath(
            this.physicalTilePos.x, this.physicalTilePos.y, x, y)

        if (path && path.length > 0) {
            this.pathToFollow = path.slice(0, -1)  // drop last (origin)
        } else {
            this.setState(UnitState.idle)
            this.pathToFollow = null
            return
        }
        this.substate = Substep.incrementStep
    }

    patrol(): void {
        this.setState(UnitState.patrolling)
        this.nextStateValue = UnitState.patrolling
        this.patrolPosition = { ...this.physicalTilePos }
        this.pathToFollow = this.findRandomPatrolPath(this.physicalTilePos.x, this.physicalTilePos.y)
    }

    attack(enemy: Unit): void {
        this.enemy     = enemy
        this.targetPos = { x: -1, y: -1 }
        this.setState(UnitState.pursuingUnit)
    }

    stop(): void {
        this.setState(UnitState.idle)
        this.pathToFollow = null
    }

    setObjectiveCommand(ord: Command | null): void {
        this.completedOrder     = false
        this.objectiveCommand   = ord
    }

    recoverHealth(): void { this.setState(UnitState.healing) }

    heal(x: number, y: number): void {
        if (!MapObject.map) return
        const p = MapObject.map.getLineOfSightPosition(x, this.physicalTilePos.x, y, this.physicalTilePos.y)
        if (p.x === -1) return
        this.setHealing(p.x, p.y)
    }

    private setHealing(x: number, y: number): void {
        this.setState(UnitState.moving)
        this.nextStateValue = UnitState.healing
        const path = this.pathFinder.findShortestPath(
            this.physicalTilePos.x, this.physicalTilePos.y, x, y)
        if (path && path.length > 0) {
            this.pathToFollow = path.slice(0, -1)
        } else {
            this.setState(UnitState.idle)
            this.pathToFollow = null
            return
        }
        this.substate = Substep.incrementStep
    }

    // MARK: - Collision

    /// Returns `true` if this unit's next step lands on the same tile as `other`.
    /// Mirrors C# Unidad.HayColision: collision only when our next tile equals their
    /// current resting tile (stationary) or their next tile (moving). Proximity alone
    /// is not a collision — otherwise any nearby unit would trigger evade every frame
    /// and movement would lock up.
    hasCollision(other: Unit): boolean {
        if (other === this) return false
        if (other.isMoving()) {
            return this.nextTile.x === other.nextTile.x && this.nextTile.y === other.nextTile.y
        }
        return this.nextTile.x === other.physicalTilePos.x && this.nextTile.y === other.physicalTilePos.y
    }

    /// Triggers the evasion sub-state and captures nearby unit tiles so the next
    /// A* call routes around them.
    evadeUnit(_other: Unit, visible: Unit[] | null): void {
        this.substate = Substep.dodgeUnit

        const blocked: { i: number; j: number }[] = []
        for (const u of visible ?? []) {
            const tile = u.isMoving() ? u.nextTile : u.physicalTilePos
            blocked.push({ i: tile.x, j: tile.y })
        }
        this.dodgeBlockedTiles = blocked
    }

    // MARK: - Queries

    isDead(): boolean { return this.stateValue === UnitState.dead || this.stateValue === UnitState.dying }
    isMoving(): boolean {
        return this.stateValue === UnitState.moving ||
               this.stateValue === UnitState.patrolling ||
               this.stateValue === UnitState.pursuingUnit
    }

    isOnScreen(): boolean {
        const cam = MapObject.camera
        if (!cam) return false
        return this.x >= cam.startX && this.x <= cam.startX + cam.width &&
               this.y >= cam.startY && this.y <= cam.startY + cam.height
    }

    calculateDistance(toI: number, toJ: number): number {
        const di = this.physicalTilePos.x - toI
        const dj = this.physicalTilePos.y - toJ
        return Math.sqrt(di * di + dj * dj)
    }

    /// Whether the unit is close enough to its objective tile to count a move order as
    /// fulfilled: closer than `minTilesToCompleteMove` tiles on each axis, as in the original.
    completedMoveObjective(): boolean {
        if (!this.objectiveCommand) return false
        const { x, y } = this.objectiveCommand.point
        return Math.abs(x - this.physicalTilePos.x) < Unit.Constants.minTilesToCompleteMove &&
               Math.abs(y - this.physicalTilePos.y) < Unit.Constants.minTilesToCompleteMove
    }

    isUnderMouse(): boolean {
        const mx = Math.trunc(Mouse.shared.x)
        const my = Math.trunc(Mouse.shared.y)
        const fw = this.sprite?.frameWidth  ?? 20
        const fh = this.sprite?.frameHeight ?? 30
        const hw = fw / 2
        return mx >= this.x - hw && mx <= this.x + hw && my >= this.y - fh && my <= this.y
    }

    selectIfInRect(x: number, y: number, w: number, h: number): boolean {
        const fw = this.sprite?.frameWidth  ?? 20
        const fh = this.sprite?.frameHeight ?? 30
        const inRange = x <= this.x - fw / 2 && y <= this.y - fh / 2 &&
                        x + w > this.x + fw / 2 && y + h > this.y
        if (inRange) this.isSelected = true
        return inRange
    }

    // MARK: - Group

    joinGroup(g: Group):   void { this.group_ = g }
    leaveGroup():          void { this.group_ = null }
    markAsCommander():     void {}
    unmarkCommander():     void {}

    // MARK: - Formation path

    calculatePathAtDistance(commanderPath: { i: number; j: number }[], offsetX: number, offsetY: number): void {
        const map = MapObject.map
        if (!map) return
        this.setState(UnitState.moving)
        this.nextStateValue = UnitState.idle

        const pathCopy = [...commanderPath].reverse().map(p => ({ i: p.i + offsetX, j: p.j + offsetY }))
        const pathList: { i: number; j: number }[] = []
        let idx = 0

        while (idx < pathCopy.length) {
            const pt = pathCopy[idx]
            if (!map.isWalkable(pt.i, pt.j)) {
                if (idx > 0) {
                    const prevIdx = idx - 1
                    const nextValidIdx = this.findNextValidPos(pathCopy, idx, map)
                    if (nextValidIdx === null) { idx = pathCopy.length; continue }
                    idx = nextValidIdx
                    let seg = this.pathFinder.findShortestPath(
                        pathCopy[prevIdx].i, pathCopy[prevIdx].j, pathCopy[idx].i, pathCopy[idx].j)
                    if (!seg) {
                        const prevV = this.findPrevValidPos(pathCopy, nextValidIdx, map)
                        if (prevV === null) { this.pathToFollow = []; return }
                        idx = prevV
                        seg = this.pathFinder.findShortestPath(
                            pathCopy[prevIdx].i, pathCopy[prevIdx].j, pathCopy[idx].i, pathCopy[idx].j)
                    }
                    if (!seg) { this.pathToFollow = []; return }
                    pathList.push(...[...seg].reverse())
                } else { idx++ }
            } else { pathList.push(pt); idx++ }
        }

        this.pathToFollow = [...pathList].reverse()
        this.substate = Substep.incrementStep
    }

    private findNextValidPos(list: { i: number; j: number }[], from: number, map: any): number | null {
        let idx = from
        while (idx < list.length && !map.isWalkable(list[idx].i, list[idx].j)) idx++
        if (idx >= list.length) return null
        if (idx < list.length - 1 && map.isWalkable(list[idx + 1].i, list[idx + 1].j)) {
            idx++
            if (idx < list.length - 1 && map.isWalkable(list[idx + 1].i, list[idx + 1].j)) idx++
        }
        return idx
    }

    private findPrevValidPos(list: { i: number; j: number }[], from: number, map: any): number | null {
        let idx = from
        while (idx >= 0 && !map.isWalkable(list[idx].i, list[idx].j)) idx--
        return idx < 0 ? null : idx
    }

    // MARK: - Combat

    counterAttack(attacker: Unit): void {
        if (this.stateValue !== UnitState.idle) return
        this.enemy = attacker
        if (this.calculateDistance(attacker.physicalTilePos.x, attacker.physicalTilePos.y) < this.attackRange) {
            this.aimAtUnit(attacker)
            this.setState(UnitState.attacking)
        }
    }

    takeDamage(dmg: number): void {
        this.health -= dmg
        if (this.health <= 0) { this.health = 0; this.die() }
    }

    /// Starts dying. The death sound plays on the next frame (see updateDyingState).
    die(): void {
        this.setState(UnitState.dying)
        this.enemy = null
    }

    // MARK: - Private state handlers

    private setState(s: UnitState): void {
        this.stateValue = s
        this.count = 0
        if (s === UnitState.idle) this.pathToFollow = null
        if (s === UnitState.attacking) this.enemy?.counterAttack(this)
    }

    /// Shows the animation for the unit's state and direction, then advances it by one
    /// frame. Called once per frame. The dying animation plays once and stays on its last frame.
    private updateAnimation(): void {
        const sprite = this.sprite
        if (!sprite) return
        const animation = this.firstAnimation() + this.direction
        const isDying = (s: UnitState | null) => s === UnitState.dying || s === UnitState.dead
        if (isDying(this.stateValue)) {
            if (!isDying(this.shownState)) {
                sprite.setAnimation(animation)
                sprite.loop = false
                sprite.play()
            }
            if (sprite.isAnimationDone()) {
                sprite.setFrame(sprite.frameCount - 1)
                sprite.stop()
            }
        } else {
            sprite.setAnimation(animation)
            sprite.play()
        }
        this.shownState = this.stateValue
        sprite.update()
    }

    private firstAnimation(): number {
        switch (this.stateValue) {
            case UnitState.idle:
            case UnitState.healing:
                return this.unitType === 0 ? Res.SPR_ANIM_PATRICIO_QUIETO_N : Res.SPR_ANIM_INGLES_QUIETO_N
            case UnitState.moving:
            case UnitState.pursuingUnit:
            case UnitState.patrolling:
                return this.unitType === 0 ? Res.SPR_ANIM_PATRICIO_CAMINA_N : Res.SPR_ANIM_INGLES_CAMINA_N
            case UnitState.dying:
            case UnitState.dead:
                return this.unitType === 0 ? Res.SPR_ANIM_PATRICIO_MUERE_N : Res.SPR_ANIM_INGLES_MUERE_N
            case UnitState.attacking:
                return this.unitType === 0 ? Res.SPR_ANIM_PATRICIO_ATACA_N : Res.SPR_ANIM_INGLES_ATACA_N
        }
    }

    // MARK: - Movement

    private updateMovingState(): boolean { return this.followPath() }
    private updatePatrollingState(): boolean {
        if (!this.pathToFollow) {
            this.pathToFollow = this.findRandomPatrolPath(this.physicalTilePos.x, this.physicalTilePos.y)
        }
        return this.followPath()
    }

    /// Walks one frame along the path: takes the next tile when the last one was reached,
    /// re-plans after a collision, and steps toward the next tile's centre. When the path
    /// ends, the unit switches to its next state.
    /// Returns whether the unit reached a new tile (or re-planned its step) this frame.
    private followPath(): boolean {
        if (this.substate === Substep.incrementStep) {
            if (!this.pathToFollow || this.pathToFollow.length === 0) {
                this.setState(this.nextStateValue)
                this.pathToFollow = null
                return false
            }
            const next = this.pathToFollow[this.pathToFollow.length - 1]
            this.nextTile = { x: next.i, y: next.j }
            this.pathToFollow.pop()
            this.nextStep = this.tileToWorld(this.nextTile.x, this.nextTile.y)
            this.substate = Substep.reachStep
        } else if (this.substate === Substep.dodgeUnit) {
            this.recalcNextStep()
            this.substate = Substep.reachStep
            return true
        }

        const dir = this.getDirection(this.nextStep.x, this.nextStep.y)
        if (dir !== -1) this.direction = dir

        const arrived = this.moveToNextStep()
        if (arrived) {
            this.previousTile    = { ...this.physicalTilePos }
            this.physicalTilePos = { ...this.nextTile }
            this.substate        = Substep.incrementStep
            return true
        }
        return false
    }

    private moveToNextStep(): boolean {
        const spd = this.defaultSpeedVec.x
        const dx  = this.nextStep.x - this.worldPos.x
        const dy  = this.nextStep.y - this.worldPos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= spd) {
            this.worldPos    = { ...this.nextStep }
            this.currentSpeed = { x: dx, y: dy }
            return true
        }
        const ratio = spd / dist
        const vx = Math.trunc(dx * ratio)
        const vy = Math.trunc(dy * ratio)
        this.currentSpeed  = { x: vx, y: vy }
        this.worldPos.x   += vx
        this.worldPos.y   += vy
        return false
    }

    private recalcNextStep(): void {
        this.worldPos    = this.tileToWorld(this.physicalTilePos.x, this.physicalTilePos.y)

        const blocked = this.dodgeBlockedTiles
        this.dodgeBlockedTiles = []

        if (!this.pathToFollow || this.pathToFollow.length === 0) { this.setLastPos(); return }

        let nextTileIJ = this.pathToFollow.pop()!
        let newPath = this.pathFinder.findShortestPath(
            this.physicalTilePos.x, this.physicalTilePos.y, nextTileIJ.i, nextTileIJ.j, blocked)

        while (!newPath) {
            if (!this.pathToFollow || this.pathToFollow.length === 0) { this.setLastPos(); return }
            nextTileIJ = this.pathToFollow.pop()!
            newPath = this.pathFinder.findShortestPath(
                this.physicalTilePos.x, this.physicalTilePos.y, nextTileIJ.i, nextTileIJ.j, blocked)
        }

        const detour = newPath
        const firstStep = detour.pop()!
        this.nextTile = { x: firstStep.i, y: firstStep.j }
        this.nextStep = this.tileToWorld(this.nextTile.x, this.nextTile.y)
        this.pathToFollow = [...(this.pathToFollow ?? []), ...detour]
    }

    private setLastPos(): void {
        this.nextTile = { ...this.physicalTilePos }
        this.nextStep = this.tileToWorld(this.nextTile.x, this.nextTile.y)
    }

    private getDirection(targetX: number, targetY: number): number {
        const dx = targetX - this.worldPos.x
        const dy = targetY - this.worldPos.y
        if (dx === 0 && dy === 0) return -1
        let angle = Math.atan2(dy, dx) * 180 / Math.PI
        if (angle < 0) angle += 360
        const index   = Math.trunc((angle + 22.5) / 45) % 8
        const mapping = [2, 3, 4, 5, 6, 7, 0, 1]
        return mapping[index]
    }

    private findRandomPatrolPath(i: number, j: number): { i: number; j: number }[] | null {
        const map = MapObject.map
        if (!map) return null
        const range = Unit.Constants.patrolRandomMax - Unit.Constants.patrolRandomMin
        for (let attempt = 0; attempt < 20; attempt++) {
            const offI = Math.floor(Math.random() * range) + Unit.Constants.patrolRandomMin
            const offJ = Math.floor(Math.random() * range) + Unit.Constants.patrolRandomMin
            const si   = Math.random() < 0.5 ? 1 : -1
            const sj   = Math.random() < 0.5 ? 1 : -1
            const di   = this.patrolPosition.x + si * offI
            const dj   = this.patrolPosition.y + sj * offJ
            if (!map.isWalkable(di, dj)) continue
            const path = this.pathFinder.findShortestPath(i, j, di, dj)
            if (path) return path
        }
        return null
    }

    // MARK: - Pursuit / attack

    /// Chases the enemy: the path is recalculated whenever it changes tile, and the unit
    /// starts shooting once closer than its range. Returns true if the unit moved to a new tile.
    private updatePursuingUnitState(): boolean {
        const enemy = this.enemy
        if (!enemy) { this.setState(UnitState.idle); return false }
        if (enemy.isDead()) { this.enemy = null; this.setState(UnitState.idle); return false }

        this.nextStateValue = UnitState.attacking
        const ep = enemy.physicalTilePos

        if (this.targetPos.x !== ep.x || this.targetPos.y !== ep.y) {
            this.targetPos = { ...ep }
            const path = this.pathFinder.findShortestPath(
                this.physicalTilePos.x, this.physicalTilePos.y, ep.x, ep.y)
            if (!path || path.length === 0) { this.setState(UnitState.idle); return false }
            this.pathToFollow = path.slice(0, -1)   // the last node is the start
            this.substate = Substep.incrementStep
        }

        if (this.calculateDistance(ep.x, ep.y) < this.attackRange) {
            this.aimAtUnit(enemy)
            this.setState(UnitState.attacking)
            return false
        }
        return this.followPath()
    }

    /// Shoots the enemy every `attackInterval` frames, following it while it stays in range
    /// and chasing it when it leaves.
    private updateAttackingState(): void {
        const enemy = this.enemy
        if (!enemy) { this.setState(UnitState.idle); return }
        if (enemy.isDead()) { this.enemy = null; this.setState(UnitState.idle); return }

        // If the enemy moved, aim again, or chase it if it's out of range.
        const ep = enemy.physicalTilePos
        if (this.targetPos.x !== ep.x || this.targetPos.y !== ep.y) {
            if (this.calculateDistance(ep.x, ep.y) < this.attackRange) {
                this.aimAtUnit(enemy)
                this.targetPos = { ...ep }
            } else {
                this.setState(UnitState.pursuingUnit)
                this.nextStateValue = UnitState.attacking
            }
        }

        // The original compares before counting, so a shot comes one frame after the interval.
        const ready = this.count >= this.attackInterval
        this.count++
        if (!ready) return

        this.playShotSound()
        this.count = 0
        enemy.takeDamage(this.attackPoints)
        if (enemy.isDead()) { this.enemy = null; this.setState(UnitState.idle) }
    }

    private aimAtUnit(enemy: Unit): void {
        this.enemy = enemy
        const di = enemy.physicalTilePos.x - this.physicalTilePos.x
        const dj = enemy.physicalTilePos.y - this.physicalTilePos.y
        let angle = Math.atan2(dj, di) * 180 / Math.PI
        if (angle < 0) angle += 360
        const index   = Math.trunc((angle + 22.5) / 45) % 8
        const mapping = [2, 3, 4, 5, 6, 7, 0, 1]
        this.direction = mapping[index]
    }

    /// The unit is dead after `deathFrameCount` frames (its animation plays the death once).
    private updateDyingState(): void {
        if (this.count === 0) {
            // The original plays the Patricio's death sound for every unit, British ones included.
            this.sound.play(Res.SFX_MUERTE_PATRICIO, 0)
        }
        if (this.count >= Unit.Constants.deathFrameCount) { this.setState(UnitState.dead); return }
        this.count++
    }

    private playShotSound(): void {
        const sfx = this.faction === 'argentine' ? Res.SFX_DISPARO_PATRICIO : Res.SFX_DISPARO_INGLES
        this.sound.play(sfx, 0)
    }

    /// Recovers `recoveryPoints` health every `ticksPerRecovery` counts until full.
    private updateHealingState(): void {
        // The original counts each frame twice (two increments), so recoveries come
        // about twice as often as ticksPerRecovery suggests.
        this.count++
        const due = this.count > this.ticksPerRecovery
        this.count++
        if (!due) return

        this.count = 0
        this.health += this.recoveryPoints_
        if (this.health >= this.resistancePoints) {
            this.health = this.resistancePoints
            this.setState(UnitState.idle)
        }
    }

    private checkOrderCompleted(): void {
        if (!this.objectiveCommand) return
        const id = this.objectiveCommand.id
        if (id === CommandKind.move || id === CommandKind.takeObject) {
            if (this.completedMoveObjective()) this.completedOrder = true
        }
    }
}
