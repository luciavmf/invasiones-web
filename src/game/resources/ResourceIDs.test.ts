// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// The resource IDs use positions in data/res.json, and the string IDs use keys of
// data/strings_*.json. These tests fail if the files and the IDs drift apart, as the
// macOS port's ResourceIDTests do.

import { describe, expect, test } from 'vitest'
import res from '../../../public/data/res.json'
import stringsES from '../../../public/data/strings_es.json'
import stringsEN from '../../../public/data/strings_en.json'
import stringsDE from '../../../public/data/strings_de.json'
import { SoundID } from '../audio/Sound'
import { ImageID, FontFamily } from './ImageID'
import { AnimationID } from './AnimationID'
import { UnitType, SpriteID } from './UnitType'
import { StringID } from './StringID'
import { TilesetID, tilesetCount, tilesetIDFromTsxName } from '../map/TilesetID'

/// The file name at the given position of a path list.
function fileName(paths: string[], index: number): string | undefined {
    return paths[index]?.split('/').pop()
}

describe('resource IDs match res.json', () => {
    test('sounds', () => {
        const paths = res.sonidos.sfx
        expect(paths).toHaveLength(Object.keys(SoundID).length)
        expect(fileName(paths, SoundID.splash)).toBe('otheme.ogg')
        expect(fileName(paths, SoundID.patricioDeath)).toBe('patricio_muerto.wav')
        expect(fileName(paths, SoundID.battle)).toBe('TOS-rbattle.ogg')
    })

    test('images', () => {
        const paths = res.imagenes
        expect(paths).toHaveLength(Object.keys(ImageID).length)
        expect(fileName(paths, ImageID.logo)).toBe('logo.png')
        expect(fileName(paths, ImageID.background)).toBe('fondo.png')
        expect(fileName(paths, ImageID.hud)).toBe('hud.png')
    })

    test('fonts', () => {
        expect(res.fuentes).toHaveLength(Object.keys(FontFamily).length)
        expect(fileName(res.fuentes, FontFamily.lblack)).toBe('LBLACK.TTF')
    })

    test('unit types and sprites', () => {
        expect(res.unidades.map(u => u.name)).toEqual(['patricio', 'ingles'])
        expect(UnitType).toEqual({ patricio: 0, british: 1 })
        expect(res.sprites.map(s => s.name)).toEqual(['patricio', 'ingles'])
        expect(SpriteID).toEqual({ patricio: 0, british: 1 })
    })

    test('animations', () => {
        expect(res.anims).toHaveLength(Object.keys(AnimationID).length)
    })

    test('tilesets, then the maps', () => {
        const paths = res.escenarios.tilesets
        expect(paths).toHaveLength(tilesetCount)
        expect(fileName(paths, TilesetID.grass)).toBe('pasto.tsx')
        expect(fileName(paths, TilesetID.fort)).toBe('fuerte.tsx')
        expect(fileName(res.escenarios.mapas, 0)).toBe('nivel1a.tmx')
    })

    test('tileset names in the .tsx files', () => {
        expect(tilesetIDFromTsxName('Enfermeria')).toBe(TilesetID.infirmary)
        // As in the original, the objectives tileset is treated as the debug one.
        expect(tilesetIDFromTsxName('objetivos')).toBe(TilesetID.debug)
    })
})

describe('string IDs', () => {
    test.each([
        ['es', stringsES], ['en', stringsEN], ['de', stringsDE],
    ])('every string ID has a text in strings_%s.json', (_, strings) => {
        const missing = Object.values(StringID).filter(key => !(key in strings))
        expect(missing).toEqual([])
    })
})
