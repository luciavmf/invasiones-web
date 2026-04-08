// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { State } from '../State'
import { StateMachine } from '../StateMachine'
import { GameStateKey } from '../GameFrame'
import { ResourceManager } from '../resources/ResourceManager'
import { Res } from '../resources/Res'
import { GameColor } from '../Definitions'
import type { Video } from '../rendering/Video'

export class LogoState extends State {

    private readonly logoStartTick = 20
    private readonly logoEndTick   = 70
    private alpha = 10

    constructor(sm: StateMachine) {
        super(sm)
        this.count = 0
    }

    start(): void {}

    update(): void {
        if (this.count === 0) {
            this.background = ResourceManager.shared.getImageSync(Res.IMG_LOGO)
            this.alpha = 10
        } else if (this.count > this.logoStartTick + this.logoEndTick) {
            this.stateMachine.setNextState(GameStateKey.mainMenu)
        }
        this.count++
    }

    draw(video: Video): void {
        video.fillScreen(GameColor.black)

        if (this.count > this.logoStartTick && this.count < this.logoEndTick) {
            if (this.alpha < 245) this.alpha += 10
            video.draw(this.background, 0, 0, this.alpha, 3) // centerHorizontal | centerVertical
        }
    }

    exit(): void {
        this.background = null
    }
}
