import { addPlayer } from '@/services/firebase';

export default {  
  // Navigation
  settings: 'Inställningar',
  team: 'Lag',
  sportsCourt: 'Planen',
  
  // Settings Screen
  aboutTheApp: 'Ett verktyg för sporttränare att planera laguppställningar, hantera taktik och utveckla spelstrategier.',
  copyright: '© 2025 CoachMate av Christian Lindehammar.',
  thirdPartyLibraries: 'Denna app använder flera open-source bibliotek:',
  selectCurrentSport: 'Välj aktuell sport',
  floorball: 'Innebandy',
  soccer: 'Fotboll',
  hockey: 'Hockey',

  // Home Screen
  welcomeToCoachMate: 'Välkommen till CoachMate!',
  selectPreferredSport: 'Välj först din sport:',
  createTeamPrompt: "Nu ska vi skapa ditt lag!",

  // Team Screen
  noTeamsExist: 'Inga lag finns. Skapa ett lag först.',
  createTeam: "Skapa ett lag",
  selectTeam: "Välj ett lag", 
  renameTeam: "Byt namn på lag",
  removeTeam: "Ta bort lag",
  shareTeam: "Dela lag",
  importTeam: "Importera lag",
  startingPlayers: 'Spelare på plan',
  benchPlayers: 'Spelare på bänken',
  courtBenchSeparator: 'Plan / Bänk Separator',
  enterPlayerName: 'Ange spelarens namn',
  addPlayer: 'Lägg till spelare',
  renamePlayer: 'Byt namn på spelare',

  playerPositions: {
    Goalkeeper: 'Målvakt',
    Defender: 'Försvarare',
    Midfielder: 'Mittfältare',
    Center: "Center",
    Forward: 'Anfallare'
  },

  // Not Found Screen
  screenNotExist: "Denna skärm finns inte.",
  goToHome: 'Gå till hemskärmen!',

  // Modals and Dialogs
  rename: 'Byt namn',
  delete: 'Radera',
  cancel: 'Avbryt',
  ok: 'OK',
  startByAddingPlayers: 'Börja med att lägga till spelare i ditt lag med hjälp av fältet ovan',
  createNewTeam: 'Skapa nytt lag',
  deletePlayer: 'Radera spelare',
  deletePlayerConfirm: 'Är du säker på att du vill radera {{playerName}}?',
  exportTeam: 'Exportera lag',
  howToExportTeam: 'Hur vill du exportera laget?',
  failedToExportTeam: 'Misslyckades med att exportera laget',
  sharingNotAvailable: 'Delning är inte tillgänglig på denna enhet',

  // Drag Hint
  dragHint: 'Håll in och dra en spelare upp eller ner för att ändra ordningen',

  // Collapsible Sections
  aboutApp: 'Om appen',
  generalSettings: 'Allmänna inställningar',
  thirdPartyLibs: '3:e parts bibliotek',

  //Alerts
  error: 'Fel',
  failedToImportTeamFile: 'Misslyckades med att importera lagfil',
  teamRemoveConfirm: 'Är du säker på att du vill ta bort "{{teamName}}"?',
  invalidFile: 'Ogiltig fil',
  selectCoachmateFile: 'Vänligen välj en .coachmate fil',
};