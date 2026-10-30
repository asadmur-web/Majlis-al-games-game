/**
 * Phase 4 Interface for Majlis Al-Games
 *
 * Phase 4: Results and Scoring
 * - Final score tallying
 * - Victory/defeat determination
 * - Celebration effects
 * - Game history logging
 */

import { type PlayerRoleType } from '../game/roleAssignment'

/**
 * Phase 4 state interface for results phase.
 */
export interface Phase4State {
  /** Final rankings by score */
  rankings: Array<{
    playerId: string
    nickname: string
    score: number
    traitor: boolean
  }>
  /** Whether traitors were successfully exposed */
  traitorsExposed: boolean
  /** List of exposed traitor IDs */
  exposedTraitors: string[]
  /** Game outcome (victory or defeat) */
  outcome: 'traitor_victory' | 'loyal_victory' | 'draw'
  /** Final message to display */
  finalMessage: string
  /** Celebration effects to trigger */
  celebrationEffects: {
    /** Particle effect type */
    type: 'confetti' | 'fireworks' | 'stars'
    /** Whether enabled */
    enabled: boolean
  }
  /** Game duration in milliseconds */
  duration: number
  /** Whether scores have been finalized */
  scoresFinalized: boolean
}

/**
 * Initializes a new Phase 4 state with results.
 *
 * @param players All player roles from the game
 * @param finalScores Final scores for each player
 * @param exposedTraitors List of traitor IDs that were exposed
 * @param gameDuration Duration of the game in milliseconds
 * @returns Phase 4 state
 */
export function initPhase4State(
  players: PlayerRoleType[],
  finalScores: Map<string, number>,
  exposedTraitors: string[] = [],
  gameDuration: number = 0
): Phase4State {
  const totalPlayers = players.length
  const traitorsExposed = exposedTraitors.length > 0

  // Determine outcome
  let outcome: 'traitor_victory' | 'loyal_victory' | 'draw'
  const traitorCount = players.filter(p => p.isTraitor).length

  if (traitorsExposed && traitorCount > 0) {
    // Loyal team wins when traitors are exposed
    outcome = 'loyal_victory'
  } else if (!traitorsExposed && traitorCount > 0) {
    // Traitors win when they remain hidden
    outcome = 'traitor_victory'
  } else {
    outcome = 'draw'
  }

  // Build rankings sorted by score (descending)
  const rankings = Array.from(finalScores.entries())
    .map(([playerId, score]) => {
      const player = players.find(p => p.id === playerId)
      return {
        playerId,
        nickname: player?.nickname || `Player ${playerId}`,
        score,
        traitor: player?.isTraitor || false,
      }
    })
    .sort((a, b) => b.score - a.score)

  // Determine final message
  let finalMessage: string
  if (outcome === 'loyal_victory') {
    finalMessage = `🏆 Loyal players victory! The traitors were exposed.`
  } else if (outcome === 'traitor_victory') {
    finalMessage = `🕵️ Traitor victory! The traitors remained undetected.`
  } else {
    finalMessage = `🤝 Draw! The game ended in a tie.`
  }

  return {
    rankings,
    traitorsExposed,
    exposedTraitors,
    outcome,
    finalMessage,
    celebrationEffects: {
      type: 'confetti',
      enabled: true,
    },
    duration: gameDuration,
    scoresFinalized: true,
  }
}

/**
 * Gets a player's ranking position.
 *
 * @param phase4State Current Phase 4 state
 * @param playerId Player ID
 * @returns Ranking position (1-based), or null if not found
 */
export function getPlayerRanking(
  phase4State: Phase4State,
  playerId: string
): number | null {
  const ranking = phase4State.rankings.findIndex(r => r.playerId === playerId)
  return ranking !== -1 ? ranking + 1 : null
}

/**
 * Gets the winner of the game.
 *
 * @param phase4State Current Phase 4 state
 * @returns Winner nickname, or null if no clear winner
 */
export function getWinner(
  phase4State: Phase4State
): string | null {
  const loyalWinners = phase4State.rankings
    .filter(r => !r.traitor)
    .sort((a, b) => b.score - a.score)

  const traitorWinners = phase4State.rankings
    .filter(r => r.traitor)
    .sort((a, b) => b.score - a.score)

  if (phase4State.outcome === 'loyal_victory') {
    // Loyal team wins - return top loyal player
    return loyalWinners[0]?.nickname || null
  } else if (phase4State.outcome === 'traitor_victory') {
    // Traitor team wins - return top traitor player
    return traitorWinners[0]?.nickname || null
  }

  return null
}

/**
 * Checks if a specific player was a traitor and was exposed.
 *
 * @param phase4State Current Phase 4 state
 * @param playerId Player ID
 * @returns Object with traitor and exposed status
 */
function _checkPlayerTraitorExposure(
  phase4State: Phase4State,
  playerId: string
): {
  isTraitor: boolean
  wasExposed: boolean
} {
  const playerRanking = phase4State.rankings.find(r => r.playerId === playerId)
  if (!playerRanking) {
    return { isTraitor: false, wasExposed: false }
  }

  return {
    isTraitor: playerRanking.traitor,
    wasExposed: phase4State.traitorsExposed && playerRanking.traitor,
  }
}

/**
 * Finalizes the scores and determines the game outcome.
 *
 * @param phase4State Current Phase 4 state
 * @returns Updated Phase 4 state with finalized results
 */
export function finalizeResults(phase4State: Phase4State): Phase4State {
  // In a real implementation, this would add any final calculations
  // For now, we just ensure scoresFinalized is true
  return {
    ...phase4State,
    scoresFinalized: true,
  }
}

/**
 * Gets the final score for a player.
 *
 * @param phase4State Current Phase 4 state
 * @param playerId Player ID
 * @returns Final score
 */
export function getFinalScore(
  phase4State: Phase4State,
  playerId: string
): number {
  const playerRanking = phase4State.rankings.find(r => r.playerId === playerId)
  return playerRanking ? playerRanking.score : 0
}

export default {
  initPhase4State,
  finalizeResults,
  getPlayerRanking,
  getWinner,
  getFinalScore,
}