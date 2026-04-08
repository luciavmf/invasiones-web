// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import * as PIXI from 'pixi.js'
import { StateMachine } from './StateMachine'
import { Video } from './rendering/Video'
import { GameText } from './resources/GameText'
import { ResourceManager } from './resources/ResourceManager'
import { Mouse } from './input/Mouse'
import { Sound } from './audio/Sound'
import { LogoState } from './states/LogoState'
import { MainMenuState } from './states/MainMenuState'
import { CreditsState } from './states/CreditsState'
import { ExitState } from './states/ExitState'
import { OptionsState } from './states/OptionsState'
import { HelpState } from './states/HelpState'
import { GameState as GameBattle } from './states/GameState'

/// All top-level game screens.
export const GameStateKey = {
    invalid:           'invalid',
    end:               'end',
    logo:              'logo',
    game:              'game',
    help:              'help',
    mainMenu:          'mainMenu',
    introConsequences: 'introConsequences',
    credits:           'credits',
    options:           'options',
    quit:              'quit',
} as const

export type GameStateKey = typeof GameStateKey[keyof typeof GameStateKey]

/// Main game coordinator. Hosts the state machine and drives the game loop via PixiJS ticker.
export class GameFrame {

    static fps = 0

    private stateMachine!: StateMachine
    private video!: Video

    /// Initialises all subsystems and starts the game loop.
    async startGame(app: PIXI.Application): Promise<void> {
        this.video = new Video(app)

        await GameText.loadStrings()
        await ResourceManager.shared.loadResourcePaths()
        await ResourceManager.shared.preloadImages()
        await ResourceManager.shared.loadFonts()
        await ResourceManager.shared.loadAnimations()
        await ResourceManager.shared.loadSprites()
        await Sound.shared.loadAllSounds()

        this.stateMachine = new StateMachine()
        this.stateMachine.addState(GameStateKey.logo,     new LogoState(this.stateMachine))
        this.stateMachine.addState(GameStateKey.mainMenu, new MainMenuState(this.stateMachine))
        this.stateMachine.addState(GameStateKey.game,     new GameBattle(this.stateMachine))
        this.stateMachine.addState(GameStateKey.end,      null)
        this.stateMachine.addState(GameStateKey.help,     new HelpState(this.stateMachine))
        this.stateMachine.addState(GameStateKey.credits,  new CreditsState(this.stateMachine))
        this.stateMachine.addState(GameStateKey.options,  new OptionsState(this.stateMachine))
        this.stateMachine.addState(GameStateKey.quit,     new ExitState(this.stateMachine))

        this.stateMachine.setState(GameStateKey.logo)
        this.stateMachine.update()

        // Drive the loop via PixiJS ticker (replaces SpriteKit's update callback).
        app.ticker.add((ticker) => {
            GameFrame.fps = ticker.FPS
            this.update(app)
            this.draw()
        })
    }

    private update(app: PIXI.Application): void {
        if (this.stateMachine.currentStateKey === GameStateKey.end) {
            app.ticker.stop()
            return
        }
        Mouse.shared.update()
        this.stateMachine.update()
    }

    private draw(): void {
        this.video.clear()
        this.stateMachine.draw(this.video)
        Mouse.shared.drawCursor(this.video)
    }
}
