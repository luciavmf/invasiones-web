// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import type { Surface }   from '../rendering/Surface'
import type { AnimObject } from './AnimObject'

export const CommandKind = {
    invalid:    -1,
    takeObject:  0,
    move:        1,
    attack:      2,
    patrol:      3,
    heal:        4,
    trigger:     5,
    kill:        6,
} as const
export type CommandKind = typeof CommandKind[keyof typeof CommandKind]

/// Represents a single order that a unit or group must carry out.
export class Command {
    readonly id:        CommandKind
    readonly point:     { x: number; y: number }
    readonly image:     Surface    | null
    readonly animation: AnimObject | null
    readonly width:     number

    constructor(
        kind:    CommandKind,
        x:       number,
        y:       number,
        extra?:  number | AnimObject | Surface | null,
    ) {
        this.id    = kind
        this.point = { x, y }
        this.image = null
        this.animation = null
        this.width = 0

        if (typeof extra === 'number') {
            // kill command with width
            ;(this as any).width = extra
        } else if (extra != null && 'texture' in extra) {
            // takeObject command with Surface image
            ;(this as any).image = extra
        } else if (extra != null) {
            // trigger command with AnimObject
            ;(this as any).animation = extra
        }
    }
}
