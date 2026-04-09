// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { State } from '../State'
import { StateMachine } from '../StateMachine'
import { GameStateKey } from '../GameFrame'
import { ResourceManager } from '../resources/ResourceManager'
import { GameText } from '../resources/GameText'
import { Res } from '../resources/Res'
import { Theme, FontConstants, Layout } from '../Definitions'
import { Surface } from '../rendering/Surface'
import { Video } from '../rendering/Video'
import { Mouse, MOUSE_LEFT } from '../input/Mouse'
import { Language } from '../Language'
import { Button } from '../gui/Button'
import type { Video as VideoType } from '../rendering/Video'

const RadioLayout = {
    startY:    325,
    rowHeight:  36,
    hoverX:    460,
    hoverW:    190,
    indX:      472,
    indSize:    12,
    textX:     496,
}

export class OptionsState extends State {

    private hoveredLanguage: Language | null = null
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

        const mx = Mouse.shared.x
        const my = Mouse.shared.y
        this.hoveredLanguage = null

        Language.all.forEach((lang, i) => {
            const rowY = RadioLayout.startY + i * RadioLayout.rowHeight
            const inRow = mx >= RadioLayout.hoverX
                       && mx <= RadioLayout.hoverX + RadioLayout.hoverW
                       && my >= rowY && my < rowY + RadioLayout.rowHeight

            if (inRow) {
                this.hoveredLanguage = lang
                if (Mouse.shared.pressedButtons.has(MOUSE_LEFT)) {
                    Mouse.shared.releaseButton(MOUSE_LEFT)
                    if (Language.current !== lang) {
                        Language.current = lang
                        GameText.loadStrings() // fire-and-forget; strings update on next frame
                    }
                }
            }
        })
    }

    draw(video: VideoType): void {
        video.draw(this.background, 0, 0, 0)

        video.setFont(ResourceManager.shared.fonts[FontConstants.titleFont], Theme.text)
        video.writeId(Res.STR_MENU_OPCIONES, 0, Layout.titleYPosition, Surface.centerHorizontal)

        video.setFont(ResourceManager.shared.fonts[FontConstants.buttonFont], Theme.text)
        video.writeId(Res.STR_LANGUAGE_LABEL, 0, RadioLayout.startY - 28, Surface.centerHorizontal)

        Language.all.forEach((lang, i) => {
            const rowY = RadioLayout.startY + i * RadioLayout.rowHeight
            const indY = rowY + (RadioLayout.rowHeight - RadioLayout.indSize) / 2

            if (lang === this.hoveredLanguage) {
                video.setColor(Theme.menus)
                video.fillRoundedRect(RadioLayout.hoverX, rowY, RadioLayout.hoverW, RadioLayout.rowHeight - 2, 4, Theme.alpha)
            }

            video.setColor(Theme.text)
            video.drawRect(RadioLayout.indX, indY, RadioLayout.indSize, RadioLayout.indSize, 0)

            if (lang === Language.current) {
                const inset = 3
                video.fillRect(RadioLayout.indX + inset, indY + inset,
                    RadioLayout.indSize - inset * 2, RadioLayout.indSize - inset * 2)
            }

            const textY = rowY + RadioLayout.rowHeight / 2 - Video.height / 2
            video.write(lang.displayName, RadioLayout.textX, textY, Surface.centerVertical)
        })

        this.backButton?.draw(video)
    }

    exit(): void {}
}
