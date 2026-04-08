// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Command, CommandKind } from '../level/Command'

const MAX_BATTLES = 5

class Battle {
    commands: Command[] = []
}

/// Scripted AI controller for an enemy group.
export class IA {

    private battles: Battle[] = Array.from({ length: MAX_BATTLES }, () => new Battle())
    private battleCount  = 0
    private currentBattle = 0

    async load(x: number, y: number, levelIndex: number): Promise<void> {
        const url = `/data/nivel/orden_nv${levelIndex}_${x}_${y}.xml`
        try {
            const resp = await fetch(url)
            if (!resp.ok) { console.debug(`IA: file not found: ${url}`); return }
            const text = await resp.text()
            const doc  = new DOMParser().parseFromString(text, 'application/xml')

            this.battleCount  = 0
            this.currentBattle = 0

            for (const battleEl of Array.from(doc.querySelectorAll('batalla'))) {
                if (this.battleCount >= MAX_BATTLES) break
                const cmds: Command[] = []
                for (const child of Array.from(battleEl.children)) {
                    const iVal = (parseInt(child.getAttribute('i') ?? '0', 10)) << 1
                    const jVal = (parseInt(child.getAttribute('j') ?? '0', 10)) << 1
                    let kind: typeof CommandKind[keyof typeof CommandKind] | null = null
                    if (child.tagName === 'mover' || child.tagName === 'llegar') kind = CommandKind.move
                    else if (child.tagName === 'patrol') kind = CommandKind.patrol
                    if (kind !== null) {
                        cmds.push(new Command(kind, iVal, jVal))
                    }
                }
                // stored reversed so pop() gives first command
                this.battles[this.battleCount].commands = [...cmds].reverse()
                this.battleCount++
            }
        } catch (e) {
            console.debug(`IA: error loading ${url}`, e)
        }
    }

    nextCommand(): Command | null {
        if (this.currentBattle >= this.battleCount) return null
        if (this.battles[this.currentBattle].commands.length === 0) {
            this.currentBattle++
            if (this.currentBattle >= this.battleCount) return null
        }
        return this.battles[this.currentBattle].commands.pop() ?? null
    }
}
