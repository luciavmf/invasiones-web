// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Objective }    from './Objective'
import { Command, CommandKind } from './Command'
import { AnimObject }   from './AnimObject'
import { ResourceManager } from '../resources/ResourceManager'
import { Res }          from '../resources/Res'
import type { Surface } from '../rendering/Surface'

const MAX_BATTLES = 5

class Battle {
    objectives: Objective[] = []
    objectiveCount = 0
}

/// Level definition loaded from nivel_N.xml.
export class Level {

    static readonly Constants = { maxBattles: MAX_BATTLES }

    private battles: (Battle | null)[] = new Array(MAX_BATTLES).fill(null)
    currentBattleIndex   = 0
    battleCount          = 0
    currentObjectiveIndex= 0
    completedObjectiveCount = -1

    get currentObjectiveCount(): number {
        return this.battles[this.currentBattleIndex]?.objectiveCount ?? 0
    }

    async load(levelIndex: number): Promise<void> {
        const url = `${import.meta.env.BASE_URL}data/nivel/nivel_${levelIndex}.xml`
        try {
            const resp = await fetch(url)
            if (!resp.ok) { console.debug(`Level: not found: ${url}`); return }
            const text = await resp.text()
            const doc  = new DOMParser().parseFromString(text, 'application/xml')

            this.currentBattleIndex    = 0
            this.currentObjectiveIndex = 0
            this.battleCount           = 0

            for (const battleEl of Array.from(doc.querySelectorAll('batalla'))) {
                if (this.battleCount >= MAX_BATTLES) break
                const b = new Battle()
                const objectives: Objective[] = []

                for (const objEl of Array.from(battleEl.querySelectorAll('objetivo'))) {
                    const obj  = new Objective()
                    const cmds: Command[] = []

                    for (const cmdEl of Array.from(objEl.children)) {
                        const iVal = (parseInt(cmdEl.getAttribute('i') ?? '0', 10)) << 1
                        const jVal = (parseInt(cmdEl.getAttribute('j') ?? '0', 10)) << 1
                        let kind: typeof CommandKind[keyof typeof CommandKind] | null = null

                        switch (cmdEl.tagName) {
                            case 'tomar':   kind = CommandKind.takeObject; break
                            case 'llegar':  kind = CommandKind.move;       break
                            case 'trigger': kind = CommandKind.trigger;    break
                            case 'matar':   kind = CommandKind.kill;       break
                        }
                        if (kind === null) continue

                        let cmd: Command
                        if (kind === CommandKind.takeObject) {
                            const imgPath = cmdEl.getAttribute('imagen') ?? ''
                            let surface: Surface | null = null
                            if (imgPath) surface = await ResourceManager.shared.getImageByPath(imgPath)
                            cmd = new Command(kind, iVal, jVal, surface)
                        } else if (kind === CommandKind.trigger) {
                            const t = cmdEl.getAttribute('tipo') ?? ''
                            let animIdx = -1
                            if (t === 'fuego1') animIdx = Res.ANIM_FUEGO_1
                            else if (t === 'fuego2') animIdx = Res.ANIM_FUEGO_2
                            if (animIdx >= 0 && ResourceManager.shared.animations[animIdx]) {
                                const animObj = new AnimObject(
                                    ResourceManager.shared.animations[animIdx]!.clone(), iVal, jVal)
                                cmd = new Command(kind, iVal, jVal, animObj)
                            } else {
                                cmd = new Command(kind, iVal, jVal)
                            }
                        } else if (kind === CommandKind.kill) {
                            const w = (parseInt(cmdEl.getAttribute('ancho') ?? '0', 10)) << 1
                            cmd = new Command(kind, iVal, jVal, w)
                        } else {
                            cmd = new Command(kind, iVal, jVal)
                        }
                        cmds.push(cmd)
                    }

                    // Store reversed so pop() gives first command
                    obj.commands = [...cmds].reverse()
                    objectives.push(obj)
                }

                b.objectives     = [...objectives].reverse()  // reversed for LIFO pop
                b.objectiveCount = objectives.length
                this.battles[this.battleCount] = b
                this.battleCount++
            }
        } catch (e) {
            console.error(`Level: error loading ${url}`, e)
        }
    }

    nextObjective(): Objective | null {
        this.currentObjectiveIndex++
        this.completedObjectiveCount++

        const battle = this.battles[this.currentBattleIndex]
        if (!battle) return null

        if (battle.objectives.length === 0) {
            this.currentBattleIndex++
            this.currentObjectiveIndex = 0
            if (this.currentBattleIndex >= this.battleCount) return null
        }

        const b2 = this.battles[this.currentBattleIndex]
        if (!b2 || b2.objectives.length === 0) return null
        return b2.objectives.pop() ?? null
    }
}
