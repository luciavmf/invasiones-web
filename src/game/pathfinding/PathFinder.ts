// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import type { Map } from '../map/Map'

class Node {
    parent: Node | null = null
    costG = 0
    costH = 0
    costF = 0
    i: number
    j: number
    constructor(i: number, j: number) { this.i = i; this.j = j }
    equals(other: Node): boolean { return this.i === other.i && this.j === other.j }
}

/// A* pathfinding on the physical tile grid (2× map resolution).
export class PathFinder {

    static readonly shared = new PathFinder()

    private readonly COST_DIAGONAL = 14
    private readonly COST_STRAIGHT = 10
    private readonly COST_MAX      = 99999
    private readonly TIMEOUT_MS    = 4500

    private map: Map | null = null

    private constructor() {}

    loadMap(map: Map): void {
        this.map = map
    }

    /// Returns the shortest path or null. First element = destination, last = origin.
    findShortestPath(
        startI: number, startJ: number,
        targetI: number, targetJ: number,
    ): { i: number; j: number }[] | null {
        const map = this.map
        if (!map || map.physicalTilesLayer.length === 0) return null
        if (!map.isWalkable(targetI, targetJ)) return null

        const start  = new Node(startI,  startJ)
        const target = new Node(targetI, targetJ)

        const open:   Node[] = [start]
        const closed: Node[] = []
        const t0 = performance.now()

        while (open.length > 0) {
            if (performance.now() - t0 > this.TIMEOUT_MS) return null

            let bestIdx = 0
            for (let k = 1; k < open.length; k++) {
                if (open[k].costF < open[bestIdx].costF) bestIdx = k
            }
            if (open[bestIdx].costF >= this.COST_MAX) return null

            const best = open.splice(bestIdx, 1)[0]

            if (best.equals(target)) {
                closed.push(best)
                return this.reconstructPath(best)
            }

            this.addChildren(best, open, closed, target, map)
            closed.push(best)
        }
        return null
    }

    private addChildren(parent: Node, open: Node[], closed: Node[], target: Node, map: Map): void {
        const up    = this.openNode(parent, parent.i - 1, parent.j,     this.COST_STRAIGHT, open, closed, target, map)
        const right = this.openNode(parent, parent.i,     parent.j + 1, this.COST_STRAIGHT, open, closed, target, map)
        const down  = this.openNode(parent, parent.i + 1, parent.j,     this.COST_STRAIGHT, open, closed, target, map)
        const left  = this.openNode(parent, parent.i,     parent.j - 1, this.COST_STRAIGHT, open, closed, target, map)
        if (up    && right) this.openNode(parent, parent.i - 1, parent.j + 1, this.COST_DIAGONAL, open, closed, target, map)
        if (right && down)  this.openNode(parent, parent.i + 1, parent.j + 1, this.COST_DIAGONAL, open, closed, target, map)
        if (down  && left)  this.openNode(parent, parent.i + 1, parent.j - 1, this.COST_DIAGONAL, open, closed, target, map)
        if (left  && up)    this.openNode(parent, parent.i - 1, parent.j - 1, this.COST_DIAGONAL, open, closed, target, map)
    }

    private openNode(
        parent: Node, i: number, j: number, cost: number,
        open: Node[], closed: Node[], target: Node, map: Map,
    ): boolean {
        if (!map.isWalkable(i, j)) return false
        const child = new Node(i, j)
        if (closed.some(n => n.equals(child))) return true
        child.costG = cost + parent.costG
        child.costH = (Math.abs(i - target.i) + Math.abs(j - target.j)) * this.COST_STRAIGHT
        child.costF = child.costG + child.costH
        child.parent = parent
        if (!open.some(n => n.equals(child))) open.push(child)
        return true
    }

    private reconstructPath(node: Node): { i: number; j: number }[] {
        const path: { i: number; j: number }[] = []
        let cur: Node | null = node
        while (cur) { path.push({ i: cur.i, j: cur.j }); cur = cur.parent }
        return path  // [0] = destination, [last] = origin
    }
}
