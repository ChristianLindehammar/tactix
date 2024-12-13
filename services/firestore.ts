import { firestore } from '../firebaseConfig';

// Fetch teams shared with a coach
export const fetchTeamsSharedWithCoach = async (currentCoachEmail) => {
  const teams = await firestore
    .collection('teams')
    .where('sharedWith', 'array-contains', currentCoachEmail)
    .get();
  return teams.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Fetch game plans for a team
export const fetchGamePlansForTeam = async (teamId) => {
  const gamePlans = await firestore
    .collection('gamePlans')
    .where('teamId', '==', teamId)
    .get();
  return gamePlans.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};
