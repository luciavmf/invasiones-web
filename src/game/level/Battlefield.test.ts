// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// Map objects and units placed on a hand-made battlefield, without loading an episode,
// as the macOS port's BattlefieldTests.

import { describe, expect, test } from 'vitest'
import { MapObject } from './MapObject'
import { Camera } from '../map/Camera'
import { PathFinder } from '../pathfinding/PathFinder'
import { Unit } from '../units/Unit'
import { FakeSound, TestGrid } from '../../test/support'

describe('map objects', () => {
    const grid = new TestGrid(['.....'])

    test('tileToWorld uses the battlefield tile size', () => {
        const object = new MapObject({ map: grid, camera: new Camera(0, 0, 600) }, null, 4, 2)

        // x = ((i - j) * 64 / 2) >> 1, y = ((i + j) * 32 / 2) >> 1
        expect(object.worldPos).toEqual({ x: 32, y: 48 })
    })

    test('the screen position follows the camera', () => {
        const camera = new Camera(0, 0, 600)
        camera.x = 100
        camera.y = 50
        const object = new MapObject({ map: grid, camera }, null, 0, 0)

        object.setTilePosition(4, 2)

        expect(object.x).toBe(camera.startX + 32 + 100)
        expect(object.y).toBe(camera.startY + 48 + 50)
    })

    test('units without a battlefield stay at the origin', () => {
        expect(new Unit().tileToWorld(4, 2)).toEqual({ x: 0, y: 0 })
    })
})

describe('units on a battlefield', () => {
    // A corridor with the infirmary's tiles blocked at the far end.
    const grid = new TestGrid(['....##'])

    function makeUnit(i: number, j: number, camera = new Camera(0, 0, 600)): Unit {
        const pathFinder = new PathFinder()
        pathFinder.loadMap(grid)
        const unit = new Unit(undefined, { map: grid, camera }, pathFinder, new FakeSound())
        unit.setTilePosition(i, j)
        return unit
    }

    test('heal walks to the last free tile before the infirmary', () => {
        const unit = makeUnit(0, 0)

        unit.heal(0, 5)

        expect(unit.currentState).toBe('moving')
        expect(unit.pathToFollow).toEqual([{ i: 0, j: 3 }, { i: 0, j: 2 }, { i: 0, j: 1 }])
    })

    test('heal with no free tile leaves the unit idle', () => {
        const unit = makeUnit(0, 4)   // a blocked tile, so the walk finds nothing

        unit.heal(0, 5)

        expect(unit.currentState).toBe('idle')
        expect(unit.pathToFollow).toBeNull()
    })

    test('isOnScreen follows the camera', () => {
        const scrolled = new Camera(0, 0, 600)
        scrolled.x = -2000

        expect(makeUnit(0, 0).isOnScreen()).toBe(true)
        expect(makeUnit(0, 0, scrolled).isOnScreen()).toBe(false)
    })
})
