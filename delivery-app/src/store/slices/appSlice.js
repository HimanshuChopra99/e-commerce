import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'dp_auth';
const ONLINE_KEY = 'dp_online'; // persisted separately so setMe can't clobber it

// ── Persistence helpers ───────────────────────────────────────────────────────

function loadAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { partner: null, token: null };
    return JSON.parse(raw);
  } catch {
    return { partner: null, token: null };
  }
}

function loadOnline() {
  try {
    const raw = localStorage.getItem(ONLINE_KEY);
    if (raw === null) return false;
    return JSON.parse(raw) === true;
  } catch {
    return false;
  }
}

function saveAuth(partner, token) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ partner, token }));
  } catch {}
}

function saveOnline(value) {
  try {
    localStorage.setItem(ONLINE_KEY, JSON.stringify(Boolean(value)));
  } catch {}
}

function clearAuth() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ONLINE_KEY);
  } catch {}
}

// ── Initial state ─────────────────────────────────────────────────────────────

const persisted = loadAuth();

const initialState = {
  // Load online status from its own dedicated key — never from DB partner.isOnline,
  // so that a page-refresh doesn't reset the toggle back to whatever the DB says.
  online: loadOnline(),
  partner: persisted.partner ?? null, // { id, publicId, firstName, lastName, email, vehicleType, isOnline }
  token: persisted.token ?? null, // JWT access token
  stats: null, // real delivery stats from /delivery-partner/me
  recentOrders: [], // real recent deliveries
  authLoading: false,
  authError: null,
};

// ── Slice ─────────────────────────────────────────────────────────────────────

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setOnline: (state, action) => {
      state.online = Boolean(action.payload);
      saveOnline(state.online); // persist the toggle immediately
    },
    loginSuccess: (state, action) => {
      state.partner = action.payload.partner;
      state.token = action.payload.accessToken;
      // On fresh login use the DB value; after that the partner controls it
      state.online = Boolean(action.payload.partner?.isOnline);
      state.authError = null;
      saveAuth(action.payload.partner, action.payload.accessToken);
      saveOnline(state.online);
    },
    // Populated from GET /delivery-partner/me (real DB data).
    // IMPORTANT: never overwrite state.online — the partner owns that toggle.
    // The DB value can lag behind (grace period) or differ from the UI state.
    setMe: (state, action) => {
      const { partner, stats, recentOrders } = action.payload;
      if (partner) {
        state.partner = partner;
        // Persist auth but do NOT change state.online — it lives in ONLINE_KEY
        saveAuth(partner, state.token);
      }
      if (stats) state.stats = stats;
      if (Array.isArray(recentOrders)) state.recentOrders = recentOrders;
    },
    logout: (state) => {
      state.partner = null;
      state.token = null;
      state.online = false;
      state.stats = null;
      state.recentOrders = [];
      clearAuth();
    },
    setAuthError: (state, action) => {
      state.authError = action.payload;
    },
    setAuthLoading: (state, action) => {
      state.authLoading = action.payload;
    },
  },
});

export const {
  setOnline,
  loginSuccess,
  setMe,
  logout,
  setAuthError,
  setAuthLoading,
} = appSlice.actions;
export default appSlice.reducer;
