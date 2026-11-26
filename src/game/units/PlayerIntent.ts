// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// What the player asks the team to do, as in the macOS port (PlayerIntent.swift).

import type { Unit } from './Unit'

export type PlayerIntent =
    /// Select the team's units inside a screen rectangle (a finished drag).
    | { kind: 'selectInRect'; x: number; y: number; w: number; h: number }
    /// Select one of the team's units (a click on it).
    | { kind: 'select'; unit: Unit }
    /// Clear the selection (a click elsewhere).
    | { kind: 'deselect' }
    /// Send the selection to a tile.
    | { kind: 'move'; x: number; y: number }
    /// Send the selection after an enemy unit.
    | { kind: 'attack'; enemy: Unit }
    /// Send the selection to heal at the infirmary tile that was clicked.
    | { kind: 'heal'; x: number; y: number }
