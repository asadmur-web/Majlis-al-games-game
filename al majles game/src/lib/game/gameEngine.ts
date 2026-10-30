/**
 * Game Engine for Majlis Al-Games
 *
 * Core game logic including role assignment, phase management,
 * scoring, and real-time socket event handling.
 */

import { assignRoles, RoleAssignmentConfig, validatePlayerCount, getTraitorAllocationDescription, PlayerRole } from './roleAssignment'
import type { PlayerRole as PlayerRoleType } from './roleAssignment'

/**
 * Game state interface describing the current state of a game session.
 */
export interface GameState {
  /** Unique room code */
  roomCode: string
  /** Current phase of the game */
  phase: 'lobby' | 'setup' | 'question' | 'voting' | 'results'
  /** Whether the game has started */
  isStarted: boolean
  /** Total number of players */
  totalPlayers: number
  /** List of player roles */
  players: PlayerRoleType[]
  /** Current traitor count */
  traitorCount: number
  /** Host room code (the unique identifier) */
  hostCode: string
  /** Game settings */
  settings: GameSettings
  /** Timestamp of last state update */
  lastUpdated: number
}

/**
 * Game settings configuration.
 */
export interface GameSettings {
  /** Time limit for questions (in seconds) */
  questionTimeLimit?: number
  /** Time limit for voting (in seconds) */
  votingTimeLimit?: number
  /** Whether traitor count is host-overridden */
  hostOverrideTraitorCount: boolean
  /** Custom traitor count if host overrode default */
  customTraitorCount?: number
  /** Game mode or category */
  gameMode?: string
  /** Whether sound effects are enabled */
  soundEffects: boolean
}

/**
 * Creates a new game state for a room.
 *
 * @param roomCode Unique room code
 * @param hostCode Host's unique room code
 * @param playerNicknames Array of player nicknames
 * @param settings Game settings
 * @returns Initial game state with assigned roles
 */
export function createGameState(
  roomCode: string,
  hostCode: string,
  playerNicknames: string[],
  settings: GameSettings = {}
): GameState {
  // Validate player count meets minimum threshold
  const validation = validatePlayerCount(playerNicknames.length)
  if (!validation.isValid) {
    throw new Error(validation.error!)
  }

  // Determine traitor count (default or host override)
  const traitorCount = settings.hostOverrideTraitorCount
    ? (settings.customTraitorCount ?? validation.traitorCount)
    : validation.traitorCount

  // Assign roles to players
  const players = assignRoles(playerNicknames, {
    defaultTraitorCount: traitorCount,
    hostOverride: settings.hostOverrideTraitorCount,
    customTraitorCount: settings.customTraitorCount,
  })

  return {
    roomCode,
    hostCode,
    phase: 'lobby',
    isStarted: false,
    totalPlayers: playerNicknames.length,
    players,
    traitorCount,
    lastUpdated: Date.now(),
    settings: {
      questionTimeLimit: settings.questionTimeLimit,
      votingTimeLimit: settings.votingTimeLimit,
      hostOverrideTraitorCount: settings.hostOverrideTraitorCount,
      customTraitorCount: settings.customTraitorCount,
      soundEffects: settings.soundEffects ?? true,
      ...settings,
    },
  }
}

/**
 * Advances the game to the next phase.
 *
 * @param currentPhase Current game phase
 * @returns Next game phase
 */
export function advancePhase(currentPhase: GameState['phase']): GameState['phase'] {
  const phaseOrder: GameState['phase'][] = ['lobby', 'setup', 'question', 'voting', 'results']

  const currentIndex = phaseOrder.indexOf(currentPhase)
  if (currentIndex === -1) {
    return 'lobby' // fallback
  }

  const nextIndex = currentIndex + 1
  if (nextIndex >= phaseOrder.length) {
    return 'results' // game over
  }

  return phaseOrder[nextIndex]
}

/**
 * Gets the traitor allocation description for the current player count.
 *
 * @param totalPlayers Number of players
 * @returns Description string
 */
export function getTraitorSetup(totalPlayers: number): string {
  return getTraitorAllocationDescription(totalPlayers)
}

/**
 * Validates that a player count is sufficient to start a game.
 *
 * @param totalPlayers Number of players to validate
 * @returns Validation result
 */
export function canStartGame(totalPlayers: number): {
  canStart: boolean
  message: string
  traitorCount: number
} {
  const validation = validatePlayerCount(totalPlayers)
  if (!validation.isValid) {
    return {
      canStart: false,
      message: validation.error!,
      traitorCount: 0,
    }
  }

  const traitorCount = getDefaultTraitorCount(totalPlayers)
  return {
    canStart: true,
    message: `Game can start with ${totalPlayers} players (${traitorCount} Traitor${
      traitorCount !== 1 ? 's' : ''
    }).`,
    traitorCount,
  }
}

/**
 * Interface for a game question.
 */
export interface GameQuestion {
  /** Unique question ID */
  id: string
  /** The question text */
  text: string
  /** The phase when this question was asked */
  phase: GameState['phase']
  /** Whether this question was asked to traitors specifically */
  targetedTraitor?: boolean
}

/**
 * Creates a new game question.
 *
 * @param text Question text
 * @param phase Current game phase
 * @returns New game question with ID
 */
export function createGameQuestion(
  text: string,
  phase: GameState['phase']
): GameQuestion {
  return {
    id: `question-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    text,
    phase,
  }
}

/**
 * Interface for a game vote.
 */
export interface GameVote {
  /** voter player ID */
  voterId: string
  /** The player being voted on */
  targetId: string
  /** Whether the voter thinks the target is a traitor */
  isTraitorVote: boolean
  /** Timestamp of the vote */
  timestamp: number
}

/**
 * Processes a player vote and returns the vote result.
 *
 * @param vote The vote to process
 * @param allPlayers All players in the game
 * @returns Vote result with tally
 */
export function processVote(
  vote: GameVote,
  allPlayers: PlayerRoleType[]
): {
  vote: GameVote
  traitorTally: { isTraitor: number; isLoyal: number }
  totalVotes: number
} {
  const traitorTally = { isTraitor: 0, isLoyal: 0 }

  // Tally the vote
  if (vote.isTraitorVote) {
    traitorTally.isTraitor++
  } else {
    traitorTally.isLoyal++
  }

  const totalVotes = traitorTally.isTraitor + traitorTally.isLoyal

  return {
    vote,
    traitorTally,
    totalVotes,
  }
}

/**
 * Determines if a vote result exposes a traitor.
 * A traitor is exposed if the majority vote correctly identifies them.
 *
 * @param traitorTally Tally from processVote
 * @param totalPlayers Total number of players
 * @param actualIsTraitor Whether the target is actually a traitor
 * @returns Whether the traitor was exposed (correctly identified)
 */
export function isTraitorExposed(
  traitorTally: { isTraitor: number; isLoyal: number },
  totalPlayers: number,
  actualIsTraitor: boolean
): {
  exposed: boolean
  majorityWasCorrect: boolean
  votePercentage: number
} {
  const majorityThreshold = Math.floor(totalPlayers / 2) + 1
  const majorityMet = traitorTally.isTraitor >= majorityThreshold

  const majorityWasCorrect = majorityMet ? actualIsTraitor : !actualIsTraitor
  const exposed = majorityWasCorrect && actualIsTraitor

  const votePercentage = totalPlayers > 0
    ? (traitorTally.isTraitor / totalPlayers) * 100
    : 0

  return {
    exposed,
    majorityWasCorrect,
    votePercentage: Math.round(votePercentage * 10) / 10, // round to 1 decimal
  }
}

export default {
  createGameState,
  advancePhase,
  getTraitorSetup,
  canStartGame,
  createGameQuestion,
  GameQuestion,
  GameVote,
  processVote,
  isTraitorExposed,
}