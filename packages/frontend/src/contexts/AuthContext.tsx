import { createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
  isPremium: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Premium status is now managed by the backend and checked via useAuth hook
  // This context is simplified - premium status comes from backend JWT validation
  const isPremium = false; // Default value, real status checked via API calls

  return (
    <AuthContext.Provider value={{ isPremium }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
