// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { State } from '../State'
import { StateMachine } from '../StateMachine'
import { GameStateKey } from '../GameFrame'
import { ResourceManager } from '../resources/ResourceManager'
import { Res } from '../resources/Res'
import { FontConstants } from '../Definitions'
import { Surface } from '../rendering/Surface'
import { Video } from '../rendering/Video'
import { Mouse } from '../input/Mouse'
import { Sound } from '../audio/Sound'
import { Menu } from '../gui/Menu'
import type { Video as VideoType } from '../rendering/Video'

const ITEM_NEW_GAME = 0
const ITEM_HELP     = 1
const ITEM_OPTIONS  = 2
const ITEM_CREDITS  = 3
const ITEM_QUIT     = 4

const MENU_Y_OFFSET = 50

export class MainMenuState extends State {

    private readonly ticksUntilMenuAppears = 20
    private readonly menuSlideSpeed        = 5

    private menu:        Menu | null = null
    private menuTargetY  = 0
    private posY         = 0
    private firstBuild   = true

    constructor(sm: StateMachine) {
        super(sm)
        this.firstBuild = true
    }

    start(): void {
        this.background = ResourceManager.shared.getImageSync(Res.IMG_SPLASH)

        Mouse.shared.setCursor(ResourceManager.shared.getImageSync(Res.IMG_CURSOR))
        Mouse.shared.showCursor()

        const m = new Menu(null, 5, 0, Video.height - MENU_Y_OFFSET, Surface.centerHorizontal)
        m.addItem(ITEM_NEW_GAME, Res.STR_MENU_NUEVO_JUEGO, Menu.Constants.itemVisible)
        m.addItem(ITEM_HELP,    Res.STR_MENU_AYUDA,        Menu.Constants.itemVisible)
        m.addItem(ITEM_OPTIONS, Res.STR_MENU_OPCIONES,     Menu.Constants.itemVisible)
        m.addItem(ITEM_CREDITS, Res.STR_MENU_CREDITOS,     Menu.Constants.itemVisible)
        m.addItem(ITEM_QUIT,    Res.STR_MENU_SALIR,        Menu.Constants.itemVisible)

        if (this.firstBuild) {
            this.firstBuild  = false
            this.menuTargetY = Video.height - m.frame.height - MENU_Y_OFFSET
            this.posY        = Video.height + m.frame.height + MENU_Y_OFFSET
            m.setPosition(0, Video.height + 15, Surface.centerHorizontal)
        }

        m.font   = ResourceManager.shared.fonts[FontConstants.menuFont]
        this.menu = m

        Sound.shared.stop(Res.SFX_BATALLA)
        Sound.shared.play(Res.SFX_SPLASH, -1)
    }

    update(): void {
        if (!this.menu) return

        this.count++
        if (this.count > this.ticksUntilMenuAppears) {
            if (this.posY > this.menuTargetY) this.posY -= this.menuSlideSpeed
            this.menu.setPosition(0, this.posY, Surface.centerHorizontal)
        }

        const selected = this.menu.update()
        switch (selected) {
            case ITEM_NEW_GAME: this.stateMachine.setNextState(GameStateKey.game);    break
            case ITEM_HELP:     this.stateMachine.setNextState(GameStateKey.help);    break
            case ITEM_OPTIONS:  this.stateMachine.setNextState(GameStateKey.options); break
            case ITEM_CREDITS:  this.stateMachine.setNextState(GameStateKey.credits); break
            case ITEM_QUIT:     this.stateMachine.setNextState(GameStateKey.quit);    break
        }
    }

    draw(video: VideoType): void {
        video.draw(this.background, 0, 0, 0)
        this.menu?.draw(video)
    }

    exit(): void {
        this.menu = null
    }
}
