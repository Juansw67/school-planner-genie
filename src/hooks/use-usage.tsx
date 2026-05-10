import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getQuota } from "@/lib/quota.functions";

export const FREE_LIMIT = 3;

export function useUsage() {
  const { user } = useAuth();
  const fetchQuota = useServerFn(getQuota);
  const [used, setUsed] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const q = await fetchQuota({ data: { userId: user?.id ?? null } });
      setUsed(q.used);
      setIsPremium(q.isPremium);
      setAllowed(q.allowed);
    } finally {
      setLoading(false);
    }
  }, [fetchQuota, user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { used, isPremium, loading, allowed, limit: FREE_LIMIT, refresh };
}