import { useState, useEffect, useCallback } from "react";
import axiosInstance from "./axiosinstance";
import { toast } from "sonner";

const STORAGE_KEY = "yt_subscribed_channels";

export function getSubscribedChannels(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

export function isChannelSubscribedSync(channelIdentifier?: string): boolean {
  if (!channelIdentifier) return false;
  const list = getSubscribedChannels();
  const normalized = String(channelIdentifier).trim().toLowerCase();
  return list.some((c) => String(c).trim().toLowerCase() === normalized);
}

export async function toggleChannelSubscriptionApi(
  channelIdentifier: string,
  channelName?: string,
  userId?: string
): Promise<{ isSubscribed: boolean }> {
  if (!channelIdentifier) return { isSubscribed: false };

  const currentList = getSubscribedChannels();
  const targetId = String(channelIdentifier).trim();
  const normalized = targetId.toLowerCase();

  const exists = currentList.some((c) => String(c).trim().toLowerCase() === normalized);
  let updatedList: string[];
  let nextState: boolean;

  if (exists) {
    updatedList = currentList.filter((c) => String(c).trim().toLowerCase() !== normalized);
    nextState = false;
  } else {
    updatedList = [...currentList, targetId];
    nextState = true;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  } catch (_) {}

  // Broadcast event across components
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("yt_subscription_change", {
        detail: { channelId: targetId, isSubscribed: nextState },
      })
    );
  }

  // Toast feedback
  const displayName = channelName || targetId;
  if (nextState) {
    toast.success(`Subscribed to ${displayName}!`, {
      description: "You'll now see new videos and updates from this channel.",
    });
  } else {
    toast.info(`Unsubscribed from ${displayName}`);
  }

  // Background server sync
  try {
    await axiosInstance.post(
      `/user/subscribe/${encodeURIComponent(targetId)}`,
      { userId, isSubscribed: nextState }
    );
  } catch (_) {
    // Non-blocking for offline/guest
  }

  return { isSubscribed: nextState };
}

/**
 * React hook to observe and toggle subscription state reactively.
 */
export function useChannelSubscription(channelIdentifier?: string, channelName?: string, userId?: string) {
  const [isSubscribed, setIsSubscribed] = useState<boolean>(() =>
    isChannelSubscribedSync(channelIdentifier)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setIsSubscribed(isChannelSubscribedSync(channelIdentifier));

    const handleEvent = (e: any) => {
      const detail = e.detail;
      if (
        detail &&
        channelIdentifier &&
        String(detail.channelId).toLowerCase() === String(channelIdentifier).toLowerCase()
      ) {
        setIsSubscribed(detail.isSubscribed);
      }
    };

    window.addEventListener("yt_subscription_change", handleEvent);
    return () => window.removeEventListener("yt_subscription_change", handleEvent);
  }, [channelIdentifier]);

  const toggleSubscription = useCallback(async () => {
    if (!channelIdentifier) return;
    setIsLoading(true);
    try {
      const res = await toggleChannelSubscriptionApi(channelIdentifier, channelName, userId);
      setIsSubscribed(res.isSubscribed);
    } finally {
      setIsLoading(false);
    }
  }, [channelIdentifier, channelName, userId]);

  return { isSubscribed, toggleSubscription, isLoading };
}
