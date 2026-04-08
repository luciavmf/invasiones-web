// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import type { MapObject } from './MapObject'

/// 2-D table of MapObject references indexed by physical tile position.
export class ObjectTable {
    tabla: (MapObject | null)[][]

    constructor(data: (MapObject | null)[][]) {
        this.tabla = data
    }
}
