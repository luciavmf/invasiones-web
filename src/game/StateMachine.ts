// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { State } from './State'
import { GameStateKey } from './GameFrame'
import type { Video } from './rendering/Video'

/// Generic game state machine.
export class StateMachine {

    private currentStateObj: State | null = null
    currentStateKey: GameStateKey = GameStateKey.invalid
    private nextStateObj: State | null = null
    private nextStateKey: GameStateKey = GameStateKey.invalid

    private allStates = new Map<GameStateKey, State | null>()

    addState(key: GameStateKey, state: State | null): void {
        this.allStates.set(key, state)
    }

    /// Queues a state transition — executed at the start of the next update().
    setNextState(key: GameStateKey): void {
        if (!this.allStates.has(key)) {
            console.error(`StateMachine: unknown state key ${key}`)
            return
        }
        this.nextStateObj = this.allStates.get(key) ?? null
        this.nextStateKey = key
    }

    /// Immediately switches state without calling exit()/start() — used for the initial state.
    setState(key: GameStateKey): void {
        this.currentStateObj = this.allStates.get(key) ?? null
        this.currentStateKey = key
    }

    update(): void {
        if (this.nextStateObj !== null || this.nextStateKey !== GameStateKey.invalid) {
            const prev = this.currentStateObj
            this.currentStateObj = this.nextStateObj
            this.currentStateKey = this.nextStateKey

            this.nextStateObj = null
            this.nextStateKey = GameStateKey.invalid

            prev?.exit()
            this.currentStateObj?.start()
        }

        this.currentStateObj?.update()
    }

    draw(video: Video): void {
        this.currentStateObj?.draw(video)
    }

    dispose(): void {
        this.allStates.clear()
    }
}
