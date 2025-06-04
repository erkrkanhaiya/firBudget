
"use client";

import type { User } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword, // Import createUser
  updateProfile as firebaseUpdateProfile, // Import updateProfile
  type User as FirebaseUser // Import Firebase User type
} from 'firebase/auth';
import { Loader2 } from 'lucide-react';

interface UserContextType {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>; // Added to allow manual updates
  isLoadingAuth: boolean; // To indicate auth state is being determined
  login: (email: string, password: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<FirebaseUser>; // Add signup method
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Start as true

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        setCurrentUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName,
          email: firebaseUser.email,
          avatarUrl: firebaseUser.photoURL,
        });
      } else {
        // User is signed out
        setCurrentUser(null);
      }
      setIsLoadingAuth(false); // Auth state determined
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  const login = async (email: string, password: string): Promise<FirebaseUser> => {
    const userCredential = await firebaseSignInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  const logout = async (): Promise<void> => {
    await firebaseSignOut(auth);
  };

  const signup = async (email: string, password: string, name?: string): Promise<FirebaseUser> => {
    const userCredential = await firebaseCreateUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await firebaseUpdateProfile(userCredential.user, {
        displayName: name || null, // Ensure displayName can be null if name is empty
        photoURL: null, // Explicitly set photoURL to null initially
      });
      // Update local currentUser state immediately if needed, or rely on onAuthStateChanged
      // onAuthStateChanged will pick up the displayName.
       if (auth.currentUser) { // Check if currentUser is not null
         setCurrentUser({
          id: auth.currentUser.uid,
          name: auth.currentUser.displayName,
          email: auth.currentUser.email,
          avatarUrl: auth.currentUser.photoURL,
        });
       }
    }
    return userCredential.user;
  };

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, isLoadingAuth, login, logout, signup }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};


    