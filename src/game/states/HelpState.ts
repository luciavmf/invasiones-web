// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { State } from '../State'
import { StateMachine } from '../StateMachine'
import { GameStateKey } from '../GameFrame'
import { ResourceManager } from '../resources/ResourceManager'
import { Res } from '../resources/Res'
import { Theme, FontConstants, FontIndex, Layout } from '../Definitions'
import { Surface } from '../rendering/Surface'
import { Video } from '../rendering/Video'
import { Button } from '../gui/Button'
import { Animation } from '../sprites/Animation'
import type { Video as VideoType } from '../rendering/Video'

const SUBSTATE_TOTAL = 9
const HELP_TEXT_Y    = 200
const HELP_ITEM_Y    = 150

export class HelpState extends State {

    private substate    = 0
    private backButton: Button | null = null
    private nextButton: Button | null = null
    private doneButton: Button | null = null
    private screenshot: Animation | null = null

    constructor(sm: StateMachine) { super(sm) }

    start(): void {
        this.background = ResourceManager.shared.getImageSync(Res.IMG_FONDO)

        const fnt = ResourceManager.shared.fonts[FontIndex.sans18]

        this.doneButton = new Button(Res.STR_BOTON_MENU, fnt)
        this.doneButton.frame.posX = Video.width  - this.doneButton.frame.width  - Button.Constants.screenEdgeOffset
        this.doneButton.frame.posY = Video.height - this.doneButton.frame.height - Button.Constants.screenEdgeOffset

        this.nextButton = new Button(Res.STR_SIGUIENTE, fnt)
        this.nextButton.frame.posX = Video.width  - this.nextButton.frame.width  - Button.Constants.screenEdgeOffset
        this.nextButton.frame.posY = Video.height - this.nextButton.frame.height - Button.Constants.screenEdgeOffset

        this.backButton = new Button(Res.STR_ATRAS, fnt)
        this.backButton.frame.posX = this.nextButton.frame.posX - this.nextButton.frame.width - Button.Constants.screenEdgeOffset
        this.backButton.frame.posY = this.nextButton.frame.posY

        this.substate = 0
        this.loadScreenshot(0)
    }

    update(): void {
        if (this.nextButton?.update()) {
            const next = this.substate + 1
            if (next >= SUBSTATE_TOTAL) {
                this.stateMachine.setNextState(GameStateKey.mainMenu)
            } else {
                this.substate = next
                this.loadScreenshot(next)
            }
        }

        if (this.backButton?.update() && this.substate > 0) {
            this.substate--
            this.loadScreenshot(this.substate)
        }

        this.screenshot?.update()
    }

    draw(video: VideoType): void {
        video.draw(this.background, 0, 0, 0)

        video.setFont(ResourceManager.shared.fonts[FontConstants.titleFont], Theme.title)
        video.writeId(Res.STR_MENU_AYUDA, 0, Layout.titleYPosition, Surface.centerHorizontal)

        video.setFont(ResourceManager.shared.fonts[FontConstants.helpTitleFont], Theme.text)
        video.writeId(Res.STR_MENU_AYUDA_TEXTO_SELECCIONAR_01 + this.substate * 2, 0, HELP_ITEM_Y, Surface.centerHorizontal)

        video.setFont(ResourceManager.shared.fonts[FontConstants.helpFont], Theme.text)
        video.writeId(Res.STR_MENU_AYUDA_TEXTO_SELECCIONAR_02 + this.substate * 2, 0, HELP_TEXT_Y, Surface.centerHorizontal)

        this.screenshot?.draw(video, 0, 150, Surface.centerHorizontal | Surface.centerVertical)

        if (this.substate > 0) this.backButton?.draw(video)
        if (this.substate < SUBSTATE_TOTAL - 1) {
            this.nextButton?.draw(video)
        } else {
            this.doneButton?.draw(video)
        }
    }

    exit(): void {
        this.screenshot = null
    }

    private loadScreenshot(sub: number): void {
        const animIdx = Res.ANIM_AYUDA_SELECCION + sub
        const anim    = ResourceManager.shared.animations[animIdx] ?? null
        if (!anim) { this.screenshot = null; return }
        anim.play()
        anim.loop = true
        this.screenshot = anim
    }
}
