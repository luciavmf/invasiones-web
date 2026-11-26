// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { State } from '../State'
import { StateMachine } from '../StateMachine'
import { GameStateKey } from '../GameFrame'
import { ResourceManager } from '../resources/ResourceManager'
import { Surface } from '../rendering/Surface'
import { ConfirmationMenu, ConfirmationSelection } from '../gui/ConfirmationMenu'
import type { Video } from '../rendering/Video'
import { ImageID } from '../resources/ImageID'
import { StringID } from '../resources/StringID'

export class ExitState extends State {

    private confirmMenu: ConfirmationMenu | null = null

    constructor(sm: StateMachine) { super(sm) }

    start(): void {
        this.background  = ResourceManager.shared.getImageSync(ImageID.splash)
        this.confirmMenu = new ConfirmationMenu(StringID.exitConfirmation, StringID.no, StringID.yes)
        this.confirmMenu.setPosition(0, 0, Surface.centerHorizontal | Surface.centerVertical)
    }

    update(): void {
        const result = this.confirmMenu?.update() ?? ConfirmationSelection.none
        if (result === ConfirmationSelection.right) this.stateMachine.setState(GameStateKey.end)
        if (result === ConfirmationSelection.left)  this.stateMachine.setNextState(GameStateKey.mainMenu)
    }

    draw(video: Video): void {
        video.draw(this.background, 0, 0, 0)
        this.confirmMenu?.draw(video)
    }

    exit(): void {
        this.confirmMenu = null
    }
}
