"use client";

import { useCallback, useEffect, useState } from "react";

import {
  defaultFavoriteAvatars,
  FAVORITE_AVATARS_STORAGE_KEY,
  readFavoriteAvatars,
  writeFavoriteAvatars,
  type FavoriteAvatar,
} from "@/lib/avatars/favoritesStorage";

export function useFavoriteAvatars() {
  const [favorites, setFavorites] = useState<FavoriteAvatar[]>(() =>
    defaultFavoriteAvatars(),
  );

  const refresh = useCallback(() => {
    setFavorites(readFavoriteAvatars());
  }, []);

  const setFavoritesAndPersist = useCallback((next: FavoriteAvatar[]) => {
    writeFavoriteAvatars(next);
    setFavorites(readFavoriteAvatars());
  }, []);

  useEffect(() => {
    setFavorites(readFavoriteAvatars());
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === FAVORITE_AVATARS_STORAGE_KEY || e.key === null) {
        setFavorites(readFavoriteAvatars());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { favorites, refresh, setFavoritesAndPersist };
}
