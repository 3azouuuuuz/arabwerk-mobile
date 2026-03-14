import { useCallback, useEffect, useState } from 'react';
import { ENV } from '../config/env';
import { AverageRating, Category, Provider, Rating, User, Verification } from './types';

export const useProvidersData = (userId?: string, userType?: number) => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [ratings, setRatings] = useState<Record<string, AverageRating>>({});
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${ENV.API_BASE_URL}/category`);
        const data: Category[] = await response.json();
        setCategories(data.filter(category => category.is_active === true));
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch all data (users, verifications, providers)
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
        const providersList: Provider[] = await providersRes.json();

        setUsers(usersData);
        setVerifications(verificationsData);

        const mergedProviders: Provider[] = providersList.map((provider: any) => {
          const categoriesArray = provider.category
            ? provider.category
                .split('،')
                .map((c: string) => c.trim())
                .filter((c: string) => c.length > 0)
            : [];

          const userObj = usersData.find(u => u.id === provider.user_id);
          const verification = verificationsData.find(v => v.user_id === provider.user_id);

          return {
            ...provider,
            categories: categoriesArray,
            provider_name: userObj ? userObj.firstname : 'Provider',
            provider_plan: provider.plan,
            is_id_verified: verification ? verification.is_id_verified : false,
            is_company_registered: verification ? verification.is_company_registered : false,
          };
        });

        setProviders(mergedProviders);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsInitialLoad(false);
      }
    };
    fetchData();
  }, []);

  // Fetch ratings
  const fetchRatingsData = useCallback(async () => {
    if (providers.length === 0 || users.length === 0) return;
    try {
      const ratingsRes = await fetch(`${ENV.API_BASE_URL}/ratings`);
      if (!ratingsRes.ok) return;
      const allRatings: Rating[] = await ratingsRes.json();

      const providerIds = providers
        .map(p => p.user_id)
        .filter(id => id)
        .map(id => id.toString());

      const filteredRatings = allRatings.filter(
        r => r.provider_id && providerIds.includes(r.provider_id.toString())
      );

      const ratingMap: Record<string, { sum: number; count: number }> = {};
      filteredRatings.forEach(({ provider_id, rating }) => {
        if (!provider_id) return;
        const key = provider_id.toString();
        if (!ratingMap[key]) ratingMap[key] = { sum: 0, count: 0 };
        ratingMap[key].sum += rating;
        ratingMap[key].count += 1;
      });

      const ratingsObj: Record<string, AverageRating> = {};
      Object.entries(ratingMap).forEach(([provider_id, { sum, count }]) => {
        ratingsObj[provider_id] = {
          avg: parseFloat((sum / count).toFixed(2)),
          count,
          userRating: 0,
          allUserRatings: [],
        };
      });

      if (userId) {
        const userRatings = filteredRatings.filter(
          r => r.user_id && r.user_id.toString() === userId.toString()
        );
        userRatings.forEach(r => {
          if (!r.provider_id) return;
          const key = r.provider_id.toString();
          if (ratingsObj[key]) ratingsObj[key].userRating = r.rating;
        });
      }

      const usersMap: Record<string, string> = {};
      users.forEach(u => {
        if (u.id) usersMap[u.id.toString()] = u.firstname || 'User';
      });

      filteredRatings.forEach(r => {
        if (!r.provider_id) return;
        const key = r.provider_id.toString();
        if (ratingsObj[key]) {
          ratingsObj[key].allUserRatings.push({
            userName: usersMap[r.user_id?.toString() || ''] || 'User',
            rating: r.rating,
          });
        }
      });

      setRatings(ratingsObj);
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  }, [providers, userId, users]);

  useEffect(() => {
    fetchRatingsData();
  }, [fetchRatingsData]);

  return {
    providers,
    categories,
    users,
    verifications,
    ratings,
    isInitialLoad,
    setRatings,
    fetchRatingsData,
  };
};