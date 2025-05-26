
"use client";

import type { User } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  type User as FirebaseUser // Import Firebase User type
} from 'firebase/auth';
import { Loader2 } from 'lucide-react';

interface UserContextType {
  currentUser: User | null;
  isLoadingAuth: boolean; // To indicate auth state is being determined
  login: (email: string, password: string) => Promise<FirebaseUser>; // Update signature
  logout: () => Promise<void>;
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
    // signInWithEmailAndPassword will throw an error on failure, which can be caught by the caller
    const userCredential = await firebaseSignInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle setting currentUser
    return userCredential.user;
  };

  const logout = async (): Promise<void> => {
    await firebaseSignOut(auth);
    // onAuthStateChanged will handle setting currentUser to null
  };

  // Display a loading indicator while Firebase initializes auth state
  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <UserContext.Provider value={{ currentUser, isLoadingAuth, login, logout }}>
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
