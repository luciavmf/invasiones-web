// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Unit }        from './Unit'
import { Command, CommandKind } from '../level/Command'
import type { IA }     from '../ai/IA'
import type { Map }    from '../map/Map'

const GroupState = {
    waitingCommand:  'waitingCommand',
    grouping:        'grouping',
    moving:          'moving',
    healing:         'healing',
    attacking:       'attacking',
    eliminating:     'eliminating',
    pursuingEnemy:   'pursuingEnemy',
} as const
type GroupState = typeof GroupState[keyof typeof GroupState]

/// A squad of units sharing a movement strategy.
export class Group {

    static map: Map | null = null

    readonly id: number
    ai: IA | null = null
    units: Unit[]

    private stateValue: GroupState = GroupState.waitingCommand
    private nextStateValue: GroupState = GroupState.waitingCommand
    private objectiveCommand: Command | null = null
    private receivedCommand:  Command | null = null
    private targetTile  = { x: 0, y: 0 }
    private completedOrder = false
    private speed_ = 100
    private commander: Unit | null = null
    private avgHealth_    = 0
    private avgResistance_= 0

    get currentState():    GroupState { return this.stateValue }
    get soldierCount():    number     { return this.units.length }
    get health():          number     { return this.avgHealth_ }
    get resistancePoints():number     { return this.avgResistance_ }
    get maxSpeed():        number     { return this.speed_ }
    set maxSpeed(v: number)           { this.speed_ = v }

    private _isSelected = false
    get isSelected(): boolean { return this._isSelected }
    set isSelected(v: boolean) {
        this._isSelected = v
        this.units.forEach(u => u.isSelected = v)
    }

    constructor(units: Unit[]) {
        this.id    = Math.floor(Math.random() * 100000)
        this.units = units
        this.speed_= 100
        this.avgResistance_ = 0
        for (const u of units) {
            u.joinGroup(this)
            if (u.speed.x < this.speed_) this.speed_ = u.speed.x
            this.avgResistance_ += u.resistancePoints
        }
        if (units.length > 0) this.avgResistance_ = Math.trunc(this.avgResistance_ / units.length)
    }

    update(): void {
        switch (this.stateValue) {
            case GroupState.waitingCommand: this.updateWaitingState(); break
            case GroupState.moving:         this.updateMovingState();  break
            case GroupState.grouping:       this.updateGroupingState(); break
            case GroupState.healing:        this.updateHealingState(); break
            case GroupState.eliminating:    return
            case GroupState.pursuingEnemy:  break
            case GroupState.attacking:      break
        }

        this.checkHealthAndOrder()
        this.removeDeadUnits()

        if (this.units.length <= 1) this.setState(GroupState.eliminating)
        if (this.commander?.isDead()) this.setAuxCommander()
    }

    move(x: number, y: number): void {
        this.receivedCommand = new Command(CommandKind.move, x, y)
        this.setState(GroupState.grouping)
        this.targetTile = { x, y }
        if (!this.commander) this.setCommander()
        this.nextStateValue = GroupState.waitingCommand
        this.moveUnitsToFormation()
    }

    attack(enemy: Unit): void { this.units.forEach(u => u.attack(enemy)) }

    heal(x: number, y: number): void {
        this.receivedCommand = new Command(CommandKind.heal, x, y)
        if (!this.commander) this.setAuxCommander()
        const map = Group.map
        if (!map || !this.commander) return
        const p = map.getLineOfSightPosition(
            x, this.commander.physicalTilePos.x,
            y, this.commander.physicalTilePos.y)
        if (p.x === -1) return
        this.setHealing(p.x, p.y)
    }

    setAI(intel: IA): void {
        this.ai = intel
        this.setState(GroupState.waitingCommand)
    }

    dissolve(): void { this.units.forEach(u => u.leaveGroup()) }

    removeUnit(unit: Unit): void {
        this.units = this.units.filter(u => u !== unit)
        if (unit === this.commander) {
            this.commander = null
            unit.unmarkCommander()
            this.setAuxCommander()
        }
        if (this.units.length <= 1) this.setState(GroupState.eliminating)
    }

    getLastUnit(): Unit | null {
        return this.units.length === 1 ? this.units[0] : null
    }

    private setState(s: GroupState): void {
        this.stateValue = s
        if (s === GroupState.waitingCommand) {
            this.completedOrder  = false
            this.receivedCommand = null
        }
    }

    private setCommander(): void {
        if (this.units.length === 0) return
        this.commander = this.units[0]
        this.commander.markAsCommander()
    }

    private setAuxCommander(): void {
        if (this.units.length < 2) return
        this.commander = this.units[0]
        this.commander.markAsCommander()
    }

    private setHealing(x: number, y: number): void {
        this.move(x, y)
        this.receivedCommand = new Command(CommandKind.heal, x, y)
        this.nextStateValue  = GroupState.healing
    }

    private updateWaitingState(): void {
        if (!this.ai) return
        if (!this.receivedCommand) this.receivedCommand = this.ai.nextCommand()
        if (this.receivedCommand?.id === CommandKind.move) {
            const ord = this.receivedCommand
            this.setObjectiveCommand(CommandKind.move, ord.point.x, ord.point.y)
            this.move(ord.point.x, ord.point.y)
        }
    }

    private updateGroupingState(): void {
        const allIdle = this.units.every(u => u.currentState === 'idle')
        if (!allIdle) return
        if (!this.receivedCommand) return
        const id = this.receivedCommand.id
        if (id !== CommandKind.move && id !== CommandKind.heal) return

        this.commander?.move(this.targetTile.x, this.targetTile.y)
        if (!this.commander?.pathToFollow) { this.setState(GroupState.waitingCommand); return }

        this.setState(GroupState.moving)
        const path = this.commander.pathToFollow
        if (path) {
            for (const u of this.units) {
                u.calculatePathAtDistance(path, u.formationOffset.x, u.formationOffset.y)
            }
        }
    }

    private updateMovingState(): void {
        const isHeal = this.receivedCommand?.id === CommandKind.heal
        const allIdle = this.units.every(u =>
            u.currentState === 'idle' || (isHeal && u.currentState === 'healing'))

        if (isHeal) {
            for (const u of this.units) {
                if (u.currentState === 'idle' && u.health !== u.resistancePoints) u.recoverHealth()
            }
        }
        if (allIdle) this.setState(this.nextStateValue)
    }

    private updateHealingState(): void {
        if (this.units.every(u => u.health === u.resistancePoints)) {
            this.setState(GroupState.waitingCommand)
        }
    }

    private checkHealthAndOrder(): void {
        if (!this.receivedCommand) return
        this.avgHealth_ = 0
        for (const u of this.units) {
            this.avgHealth_ += u.health
            if (this.receivedCommand.id === CommandKind.move && u.completedMoveObjective()) {
                this.completedOrder = true
            }
        }
        if (this.units.length > 0) {
            this.avgHealth_ = Math.trunc(this.avgHealth_ / this.units.length)
            if (this.completedOrder) this.setState(GroupState.waitingCommand)
        }
    }

    private removeDeadUnits(): void {
        const before = this.units.length
        this.units = this.units.filter(u => !u.isDead())
        if (this.units.length !== before && this.units.length > 0) {
            this.avgResistance_ = Math.trunc(
                this.units.reduce((s, u) => s + u.resistancePoints, 0) / this.units.length)
        }
    }

    private moveUnitsToFormation(): void {
        if (!this.commander) return
        const x = this.commander.physicalTilePos.x
        const y = this.commander.physicalTilePos.y
        const map = Group.map
        if (!map) return

        let i = 0, j = 0, inc = 2, dir = 1, placed = 1, index = 0
        this.commander.formationOffset = { x: 0, y: 0 }

        while (placed < this.units.length && index < this.units.length) {
            const u = this.units[index]
            if (u !== this.commander) {
                if (map.isWalkable(x + i, y + j)) {
                    u.formationOffset = { x: i, y: j }
                    u.move(x + i, y + j)
                    u.setObjectiveCommand(this.objectiveCommand)
                    placed++
                    index++
                }
            } else {
                this.commander.stop()
                index++
            }

            switch (dir) {
                case 1: i += 2; if (i === inc)  dir = 2; break
                case 2: j += 2; if (j === inc)  dir = 3; break
                case 3: i -= 2; if (i === -inc) dir = 0; break
                case 0: j -= 2; if (j === -inc) { dir = 1; inc += 2 } break
            }
        }
    }

    private setObjectiveCommand(kind: typeof CommandKind[keyof typeof CommandKind], x: number, y: number): void {
        this.objectiveCommand = new Command(kind, x, y)
    }
}
