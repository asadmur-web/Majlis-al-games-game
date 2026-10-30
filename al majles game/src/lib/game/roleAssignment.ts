/**
 * Role Assignment Module for Majlis Al-Games
 *
 * Handles dynamic traitor allocation based on player count,
 * with host override capability.
 *
 * Minimum Player Threshold: A game session cannot start unless there are
 * at least 4 players in the room (total_players >= 4).
 */

export interface PlayerRole {
  id: string
  nickname: string
  isTraitor: boolean
  color: 'traitor' | 'loyal'
}

/**
 * Default traitor allocation matrix based on player count.
 * Defines the number of traitors for each player range.
 */
export const TRAITOR_MATRIX = {
  '4-5': 1,
  '6-8': 2,
  '9-12': 3,
} as const

/**
 * Gets the default number of traitors based on total player count.
 *
 * @param totalPlayers Number of players in the room (must be >= 4)
 * @returns Number of traitors according to the default matrix
 * @throws Error if totalPlayers < 4
 */
export function getDefaultTraitorCount(totalPlayers: number): number {
  if (totalPlayers < 4) {
    throw new Error(
      `Minimum player threshold not met: ${totalPlayers} players. ` +
      `A game session requires at least 4 players (total_players >= 4).`
    )
  }

  if (totalPlayers >= 9 && totalPlayers <= 12) {
    return TRAITOR_MATRIX['9-12']
  }

  if (totalPlayers >= 6 && totalPlayers <= 8) {
    return TRAITOR_MATRIX['6-8']
  }

  if (totalPlayers >= 4 && totalPlayers <= 5) {
    return TRAITOR_MATRIX['4-5']
  }

  // Fallback (should not be reached due to the check above)
  return 1
}

/**
 * Role assignment configuration allowing host customization.
 * The host can override the default traitor count.
 */
export interface RoleAssignmentConfig {
  /** Default traitor count based on player count */
  defaultTraitorCount: number
  /** Whether host has overridden the default traitor count */
  hostOverride: boolean
  /** Manually set traitor count (only used when hostOverride is true) */
  customTraitorCount?: number
}

/**
 * Assigns roles to players based on the traitor allocation rules.
 *
 * @param players Array of player nicknames/ids
 * @param config Role assignment configuration with traitor count
 * @returns Array of PlayerRole objects with traitor/loyal assignments
 */
export function assignRoles(
  players: string[],
  config: RoleAssignmentConfig
): PlayerRole[] {
  const totalPlayers = players.length

  // Get traitor count (default or host override)
  let traitorCount = config.defaultTraitorCount

  if (config.hostOverride && config.customTraitorCount !== undefined) {
    // Host has overridden - validate the custom count
    if (config.customTraitorCount < 1) {
      throw new Error('Traitor count must be at least 1')
    }
    if (config.customTraitorCount > totalPlayers - 1) {
      throw new Error(
        `Custom traitor count (${config.customTraitorCount}) exceeds maximum. ` +
        `Maximum traitors = total players - 1 (${totalPlayers - 1}), ` +
        `as at least one player must be loyal.`
      )
    }
    if (config.customTraitorCount > totalPlayers) {
      throw new Error(
        `Custom traitor count (${config.customTraitorCount}) exceeds total players (${totalPlayers}).`
      )
    }
    traitorCount = config.customTraitorCount
  }

  // Assign roles: first N players become traitors, rest are loyal
  const roles: PlayerRole[] = []
  const traitorColor = 'traitor'
  const loyalColor = 'loyal'

  for (let i = 0; i < totalPlayers; i++) {
    const isTraitor = i < traitorCount
    roles.push({
      id: `player-${i + 1}`,
      nickname: players[i] || `Player ${i + 1}`,
      isTraitor,
      color: isTraitor ? traitorColor : loyalColor,
    })
  }

  return roles
}

/**
 * Validates that the player count meets the minimum threshold
 * and returns the default traitor count.
 *
 * @param totalPlayers Number of players in the room
 * @returns Object with isValid flag and traitor count
 */
export function validatePlayerCount(totalPlayers: number): {
  isValid: boolean
  traitorCount: number
  error?: string
} {
  if (totalPlayers < 4) {
    return {
      isValid: false,
      traitorCount: 0,
      error: `Minimum player threshold not met: ${totalPlayers} players. A game session requires at least 4 players (total_players >= 4).`,
    }
  }

  const traitorCount = getDefaultTraitorCount(totalPlayers)

  return {
    isValid: true,
    traitorCount,
  }
}

/**
 * Gets the traitor allocation description for display in the UI.
 *
 * @param totalPlayers Number of players in the room
 * @returns Description string showing the traitor count and allocation rules
 */
export function getTraitorAllocationDescription(totalPlayers: number): string {
  if (totalPlayers < 4) {
    return `Need at least 4 players to start a game.`
  }

  const traitorCount = getDefaultTraitorCount(totalPlayers)

  const rangeMap: Record<string, string> = {
    '4-5': '4-5 players',
    '6-8': '6-8 players',
    '9-12': '9-12 players',
  }

  return `With ${totalPlayers} players: ${traitorCount} Traitor${
    traitorCount !== 1 ? 's' : ''
  } (${rangeMap[Object.keys(TRAITOR_MATRIX).find(
    key => {
      const [min, max] = key.split('-').map(Number)
      return totalPlayers >= min && totalPlayers <= max
    } || '4-5')
  } range)`
}

/**
 * Generates a summary of role assignments for logging/debugging.
 *
 * @param roles Array of PlayerRole objects
 * @returns Summary string
 */
export function getRoleAssignmentSummary(roles: PlayerRole[]): string {
  const traitors = roles.filter(r => r.isTraitor)
  const loyal = roles.filter(r => !r.isTraitor)

  return `
Role Assignment Summary:
- Total Players: ${roles.length}
- Traitors: ${traitors.length} ${traitors.map(r => r.nickname).join(', ')}
- Loyal: ${loyal.length} ${loyal.map(r => r.nickname).join(', ')}
- Traitor(s): ${traitors.length > 0 ? 'Yes' : 'No'}
  `.trim()
}

export default {
  assignRoles,
  getDefaultTraitorCount,
  validatePlayerCount,
  getTraitorAllocationDescription,
  getRoleAssignmentSummary,
  TRAITOR_MATRIX,
}