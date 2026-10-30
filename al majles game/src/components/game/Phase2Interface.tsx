/**
 * Phase 2 Interface for Majlis Al-Games
 *
 * Phase 2: Question Generation and Answering
 * - Smart question generation tailored to game mode
 * - Players provide answers
 * - Answer evaluation engine
 * - Scoring system begins
 */

import { createGameQuestion, type GameQuestion } from '../game/gameEngine'

/**
 * Phase 2 state interface for question phase.
 */
export interface Phase2State {
  /** Current question being asked */
  currentQuestion: GameQuestion | null
  /** List of player answers */
  playerAnswers: Map<string, string>
  /** Whether the question time limit has expired */
  timeExpired: boolean
  /** Question time limit in seconds */
  questionTimeLimit: number
  /** Time when the question was presented */
  questionStartTime: number
  /** Current score tracking */
  scores: Map<string, number>
  /** Whether the question phase is active */
  isActive: boolean
}

/**
 * Initializes a new Phase 2 state.
 *
 * @param questionTimeLimit Time limit in seconds for answering
 * @returns Phase 2 state
 */
export function initPhase2State(
  questionTimeLimit: number = 30
): Phase2State {
  const now = Date.now()
  return {
    currentQuestion: null,
    playerAnswers: new Map(),
    timeExpired: false,
    questionTimeLimit,
    questionStartTime: now,
    scores: new Map(),
    isActive: false,
  }
}

/**
 * Presents a new question to the players.
 *
 * @param phase2State Current Phase 2 state
 * @param questionText The question to present
 * @returns Updated Phase 2 state with the question
 */
export function presentQuestion(
  phase2State: Phase2State,
  questionText: string
): Phase2State {
  const question = createGameQuestion(questionText, 'question')

  const now = Date.now()
  const questionStartTime = now

  return {
    ...phase2State,
    currentQuestion: question,
    playerAnswers: new Map(),
    timeExpired: false,
    questionStartTime,
    isActive: true,
  }
}

/**
 * Records a player's answer to the current question.
 *
 * @param phase2State Current Phase 2 state
 * @param playerId Player's ID
 * @param answer The answer text
 * @returns Updated Phase 2 state
 */
export function recordAnswer(
  phase2State: Phase2State,
  playerId: string,
  answer: string
): Phase2State {
  if (!phase2State.currentQuestion) {
    throw new Error('No current question to answer')
  }

  const updatedAnswers = new Map(phase2State.playerAnswers)
  updatedAnswers.set(playerId, answer)

  const now = Date.now()
  const timeElapsed = (now - phase2State.questionStartTime) / 1000
  const timeExpired = timeElapsed >= phase2State.questionTimeLimit

  return {
    ...phase2State,
    playerAnswers: updatedAnswers,
    timeExpired,
    questionStartTime:
      timeExpired || phase2State.questionStartTime > now ? now : phase2State.questionStartTime,
  }
}

/**
 * Evaluates all player answers and calculates scores.
 *
 * @param phase2State Current Phase 2 state
 * @param correctAnswer The correct answer (determined by game logic)
 * @returns Updated Phase 2 state with scores calculated
 */
export function evaluateAnswers(
  phase2State: Phase2State,
  correctAnswer: string
): Phase2State {
  const traitorTally = { isTraitor: 0, isLoyal: 0 }
  const playerScores = new Map<string, number>()

  // Get all player IDs from the game
  // In a real implementation, this would come from the game state
  const allPlayers = Array.from(phase2State.playerAnswers.keys())

  // Evaluate each answer
  for (const [playerId, answer] of phase2State.playerAnswers) {
    const isCorrect = answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()

    // Score: 1 point for correct answer
    let score = isCorrect ? 1 : 0

    // Additional scoring logic could go here:
    // - Bonus points for traitors who give misleading answers
    // - Penalty points for incorrect answers
    // - etc.

    playerScores.set(playerId, (playerScores.get(playerId) ?? 0) + score)

    // Track traitor-specific scoring
    if (isCorrect) {
      // Loyal players who answer correctly get points
      // Traitars who answer correctly may give away information
      traitorTally.isLoyal++
    } else {
      traitorTally.isTraitor++
    }
  }

  // Set scores on the state
  for (const [playerId, score] of playerScores) {
    phase2State.scores.set(playerId, score)
  }

  return {
    ...phase2State,
    scores: playerScores,
  }
}

/**
 * Advances the phase 2 to the next stage (voting phase).
 *
 * @param phase2State Current Phase 2 state
 * @returns Phase 2 state ready for voting
 */
export function advanceToVoting(phase2State: Phase2State): Phase2State {
  return {
    ...phase2State,
    isActive: false,
    currentQuestion: null,
  }
}

/**
 * Gets the score for a specific player.
 *
 * @param phase2State Current Phase 2 state
 * @param playerId Player ID
 * @returns Player score, or 0 if not found
 */
export function getPlayerScore(
  phase2State: Phase2State,
  playerId: string
): number {
  return phase2State.scores.get(playerId) ?? 0
}

/**
 * Gets the player with the highest score.
 *
 * @param phase2State Current Phase 2 state
 * @returns Player ID with highest score, or null if no scores
 */
export function getTopScorer(
  phase2State: Phase2State
): string | null {
  const scores = Array.from(phase2State.scores.entries())
  if (scores.length === 0) return null

  scores.sort((a, b) => b[1] - a[1])
  return scores[0][0]
}

export default {
  initPhase2State,
  presentQuestion,
  recordAnswer,
  evaluateAnswers,
  advanceToVoting,
  getPlayerScore,
  getTopScorer,
}