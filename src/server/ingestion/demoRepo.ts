export interface InMemoryFile {
  path: string;
  content: string;
}

export { GOLDEN_DEMO_REPO_URL } from "../shared/constants";

export const GOLDEN_DEMO_FILES: InMemoryFile[] = [
  {
    path: "tsconfig.json",
    content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}`,
  },
  {
    path: "package.json",
    content: `{
  "name": "demo-auth-app",
  "version": "1.0.0",
  "description": "CodeAtlas Golden Demo Repository",
  "dependencies": {
    "react": "^18.3.1"
  }
}`,
  },
  {
    path: "src/types/user.ts",
    content: `export interface UserCredentials {
  username: string;
  password?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
  };
}
`,
  },
  {
    path: "src/components/Button.tsx",
    content: `import React, { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export function Button({ variant = 'primary', children, ...props }: ButtonProps) {
  return (
    <button className={\`btn btn-\${variant}\`} {...props}>
      {children}
    </button>
  );
}

export default Button;
`,
  },
  {
    path: "src/features/auth/Login.tsx",
    content: `import React, { useState } from 'react';
import { authenticateUser } from '@/services/authenticate';
import { UserCredentials } from '@/types/user';
import { Button } from '@/components/Button';

export interface LoginProps {
  onSuccess?: () => void;
}

export function Login({ onSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const credentials: UserCredentials = { username, password };
      await authenticateUser(credentials);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <h2>Sign In</h2>
      {error && <div className="error">{error}</div>}
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <Button type="submit">Log In</Button>
    </form>
  );
}

export default Login;
`,
  },
  {
    path: "src/services/authenticate.ts",
    content: `import { apiClient } from '@/lib/api';
import { UserCredentials, AuthResponse } from '@/types/user';

export async function authenticateUser(credentials: UserCredentials): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
  if (!response.token) {
    throw new Error('Authentication token missing from response');
  }
  return response;
}

export function logout(): void {
  apiClient.clearToken();
}
`,
  },
  {
    path: "src/lib/api.ts",
    content: `import { getAuthContextState } from '@/context/AuthProvider';

export class ApiClient {
  private baseUrl: string = '/api';

  async post<T>(endpoint: string, payload: any): Promise<T> {
    const auth = getAuthContextState();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (auth.token) {
      headers['Authorization'] = \`Bearer \${auth.token}\`;
    }

    const res = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(\`API error: \${res.statusText}\`);
    }
    return res.json();
  }

  clearToken(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
    }
  }
}

export const apiClient = new ApiClient();
`,
  },
  {
    path: "src/context/AuthProvider.tsx",
    content: `import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: { id: string; name: string } | null;
}

const defaultState: AuthState = {
  isAuthenticated: false,
  token: null,
  user: null,
};

let globalState: AuthState = defaultState;

export function getAuthContextState(): AuthState {
  return globalState;
}

const AuthContext = createContext<AuthState>(defaultState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(defaultState);

  const setAuth = (token: string, user: { id: string; name: string }) => {
    const newState = { isAuthenticated: true, token, user };
    globalState = newState;
    setState(newState);
  };

  const clearAuth = () => {
    globalState = defaultState;
    setState(defaultState);
  };

  return (
    <AuthContext.Provider value={state}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
`,
  },
  {
    path: "src/routes/ProtectedRoute.tsx",
    content: `import React, { ReactNode } from 'react';
import { useAuth } from '@/context/AuthProvider';

export interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedRoute({ children, fallback = null }: ProtectedRouteProps) {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
`,
  },
];
