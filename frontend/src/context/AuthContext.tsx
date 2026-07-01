import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserResponse } from "@/types";
import * as api from "@/services/api";

export interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<string>;
  logout: () => void;
  register: (data: {
    email: string;
    password: string;
    confirm_password: string;
    name: string;
    role: string;
  }) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      // Validate token by fetching user profile
      api.users
        .getMe()
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          // Token expired or invalid
          localStorage.removeItem("token");
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<string> => {
    const response = await api.auth.login(email, password);
    localStorage.setItem("token", response.access_token);
    setToken(response.access_token);

    const userData = await api.users.getMe();
    setUser(userData);

    return response.redirect_url;
  };

  const register = async (data: {
    email: string;
    password: string;
    confirm_password: string;
    name: string;
    role: string;
  }): Promise<string> => {
    const response = await api.auth.register(data);
    localStorage.setItem("token", response.access_token);
    setToken(response.access_token);

    const userData = await api.users.getMe();
    setUser(userData);

    return response.redirect_url;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
