import axios from "axios";
import { useNotificationStore } from "../store/notificationStore";
import { useToastStore } from "../store/toastStore";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 30000,
});

client.interceptors.request.use((config) => config);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.detail ||
      error?.message ||
      "The pipeline API did not respond.";
    if (typeof window !== "undefined") {
      useToastStore.getState().addToast({
        type: "error",
        title: "API request failed",
        message: String(message),
      });
      useNotificationStore.getState().addNotification({
        type: "error",
        title: "API request failed",
        message: String(message),
        route: "/settings",
      });
    }
    return Promise.reject(error);
  },
);

export default client;
