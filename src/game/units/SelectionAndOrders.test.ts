// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// Selecting units and giving them orders through ArgentineTeam.handle, as the macOS
// port's SelectionAndOrderTests.

import { beforeEach, describe, expect, test } from 'vitest'
import { ArgentineTeam } from './ArgentineTeam'
import { Player } from './Player'
import { Unit, type UnitFaction } from './Unit'
import type { PlayerIntent } from './PlayerIntent'
import { Camera } from '../map/Camera'
import { Map } from '../map/Map'
import { ObjectTable } from '../level/ObjectTable'
import { Hud } from '../level/Hud'
import { PathFinder } from '../pathfinding/PathFinder'
import { FakePointer, FakeSound, TestGrid } from '../../test/support'

// Infirmary tiles blocked at the far end of a corridor.
const grid = new TestGrid(['........##', '..........'])
const camera = new Camera(0, 0, 600)
/// A rectangle that covers every unit on screen.
const everything: PlayerIntent = { kind: 'selectInRect', x: -10000, y: -10000, w: 20000, h: 20000 }

let pathFinder: PathFinder
let team: ArgentineTeam

beforeEach(() => {
    pathFinder = new PathFinder()
    pathFinder.loadMap(grid)
    team = new ArgentineTeam(new Map(camera), camera, new ObjectTable([]), new Hud(), new FakePointer())
})

/// Places a unit of the given faction on the first row; Argentine units join the team.
function addUnit(j: number, faction: UnitFaction = 'argentine'): Unit {
    const unit = new Unit(undefined, { map: grid, camera }, pathFinder, new FakeSound())
    unit.faction = faction
    unit.setTilePosition(0, j)
    if (faction === 'argentine') team.units.push(unit)
    return unit
}

function addUnits(count: number): Unit[] {
    return Array.from({ length: count }, (_, j) => addUnit(j))
}

describe('drag selection', () => {
    test('dragging over one unit selects it', () => {
        const unit = addUnit(0)

        team.handle(everything)

        expect(team.selectedUnit).toBe(unit)
        expect(team.selectedGroup).toBeNull()
        expect(unit.isSelected).toBe(true)
    })

    test('dragging over several units forms a selected group', () => {
        const units = addUnits(3)

        team.handle(everything)

        const group = team.selectedGroup!
        expect(group).not.toBeNull()
        expect(team.selectedUnit).toBeNull()
        expect(group.isSelected).toBe(true)
        expect(group.soldierCount).toBe(3)
        expect(units.every(u => u.isSelected && u.myGroup === group)).toBe(true)
    })

    test('drag selection stops at six units', () => {
        const units = addUnits(8)

        team.handle(everything)

        expect(team.selectedGroup?.soldierCount).toBe(Player.maxSelectedUnits)
        expect(units.slice(0, 6).every(u => u.isSelected)).toBe(true)
        expect(units.slice(6).every(u => !u.isSelected && u.myGroup === null)).toBe(true)
    })

    test('drag selection only picks units inside the rectangle', () => {
        const inside = addUnit(0)
        const outside = addUnit(9)

        // Just around the first unit (sprite 20×30 by default); the other is 144 px to the left.
        team.handle({ kind: 'selectInRect', x: inside.x - 15, y: inside.y - 20, w: 30, h: 30 })

        expect(team.selectedUnit).toBe(inside)
        expect(outside.isSelected).toBe(false)
    })

    test('drag selection is ignored while something is selected', () => {
        const first = addUnit(0)
        const second = addUnit(1)
        team.handle({ kind: 'select', unit: first })

        team.handle(everything)

        expect(team.selectedUnit).toBe(first)
        expect(second.isSelected).toBe(false)
    })
})

describe('clicking', () => {
    test('clicking a unit selects only it', () => {
        const first = addUnit(0)
        const second = addUnit(1)
        team.handle({ kind: 'select', unit: first })

        team.handle({ kind: 'select', unit: second })

        expect(team.selectedUnit).toBe(second)
        expect(first.isSelected).toBe(false)
        expect(second.isSelected).toBe(true)
    })

    test('clicking a unit takes it out of its group', () => {
        const units = addUnits(3)
        team.handle(everything)
        const group = team.selectedGroup!

        team.handle({ kind: 'select', unit: units[0] })

        expect(team.selectedGroup).toBeNull()
        expect(team.selectedUnit).toBe(units[0])
        expect(units[0].myGroup).toBeNull()
        expect(group.soldierCount).toBe(2)
        expect(units[1].isSelected).toBe(false)
    })

    test('enemy units cannot be selected', () => {
        const enemy = addUnit(0, 'enemy')

        team.handle({ kind: 'select', unit: enemy })

        expect(team.selectedUnit).toBeNull()
        expect(enemy.isSelected).toBe(false)
    })

    test('deselect clears a unit or a group', () => {
        const units = addUnits(3)
        team.handle(everything)

        team.handle({ kind: 'deselect' })

        expect(team.hasSelection).toBe(false)
        expect(units.every(u => !u.isSelected)).toBe(true)
        expect(team.hud.selectedUnit).toBeNull()
    })
})

describe('orders', () => {
    test('move sends the selected unit', () => {
        const unit = addUnit(0)
        team.handle({ kind: 'select', unit })

        team.handle({ kind: 'move', x: 1, y: 5 })

        expect(unit.currentState).toBe('moving')
        expect(unit.pathToFollow?.[0]).toEqual({ i: 1, j: 5 })
    })

    test('move sends the selected group into formation', () => {
        addUnits(3)
        team.handle(everything)

        team.handle({ kind: 'move', x: 1, y: 5 })

        expect(team.selectedGroup?.currentState).toBe('grouping')
    })

    test('orders without a selection do nothing', () => {
        const unit = addUnit(0)
        const enemy = addUnit(5, 'enemy')

        team.handle({ kind: 'move', x: 1, y: 5 })
        team.handle({ kind: 'attack', enemy })

        expect(unit.currentState).toBe('idle')
    })

    test('attack sends the unit after the enemy', () => {
        const unit = addUnit(0)
        const enemy = addUnit(5, 'enemy')
        team.handle({ kind: 'select', unit })

        team.handle({ kind: 'attack', enemy })

        expect(unit.currentState).toBe('pursuingUnit')
    })

    test('attack sends every unit of the group', () => {
        const units = addUnits(3)
        const enemy = addUnit(5, 'enemy')
        team.handle(everything)

        team.handle({ kind: 'attack', enemy })

        expect(units.every(u => u.currentState === 'pursuingUnit')).toBe(true)
    })

    test('heal only sends hurt units', () => {
        const unit = addUnit(0)
        team.handle({ kind: 'select', unit })

        team.handle({ kind: 'heal', x: 0, y: 9 })
        expect(unit.currentState).toBe('idle')

        unit.takeDamage(10)
        team.handle({ kind: 'heal', x: 0, y: 9 })
        expect(unit.currentState).toBe('moving')
    })
})
