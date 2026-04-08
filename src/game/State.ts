// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import type { StateMachine } from './StateMachine'
import type { Video } from './rendering/Video'
import type { Surface } from './rendering/Surface'

/// Abstract base class for all game states.
export abstract class State {

    protected stateMachine: StateMachine

    /// Background image for this state (loaded in start(), drawn in draw()).
    protected background: Surface | null = null

    /// Generic counter used for timers and animations.
    protected count = 0

    constructor(sm: StateMachine) {
        this.stateMachine = sm
    }

    abstract start(): void
    abstract update(): void
    abstract draw(video: Video): void
    abstract exit(): void
}
