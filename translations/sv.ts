import { addPlayer } from '@/services/firebase';

export default {  
  // Navigation
  settings: 'Inställningar',
  team: 'Lag',
  playGround: 'Spelplan',
  tactics: 'Taktik',
  
  // Settings Screen
  sportSelection: 'Sportval',
  aboutApp: 'Om appen',
  aboutTheApp: 'Ett verktyg för idrottstränare att planera lagträningar, hantera taktiker och utveckla spelstrategier.',
  copyright: '© 2025 CoachMate, Christian Lindehammar.',
  thirdPartyLibraries: 'Denna app använder flera öppen källkod-bibliotek:',
  selectCurrentSport: 'Välj nuvarande sport',
  floorball: 'Innebandy',
  soccer: 'Fotboll',
  hockey: 'Ishockey',
  bandy: 'Bandy',
  basketball: 'Basket',

  // Home Screen
  welcomeToCoachMate: 'Välkommen till CoachMate!',
  selectPreferredSport: 'Välj din föredragna sport först:',
  createTeamPrompt: "Nu ska vi skapa ditt lag!",

  // Team Screen
  noTeamsExist: 'Inga lag finns. Skapa ett lag först.',
  createTeam: "Skapa lag",
  selectTeam: "Välj lag", 
  renameTeam: "Byt namn på lag",
  removeTeam: "Ta bort lag",
  shareTeam: "Dela lag",
  importTeam: "Importera lag",
  startingPlayers: 'Startspelare',
  benchPlayers: 'Avbytare',
  bench: 'Bänk', // Added
  noPlayersOnBench: 'Inga spelare på bänken', // Added
  courtBenchSeparator: 'Plan / Bänk separator',
  enterPlayerName: 'Ange spelarnamn',
  addPlayer: 'Lägg till spelare',
  renamePlayer: 'Byt namn på spelare',
  movePlayerToBench: 'Flytta till bänken',
  movePlayerToBenchConfirm: 'Flytta {{playerName}} till bänken?',
  move: 'Flytta',

  playerPositions: {
    Goalkeeper: 'Målvakt',
    Defender: 'Försvarare',
    Midfielder: 'Mittfältare',
    Center: "Center",
    Forward: 'Anfallare',
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
  screenNotExist: "Denna skärm existerar inte.",
  goToHome: 'Gå till hemskärmen!',

  // Modals and Dialogs
  rename: 'Byt namn',
  delete: 'Ta bort',
  cancel: 'Avbryt',
  ok: 'OK',
  startByAddingPlayers: 'Börja med att lägga till spelare i ditt lag med hjälp av fältet ovan',
  createNewTeam: 'Skapa nytt lag',
  deletePlayer: 'Ta bort spelare',
  deletePlayerConfirm: 'Är du säker på att du vill ta bort spelaren {{playerName}}?',
  exportTeam: 'Exportera lag',
  howToExportTeam: 'Hur vill du exportera laget?',
  failedToExportTeam: 'Misslyckades med att exportera laget',
  sharingNotAvailable: 'Delning är inte tillgänglig på den här enheten',

  // Drag Hint
  dragHint: 'Tryck och dra spelare upp och ner för att ändra deras ordning',

  // Collapsible Sections
  aboutApp: 'Om appen',
  generalSettings: 'Allmänna inställningar',
  thirdPartyLibs: 'Tredjepartsbibliotek',

  //Alerts
  error: 'Fel',
  success: 'Lyckat',
  teamImportSuccessful: 'Lag "{{teamName}}" importerades framgångsrikt!',
  failedToImportTeamFile: 'Misslyckades med att importera lagfil',
  teamRemoveConfirm: 'Är du säker på att du vill ta bort laget "{{teamName}}"?',
  invalidFile: 'Ogiltig fil',
  selectCoachmateFile: 'Välj en .coachmate fil',

  // Beta Testing Program - updated to be platform-agnostic
  betaTestersNeeded: 'Beta-testare behövs!',
  betaTestingProgramDescription: 'Vi söker användare som kan hjälpa oss att testa vår nya version. Tryck här för att gå med i vårt testprogram och ge feedback.',
  checkOutBetaTestingProgram: 'Kolla in vårt beta-testprogram',

  // Tactics Screen
  players: 'Spelare',
  player: 'Spelare',
  opponents: 'Motståndare',
  opponent: 'Motståndare',
  clearAll: 'Rensa alla',
  removeAllMarkers: 'Ta bort alla markörer?',
  
  // Tactics Tooltips
  tacticsAddTooltip: 'Tryck på spelare- eller motståndarknappen och sedan på planen för att lägga till en markör',
  tacticsMoveTooltip: 'Dra markörerna för att flytta dem på planen',
  tacticsDeleteTooltip: 'Tryck och håll på en markör för att ta bort den',

  // Court Configuration
  configurationOptions: 'Konfigurationsalternativ',
  createNew: 'Skapa ny',
  createConfiguration: 'Skapa konfiguration',
  renameConfiguration: 'Byt namn på konfiguration',
  deleteConfigurationConfirm: 'Är du säker på att du vill ta bort denna konfiguration?',
  confirmDelete: 'Bekräfta borttagning',
};