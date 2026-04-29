/**
 * firebase-init.js - Firebase configuration and initialization
 */

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAqBQgzGJU5DypaNMyYRr5Bis7VqoqSNBY",
  authDomain: "eslamia-26da9.firebaseapp.com",
  projectId: "eslamia-26da9",
  storageBucket: "eslamia-26da9.firebasestorage.app",
  messagingSenderId: "1033255637879",
  appId: "1:1033255637879:web:7591609017c1e1df674772",
  measurementId: "G-BD8DM30SEF",
  databaseURL: "https://eslamia-26da9-default-rtdb.europe-west1.firebasedatabase.app" // Corrected regional URL
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

console.log("Firebase initialized successfully.");
