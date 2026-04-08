// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { State }           from '../State'
import { StateMachine }    from '../StateMachine'
import { GameStateKey }    from '../GameFrame'
import { Episode }         from '../level/Episode'
import { Menu }            from '../gui/Menu'
import { ConfirmationMenu } from '../gui/ConfirmationMenu'
import { Button }          from '../gui/Button'
import { Surface }         from '../rendering/Surface'
import { Video }           from '../rendering/Video'
import { ResourceManager } from '../resources/ResourceManager'
import { Res }             from '../resources/Res'
import { FontConstants, GameColor } from '../Definitions'
import type { Video as VideoType } from '../rendering/Video'

const GS = { start: 0, won: 1, lost: 2, menu: 3, playing: 4, confirmation: 5 } as const
type GSK  = typeof GS[keyof typeof GS]
const MI  = { continuar: 0, quit: 1 } as const

export class GameState extends State {

    private episode:     Episode | null = null
    private gameMenu:    Menu    | null = null
    private confirmMenu: ConfirmationMenu | null = null
    private button:      Button  | null = null
    private state: GSK = GS.start

    private readonly gamePausedY = -200

    constructor(sm: StateMachine) { super(sm) }

    start(): void {
        this.state = GS.start
        this.gameMenu = new Menu(null, 2, 0, 0, Surface.centerHorizontal | Surface.centerVertical)
        this.gameMenu.font = ResourceManager.shared.fonts[FontConstants.menuFont]
        this.gameMenu.addItem(MI.continuar, Res.STR_MENU_CONTINUAR, 1)
        this.gameMenu.addItem(MI.quit,      Res.STR_MENU_SALIR,     1)
    }

    update(): void {
        switch (this.state) {
            case GS.start: {
                this.episode = new Episode()
                this.episode.start()
                this.state = GS.playing

                this.button = new Button(Res.STR_BOTON_MENU_DEL_JUEGO, null)
                if (this.button) {
                    this.button.posX = Video.width  - this.button.width  - Button.Constants.screenEdgeOffset
                    this.button.posY = Button.Constants.screenEdgeOffset
                }

                this.confirmMenu = new ConfirmationMenu(
                    Res.STR_CONFIRMACION_SALIR, Res.STR_NO, Res.STR_SI)
                this.confirmMenu.setPosition(0, 0, Surface.centerVertical | Surface.centerHorizontal)
                break
            }
            case GS.playing: {
                this.episode?.update()  // returns Promise but we fire-and-forget each frame
                if (this.episode?.state === 1 /* playing */) {
                    if ((this.button?.update() ?? 0) !== 0) this.state = GS.menu
                }
                if (this.episode?.state === -1 /* end */) {
                    this.stateMachine.setNextState(GameStateKey.mainMenu)
                }
                break
            }
            case GS.menu: {
                const item = this.gameMenu?.update() ?? -1
                if (item === MI.continuar) this.state = GS.playing
                else if (item === MI.quit) this.state = GS.confirmation
                break
            }
            case GS.confirmation: {
                const res = this.confirmMenu?.update() ?? -1
                if (res === 0) this.state = GS.playing
                if (res === 1) this.stateMachine.setNextState(GameStateKey.mainMenu)
                break
            }
        }
    }

    draw(video: VideoType): void {
        switch (this.state) {
            case GS.playing: {
                this.episode?.draw(video)
                if (this.episode?.state === 1) this.button?.draw(video)
                break
            }
            case GS.menu: {
                this.episode?.draw(video)
                this.gameMenu?.draw(video)
                video.setFont(ResourceManager.shared.fonts[FontConstants.titleFont], GameColor.white)
                video.writeId(Res.STR_JUEGO_PAUSADO, 0, this.gamePausedY,
                    Surface.centerVertical | Surface.centerHorizontal)
                break
            }
            case GS.confirmation: {
                this.episode?.draw(video)
                this.confirmMenu?.draw(video)
                break
            }
        }
    }

    exit(): void {}
}
