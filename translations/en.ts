export default {  
  // Navigation
  settings: 'Settings',
  team: 'Team',
  playGround: 'Play Ground',
  tactics: 'Tactics',
  
  // Settings Screen
  sportSelection: 'Sport Selection',
  aboutApp: 'About the app',
  aboutTheApp: 'A tool for sports coaches to plan team training, manage tactics, and develop game strategies.',
  copyright: '© 2025 CoachMate by Christian Lindehammar. All rights reserved.',
  thirdPartyLibraries: 'This app uses several open-source libraries:',
  selectCurrentSport: 'Select current sport',
  floorball: 'Floorball',
  soccer: 'Soccer',
  hockey: 'Hockey',
  bandy: 'Bandy',
  basketball: 'Basketball',

  // Beta Testing Program - updated to be platform-agnostic
  betaTestersNeeded: 'Beta Testers Needed!',
  betaTestingProgramDescription: 'We\'re looking for users to help test our upcoming version. Tap here to join our testing program and provide feedback.',
  checkOutBetaTestingProgram: 'Check out our beta testing program',

  // Home Screen
  welcomeToCoachMate: 'Welcome to CoachMate!',
  selectPreferredSport: 'First, select your preferred sport:',
  createTeamPrompt: "Now, let's create your team!",

  // Team Screen
  noTeamsExist: 'No teams exist. Please create a team first.',
  createTeam: "Create Team",
  selectTeam: "Select Team", 
  renameTeam: "Rename Team",
  removeTeam: "Remove Team",
  shareTeam: "Share Team",
  importTeam: "Import Team",
  startingPlayers: 'Starting Players',
  benchPlayers: 'Bench Players',
  bench: 'Bench', // Added
  noPlayersOnBench: 'No players on the bench', // Added
  noPlayersYet: 'No players yet. Add your first player above!',
  courtBenchSeparator: 'Court / Bench Separator',
  enterPlayerName: 'Enter player name',
  addPlayer: 'Add Player',
  movePlayerToBench: 'Move to Bench',
  movePlayerToBenchConfirm: 'Move {{playerName}} to the bench?',
  move: 'Move',

  playerPositions: {
    Goalkeeper: 'Goalkeeper',
    Defender: 'Defender',
    Midfielder: 'Midfielder',
    Center: "Center",
    Forward: 'Forward',
    PointGuard: 'Point Guard',
    ShootingGuard: 'Shooting Guard',
    SmallForward: 'Small Forward',
    PowerForward: 'Power Forward'
  },

  playerPositionsShort: {
    PointGuard: 'PG',
    ShootingGuard: 'SG',
    SmallForward: 'SF',
    PowerForward: 'PF',
    Center: 'C'
  },

  // Not Found Screen
  screenNotExist: "This screen doesn't exist.",
  goToHome: 'Go to home screen!',

  // Modals and Dialogs
  rename: 'Rename',
  delete: 'Delete',
  cancel: 'Cancel',
  ok: 'OK',
  startByAddingPlayers: 'Start by adding players to your team using the input field above',
  createNewTeam: 'Create New Team',
  deletePlayer: 'Delete Player',
  deletePlayerConfirm: 'Are you sure you want to delete {{playerName}}?',
  exportTeam: 'Export Team',
  howToExportTeam: 'How would you like to export the team?',
  failedToExportTeam: 'Failed to export team',
  sharingNotAvailable: 'Sharing is not available on this device',
  renamePlayer: 'Rename Player',

  // Drag Hint
  dragHint: 'Drag and hold players up and down to reorder them',

  // Collapsible Sections
  generalSettings: 'General settings',
  thirdPartyLibs: '3rd party libraries',

  //Alerts
  error: 'Error',
  success: 'Success',
  teamImportSuccessful: 'Team "{{teamName}}" imported successfully!',
  failedToImportTeamFile: 'Failed to import team file',
  teamRemoveConfirm: 'Are you sure you want to remove "{{teamName}}"?',
  invalidFile: 'Invalid File',
  selectCoachmateFile: 'Please select a .coachmate file',

  // Tactics Screen
  players: 'Players',
  player: 'Player',
  opponents: 'Opponents',
  opponent: 'Opponent',
  clearAll: 'Clear All',
  removeAllMarkers: 'Remove all markers?',
  
  // Tactics Tooltips
  tacticsAddTooltip: 'Tap the player or opponent button, then tap the court to add a marker',
  tacticsMoveTooltip: 'Drag markers to reposition them on the court',
  tacticsDeleteTooltip: 'Long press on a marker to delete it',

  // Court Configuration
  configurationOptions: 'Configuration Options',
  createNew: 'Create New',
  createConfiguration: 'Create Configuration',
  renameConfiguration: 'Rename Configuration',
  deleteConfigurationConfirm: 'Are you sure you want to delete this configuration?',
  confirmDelete: 'Confirm Delete',
};