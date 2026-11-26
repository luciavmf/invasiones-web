// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// Turning the mouse into intents and picking the cursor, as the macOS port's
// PlayerInputTests.

import { beforeEach, describe, expect, test } from 'vitest'
import { PlayerInput } from './PlayerInput'
import { Unit, type UnitFaction } from './Unit'
import { Mouse } from '../input/Mouse'
import { FakeInputMap, FakePointer, FakeSound } from '../../test/support'

const left = Mouse.Constants.leftButton
const right = Mouse.Constants.rightButton

let pointer: FakePointer
let map: FakeInputMap
let input: PlayerInput

beforeEach(() => {
    pointer = new FakePointer()
    map = new FakeInputMap()
    input = new PlayerInput(map, pointer)
})

function makeUnit(faction: UnitFaction): Unit {
    const unit = new Unit(undefined, null, undefined, new FakeSound())
    unit.faction = faction
    return unit
}

describe('dragging', () => {
    test('a finished drag selects inside its rectangle', () => {
        pointer.finishedDragging = true
        pointer.dragRect = { x: 10, y: 20, width: 30, height: 40 }

        expect(input.dragSelection()).toEqual({ kind: 'selectInRect', x: 10, y: 20, w: 30, h: 40 })
    })

    test('a drag under four pixels either way is ignored', () => {
        pointer.finishedDragging = true
        pointer.dragRect = { x: 10, y: 20, width: 30, height: 3 }

        expect(input.dragSelection()).toBeNull()
    })

    test('a drag still in progress selects nothing', () => {
        pointer.dragging = true
        pointer.dragRect = { x: 10, y: 20, width: 30, height: 40 }

        expect(input.dragSelection()).toBeNull()
    })
})

describe('left clicks', () => {
    test('a left click on an Argentine unit selects it', () => {
        const unit = makeUnit('argentine')
        pointer.press(left)

        expect(input.clickIntents(unit, false)).toEqual([{ kind: 'select', unit }])
        expect(pointer.pressedButtons.has(left)).toBe(false)
    })

    test('a left click on an enemy without a selection does nothing', () => {
        pointer.press(left)

        expect(input.clickIntents(makeUnit('enemy'), false)).toEqual([])
    })

    test('a left click elsewhere deselects', () => {
        pointer.press(left)

        expect(input.clickIntents(null, true)).toEqual([{ kind: 'deselect' }])
        expect(input.clickIntents(makeUnit('enemy'), true)).toEqual([{ kind: 'deselect' }])
    })

    test('holding the button while dragging a rectangle is not a click', () => {
        pointer.press(left)
        pointer.dragging = true
        pointer.dragRect = { x: 0, y: 0, width: 10, height: 10 }

        expect(input.clickIntents(makeUnit('argentine'), true)).toEqual([])
    })
})

describe('right clicks', () => {
    test('a right click on a walkable tile moves there', () => {
        pointer.press(right)

        expect(input.clickIntents(null, true)).toEqual([{ kind: 'move', x: 3, y: 4 }])
        expect(pointer.pressedButtons.size).toBe(0)
    })

    test('a right click on a live enemy attacks it', () => {
        const enemy = makeUnit('enemy')
        pointer.press(right)

        expect(input.clickIntents(enemy, true)).toEqual([{ kind: 'attack', enemy }])
    })

    test('a right click on a dead enemy or an own unit moves there', () => {
        const dead = makeUnit('enemy')
        dead.takeDamage(1000)

        pointer.press(right)
        expect(input.clickIntents(dead, true)).toEqual([{ kind: 'move', x: 3, y: 4 }])

        pointer.press(right)
        expect(input.clickIntents(makeUnit('argentine'), true)).toEqual([{ kind: 'move', x: 3, y: 4 }])
    })

    test('a right click on an infirmary heals there', () => {
        map.walkable = false
        map.infirmary = true
        pointer.press(right)

        expect(input.clickIntents(null, true)).toEqual([{ kind: 'heal', x: 3, y: 4 }])
    })

    test('a right click on another blocked tile is used up without an order', () => {
        map.walkable = false
        pointer.press(right)

        expect(input.clickIntents(null, true)).toEqual([])
        expect(pointer.pressedButtons.size).toBe(0)
    })

    test('a right click without a selection is left alone', () => {
        pointer.press(right)

        expect(input.clickIntents(null, false)).toEqual([])
        expect([...pointer.pressedButtons]).toEqual([right])
    })

    test('selecting and ordering in the same frame', () => {
        const unit = makeUnit('argentine')
        pointer.press(left)
        pointer.press(right)

        expect(input.clickIntents(unit, false)).toEqual([{ kind: 'select', unit }, { kind: 'move', x: 3, y: 4 }])
    })
})

describe('cursor', () => {
    test('normal without a selection', () => {
        map.infirmary = true

        expect(input.cursor(makeUnit('enemy'), false, true)).toBe('normal')
    })

    test('an attack over an enemy', () => {
        expect(input.cursor(makeUnit('enemy'), true, false)).toBe('attack')
        expect(input.cursor(makeUnit('argentine'), true, false)).toBe('normal')
    })

    test('healing over an infirmary, only for a hurt selection', () => {
        map.infirmary = true

        expect(input.cursor(null, true, true)).toBe('heal')
        expect(input.cursor(null, true, false)).toBe('normal')
    })
})
