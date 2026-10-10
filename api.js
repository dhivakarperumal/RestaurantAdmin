import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const API_BASE_URL =
//  process.env.EXPO_PUBLIC_API_URL || "https://lifetracking.qtechx.com/api";
    process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.3:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

let cachedToken = null;
let appLockToken = null;

/* =========================
   TOKEN MANAGEMENT
========================= */

export const setAuthToken = async (token) => {
  cachedToken = token || null;

  if (token) {
    await AsyncStorage.setItem("userToken", token);
  } else {
    await AsyncStorage.removeItem("userToken");
  }
};

export const getStoredToken = async () => {
  if (cachedToken) {
    return cachedToken;
  }

  const token = await AsyncStorage.getItem("userToken");

  if (token) {
    cachedToken = token;
  }

  return token || null;
};

export const clearTokenCache = () => {
  cachedToken = null;
};

export const getAppLockToken = () => appLockToken;

export const setAppLockToken = (token) => {
  appLockToken = token || null;
};

/* =========================
   USER PROFILE
========================= */

export const saveUser = async (user) => {
  if (user) {
    await AsyncStorage.setItem("userProfile", JSON.stringify(user));
  }
};

export const getStoredUser = async () => {
  const user = await AsyncStorage.getItem("userProfile");

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
};

/* =========================
   API ERROR
========================= */

export const getApiErrorMessage = (
  error,
  fallback = "Something went wrong",
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

/* =========================
   REQUEST INTERCEPTOR
========================= */

api.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (appLockToken) {
      config.headers["X-App-Lock-Token"] = appLockToken;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/* =========================
   RESPONSE INTERCEPTOR
========================= */

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    if (error.response) {
      const status = error.response.status;

      const isAppLockUnlock = String(error.config?.url || "").includes(
        "/app-lock/unlock",
      );
      if (status === 401 && !isAppLockUnlock) {
        await logoutUser();
      }

      return Promise.reject({
        status,
        message:
          error.response.data?.message ||
          error.response.data?.error ||
          "Server error",
        data: error.response.data,
      });
    }

    return Promise.reject({
      status: "network_error",
      message:
        "Network connection failed. Please check your internet connection.",
    });
  },
);

/* =========================
   LOGIN
========================= */

export const loginWithIdentifier = async (identifier, password) => {
  const normalizedIdentifier = String(identifier || "").trim();
  const response = await api.post("/users/login", {
    identifier: normalizedIdentifier,
    email: normalizedIdentifier,
    password: String(password || ""),
    rememberMe: false,
  });

  const data = response.data || {};
  const token = data.token;
  const user = data.user || data.data;

  if (!token || !user || typeof user !== "object") {
    throw new Error(data.message || "The server returned an incomplete login response.");
  }

  await setAuthToken(token);
  await saveUser(user);

  return {
    ...data,
    token,
    user,
    message: data.message || "Login successful",
  };
};

/* =========================
   REGISTRATION
========================= */

export const registerUser = async ({ username, email, phone, password }) => {
  const normalizedUsername = String(username || "").trim();
  const normalizedEmail = String(email || "").trim();
  const normalizedPhone = String(phone || "").trim();
  const response = await api.post("/users/register", {
    username: normalizedUsername,
    firstName: normalizedUsername,
    email: normalizedEmail,
    phone: normalizedPhone,
    mobile_number: normalizedPhone,
    password: String(password || ""),
  });

  const data = response.data || {};
  const token = data.token;
  const user = data.user || data.data;

  if (!token || !user || typeof user !== "object") {
    throw new Error(
      data.message || "The server returned an incomplete registration response.",
    );
  }

  await setAuthToken(token);
  await saveUser(user);

  return {
    ...data,
    token,
    user,
    message: data.message || "Registration successful",
  };
};

/* =========================
   LOGOUT
========================= */

export const logoutUser = async () => {
  try {
    await AsyncStorage.removeMany(["userToken", "userProfile"]);
  } finally {
    clearTokenCache();
    setAppLockToken(null);
  }
};

/* =========================
   CHECK LOGIN
========================= */

export const isLoggedIn = async () => {
  const token = await getStoredToken();
  return !!token;
};

export default api;