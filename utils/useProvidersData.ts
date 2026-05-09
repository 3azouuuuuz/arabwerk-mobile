import { useCallback, useEffect, useRef, useState } from 'react';
import { ENV } from '../config/env';
import { AverageRating, Category, Provider, Rating, User, Verification } from './types';

const PRO_PLANS = ['pro', 'Pro', 'PRO', 'premium', 'Premium', 'PREMIUM'];
const isPro = (plan: string) => PRO_PLANS.includes(plan?.trim() || '');

function buildSortedList(
  providers: Provider[],
  ratingsObj: Record<string, AverageRating>
): Provider[] {
  const sorted = [...providers].sort((a, b) => {
    const aIsPro = isPro(a.plan);
    const bIsPro = isPro(b.plan);
    const ratingA = ratingsObj[a.user_id]?.avg || 0;
    const ratingB = ratingsObj[b.user_id]?.avg || 0;

    if (aIsPro && !bIsPro) return -1;
    if (!aIsPro && bIsPro) return 1;
    return ratingB - ratingA;
  });

  // ── DEBUG: print the first 20 in sorted order ──────────────────────────
  console.log('🔢 SORTED ORDER (first 20):');
  sorted.slice(0, 20).forEach((p, i) => {
    console.log(
      `  [${i + 1}] plan="${p.plan}" isPro=${isPro(p.plan)} rating=${ratingsObj[p.user_id]?.avg ?? 0} name="${p.business_name || p.provider_name}"`
    );
  });

  return sorted;
}

export const useProvidersData = (userId?: string, userType?: number) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [ratings, setRatings] = useState<Record<string, AverageRating>>({});
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [sortedProviders, setSortedProviders] = useState<Provider[]>([]);

  const rawProvidersRef = useRef<Provider[]>([]);
  const usersRef = useRef<User[]>([]);
  const hasSortedRef = useRef(false);
  const sortCountRef = useRef(0); // counts how many times sort runs

  // ── Fetch categories ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${ENV.API_BASE_URL}/category`);
        const data: Category[] = await res.json();
        setCategories(data.filter((c) => c.is_active === true));
      } catch (e) {
        console.error('Error fetching categories:', e);
      }
    };
    fetchCategories();
  }, []);

  // ── Fetch providers + users + verifications ───────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, verificationsRes, providersRes] = await Promise.all([
          fetch(`${ENV.API_BASE_URL}/users/public`),
          fetch(`${ENV.API_BASE_URL}/verifications`),
          fetch(`${ENV.API_BASE_URL}/provider_profiles`),
        ]);

        const usersData: User[] = await usersRes.json();
        const verificationsData: Verification[] = await verificationsRes.json();
        const providersList: any[] = await providersRes.json();

        usersRef.current = usersData;

        const merged: Provider[] = providersList.map((provider) => {
          const categoriesArray = provider.category
            ? provider.category
                .split('،')
                .map((c: string) => c.trim())
                .filter((c: string) => c.length > 0)
            : [];

          const userObj = usersData.find((u) => u.id === provider.user_id);
          const verification = verificationsData.find((v) => v.user_id === provider.user_id);

          return {
            ...provider,
            categories: categoriesArray,
            provider_name: userObj ? userObj.firstname : 'Provider',
            provider_plan: provider.plan,
            is_id_verified: verification?.is_id_verified ?? false,
            is_company_registered: verification?.is_company_registered ?? false,
          };
        });

        console.log(`📦 Providers loaded: ${merged.length}`);
        rawProvidersRef.current = merged;
      } catch (e) {
        console.error('Error fetching providers:', e);
      } finally {
        setIsInitialLoad(false);
      }
    };
    fetchData();
  }, []);

  // ── Fetch ratings ─────────────────────────────────────────────────────────
  const fetchRatingsData = useCallback(async () => {
    const rawProviders = rawProvidersRef.current;

    console.log(`⭐ fetchRatingsData called — providers: ${rawProviders.length}, hasSorted: ${hasSortedRef.current}`);

    if (rawProviders.length === 0) {
      console.log('⚠️ fetchRatingsData: no providers yet, skipping');
      return;
    }

    try {
      const res = await fetch(`${ENV.API_BASE_URL}/ratings`);
      if (!res.ok) throw new Error('ratings fetch failed');
      const allRatings: Rating[] = await res.json();

      const providerIds = new Set(rawProviders.map((p) => p.user_id?.toString()));

      const filtered = allRatings.filter(
        (r) => r.provider_id && providerIds.has(r.provider_id.toString())
      );

      const ratingMap: Record<string, { sum: number; count: number }> = {};
      filtered.forEach(({ provider_id, rating }) => {
        if (!provider_id) return;
        const key = provider_id.toString();
        if (!ratingMap[key]) ratingMap[key] = { sum: 0, count: 0 };
        ratingMap[key].sum += rating;
        ratingMap[key].count += 1;
      });

      const ratingsObj: Record<string, AverageRating> = {};
      Object.entries(ratingMap).forEach(([id, { sum, count }]) => {
        ratingsObj[id] = {
          avg: parseFloat((sum / count).toFixed(2)),
          count,
          userRating: 0,
          allUserRatings: [],
        };
      });

      if (userId) {
        filtered
          .filter((r) => r.user_id?.toString() === userId.toString())
          .forEach((r) => {
            const key = r.provider_id?.toString();
            if (key && ratingsObj[key]) ratingsObj[key].userRating = r.rating;
          });
      }

      const usersMap: Record<string, string> = {};
      usersRef.current.forEach((u) => {
        if (u.id) usersMap[u.id.toString()] = u.firstname || 'User';
      });
      filtered.forEach((r) => {
        const key = r.provider_id?.toString();
        if (key && ratingsObj[key]) {
          ratingsObj[key].allUserRatings.push({
            userName: usersMap[r.user_id?.toString() || ''] || 'User',
            rating: r.rating,
          });
        }
      });

      setRatings(ratingsObj);

      // ── ONE-TIME SORT ────────────────────────────────────────────────────
      if (!hasSortedRef.current) {
        hasSortedRef.current = true;
        sortCountRef.current += 1;
        console.log(`✅ Running sort #${sortCountRef.current}`);
        setSortedProviders(buildSortedList(rawProvidersRef.current, ratingsObj));
      } else {
        console.log('🚫 Sort skipped — already sorted');
      }
    } catch (e) {
      console.error('Error fetching ratings:', e);
      if (!hasSortedRef.current) {
        hasSortedRef.current = true;
        sortCountRef.current += 1;
        console.log(`✅ Running fallback sort #${sortCountRef.current} (no ratings)`);
        setSortedProviders(buildSortedList(rawProvidersRef.current, {}));
      }
    }
  }, [userId]);

  useEffect(() => {
    if (!isInitialLoad) {
      fetchRatingsData();
    }
  }, [isInitialLoad, fetchRatingsData]);

  // ── DEBUG: log every time sortedProviders changes ─────────────────────────
  useEffect(() => {
    if (sortedProviders.length === 0) return;
    console.log(`🔄 sortedProviders state updated — length: ${sortedProviders.length}`);
    console.log('🔍 First 5 in state:');
    sortedProviders.slice(0, 5).forEach((p, i) => {
      console.log(`  [${i + 1}] plan="${p.plan}" name="${p.business_name || p.provider_name}"`);
    });
  }, [sortedProviders]);

  return {
    providers: sortedProviders,
    categories,
    ratings,
    isInitialLoad,
    setRatings,
    fetchRatingsData,
  };
};