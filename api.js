import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const API_BASE_URL =
 process.env.EXPO_PUBLIC_API_URL || "https://restaurant.qtechx.com/api";
    // process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.5:5000/api";

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

function generateOrderRequestKey() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const randomHex = Math.floor(Math.random() * 16);
    const value = token === "x" ? randomHex : (randomHex & 0x3) | 0x8;
    return value.toString(16);
  });
}

api.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();
    const localNow = new Date();
    config.headers["X-Local-Time-Minutes"] = String(
      localNow.getHours() * 60 + localNow.getMinutes(),
    );

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (appLockToken) {
      config.headers["X-App-Lock-Token"] = appLockToken;
    }

    const url = String(config.url || "");
    const method = String(config.method || "get").toLowerCase();
    const isKitchenOrderSubmit =
      url.includes("/kitchen-orders") && ["post", "put", "patch"].includes(method);

    if (isKitchenOrderSubmit) {
      if (!config.headers) {
        config.headers = {};
      }

      const existingKey =
        (config.data &&
          typeof config.data === "object" &&
          (config.data.order_request_key ||
            config.data.orderRequestKey ||
            config.data.request_key ||
            config.data.order_key)) ||
        config.headers["order-request-key"] ||
        config.headers["Order-Request-Key"] ||
        config.headers["x-order-request-key"] ||
        config.headers["X-Order-Request-Key"] ||
        config.headers["idempotency-key"] ||
        config.headers["Idempotency-Key"] ||
        generateOrderRequestKey();

      const keyStr = String(existingKey).trim();

      config.headers["order-request-key"] = keyStr;
      config.headers["Order-Request-Key"] = keyStr;
      config.headers["x-order-request-key"] = keyStr;
      config.headers["X-Order-Request-Key"] = keyStr;
      config.headers["idempotency-key"] = keyStr;
      config.headers["Idempotency-Key"] = keyStr;

      if (config.data && typeof config.data === "object" && !Array.isArray(config.data)) {
        if (!config.data.order_request_key) config.data.order_request_key = keyStr;
        if (!config.data.orderRequestKey) config.data.orderRequestKey = keyStr;
        if (!config.data.request_key) config.data.request_key = keyStr;
        if (!config.data.order_key) config.data.order_key = keyStr;
      }
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
