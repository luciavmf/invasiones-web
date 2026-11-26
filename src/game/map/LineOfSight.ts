// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// Port of Mapa.ObtenerPosicionEnLineaDeVision. It only needs walkability, so it works on
// any WalkableGrid (the map in the game, hand-made grids in tests), as in the macOS port
// (LineOfSight.swift).

import type { WalkableGrid } from '../pathfinding/PathFinder'

/// Walks from (x1, y1) toward (x2, y2) along a straight line and returns the first
/// walkable tile it finds, or `null` if there is none.
export function lineOfSightPosition(
    grid: WalkableGrid, x1: number, x2: number, y1: number, y2: number,
): { x: number; y: number } | null {
    let col = x1, row = y1
    const rs = rowSlope(x1, x2, y1, y2)
    const cs = columnSlope(x1, x2, y1, y2)
    if (Math.abs(rs) === 1) {
        while (Math.trunc(row) !== y2) {
            if (grid.isWalkable(Math.trunc(col), Math.trunc(row))) return { x: Math.trunc(col), y: Math.trunc(row) }
            row += rs; col += cs
        }
    } else {
        while (Math.trunc(col) !== x2) {
            if (grid.isWalkable(Math.trunc(col), Math.trunc(row))) return { x: Math.trunc(col), y: Math.trunc(row) }
            row += rs; col += cs
        }
    }
    return null
}

function rowSlope(x1: number, x2: number, y1: number, y2: number): number {
    if (Math.abs(y2 - y1) > Math.abs(x2 - x1)) return y2 > y1 ? 1 : -1
    const d = Math.abs(y2 - y1) / Math.abs(x2 - x1)
    return d * (y2 > y1 ? 1 : -1)
}

function columnSlope(x1: number, x2: number, y1: number, y2: number): number {
    if (Math.abs(x2 - x1) > Math.abs(y2 - y1)) return x2 > x1 ? 1 : -1
    const d = Math.abs(x2 - x1) / Math.abs(y2 - y1)
    return d * (x2 > x1 ? 1 : -1)
}
