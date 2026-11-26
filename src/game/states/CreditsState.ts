// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { State } from '../State'
import { StateMachine } from '../StateMachine'
import { GameStateKey } from '../GameFrame'
import { ResourceManager } from '../resources/ResourceManager'
import { Theme, FontConstants, Layout } from '../Definitions'
import { Surface } from '../rendering/Surface'
import { Video } from '../rendering/Video'
import { Button } from '../gui/Button'
import { ImageID } from '../resources/ImageID'
import { StringID } from '../resources/StringID'

export class CreditsState extends State {

    private backButton: Button | null = null

    constructor(sm: StateMachine) { super(sm) }

    start(): void {
        this.background = ResourceManager.shared.getImageSync(ImageID.background)
        this.backButton = new Button(StringID.buttonBack, null)
        this.backButton.frame.posX = Video.width  - this.backButton.frame.width  - Button.Constants.screenEdgeOffset
        this.backButton.frame.posY = Video.height - this.backButton.frame.height - Button.Constants.screenEdgeOffset
    }

    update(): void {
        if (this.backButton?.update()) {
            this.stateMachine.setNextState(GameStateKey.mainMenu)
        }
    }

    draw(video: Video): void {
        video.draw(this.background, 0, 0, 0)

        video.setFont(ResourceManager.shared.fonts[FontConstants.titleFont], Theme.text)
        video.writeId(StringID.menuCredits, 0, Layout.titleYPosition, Surface.centerHorizontal)

        video.setFont(ResourceManager.shared.fonts[FontConstants.titleFont], Theme.text)
        video.writeId(StringID.creditsProgramming, 0, 260, Surface.centerHorizontal)

        video.setFont(ResourceManager.shared.fonts[FontConstants.buttonFont], Theme.text)
        video.writeId(StringID.creditsProgrammer1, 0, 310, Surface.centerHorizontal)

        video.setFont(ResourceManager.shared.fonts[FontConstants.titleFont], Theme.text)
        video.writeId(StringID.creditsLevelDesign, 0, 400, Surface.centerHorizontal)

        video.setFont(ResourceManager.shared.fonts[FontConstants.buttonFont], Theme.text)
        video.writeId(StringID.creditsLevelDesigner1, 0, 450, Surface.centerHorizontal)

        this.backButton?.draw(video)
    }

    exit(): void {}
}
