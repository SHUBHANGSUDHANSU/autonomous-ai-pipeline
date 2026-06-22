import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CommandPalette } from "./components/layout/CommandPalette";
import { Sidebar } from "./components/layout/Sidebar";
import { ToastViewport } from "./components/layout/ToastViewport";
import { TopBar } from "./components/layout/TopBar";
import client from "./api/client";
import { Analytics } from "./pages/Analytics";
import { Content } from "./pages/Content";
import { ContentDetail } from "./pages/ContentDetail";
import { Dashboard } from "./pages/Dashboard";
import { Pipeline } from "./pages/Pipeline";
import { Settings } from "./pages/Settings";
import { useCommandPaletteStore } from "./store/commandPaletteStore";
import { useTheme } from "./hooks/useTheme";

const BACKGROUND_VIDEO_URL =
  "https://res.cloudinary.com/dzs3x98vf/video/upload/v1779443825/kling_20260522_Image_to_Video__4503_0_ckmlnx.mp4";
const APP_BASENAME = import.meta.env.DEV ? "/static" : "/app";

interface HealthResponse {
  status: string;
  redis: boolean;
  db: boolean;
  celery: boolean;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/content" element={<Content />} />
        <Route path="/content/:id" element={<ContentDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const openPalette = useCommandPaletteStore((state) => state.openPalette);
  useTheme();
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await client.get<HealthResponse>("/health");
      return response.data;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === "ok" && data.redis && data.db && data.celery ? 45_000 : 5_000;
    },
  });
  const connected = Boolean(
    healthQuery.data?.status === "ok"
    && healthQuery.data.redis
    && healthQuery.data.db
    && healthQuery.data.celery,
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openPalette]);

  return (
    <div className="relative min-h-screen overflow-x-hidden text-[var(--text-primary)]">
      <VideoBackground />

      <Sidebar connected={connected} open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <CommandPalette />
      <ToastViewport />

      <div className="relative z-10 min-h-screen md:pl-[86px] lg:pl-[var(--sidebar-width)]">
        <motion.main
          className="min-h-screen w-full px-4 py-4 sm:px-6 lg:px-8 2xl:px-10"
          initial={false}
        >
          <TopBar onMenu={() => setMobileOpen(true)} />
          <AnimatedRoutes />
        </motion.main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={APP_BASENAME}>
      <AppLayout />
    </BrowserRouter>
  );
}

function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    playMutedVideo(videoRef.current);
  }, []);

  return (
    <div className="video-backdrop" aria-hidden="true">
      <video
        className="video-backdrop__ambient"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlay={(event) => playMutedVideo(event.currentTarget)}
      >
        <source src={BACKGROUND_VIDEO_URL} type="video/mp4" />
      </video>
      <video
        ref={videoRef}
        className="video-backdrop__media"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlay={(event) => playMutedVideo(event.currentTarget)}
      >
        <source src={BACKGROUND_VIDEO_URL} type="video/mp4" />
      </video>
      <div className="video-backdrop__veil" />
      <div className="video-backdrop__vignette" />
    </div>
  );
}

function playMutedVideo(video: HTMLVideoElement | null) {
  if (!video) return;
  video.muted = true;
  void video.play().catch(() => undefined);
}
