// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// As the macOS port's LineOfSightTests.

import { expect, test } from 'vitest'
import { lineOfSightPosition } from './LineOfSight'
import { TestGrid } from '../../test/support'

test('returns the start when it is walkable', () => {
    expect(lineOfSightPosition(new TestGrid(['.....']), 0, 0, 0, 4)).toEqual({ x: 0, y: 0 })
})

test('skips blocked tiles toward the target', () => {
    expect(lineOfSightPosition(new TestGrid(['##...']), 0, 0, 0, 4)).toEqual({ x: 0, y: 2 })
})

test('follows diagonals', () => {
    const grid = new TestGrid(['#...', '.#..', '....', '....'])

    expect(lineOfSightPosition(grid, 0, 3, 0, 3)).toEqual({ x: 2, y: 2 })
})

test('never checks the target itself', () => {
    // As in the original: the walk stops before reaching (x2, y2).
    expect(lineOfSightPosition(new TestGrid(['####.']), 0, 0, 0, 4)).toBeNull()
})
