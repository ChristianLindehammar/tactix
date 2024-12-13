import { auth, firestore } from '../firebaseConfig';

// Authentication with email link
export const sendSignInLinkToEmail = async (email) => {
  const actionCodeSettings = {
    url: 'https://www.example.com/finishSignUp?cartId=1234',
    handleCodeInApp: true,
  };

  await auth.sendSignInLinkToEmail(email, actionCodeSettings);
  window.localStorage.setItem('emailForSignIn', email);
};

export const signInWithEmailLink = async (email, link) => {
  if (auth.isSignInWithEmailLink(link)) {
    await auth.signInWithEmailLink(email, link);
    window.localStorage.removeItem('emailForSignIn');
  }
};

// CRUD operations for players
export const addPlayer = async (player) => {
  await firestore.collection('players').add(player);
};

export const fetchPlayers = async () => {
  const snapshot = await firestore.collection('players').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const updatePlayer = async (playerId, playerData) => {
  await firestore.collection('players').doc(playerId).update(playerData);
};

export const deletePlayer = async (playerId) => {
  await firestore.collection('players').doc(playerId).delete();
};

// CRUD operations for game plans
export const addGamePlan = async (gamePlan) => {
  await firestore.collection('gamePlans').add(gamePlan);
};

export const fetchGamePlans = async () => {
  const snapshot = await firestore.collection('gamePlans').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const updateGamePlan = async (gamePlanId, gamePlanData) => {
  await firestore.collection('gamePlans').doc(gamePlanId).update(gamePlanData);
};

export const deleteGamePlan = async (gamePlanId) => {
  await firestore.collection('gamePlans').doc(gamePlanId).delete();
};
