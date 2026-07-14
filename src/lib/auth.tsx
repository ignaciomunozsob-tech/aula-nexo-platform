import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'student' | 'creator' | 'admin';

interface Profile {
  id: string;
  name: string | null;
  avatar_url: string | null;
  role: UserRole;
  creator_slug: string | null;
  bio: string | null;
  links: any[];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, role?: UserRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const [{ data, error }, { data: roleData }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, avatar_url, creator_slug, bio, links, created_at, updated_at, intro_video_url, interests, onboarding_completed')
        .eq('id', userId)
        .maybeSingle(),
      supabase.rpc('get_user_role', { _user_id: userId }),
    ]);

    if (data && !error) {
      const role = (roleData as UserRole | null) ?? 'student';
      setProfile({ ...(data as any), role } as Profile);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetch with setTimeout
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);

          // Post-OAuth intent-based redirect (Google sign-in returns to '/')
          if (event === "SIGNED_IN") {
            const intent = (() => {
              try { return localStorage.getItem("novu:login_intent"); } catch { return null; }
            })();
            if (intent === "creator" || intent === "student") {
              setTimeout(async () => {
                try {
                  const { data: roles } = await supabase.rpc("get_user_roles", { _user_id: session.user.id });
                  const list = (roles as string[] | null) ?? [];
                  const isCreator = list.includes("creator") || list.includes("admin");
                  const isStudent = list.includes("student");
                  try { localStorage.removeItem("novu:login_intent"); } catch {}
                  // Only redirect from home/login/signup to avoid interrupting flows
                  const path = window.location.pathname;
                  if (!["/", "/login", "/signup"].includes(path)) return;
                  if (isCreator && isStudent) {
                    // Honor intent when user has both roles
                    window.location.assign(intent === "creator" ? "/creator-app" : "/app");
                  } else if (isCreator) {
                    window.location.assign("/creator-app");
                  } else {
                    window.location.assign("/app");
                  }
                } catch (e) { console.error("post-oauth routing", e); }
              }, 0);
            }
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, name: string, role: UserRole = 'student') => {
    const redirectUrl = `${window.location.origin}/`;

    // Allow user to self-select student or creator at signup.
    // The handle_new_user trigger reads `role` from raw_user_meta_data
    // and falls back to 'student'. 'admin' cannot be self-assigned here
    // because UserRole in the signUp signature only accepts student|creator|admin
    // — the UI never passes 'admin'.
    const safeRole: UserRole = role === 'creator' ? 'creator' : 'student';
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          role: safeRole,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
