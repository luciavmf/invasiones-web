// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// A* on hand-made grids, as the macOS port's PathFinderTests.

import { describe, expect, test } from 'vitest'
import { PathFinder } from './PathFinder'
import { TestGrid } from '../../test/support'

type Point = { i: number; j: number }

/// A pathfinder on `grid` with a clock that doesn't move unless the test says so.
function makePathFinder(grid: TestGrid, now: () => number = () => 0): PathFinder {
    const pathFinder = new PathFinder(now)
    pathFinder.loadMap(grid)
    return pathFinder
}

/// Checks that `path` goes from `start` to `target`, only through walkable tiles,
/// one step (straight or diagonal) at a time.
function expectValidPath(path: Point[], start: Point, target: Point, grid: TestGrid): void {
    // The pathfinder returns the destination first and the origin last.
    expect(path[0]).toEqual(target)
    expect(path[path.length - 1]).toEqual(start)
    for (const p of path) expect(grid.isWalkable(p.i, p.j)).toBe(true)
    for (let n = 1; n < path.length; n++) {
        const a = path[n - 1], b = path[n]
        expect(Math.max(Math.abs(a.i - b.i), Math.abs(a.j - b.j))).toBe(1)
    }
}

describe('PathFinder', () => {
    test('a straight line on an open grid', () => {
        const path = makePathFinder(new TestGrid(['.....'])).findShortestPath(0, 0, 0, 4)

        expect(path).toEqual([{ i: 0, j: 4 }, { i: 0, j: 3 }, { i: 0, j: 2 }, { i: 0, j: 1 }, { i: 0, j: 0 }])
    })

    test('prefers a diagonal over two straight steps', () => {
        // A diagonal costs 14 and two straight steps cost 20, so (0,0) → (2,2) is three points.
        const path = makePathFinder(new TestGrid(['...', '...', '...'])).findShortestPath(0, 0, 2, 2)

        expect(path).toEqual([{ i: 2, j: 2 }, { i: 1, j: 1 }, { i: 0, j: 0 }])
    })

    test('goes around a wall', () => {
        const grid = new TestGrid(['.....', '###..', '.....'])
        const path = makePathFinder(grid).findShortestPath(0, 0, 2, 0)!

        expectValidPath(path, { i: 0, j: 0 }, { i: 2, j: 0 }, grid)
        expect(path).toContainEqual({ i: 1, j: 3 })
    })

    test('does not cut corners past blocked tiles', () => {
        // A diagonal step is only allowed when both adjacent straight tiles are walkable.
        const path = makePathFinder(new TestGrid(['.#', '..'])).findShortestPath(0, 0, 1, 1)

        expect(path).toEqual([{ i: 1, j: 1 }, { i: 1, j: 0 }, { i: 0, j: 0 }])
    })

    test('returns null when the target is enclosed', () => {
        const grid = new TestGrid(['.....', '..###', '..#.#', '..###'])

        expect(makePathFinder(grid).findShortestPath(0, 0, 2, 3)).toBeNull()
    })

    test('returns null when the target is not walkable', () => {
        expect(makePathFinder(new TestGrid(['..#'])).findShortestPath(0, 0, 0, 2)).toBeNull()
    })

    test('returns null when the target is out of bounds', () => {
        expect(makePathFinder(new TestGrid(['...'])).findShortestPath(0, 0, 5, 5)).toBeNull()
    })

    test('avoids extra blocked tiles', () => {
        const grid = new TestGrid(['...', '...', '...'])
        const path = makePathFinder(grid).findShortestPath(0, 0, 2, 2, [{ i: 1, j: 1 }])!

        expectValidPath(path, { i: 0, j: 0 }, { i: 2, j: 2 }, grid)
        expect(path).not.toContainEqual({ i: 1, j: 1 })
    })

    test('returns null when the target is an extra blocked tile', () => {
        expect(makePathFinder(new TestGrid(['...'])).findShortestPath(0, 0, 0, 2, [{ i: 0, j: 2 }])).toBeNull()
    })

    test('sees tiles blocked after loading', () => {
        // In the game, Map.invalidateTile blocks tiles while a level is running.
        const grid = new TestGrid(['...', '...'])
        const pathFinder = makePathFinder(grid)
        grid.block(0, 1)

        const path = pathFinder.findShortestPath(0, 0, 0, 2)!

        expect(path).not.toContainEqual({ i: 0, j: 1 })
        expectValidPath(path, { i: 0, j: 0 }, { i: 0, j: 2 }, grid)
    })

    test('times out on slow searches', () => {
        // Each clock read moves time forward past the 4.5 s limit.
        let time = 0
        const pathFinder = makePathFinder(new TestGrid(['.....']), () => (time += 5000))

        expect(pathFinder.findShortestPath(0, 0, 0, 4)).toBeNull()
    })

    test('returns null without a grid', () => {
        expect(new PathFinder().findShortestPath(0, 0, 0, 1)).toBeNull()
    })
})
