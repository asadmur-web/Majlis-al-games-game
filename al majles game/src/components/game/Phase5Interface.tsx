/**
 * Phase 5 Interface for Majlis Al-Games
 *
 * Phase 5: Post-Game and Social Features
 * - Post-game summary and statistics
 * - Social media sharing
 * - Play again functionality
 * - Player profiles and history
 */

import { type PlayerRoleType } from '../game/roleAssignment'

/**
 * Phase 5 state interface for post-game phase.
 */
export interface Phase5State {
  /** Whether the post-game screen is active */
  isActive: boolean
  /** Game result summary */
  resultSummary: {
    outcome: 'traitor_victory' | 'loyal_victory' | 'draw'
    finalMessage: string
    duration: string
  }
  /** Final player rankings */
  finalRankings: Array<{
    rank: number
    playerId: string
    nickname: string
    score: number
    wasTraitor: boolean
  }>
  /** Whether to show play again option */
  showPlayAgain: boolean
  /** Social media share text */
  shareText: string
  /** Whether sound effects are enabled */
  soundEffects: boolean
}

/**
 * Initializes a new Phase 5 state.
 *
 * @param outcome Game outcome
 * @param rankings Final player rankings
 * @param duration Game duration in milliseconds
 * @returns Phase 5 state
 */
export function initPhase5State(
  outcome: 'traitor_victory' | 'loyal_victory' | 'draw',
  rankings: Array<{
    playerId: string
    nickname: string
    score: number
    wasTraitor: boolean
  }>,
  duration: number
): Phase5State {
  const durationMinutes = Math.floor(duration / 60000)
  const durationSeconds = Math.floor((duration % 60000) / 1000)

  let finalMessage: string
  switch (outcome) {
    case 'loyal_victory':
      finalMessage = '🏆 Loyal players win! The traitors were exposed.'
      break
    case 'traitor_victory':
      finalMessage = '🕵️ Traitors win! They remained undetected.'
      break
    case 'draw':
      finalMessage = '🤝 The game ended in a draw.'
      break
    default:
      finalMessage = 'Game over.'
  }

  return {
    isActive: true,
    resultSummary: {
      outcome,
      finalMessage,
      duration: `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`,
    },
    finalRankings: rankings.map((r, index) => ({
      rank: index + 1,
      playerId: r.playerId,
      nickname: r.nickname,
      score: r.score,
      wasTraitor: r.wasTraitor,
    })),
    showPlayAgain: true,
    shareText: `I just played Majlis Al-Games! ${finalMessage
      .toLowerCase()
      .replace('🏆 ', '')
      .replace('🕵️ ', '')
      .replace('🤝 ', '')}`,
    soundEffects: true,
  }
}

/**
 * Closes the post-game phase and returns to lobby.
 *
 * @param phase5State Current Phase 5 state
 * @returns Phase 5 state ready for return to lobby
 */
export function closePhase5(phase5State: Phase5State): Phase5State {
  return {
    ...phase5State,
    isActive: false,
  }
}

/**
 * Updates the share text for social media.
 *
 * @param phase5State Current Phase 5 state
 * @param customText Custom share text (optional)
 * @returns Phase 5 state with updated share text
 */
export function updateShareText(
  phase5State: Phase5State,
  customText?: string
): Phase5State {
  const text = customText || phase5State.shareText
  return {
    ...phase5State,
    shareText: text,
  }
}

/**
 * Gets the ranking for a specific player.
 *
 * @param phase5State Current Phase 5 state
 * @param playerId Player ID
 * @returns Player ranking, or null if not found
 */
export function getPlayerRankingInPhase5(
  phase5State: Phase5State,
  playerId: string
): { rank: number; score: number; wasTraitor: boolean } | null {
  const ranking = phase5State.finalRankings.find(r => r.playerId === playerId)
  if (!ranking) return null

  return {
    rank: ranking.rank,
    score: ranking.score,
    wasTraitor: ranking.wasTraitor,
  }
}

/**
 * Checks if a player was a traitor in the game.
 *
 * @param phase5State Current Phase 5 state
 * @param playerId Player ID
 * @returns Whether the player was a traitor
 */
function _wasPlayerTraitor(
  phase5State: Phase5State,
  playerId: string
): boolean {
  const ranking = phase5State.finalRankings.find(r => r.playerId === playerId)
  return ranking ? ranking.wasTraitor : false
}

/**
 * Gets all traitors from the final rankings.
 *
 * @param phase5State Current Phase 5 state
 * @returns Array of traitor player info
 */
function _getTraitorsFromRankings(
  phase5State: Phase5State
): Array<{ playerId: string; nickname: string; rank: number }> {
  return phase5State.finalRankings
    .filter(r => r.wasTraitor)
    .map(r => ({
      playerId: r.playerId,
      nickname: r.nickname,
      rank: r.rank,
    }))
}

export default {
  initPhase5State,
  closePhase5,
  updateShareText,
  getPlayerRankingInPhase5,
  _wasPlayerTraitor, // internal use
  _getTraitorsFromRankings, // internal use
}