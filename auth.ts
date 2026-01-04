import { User } from '../types';

const USERS_DB_KEY = 'chefai_users_db';
const SESSION_KEY = 'chefai_session_user';

// --- Default Demo User ---
export const DEMO_USER: User = {
  id: 'user_demo_permanent',
  name: 'Chef Demo',
  email: 'demo@chef.ai',
  passwordHash: 'demo123' 
};

// --- Helpers ---

const getUsers = (): User[] => {
  try {
    const stored = localStorage.getItem(USERS_DB_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("User DB corrupted or incompatible, resetting to default.");
  }

  // If storage is empty or corrupt, SEED the demo user immediately.
  // This ensures there is always an account available.
  const initial = [DEMO_USER];
  saveUsers(initial);
  return initial;
};

const saveUsers = (users: User[]) => {
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
};

// --- Auth Methods ---

export const getSession = (): User | null => {
  try {
      const stored = localStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
  } catch (e) {
      return null;
  }
};

// EXPOSED FOR DEBUGGING/UI
export const getRegisteredUsers = (): { name: string; email: string }[] => {
    return getUsers().map(u => ({ name: u.name, email: u.email }));
};

export const login = async (email: string, password: string): Promise<User> => {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 600));

  const cleanEmail = email.trim().toLowerCase();
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === cleanEmail);
  
  if (!user) {
    throw new Error('Account not found. Please sign up.');
  }

  // Simple mock password check (In prod, use bcrypt on server)
  if (user.passwordHash !== password) {
    throw new Error('Incorrect password.');
  }

  // Set Session
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
};

export const signup = async (name: string, email: string, password: string): Promise<User> => {
  await new Promise(r => setTimeout(r, 800));

  const cleanEmail = email.trim().toLowerCase();
  const users = getUsers();
  
  if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
    throw new Error('Email already in use.');
  }

  const newUser: User = {
    id: 'user_' + Date.now(),
    name: name.trim(),
    email: cleanEmail,
    passwordHash: password // Mock hashing
  };

  users.push(newUser);
  saveUsers(users);
  
  // Auto login after signup
  localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
  
  return newUser;
};

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const resetPassword = async (email: string): Promise<void> => {
  await new Promise(r => setTimeout(r, 1000));
  
  const users = getUsers();
  const cleanEmail = email.trim().toLowerCase();
  const exists = users.some(u => u.email.toLowerCase() === cleanEmail);
  
  if (!exists) {
    throw new Error("No account found with this email address.");
  }
};

export const updatePassword = async (email: string, newPass: string): Promise<void> => {
  await new Promise(r => setTimeout(r, 1000));
  const users = getUsers();
  const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (idx === -1) {
      throw new Error("User not found during update.");
  }
  
  users[idx].passwordHash = newPass;
  saveUsers(users);
};