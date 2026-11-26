// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// Attacking, dying, healing, patrolling and move objectives, checked against the C#
// original (Unidad.cs). The same rules are tested in the macOS port (UnitCombatTests).

import { beforeEach, describe, expect, test } from 'vitest'
import { Unit } from './Unit'
import { Command, CommandKind } from '../level/Command'
import { Res } from '../resources/Res'
import { openField, type FakeSound } from '../../test/support'

let makeUnit: ReturnType<typeof openField>['makeUnit']
let sound: FakeSound

beforeEach(() => {
    ({ makeUnit, sound } = openField())
})

function update(unit: Unit, times: number): void {
    for (let n = 0; n < times; n++) unit.update()
}

describe('attacking', () => {
    test('attacking an enemy in range starts shooting', () => {
        const attacker = makeUnit(0)
        const enemy = makeUnit(3, 20, 'enemy')

        attacker.attack(enemy)
        attacker.update()

        expect(attacker.currentState).toBe('attacking')
    })

    test('an idle target in range fights back', () => {
        const attacker = makeUnit(0)
        const enemy = makeUnit(3, 20, 'enemy')

        attacker.attack(enemy)
        attacker.update()

        expect(enemy.currentState).toBe('attacking')
    })

    test('a busy target does not fight back', () => {
        const attacker = makeUnit(0)
        const enemy = makeUnit(3, 20, 'enemy')
        enemy.move(20, 30)

        attacker.attack(enemy)
        attacker.update()

        expect(enemy.currentState).toBe('moving')
    })

    test('each shot comes one frame after the interval', () => {
        const attacker = makeUnit(0)
        const enemy = makeUnit(3, 20, 'enemy')
        attacker.attack(enemy)
        attacker.update()

        // Only the attacker is updated, so only it shoots.
        update(attacker, attacker.attackInterval)
        expect(enemy.health).toBe(enemy.resistancePoints)

        update(attacker, 1)
        expect(enemy.health).toBe(enemy.resistancePoints - attacker.attackPoints)

        update(attacker, attacker.attackInterval + 1)
        expect(enemy.health).toBe(enemy.resistancePoints - 2 * attacker.attackPoints)
        expect(sound.played.filter(id => id === Res.SFX_DISPARO_PATRICIO)).toHaveLength(2)
    })

    test('enemy shots play the British shot sound', () => {
        const attacker = makeUnit(0, 20, 'enemy')
        const target = makeUnit(3)
        attacker.attack(target)

        update(attacker, attacker.attackInterval + 2)

        expect(sound.played).toContain(Res.SFX_DISPARO_INGLES)
        expect(sound.played).not.toContain(Res.SFX_DISPARO_PATRICIO)
    })

    test('killing the enemy ends the attack on the same frame', () => {
        const attacker = makeUnit(0)
        const enemy = makeUnit(3, 20, 'enemy')
        enemy.takeDamage(enemy.resistancePoints - 1)
        attacker.attack(enemy)
        attacker.update()

        update(attacker, attacker.attackInterval + 1)

        expect(enemy.isDead()).toBe(true)
        expect(attacker.currentState).toBe('idle')
    })

    test('attacking a dead enemy does nothing', () => {
        const attacker = makeUnit(0)
        const enemy = makeUnit(3, 20, 'enemy')
        enemy.takeDamage(enemy.resistancePoints)

        attacker.attack(enemy)
        attacker.update()

        expect(attacker.currentState).toBe('idle')
    })
})

describe('pursuing', () => {
    test('an enemy out of range is chased', () => {
        const attacker = makeUnit(0)
        const enemy = makeUnit(12, 20, 'enemy')

        attacker.attack(enemy)
        attacker.update()

        expect(attacker.currentState).toBe('pursuingUnit')
        expect(attacker.pathToFollow).not.toBeNull()
    })

    test('at exactly the range the unit still chases', () => {
        const attacker = makeUnit(0)
        const enemy = makeUnit(attacker.range, 20, 'enemy')

        attacker.attack(enemy)
        attacker.update()

        expect(attacker.currentState).toBe('pursuingUnit')
    })

    test('the chase follows an enemy that moves', () => {
        const attacker = makeUnit(0)
        const enemy = makeUnit(12, 20, 'enemy')
        attacker.attack(enemy)
        attacker.update()

        enemy.setTilePosition(25, 14)
        attacker.update()

        expect(attacker.pathToFollow?.[0]).toEqual({ i: 25, j: 14 })
    })

    test('a chase ends in an attack once in range', () => {
        const attacker = makeUnit(0)
        const enemy = makeUnit(12, 20, 'enemy')
        attacker.attack(enemy)

        for (let n = 0; n < 500 && attacker.currentState !== 'attacking'; n++) attacker.update()

        expect(attacker.currentState).toBe('attacking')
        expect(attacker.calculateDistance(enemy.physicalTilePos.x, enemy.physicalTilePos.y))
            .toBeLessThan(attacker.range)
    })
})

describe('dying', () => {
    test('a unit with no health left dies', () => {
        const unit = makeUnit(0)

        unit.takeDamage(unit.resistancePoints)

        expect(unit.health).toBe(0)
        expect(unit.currentState).toBe('dying')
        expect(unit.isDead()).toBe(true)
    })

    test('every dying unit plays the Patricio death sound on its next frame', () => {
        const unit = makeUnit(0, 20, 'enemy')
        unit.takeDamage(unit.resistancePoints)
        expect(sound.played).toEqual([])

        unit.update()

        expect(sound.played).toEqual([Res.SFX_MUERTE_PATRICIO])
    })

    test('a dying unit is dead after the death frames', () => {
        const unit = makeUnit(0)
        unit.takeDamage(unit.resistancePoints)

        update(unit, Unit.Constants.deathFrameCount)
        expect(unit.currentState).toBe('dying')

        update(unit, 1)
        expect(unit.currentState).toBe('dead')
    })
})

describe('healing', () => {
    test('healing recovers health until full', () => {
        const unit = makeUnit(0)
        unit.takeDamage(50)
        unit.recoverHealth()

        update(unit, 200)

        expect(unit.health).toBe(unit.resistancePoints)
        expect(unit.currentState).toBe('idle')
    })

    test('a recovery comes every half the ticks between recoveries', () => {
        const unit = makeUnit(0)
        unit.takeDamage(50)
        unit.recoverHealth()

        // The original counts each frame twice, so 50 ticks take 26 frames.
        update(unit, 25)
        expect(unit.health).toBe(50)

        update(unit, 1)
        expect(unit.health).toBe(70)
    })
})

describe('patrolling', () => {
    test('patrols head 8 to 15 tiles from the start', () => {
        const unit = makeUnit(20)

        unit.patrol()

        expect(unit.currentState).toBe('patrolling')
        const destination = unit.pathToFollow?.[0]
        expect(destination).toBeDefined()
        expect(Math.abs(destination!.i - 20)).toBeGreaterThanOrEqual(8)
        expect(Math.abs(destination!.i - 20)).toBeLessThanOrEqual(15)
        expect(Math.abs(destination!.j - 20)).toBeGreaterThanOrEqual(8)
        expect(Math.abs(destination!.j - 20)).toBeLessThanOrEqual(15)
    })
})

describe('move objectives', () => {
    // The original counts a move objective as met when the unit is fewer than 3 tiles
    // away on each axis.
    test.each([
        [0, 0, true], [2, 2, true], [-2, 2, true],
        [3, 0, false], [0, -3, false], [2, 3, false],
    ])('offset (%i, %i) met: %s', (di, dj, met) => {
        const unit = makeUnit(10, 10)
        unit.setObjectiveCommand(new Command(CommandKind.move, 10 + di, 10 + dj))

        expect(unit.completedMoveObjective()).toBe(met)
    })

    test('without an objective no move objective is met', () => {
        expect(makeUnit(10, 10).completedMoveObjective()).toBe(false)
    })
})
