// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Map }          from '../map/Map'
import { Camera }       from '../map/Camera'
import { Level }        from './Level'
import { Hud }          from './Hud'
import { Obstacle }     from './Obstacle'
import { ObjectTable }  from './ObjectTable'
import { MapObject }    from './MapObject'
import { Objective }    from './Objective'
import { ArgentineTeam } from '../units/ArgentineTeam'
import { EnemyTeam }    from '../units/EnemyTeam'
import { ConfirmationMenu } from '../gui/ConfirmationMenu'
import { Button }       from '../gui/Button'
import { Surface }      from '../rendering/Surface'
import { Video }        from '../rendering/Video'
import { ResourceManager } from '../resources/ResourceManager'
import { Res }          from '../resources/Res'
import { Sound }        from '../audio/Sound'
import { Mouse }        from '../input/Mouse'
import { Keyboard }     from '../input/Keyboard'
import { FontConstants, UIColors, Layout, GameColor } from '../Definitions'
import { Unit }         from '../units/Unit'
import type { Video as VideoType } from '../rendering/Video'

const EpisodeState = {
    end:            -1,
    loading:         0,
    playing:         1,
    showIntro:       2,
    showObjectives:  3,
    won:             4,
    lost:            5,
} as const
type EpisodeState = typeof EpisodeState[keyof typeof EpisodeState]

const C = {
    countdownToRestart:    50,
    objectivesBoxWidth:   600,
    objectivesBoxHeight:  270,
    objectivesBoxButtonY:  70,
    objectiveShowStartCount: 50,
    objectivesButtonY:    510,
    objectivesBorder:     100,
    pagesPerIntro:          3,
    loadingY:             200,
}

export class Episode {

    private button: Button | null = null
    private acceptButton: Button | null = null
    private obstacles: Obstacle[]    = []
    private currentLevel: Level | null = null
    private objectsToDraw = new ObjectTable([[]])
    private camera: Camera | null = null
    private objective: Objective | null = null
    private enemy:  EnemyTeam    | null = null
    private player: ArgentineTeam | null = null
    private map: Map | null = null
    private stateValue: EpisodeState = EpisodeState.loading
    private hud: Hud | null = null
    private count   = 0
    private showObjectivePopup   = false
    private showObjectiveReminder = false
    private objectiveShowCount   = 0
    private currentPage          = 0
    private gameOverMenu: ConfirmationMenu
    private cheatsEnabled = true
    private cheatWinIdx   = 0
    private cheatLoseIdx  = 0
    private cheatObjIdx   = 0
    private asyncBusy     = false   // guard against concurrent async loading frames

    get state(): EpisodeState { return this.stateValue }

    constructor() {
        this.gameOverMenu = new ConfirmationMenu(Res.STR_CONTINUARJUEGO, Res.STR_NO, Res.STR_SI)
        this.gameOverMenu.setPosition(0, 0, Surface.centerVertical | Surface.centerHorizontal)
    }

    start(): void { this.setState(EpisodeState.loading) }
    exit():  void {}

    async update(): Promise<void> {
        switch (this.stateValue) {
            case EpisodeState.loading:         await this.updateLoadingState(); break
            case EpisodeState.showIntro:       this.updateShowIntroState();    break
            case EpisodeState.showObjectives:  this.updateShowObjectiveState(); break
            case EpisodeState.playing:         this.updatePlayingState();      break
            case EpisodeState.won:             this.updateWonState();          break
            case EpisodeState.lost:            this.updateLostState();         break
            case EpisodeState.end:             break
        }
    }

    draw(video: VideoType): void {
        switch (this.stateValue) {
            case EpisodeState.loading:        this.drawLoadingState(video);       break
            case EpisodeState.showObjectives: this.drawShowObjectiveState(video); break
            case EpisodeState.playing:        this.drawPlayingState(video);       break
            case EpisodeState.showIntro:      this.drawShowIntroState(video);     break
            case EpisodeState.won:            this.drawWonState(video);           break
            case EpisodeState.lost:           this.drawLostState(video);          break
            case EpisodeState.end:            break
        }
        video.setColor(GameColor.white)
    }

    // MARK: - LOADING

    private async updateLoadingState(): Promise<void> {
        if (this.asyncBusy) return
        this.asyncBusy = true
        try {
            const done = await this.loadLevel(0)
            if (done) {
                this.updatePlayingState()
                this.setNewObjective()
                Sound.shared.stop(Res.SFX_SPLASH)
                Sound.shared.play(Res.SFX_BATALLA, -1)
                this.setState(EpisodeState.showIntro)
            }
        } catch (e) {
            console.error('Episode: load error', e)
        } finally {
            this.asyncBusy = false
        }
    }

    private drawLoadingState(video: VideoType): void {
        video.fillScreen(GameColor.black)
        video.setFont(ResourceManager.shared.fonts[FontConstants.titleFont], UIColors.title)
        video.writeId(Res.STR_CARGANDO, 0, C.loadingY, Surface.centerHorizontal)
    }

    private async loadLevel(levelIdx: number): Promise<boolean> {
        if (this.count === 0) {
            this.hud = new Hud()
            const hudH = this.hud.height
            const cam  = new Camera(0, 0, Video.height - hudH)
            this.camera = cam
            this.map    = new Map(cam)

        } else if (this.count === 1) {
            const res = ResourceManager.shared.resJson
            await this.map!.load(res, Res.MAP_NIVEL1 + levelIdx)
            MapObject.map    = this.map
            MapObject.camera = this.camera
            const level = new Level()
            await level.load(levelIdx)
            this.currentLevel = level

        } else if (this.count === 2) {
            await ResourceManager.shared.loadUnitTypes()

        } else if (this.count === 3) {
            this.button       = new Button(Res.STR_SIGUIENTE, null)
            this.acceptButton = new Button(Res.STR_ACEPTAR,   null)

        } else if (this.count === 4) {
            this.loadPaintObjects()

        } else if (this.count === 5) {
            this.player = new ArgentineTeam(this.map!, this.camera!, this.objectsToDraw, this.hud!)
            this.enemy  = new EnemyTeam(   this.map!, this.camera!, this.objectsToDraw, this.hud!)

        } else if (this.count === 6) {
            await this.player?.loadUnits(levelIdx)

        } else if (this.count === 10) {
            await this.enemy?.loadUnits(levelIdx)
            this.count++
            return true
        }

        this.count++
        return false
    }

    private loadPaintObjects(): void {
        const map = this.map!
        this.objectsToDraw.tabla = Array.from(
            { length: map.physicalMapHeight },
            () => new Array(map.physicalMapWidth).fill(null),
        )
        this.obstacles = []

        for (let i = 0; i < map.height; i++) {
            for (let j = 0; j < map.width; j++) {
                const tileId = map.obstaclesLayer[i]?.[j] ?? 0
                if (!tileId) continue
                const ts = map.getTileset(tileId)
                if (!ts) continue
                const localId = tileId - ts.firstGid
                const obs = new Obstacle(localId, i * 2, j * 2, ts)
                this.obstacles.push(obs)
                const fi = i * 2, fj = j * 2
                if (fi < this.objectsToDraw.tabla.length && fj < this.objectsToDraw.tabla[fi].length) {
                    this.objectsToDraw.tabla[fi][fj] = obs
                }
            }
        }
    }

    // MARK: - SHOW INTRO

    private updateShowIntroState(): void {
        if (this.count === 0) {
            this.button?.setPosition(0, C.objectivesButtonY, Surface.centerHorizontal)
        }
        this.count++
        if ((this.button?.update() ?? 0) !== 0) {
            this.currentPage++
            if (this.currentPage === C.pagesPerIntro - 1) this.setState(EpisodeState.playing)
        }
    }

    private setNewObjective(): void {
        const prevBattle = this.currentLevel?.currentBattleIndex ?? 0
        this.objective = this.currentLevel?.nextObjective() ?? null

        if ((this.currentLevel?.currentBattleIndex ?? 0) !== prevBattle) {
            this.setState(EpisodeState.showIntro)
        }

        this.showObjectivePopup  = true
        this.objectiveShowCount  = 0
        this.player?.setObjective(this.objective)

        if (!this.objective) this.setState(EpisodeState.won)
    }

    private drawShowIntroState(video: VideoType): void {
        this.drawPlayingState(video)
        const hudH = this.hud?.height ?? 0
        video.setColor(UIColors.objectivesText)
        video.fillRect(
            0, -(hudH >> 1),
            Video.width - (C.objectivesBorder << 1),
            Video.height - (C.objectivesBorder << 1) - hudH,
            UIColors.alpha,
            Surface.centerVertical | Surface.centerHorizontal,
        )

        const font = this.currentPage === 0 ? FontConstants.titleFont : FontConstants.objectivesFont
        video.setFont(ResourceManager.shared.fonts[font], UIColors.text)

        const strIdx = Res.STR_PRIMER_BATALLA + this.currentPage +
                       ((this.currentLevel?.currentBattleIndex ?? 0) * C.pagesPerIntro)
        video.writeId(strIdx, 0, -(hudH >> 1), Surface.centerVertical | Surface.centerHorizontal)
        this.button?.draw(video)
    }

    // MARK: - SHOW OBJECTIVES

    private updateShowObjectiveState(): void {
        if (this.count === 0) {
            this.acceptButton?.setPosition(0, C.objectivesBoxButtonY,
                Surface.centerHorizontal | Surface.centerVertical)
        }
        this.count++
        if ((this.acceptButton?.update() ?? 0) !== 0) {
            this.currentPage++
            if (this.currentPage === C.pagesPerIntro) {
                this.setState(EpisodeState.playing)
                this.showObjectivePopup   = false
                this.showObjectiveReminder = true
            }
        }
    }

    private drawShowObjectiveState(video: VideoType): void {
        this.drawPlayingState(video)
        const hudH = this.hud?.height ?? 0
        video.setColor(UIColors.objectivesText)
        video.fillRect(0, -(hudH / 2), C.objectivesBoxWidth, C.objectivesBoxHeight,
            UIColors.alpha, Surface.centerVertical | Surface.centerHorizontal)

        video.setFont(ResourceManager.shared.fonts[FontConstants.titleFont], UIColors.text)
        video.writeId(Res.STR_OBJETIVOS, 0,
            -(hudH / 2) - C.objectivesBoxHeight / 2 + 50,
            Surface.centerVertical | Surface.centerHorizontal)

        video.setFont(ResourceManager.shared.fonts[FontConstants.objectivesFont], UIColors.text)
        const strIdx = Res.STR_PRIMER_BATALLA + this.currentPage +
                       ((this.currentLevel?.currentBattleIndex ?? 0) * C.pagesPerIntro)
        video.writeId(strIdx, 0, -(hudH >> 1) + 30, Surface.centerVertical | Surface.centerHorizontal)
        this.acceptButton?.draw(video)
    }

    // MARK: - PLAYING

    private updatePlayingState(): void {
        if (this.showObjectivePopup) this.objectiveShowCount++
        if (this.cheatsEnabled) this.checkCheats()

        this.map?.update()

        if (this.map) {
            this.map.visibleTilesLayer = Array.from(
                { length: this.map.physicalMapHeight },
                () => new Array(this.map!.physicalMapWidth).fill(0),
            )
        }

        this.player?.update()
        this.enemy?.update()
        if (this.hud) {
            this.hud.argentineCount = this.player?.unitCount ?? 0
            this.hud.enemyCount     = this.enemy?.unitCount  ?? 0
        }

        if ((this.player?.unitCount ?? 1) === 0) this.setState(EpisodeState.lost)

        this.hud?.update()
        if (this.player?.completedObjective()) {
            console.debug('Objective fulfilled.')
            this.setNewObjective()
        }

        this.obstacles.forEach(o => o.update())
    }

    private drawPlayingState(video: VideoType): void {
        video.fillScreen(GameColor.black)

        const map = this.map
        if (map) map.drawLayer(video, map.layers.terrain)

        this.drawObjects(video)
        this.drawSemiTransparentLayer(video)
        this.hud?.draw(video)
        this.player?.drawOrientationArrow(video)

        if (this.showObjectivePopup && this.objectiveShowCount > C.objectiveShowStartCount) {
            this.setState(EpisodeState.showObjectives)
        } else if (this.showObjectiveReminder && this.objectiveShowCount > C.objectiveShowStartCount) {
            const camH = this.camera?.height ?? Video.height
            video.setFont(ResourceManager.shared.fonts[FontConstants.objectivesReminderFont], UIColors.title)
            video.writeId(Res.STR_OBJETIVOS, Layout.objectivesOffset << 1,
                camH - (Layout.objectivesHeight + Layout.objectivesOffset * 2) - 10, 0)
            const strIdx = Res.STR_OBJETIVO_BATALLA_1_1 + (this.currentLevel?.completedObjectiveCount ?? 0)
            video.writeId(strIdx, Layout.objectivesOffset << 1,
                camH - (Layout.objectivesHeight + Layout.objectivesOffset * 2) + 5, 0)
        }

        if (Mouse.shared.isDragging()) {
            video.setColor(GameColor.green)
            const r = Mouse.shared.dragRect
            video.drawRect(Math.trunc(r.x), Math.trunc(r.y), Math.trunc(r.width), Math.trunc(r.height))
        }
    }

    private drawObjects(video: VideoType): void {
        if (!this.map || !this.camera || !this.player) return
        const oldClip = video.getClip()
        video.setClip(this.camera.startX, this.camera.startY, this.camera.width, this.camera.height)

        const rect = this.player.getPaintCoordinates()
        let startCol = rect.x, startRow = rect.y
        let tileY = 0, toggle = true

        while (tileY <= rect.h) {
            let tileX = 0, i = startCol, j = startRow
            while (tileX <= rect.w && j >= 0) {
                if (i >= 0 && i < this.map.physicalMapHeight && j < this.map.physicalMapWidth) {
                    const obj = this.objectsToDraw.tabla[i]?.[j]
                    if (obj instanceof Unit)     obj.draw(video)
                    if (obj instanceof Obstacle) obj.draw(video)
                }
                tileX++; i++; j--
            }
            tileY++
            if (toggle) { startCol++; toggle = false }
            else        { startRow++; toggle = true  }
        }
        video.setClip(oldClip.x, oldClip.y, oldClip.w, oldClip.h)
    }

    private drawSemiTransparentLayer(video: VideoType): void {
        if (!this.map || !this.camera || !this.player) return
        const oldClip = video.getClip()
        video.setClip(this.camera.startX, this.camera.startY, this.camera.width, this.camera.height)

        const rect = this.player.getPaintCoordinates()
        let startCol = rect.x, startRow = rect.y
        let tileY = 0, toggle = true

        while (tileY <= rect.h) {
            let tileX = 0, i = startCol, j = startRow
            while (tileX <= rect.w && j >= 0) {
                if (i >= 0 && i < this.map.physicalMapHeight && j < this.map.physicalMapWidth) {
                    if (this.map.visibleTilesLayer[i]?.[j] === 0) {
                        this.map.drawSmallTile(video, i, j, true)
                    }
                }
                tileX++; i++; j--
            }
            tileY++
            if (toggle) { startCol++; toggle = false }
            else        { startRow++; toggle = true  }
        }
        video.setClip(oldClip.x, oldClip.y, oldClip.w, oldClip.h)
    }

    // MARK: - WON / LOST

    private updateWonState(): void {
        if ((this.button?.update() ?? 0) !== 0) this.setState(EpisodeState.end)
    }

    private drawWonState(video: VideoType): void {
        this.drawPlayingState(video)
        this.button?.draw(video)
        video.setFont(ResourceManager.shared.fonts[FontConstants.titleFont], UIColors.title)
        video.writeId(Res.STR_GANASTE, 0, 0, Surface.centerHorizontal | Surface.centerVertical)
    }

    private updateLostState(): void {
        this.count++
        if (this.count <= C.countdownToRestart) return
        const result = this.gameOverMenu.update()
        if (result === 0) this.setState(EpisodeState.end)
        if (result === 1) this.setState(EpisodeState.loading)
    }

    private drawLostState(video: VideoType): void {
        this.drawPlayingState(video)
        video.setFont(ResourceManager.shared.fonts[FontConstants.titleFont], UIColors.title)
        video.writeId(Res.STR_PERDISTE, 0, -100, Surface.centerHorizontal | Surface.centerVertical)
        if (this.count > C.countdownToRestart) this.gameOverMenu.draw(video)
    }

    // MARK: - Cheats

    private checkCheats(): void {
        const keys = Keyboard.shared.pressedKeys
        if (keys.has('KeyG') && this.cheatWinIdx === 0)  this.cheatWinIdx++
        else if (keys.has('KeyA') && this.cheatWinIdx === 1) this.cheatWinIdx++
        else if (keys.has('KeyN') && this.cheatWinIdx === 2) this.cheatWinIdx++
        else if (keys.has('KeyX') && this.cheatWinIdx === 3) this.cheatWinIdx++
        else if (keys.has('KeyW') && this.cheatWinIdx === 4) { this.setState(EpisodeState.won); this.cheatWinIdx = 0 }
        else if (keys.has('KeyP') && this.cheatLoseIdx === 0) this.cheatLoseIdx++
        else if (keys.has('KeyE') && this.cheatLoseIdx === 1) this.cheatLoseIdx++
        else if (keys.has('KeyR') && this.cheatLoseIdx === 2) this.cheatLoseIdx++
        else if (keys.has('KeyX') && this.cheatLoseIdx === 3) this.cheatLoseIdx++
        else if (keys.has('KeyW') && this.cheatLoseIdx === 4) { this.setState(EpisodeState.lost); this.cheatLoseIdx = 0 }
        else if (keys.has('KeyO') && this.cheatObjIdx === 0) this.cheatObjIdx++
        else if (keys.has('KeyB') && this.cheatObjIdx === 1) this.cheatObjIdx++
        else if (keys.has('KeyJ') && this.cheatObjIdx === 2) this.cheatObjIdx++
        else if (keys.has('KeyX') && this.cheatObjIdx === 3) this.cheatObjIdx++
        else if (keys.has('KeyW') && this.cheatObjIdx === 4) { this.setNewObjective(); this.cheatObjIdx = 0 }
        else {
            if (keys.has('KeyU')) this.player?.selectNextUnit()
            this.cheatWinIdx = 0; this.cheatLoseIdx = 0; this.cheatObjIdx = 0
        }
        Keyboard.shared.clearKeys()
    }

    private setState(s: EpisodeState): void {
        this.count       = 0
        this.stateValue  = s
        this.currentPage = 0
        if (s === EpisodeState.showObjectives) this.currentPage = 2
    }
}
