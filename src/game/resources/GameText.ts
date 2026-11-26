// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Language } from '../Language'
import type { StringID } from './StringID'

/// Loads and caches localised strings from strings_XX.json, looked up by `StringID`.
export class GameText {

    private static _strings: Record<string, string> = {}
    private static _tips: string[] = []

    /// The text of a string in the current language (empty if the file doesn't have it).
    static text(id: StringID): string { return GameText._strings[id] ?? '' }

    /// All gameplay tips for the current language. Pick with a random index.
    static get tips(): string[] { return GameText._tips }

    /// Fetches and caches the strings file for the current language.
    static async loadStrings(): Promise<void> {
        const filename = Language.current.filename
        const response = await fetch(`${import.meta.env.BASE_URL}data/${filename}`)
        if (!response.ok) throw new Error(`GameText: failed to load ${filename}`)
        const raw: Record<string, unknown> = await response.json()
        const dict = raw as Record<string, string>
        GameText._strings = dict
        GameText._tips = Array.isArray(raw['tips']) ? raw['tips'] as string[] : []
    }
}
