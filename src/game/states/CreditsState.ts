// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { State } from '../State'
import { StateMachine } from '../StateMachine'
import { GameStateKey } from '../GameFrame'
import { ResourceManager } from '../resources/ResourceManager'
import { Res } from '../resources/Res'
import { UIColors, FontConstants, Layout } from '../Definitions'
import { Surface } from '../rendering/Surface'
import { Video } from '../rendering/Video'
import { Button } from '../gui/Button'

export class CreditsState extends State {

    private backButton: Button | null = null

    constructor(sm: StateMachine) { super(sm) }

    start(): void {
        this.background = ResourceManager.shared.getImageSync(Res.IMG_FONDO)
        this.backButton = new Button(Res.STR_BOTON_MENU, null)
        this.backButton.posX = Video.width  - this.backButton.width  - Button.Constants.screenEdgeOffset
        this.backButton.posY = Video.height - this.backButton.height - Button.Constants.screenEdgeOffset
    }

    update(): void {
        if (this.backButton?.update()) {
            this.stateMachine.setNextState(GameStateKey.mainMenu)
        }
    }

    draw(video: Video): void {
        video.draw(this.background, 0, 0, 0)

        video.setFont(ResourceManager.shared.fonts[FontConstants.titleFont], UIColors.text)
        video.writeId(Res.STR_MENU_CREDITOS, 0, Layout.titleYPosition, Surface.centerHorizontal)

        video.setFont(ResourceManager.shared.fonts[FontConstants.titleFont], UIColors.text)
        video.writeId(Res.STR_CREDITOS_PROGRAMACION, 0, 260, Surface.centerHorizontal)

        video.setFont(ResourceManager.shared.fonts[FontConstants.buttonFont], UIColors.text)
        video.writeId(Res.STR_CREDITOS_PROGRAMADOR_1, 0, 310, Surface.centerHorizontal)

        video.setFont(ResourceManager.shared.fonts[FontConstants.titleFont], UIColors.text)
        video.writeId(Res.STR_CREDITOS_DISENO_DE_NIVEL, 0, 400, Surface.centerHorizontal)

        video.setFont(ResourceManager.shared.fonts[FontConstants.buttonFont], UIColors.text)
        video.writeId(Res.STR_CREDITOS_DISENADOR_DE_NIVEL_1, 0, 450, Surface.centerHorizontal)

        this.backButton?.draw(video)
    }

    exit(): void {}
}
