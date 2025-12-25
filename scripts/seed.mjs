// This script initializes the Firebase Admin SDK and creates the admin user if they don't exist.
// It's meant to be run once during setup.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';

// --- IMPORTANT ---
// This script uses the Firebase Admin SDK, which requires special service account credentials.
// It should ONLY be run in a secure server-side environment.
// The service account key is loaded from environment variables.

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error("Firebase Admin credentials are not configured. Please check your .env.development.local file.");
    process.exit(1);
}

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const auth = getAuth();
const db = getFirestore();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const DUMMY_EMPLOYEES = [
  { id: '1', name: 'Sarah Chen', email: 'sarah.chen@example.com', avatar: { imageUrl: 'https://images.unsplash.com/photo-1557053910-d9eadeed1c58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHx3b21hbiUyMHBvcnRyYWl0fGVufDB8fHx8MTc2NTU0OTc0Mnww&ixlib=rb-4.1.0&q=80&w=1080' } },
  { id: '2', name: 'David Lee', email: 'david.lee@example.com', avatar: { imageUrl: 'https://images.unsplash.com/photo-1624395213043-fa2e123b2656?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxtYW4lMjBwb3J0cmFpdHxlbnwwfHx8fDE3NjU0ODExODV8MA&ixlib=rb-4.1.0&q=80&w=1080' } },
  { id: '3', name: 'Maria Garcia', email: 'maria.garcia@example.com', avatar: { imageUrl: 'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw2fHx3b21hbiUyMHNtaWxpbmd8ZW58MHx8fHwxNzY1NDczNjU2fDA&ixlib=rb-4.1.0&q=80&w=1080' } },
  { id: '4', name: 'Kenji Tanaka', email: 'kenji.tanaka@example.com', avatar: { imageUrl: 'https://images.unsplash.com/photo-1618077360395-f3068be8e001?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxtYW4lMjBnbGFzc2VzfGVufDB8fHx8MTc2NTUxNDUxMHww&ixlib=rb-4.1.0&q=80&w=1080' } },
  { id: '5', name: 'Chloe Kim', email: 'chloe.kim@example.com', avatar: { imageUrl: 'https://images.unsplash.com/flagged/photo-1559855603-ce4c8f480d76?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw5fHx3b21hbiUyMHNtaWxpbmd8ZW58MHx8fHwxNzY1NDczNjU2fDA&ixlib=rb-4.1.0&q=80&w=1080' } },
];


async function seedAdminUser() {
  console.log(`Checking for admin user: ${ADMIN_EMAIL}...`);
  try {
    // Check if the user already exists
    await auth.getUserByEmail(ADMIN_EMAIL);
    console.log('Admin user already exists. Skipping creation.');
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      // User doesn't exist, so create them
      console.log('Admin user not found. Creating...');
      try {
        await auth.createUser({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          emailVerified: true,
          displayName: 'Admin User',
        });
        console.log('Successfully created admin user.');
      } catch (creationError) {
        console.error('Error creating admin user:', creationError);
        process.exit(1);
      }
    } else {
      // Some other error occurred
      console.error('Error fetching admin user:', error);
      process.exit(1);
    }
  }
}

async function seedEmployees() {
    console.log('Seeding employees...');
    const batch = db.batch();
    const employeesCollection = db.collection('employees');

    const snapshot = await employeesCollection.limit(1).get();
    if (!snapshot.empty) {
        console.log('Employees collection already has data. Skipping seeding.');
        return;
    }

    DUMMY_EMPLOYEES.forEach(employee => {
        // Use the ID from the dummy data as the document ID
        const docRef = employeesCollection.doc(employee.id); 
        batch.set(docRef, employee);
    });

    try {
        await batch.commit();
        console.log(`Successfully seeded ${DUMMY_EMPLOYEES.length} employees.`);
    } catch (error) {
        console.error('Error seeding employees:', error);
        process.exit(1);
    }
}


async function main() {
  await seedAdminUser();
  await seedEmployees();
  console.log('Seeding complete.');
  process.exit(0);
}

main();
