import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const isConfigured = Boolean(
  supabaseUrl &&
    supabasePublishableKey &&
    typeof supabaseUrl === 'string' &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('placeholder')
);

// In-memory + LocalStorage fallback client when Supabase is not configured
function createMockSupabaseClient() {
  const SESSION_KEY = 'mustang_auth_session';
  const DATA_KEY = 'mustang_cloud_directory_year_data';
  const USERS_KEY = 'mustang_allowed_users_list';
  const listeners = new Set<(event: string, session: any) => void>();

  const getStoredAllowedUsers = (): Array<{ email: string; role: string; created_at: string }> => {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    const defaultList = [
      { email: 's2mtha16@gmail.com', role: 'admin', created_at: new Date().toISOString() },
      { email: 'admin@company.com', role: 'admin', created_at: new Date().toISOString() },
    ];
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(defaultList));
    } catch {}
    return defaultList;
  };

  const saveAllowedUsers = (users: Array<{ email: string; role: string; created_at: string }>) => {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch {}
  };

  const getSavedSession = () => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const saveSession = (session: any) => {
    try {
      if (session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {}
    listeners.forEach((cb) => {
      try {
        cb(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
      } catch (err) {
        console.error(err);
      }
    });
  };

  return {
    auth: {
      getSession: async () => {
        const session = getSavedSession();
        return { data: { session }, error: null };
      },
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        listeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                listeners.delete(callback);
              },
            },
          },
        };
      },
      signUp: async ({ email }: { email: string; password?: string }) => {
        const normalized = email.trim().toLowerCase();
        const user = { id: `mock-user-${Date.now()}`, email: normalized };
        const session = { user, access_token: 'mock-token', expires_at: Date.now() + 86400000 };
        // Ensure registered user is recorded into allowed users
        const users = getStoredAllowedUsers();
        if (!users.some((u) => u.email === normalized)) {
          users.push({ email: normalized, role: 'admin', created_at: new Date().toISOString() });
          saveAllowedUsers(users);
        }
        saveSession(session);
        return { data: { user, session }, error: null };
      },
      signInWithPassword: async ({ email }: { email: string; password?: string }) => {
        const normalized = email.trim().toLowerCase();
        const user = { id: `mock-user-${Date.now()}`, email: normalized };
        const session = { user, access_token: 'mock-token', expires_at: Date.now() + 86400000 };
        const users = getStoredAllowedUsers();
        if (!users.some((u) => u.email === normalized)) {
          users.push({ email: normalized, role: 'admin', created_at: new Date().toISOString() });
          saveAllowedUsers(users);
        }
        saveSession(session);
        return { data: { user, session }, error: null };
      },
      signOut: async () => {
        saveSession(null);
        return { error: null };
      },
    },
    from: (table: string) => {
      return {
        select: (_columns?: string) => {
          return {
            eq: (col: string, val: string) => {
              return {
                maybeSingle: async () => {
                  if (table === 'allowed_users') {
                    const users = getStoredAllowedUsers();
                    const found = users.find((u) => u.email === val.toLowerCase());
                    return { data: found || { email: val, role: 'admin' }, error: null };
                  }
                  return { data: null, error: null };
                },
                single: async () => {
                  if (table === 'allowed_users') {
                    const users = getStoredAllowedUsers();
                    const found = users.find((u) => u.email === val.toLowerCase());
                    return { data: found || { email: val, role: 'admin' }, error: null };
                  }
                  return { data: null, error: null };
                },
              };
            },
            then: (resolve: any, reject?: any) => {
              if (table === 'directory_year_data') {
                try {
                  const raw = localStorage.getItem(DATA_KEY);
                  const rows = raw ? JSON.parse(raw) : [];
                  return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
                } catch (e: any) {
                  return Promise.resolve({ data: [], error: null }).then(resolve, reject);
                }
              }
              if (table === 'allowed_users') {
                const users = getStoredAllowedUsers();
                return Promise.resolve({ data: users, error: null }).then(resolve, reject);
              }
              return Promise.resolve({ data: [], error: null }).then(resolve, reject);
            },
          };
        },
        insert: async (rows: any[]) => {
          if (table === 'allowed_users') {
            const current = getStoredAllowedUsers();
            const newItems = Array.isArray(rows) ? rows : [rows];
            newItems.forEach((item) => {
              const norm = (item.email || '').trim().toLowerCase();
              if (norm && !current.some((u) => u.email === norm)) {
                current.push({
                  email: norm,
                  role: item.role || 'member',
                  created_at: new Date().toISOString(),
                });
              }
            });
            saveAllowedUsers(current);
            return { data: current, error: null };
          }
          return { data: rows, error: null };
        },
        upsert: async (rows: any[], _options?: { onConflict?: string }) => {
          if (table === 'directory_year_data') {
            try {
              const raw = localStorage.getItem(DATA_KEY);
              const currentRows: any[] = raw ? JSON.parse(raw) : [];
              const map = new Map<string, any>();
              currentRows.forEach((r) => map.set(r.fiscal_year, r));
              rows.forEach((r) => map.set(r.fiscal_year, r));
              const updated = Array.from(map.values());
              localStorage.setItem(DATA_KEY, JSON.stringify(updated));
              return { data: rows, error: null };
            } catch (err: any) {
              return { data: null, error: { message: err?.message || 'Storage error' } };
            }
          }
          if (table === 'allowed_users') {
            const current = getStoredAllowedUsers();
            const newItems = Array.isArray(rows) ? rows : [rows];
            newItems.forEach((item) => {
              const norm = (item.email || '').trim().toLowerCase();
              const existingIdx = current.findIndex((u) => u.email === norm);
              if (existingIdx >= 0) {
                current[existingIdx] = { ...current[existingIdx], ...item, email: norm };
              } else if (norm) {
                current.push({ email: norm, role: item.role || 'member', created_at: new Date().toISOString() });
              }
            });
            saveAllowedUsers(current);
            return { data: current, error: null };
          }
          return { data: rows, error: null };
        },
        delete: () => {
          return {
            eq: async (col: string, val: string) => {
              if (table === 'directory_year_data' && col === 'fiscal_year') {
                try {
                  const raw = localStorage.getItem(DATA_KEY);
                  const currentRows: any[] = raw ? JSON.parse(raw) : [];
                  const filtered = currentRows.filter((r) => r.fiscal_year !== val);
                  localStorage.setItem(DATA_KEY, JSON.stringify(filtered));
                  return { data: null, error: null };
                } catch (err: any) {
                  return { data: null, error: { message: err?.message || 'Delete error' } };
                }
              }
              if (table === 'allowed_users' && col === 'email') {
                const current = getStoredAllowedUsers();
                const filtered = current.filter((u) => u.email !== val.toLowerCase());
                saveAllowedUsers(filtered);
                return { data: null, error: null };
              }
              return { data: null, error: null };
            },
          };
        },
      };
    },
  };
}

export const supabase: any = isConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createMockSupabaseClient();
