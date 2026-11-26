// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// Identifiers of the localised strings in data/strings_*.json, named as in the macOS
// port (StringID.swift).

/// A localised string. The value is its key in `data/strings_*.json`.
export const StringID = {
    sdlInitFailed:         'sdl_init_failed',
    windowCaption:         'window_caption',
    fatalErrorCaption:     'fatal_error_caption',
    pressToContinue:       'press_to_continue',
    loading:               'loading',
    next:                  'next',
    back:                  'back',
    youWon:                'you_won',
    youLost:               'you_lost',
    playAgain:             'play_again',
    objectives:            'objectives',
    accept:                'accept',
    continueLabel:         'continue',
    menuMain:              'menu_main',
    menuContinue:          'menu_continue',
    menuNewGame:           'menu_new_game',
    menuLoadGame:          'menu_load_game',
    menuOptions:           'menu_options',
    menuCredits:           'menu_credits',
    menuHelp:              'menu_help',
    menuExit:              'menu_exit',
    menuSave:              'menu_save',
    menuRestart:           'menu_restart',
    buttonBack:            'btn_back',
    buttonGameMenu:        'btn_game_menu',
    gamePaused:            'game_paused',
    unit:                  'unit',
    resistancePoints:      'resistance_points',
    range:                 'range',
    attackPoints:          'attack_points',
    visibility:            'visibility',
    aim:                   'aim',
    speed:                 'speed',
    exitConfirmation:      'exit_confirmation',
    yes:                   'yes',
    no:                    'no',
    enterName:             'enter_name',
    done:                  'done',
    creditsProgramming:    'credits_programming',
    creditsProgrammer1:    'credits_programmer_1',
    creditsLevelDesign:    'credits_level_design',
    creditsLevelDesigner1: 'credits_level_designer_1',
    objectiveBattle1:      'objective_battle_1_1',
    objectiveBattle2:      'objective_battle_2_1',
    objectiveBattle3:      'objective_battle_3_1',
    objectiveBattle4:      'objective_battle_4_1',
    battle1Title:          'battle_1',
    battle1Story:          'battle_1_2',
    battle1Objective:      'battle_1_objective_3',
    battle2Title:          'battle_2',
    battle2Story:          'battle_2_2',
    battle2Objective:      'battle_2_objective_3',
    battle3Title:          'battle_3',
    battle3Story:          'battle_3_2',
    battle3Objective:      'battle_3_objective_3',
    battle4Title:          'battle_4',
    battle4Story:          'battle_4_2',
    battle4Objective:      'battle_4_objective_3',
    aftermathTitle:        'aftermath',
    aftermath1:            'aftermath_1',
    aftermath2:            'aftermath_2',
    aftermath3:            'aftermath_3',
    helpSelectTitle:       'help_select_01',
    helpSelectText:        'help_select_02',
    helpMoveTitle:         'help_move_01',
    helpMoveText:          'help_move_02',
    helpAttackTitle:       'help_attack_01',
    helpAttackText:        'help_attack_02',
    helpObjectiveTitle:    'help_objective_01',
    helpObjectiveText:     'help_objective_02',
    helpScrollTitle:       'help_scroll_01',
    helpScrollText:        'help_scroll_02',
    helpHudTitle:          'help_hud_01',
    helpHudText:           'help_hud_02',
    helpHealTitle:         'help_heal_01',
    helpHealText:          'help_heal_02',
    helpTipsTitle:         'help_tips_01',
    helpTipsText:          'help_tips_02',
    helpWinTitle:          'help_win_01',
    helpWinText:           'help_win_02',
    tipButton:             'tip_00',
    language:              'language',
    languageLabel:         'language_label',
} as const
export type StringID = typeof StringID[keyof typeof StringID]

/// The intro pages shown before each battle, in order: three per battle
/// (title, story, objective), then the epilogue.
/// Page `p` of battle `b` is at `b * 3 + p`.
export const introPages: readonly StringID[] = [
    StringID.battle1Title, StringID.battle1Story, StringID.battle1Objective,
    StringID.battle2Title, StringID.battle2Story, StringID.battle2Objective,
    StringID.battle3Title, StringID.battle3Story, StringID.battle3Objective,
    StringID.battle4Title, StringID.battle4Story, StringID.battle4Objective,
    StringID.aftermathTitle, StringID.aftermath1, StringID.aftermath2, StringID.aftermath3,
]

/// The objective reminder shown during play, by number of completed objectives.
export const objectiveReminders: readonly StringID[] = [
    StringID.objectiveBattle1, StringID.objectiveBattle2, StringID.objectiveBattle3, StringID.objectiveBattle4,
]

/// The help screen pages, in order (matching `helpScreens` in AnimationID.ts).
export const helpPages: readonly { title: StringID; text: StringID }[] = [
    { title: StringID.helpSelectTitle,    text: StringID.helpSelectText },
    { title: StringID.helpMoveTitle,      text: StringID.helpMoveText },
    { title: StringID.helpAttackTitle,    text: StringID.helpAttackText },
    { title: StringID.helpObjectiveTitle, text: StringID.helpObjectiveText },
    { title: StringID.helpScrollTitle,    text: StringID.helpScrollText },
    { title: StringID.helpHudTitle,       text: StringID.helpHudText },
    { title: StringID.helpHealTitle,      text: StringID.helpHealText },
    { title: StringID.helpTipsTitle,      text: StringID.helpTipsText },
    { title: StringID.helpWinTitle,       text: StringID.helpWinText },
]
