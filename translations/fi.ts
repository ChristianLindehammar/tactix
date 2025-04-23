import { addPlayer } from '@/services/firebase';

export default {  
  // Navigation
  settings: 'Asetukset',
  team: 'Joukkue',
  playGround: 'Pelikenttä',
  tactics: 'Taktiikka',
  
  // Settings Screen
  aboutTheApp: 'Työkalu urheiluvalmentajille joukkueharjoitusten suunnitteluun, taktiikan hallintaan ja pelistrategioiden kehittämiseen.',
  copyright: '© 2025 CoachMate, Christian Lindehammar.',
  thirdPartyLibraries: 'Tämä sovellus käyttää useita avoimen lähdekoodin kirjastoja:',
  selectCurrentSport: 'Valitse nykyinen urheilulaji',
  floorball: 'Salibandy',
  soccer: 'Jalkapallo',
  hockey: 'Jääkiekko',
  bandy: 'Jääpallo',
  basketball: 'Koripallo',

  // Home Screen
  welcomeToCoachMate: 'Tervetuloa CoachMateen!',
  selectPreferredSport: 'Valitse ensin suosikkiurheilulajisi:',
  createTeamPrompt: "Nyt luodaan joukkueesi!",

  // Team Screen
  noTeamsExist: 'Joukkueita ei ole. Luo ensin joukkue.',
  createTeam: "Luo joukkue",
  selectTeam: "Valitse joukkue", 
  renameTeam: "Nimeä joukkue uudelleen",
  removeTeam: "Poista joukkue",
  shareTeam: "Jaa joukkue",
  importTeam: "Tuo joukkue",
  startingPlayers: 'Aloittavat pelaajat',
  benchPlayers: 'Vaihtopelaajat',
  bench: 'Penkki', // Added
  noPlayersOnBench: 'Ei pelaajia penkillä', // Added
  courtBenchSeparator: 'Kenttä / Penkki erotin',
  enterPlayerName: 'Syötä pelaajan nimi',
  addPlayer: 'Lisää pelaaja',
  renamePlayer: 'Nimeä pelaaja uudelleen',
  movePlayerToBench: 'Siirrä vaihtopenkille',
  movePlayerToBenchConfirm: 'Siirretäänkö {{playerName}} vaihtopenkille?',
  move: 'Siirrä',

  playerPositions: {
    Goalkeeper: 'Maalivahti',
    Defender: 'Puolustaja',
    Midfielder: 'Keskikenttäpelaaja',
    Center: "Keskushyökkääjä",
    Forward: 'Hyökkääjä',
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

  // Tactics Screen
  players: 'Pelaajat',
  player: 'Pelaaja',
  opponents: 'Vastustajat',
  opponent: 'Vastustaja',
  clearAll: 'Tyhjennä kaikki',
  removeAllMarkers: 'Poista kaikki merkit?',
  
  // Tactics Tooltips
  tacticsAddTooltip: 'Napauta pelaaja- tai vastustajapainiketta ja sitten kenttää lisätäksesi merkin',
  tacticsMoveTooltip: 'Vedä merkkejä siirtääksesi niitä kentällä',
  tacticsDeleteTooltip: 'Pidä merkki painettuna poistaaksesi sen',

  // Not Found Screen
  screenNotExist: "Tätä näyttöä ei ole olemassa.",
  goToHome: 'Mene kotinäyttöön!',

  // Modals and Dialogs
  rename: 'Nimeä uudelleen',
  delete: 'Poista',
  cancel: 'Peruuta',
  ok: 'OK',
  startByAddingPlayers: 'Aloita lisäämällä pelaajia joukkueeseesi yllä olevan kentän avulla',
  createNewTeam: 'Luo uusi joukkue',
  deletePlayer: 'Poista pelaaja',
  deletePlayerConfirm: 'Haluatko varmasti poistaa pelaajan {{playerName}}?',
  exportTeam: 'Vie joukkue',
  howToExportTeam: 'Miten haluat viedä joukkueen?',
  failedToExportTeam: 'Joukkueen vienti epäonnistui',
  sharingNotAvailable: 'Jakaminen ei ole käytettävissä tällä laitteella',

  // Drag Hint
  dragHint: 'Pidä ja vedä pelaajia ylös ja alas muuttaaksesi heidän järjestystään',

  // Collapsible Sections
  aboutApp: 'Tietoa sovelluksesta',
  generalSettings: 'Yleiset asetukset',
  thirdPartyLibs: 'Kolmannen osapuolen kirjastot',

  //Alerts
  error: 'Virhe',
  success: 'Onnistui',
  teamImportSuccessful: 'Joukkue "{{teamName}}" tuotu onnistuneesti!',
  failedToImportTeamFile: 'Joukkueen tiedoston tuonti epäonnistui',
  teamRemoveConfirm: 'Haluatko varmasti poistaa joukkueen "{{teamName}}"?',
  invalidFile: 'Virheellinen tiedosto',
  selectCoachmateFile: 'Valitse .coachmate tiedosto',

  // Beta Testing Program - updated to be platform-agnostic
  betaTestersNeeded: 'Beta-testaajia tarvitaan!',
  betaTestingProgramDescription: 'Etsimme käyttäjiä, jotka voivat auttaa testaamaan uutta versiomme. Napauta tästä liittyäksesi testiohjelmaamme ja antaaksesi palautetta.',
  checkOutBetaTestingProgram: 'Tutustu beta-testiohjelmaamme',
};