/**
 * Phase 3 Interface for Majlis Al-Games
 *
 * Phase 3: Deduction and Voting
 * - Discussion period where players discuss and deduce who the traitors are
 * - Voting phase where players vote to expose a traitor
 * - Traitor exposure and elimination
 * - Victory condition checking
 */

import { processVote, isTraitorExposed, type GameVote, type PlayerRoleType } from '../game/gameEngine'

/**
 * Phase 3 state interface for voting/deduction phase.
 */
export interface Phase3State {
  /** Current voting options (players being voted on) */
  votingOptions: string[]
  /** Votes that have been cast */
  votes: Map<string, GameVote>
  /** Whether voting is still open */
  votingOpen: boolean
  /** Time when voting started */
  votingStartTime: number
  /** Time limit for voting in seconds */
  votingTimeLimit: number
  /** Whether discussion phase is active */
  discussionActive: boolean
  /** Current vote tally results */
  voteTally: {
    /** Votes counting as traitor */
    isTraitor: number
    /** Votes counting as loyal */
    isLoyal: number
  }
  /** Whether a traitor has been exposed this round */
  traitorExposed: boolean
  /** The exposed traitor's ID (if any) */
  exposedTraitorId: string | null
  /** Score updates from this voting round */
  scoreUpdates: Map<string, number>
}

/**
 * Initializes a new Phase 3 state.
 *
 * @param players List of player nicknames/IDs
 * @param votingTimeLimit Voting time limit in seconds
 * @returns Phase 3 state
 */
export function initPhase3State(
  players: string[],
  votingTimeLimit: number = 60
): Phase3State {
  const now = Date.now()
  const votingOptions = players.map(p => p).filter(Boolean)

  return {
    votingOptions: votingOptions.length > 0 ? votingOptions : ['All Players'],
    votes: new Map(),
    votingOpen: true,
    votingStartTime: now,
    votingTimeLimit,
    discussionActive: true,
    voteTally: { isTraitor: 0, isLoyal: 0 },
    traitorExposed: false,
    exposedTraitorId: null,
    scoreUpdates: new Map(),
  }
}

/**
 * Casts a vote for a specific player.
 *
 * @param phase3State Current Phase 3 state
 * @param voterId The player casting the vote
 * @param targetId The player being voted on
 * @param isTraitorVote Whether the voter thinks the target is a traitor
 * @returns Updated Phase 3 state
 */
export function castVote(
  phase3State: Phase3State,
  voterId: string,
  targetId: string,
  isTraitorVote: boolean
): Phase3State {
  // Create the vote
  const vote: GameVote = {
    voterId,
    targetId,
    isTraitorVote,
    timestamp: Date.now(),
  }

  // Add or update the vote (each player can only vote once)
  const updatedVotes = new Map(phase3State.votes)
  updatedVotes.set(voterId, vote)

  // Recalculate tally
  const traitorTally = { isTraitor: 0, isLoyal: 0 }
  for (const vote of updatedVotes.values()) {
    if (vote.isTraitorVote) {
      traitorTally.isTraitor++
    } else {
      traitorTally.isLoyal++
    }
  }

  // Check if a traitor was exposed
  const { exposed, majorityWasCorrect, votePercentage } = isTraitorExposed(
    traitorTally,
    phase3State.votingOptions.length,
    /* actualIsTraitor will be determined by game state */
    false // placeholder - in real game, this comes from game engine
  )

  const newTraitorExposed = exposed && traitorTally.isTraitor > 0

  // Determine exposed traitor ID if traitor was exposed
  let exposedTraitorId: string | null = null
  if (newTraitorExposed) {
    // Find which player received the most "is traitor" votes
    let maxTraitorVotes = 0
    let maxVoterId: string | null = null

    for (const [voterId, vote] of updatedVotes) {
      if (vote.isTraitorVote && vote.targetId) {
        const targetVoteCount = Array.from(updatedVotes.values())
          .filter(v => v.targetId === vote.targetId && v.isTraitorVote)
          .length

        if (targetVoteCount > maxTraitorVotes) {
          maxTraitorVotes = targetVoteCount
          maxVoterId = voterId
        }
      }
    }

    // Use the target with most traitor votes as the exposed traitor
    if (maxVoterId && updatedVotes.get(maxVoterId)?.targetId) {
      exposedTraitorId = updatedVotes.get(maxVoterId)?.targetId
    }
  }

  return {
    ...phase3State,
    votes: updatedVotes,
    voteTally: traitorTally,
    traitorExposed: newTraitorExposed,
    exposedTraitorId,
    scoreUpdates: new Map(), // would be populated with actual score changes
  }
}

/**
 * Ends the voting phase and determines next steps.
 *
 * @param phase3State Current Phase 3 state
 * @returns Phase 3 state with voting closed
 */
export function endVotingPhase(phase3State: Phase3State): Phase3State {
  return {
    ...phase3State,
    votingOpen: false,
    discussionActive: false,
  }
}

/**
 * Gets the percentage of votes that were for traitor.
 *
 * @param phase3State Current Phase 3 state
 * @returns Vote percentage (0-100)
 */
export function getVotePercentage(phase3State: Phase3State): number {
  const totalVotes = phase3State.votes.size
  if (totalVotes === 0) return 0

  const traitorVotes = Array.from(phase3State.votes.values())
    .filter(v => v.isTraitorVote).length

  return Math.round((traitorVotes / totalVotes) * 100 * 10) / 10 // round to 1 decimal
}

/**
 * Gets the current vote tally breakdown.
 *
 * @param phase3State Current Phase 3 state
 * @returns Tally object with traitor and loyal counts
 */
export function getVoteTally(phase3State: Phase3State): {
  isTraitor: number
  isLoyal: number
  total: number
} {
  const { voteTally } = phase3State
  const total = voteTally.isTraitor + voteTally.isLoyal
  return {
    isTraitor: voteTally.isTraitor,
    isLoyal: voteTally.isLoyal,
    total,
  }
}

export default {
  initPhase3State,
  castVote,
  endVotingPhase,
  getVotePercentage,
  getVoteTally,
}