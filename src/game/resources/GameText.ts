// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Language } from '../Language'

/// Loads and caches localised strings from strings_XX.json.
/// All strings are indexed by the Res.STR_* constants (same order as the Swift port).
export class GameText {

    // Key order must match Res.STR_* index values exactly.
    private static readonly keyOrder: string[] = [
        'sdl_init_failed',        // 0
        'window_caption',         // 1
        'fatal_error_caption',    // 2
        'press_to_continue',      // 3
        'loading',                // 4
        'next',                   // 5
        'back',                   // 6
        'you_won',                // 7
        'you_lost',               // 8
        'play_again',             // 9
        'objectives',             // 10
        'accept',                 // 11
        'continue',               // 12
        'menu_main',              // 13
        'menu_continue',          // 14
        'menu_new_game',          // 15
        'menu_load_game',         // 16
        'menu_options',           // 17
        'menu_credits',           // 18
        'menu_help',              // 19
        'menu_exit',              // 20
        'menu_save',              // 21
        'menu_restart',           // 22
        'btn_back',               // 23
        'btn_game_menu',          // 24
        'game_paused',            // 25
        'unit',                   // 26
        'resistance_points',      // 27
        'range',                  // 28
        'attack_points',          // 29
        'visibility',             // 30
        'aim',                    // 31
        'speed',                  // 32
        'exit_confirmation',      // 33
        'yes',                    // 34
        'no',                     // 35
        'enter_name',             // 36
        'done',                   // 37
        'credits_programming',    // 38
        'credits_programmer_1',   // 39
        'credits_level_design',   // 40
        'credits_level_designer_1', // 41
        'objective_battle_1_1',   // 42
        'objective_battle_2_1',   // 43
        'objective_battle_3_1',   // 44
        'objective_battle_4_1',   // 45
        'battle_1',               // 46
        'battle_1_2',             // 47
        'battle_1_objective_3',   // 48
        'battle_2',               // 49
        'battle_2_2',             // 50
        'battle_2_objective_3',   // 51
        'battle_3',               // 52
        'battle_3_2',             // 53
        'battle_3_objective_3',   // 54
        'battle_4',               // 55
        'battle_4_2',             // 56
        'battle_4_objective_3',   // 57
        'aftermath',              // 58
        'aftermath_1',            // 59
        'aftermath_2',            // 60
        'aftermath_3',            // 61
        'help_select_01',         // 62
        'help_select_02',         // 63
        'help_move_01',           // 64
        'help_move_02',           // 65
        'help_attack_01',         // 66
        'help_attack_02',         // 67
        'help_objective_01',      // 68
        'help_objective_02',      // 69
        'help_scroll_01',         // 70
        'help_scroll_02',         // 71
        'help_hud_01',            // 72
        'help_hud_02',            // 73
        'help_heal_01',           // 74
        'help_heal_02',           // 75
        'help_tips_01',           // 76
        'help_tips_02',           // 77
        'help_win_01',            // 78
        'help_win_02',            // 79
        'tip_00',                 // 80
        'tip_01',                 // 81
        'tip_02',                 // 82
        'tip_03',                 // 83
        'tip_04',                 // 84
        'tip_05',                 // 85
        'tip_06',                 // 86
        'tip_07',                 // 87
        'tip_08',                 // 88
        'tip_09',                 // 89
        'tip_10',                 // 90
        'tip_11',                 // 91
        'tip_12',                 // 92
        'tip_13',                 // 93
        'tip_14',                 // 94
        'tip_15',                 // 95
        'tip_16',                 // 96
        'tip_17',                 // 97
        'tip_18',                 // 98
        'tip_19',                 // 99
        'tip_20',                 // 100
        'tip_21',                 // 101
        'tip_22',                 // 102
        'tip_23',                 // 103
        'language',               // 104
        'language_label',         // 105
    ]

    private static _strings: string[] = []

    static get strings(): string[] { return GameText._strings }

    /// Fetches and caches the strings file for the current language.
    static async loadStrings(): Promise<void> {
        const filename = Language.current.filename
        const response = await fetch(`${import.meta.env.BASE_URL}data/${filename}`)
        if (!response.ok) throw new Error(`GameText: failed to load ${filename}`)
        const dict: Record<string, string> = await response.json()
        GameText._strings = GameText.keyOrder.map(key => dict[key] ?? '')
    }
}
