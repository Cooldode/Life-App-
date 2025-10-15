// firebase-client.js
// Browser-friendly helpers that use the compat Firebase instance initialized in index.html
// Exposes a `window.firebaseClient` object with helper functions for Firestore and Auth.
(function () {
  if (typeof window === 'undefined') return;
  if (!window.firebase) {
    console.error('firebase-client: firebase is not available on window. Ensure firebase SDK is loaded and initialized in index.html');
    return;
  }

  const db = window.firebase.firestore();
  const auth = window.firebase.auth();

  async function addApp(data) {
    try {
      const docRef = await db.collection('apps').add(data);
      console.log('App added with ID:', docRef.id);
      return docRef.id;
    } catch (err) {
      console.error('Error adding app:', err);
      throw err;
    }
  }

  async function getApp(id) {
    try {
      const docRef = db.collection('apps').doc(id);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        console.log('No such app!');
        return null;
      }
    } catch (err) {
      console.error('Error fetching app:', err);
      throw err;
    }
  }

  async function updateApp(id, data) {
    try {
      const docRef = db.collection('apps').doc(id);
      await docRef.set(data, { merge: true });
      console.log('App updated!');
      return true;
    } catch (err) {
      console.error('Error updating app:', err);
      throw err;
    }
  }

  async function getApps(limitCount = 10) {
    try {
      const q = db.collection('apps').limit(limitCount);
      const snapshot = await q.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error('Error fetching apps:', err);
      throw err;
    }
  }

  // Auth helpers
  async function signup(email, password) {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      console.log('User signed up:', userCredential.user.uid);
      return userCredential.user;
    } catch (err) {
      console.error('Signup error:', err);
      throw err;
    }
  }

  async function login(email, password) {
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      console.log('User logged in:', userCredential.user.uid);
      return userCredential.user;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  }

  async function logout() {
    try {
      await auth.signOut();
      console.log('User logged out');
      return true;
    } catch (err) {
      console.error('Logout error:', err);
      throw err;
    }
  }

  // Expose on window
  window.firebaseClient = {
    addApp,
    getApp,
    updateApp,
    getApps,
    signup,
    login,
    logout,
    raw: {
      db,
      auth
    }
  };

  console.info('firebase-client: helpers attached to window.firebaseClient');
})();
