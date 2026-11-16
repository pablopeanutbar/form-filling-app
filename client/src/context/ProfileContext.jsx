import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as api from '../api/profile.js';

const ProfileContext = createContext(null);
export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api.getProfile(controller.signal).then(setProfile).catch((err) => {
      if (!controller.signal.aborted) setError(err);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const save = async (body) => {
    const saved = await api.saveProfile(body);
    setProfile(saved);
    return saved;
  };
  const saveEducation = async (body, id) => {
    const saved = await api.saveQualification(body, id);
    setProfile((current) => ({ ...current, education: id
      ? current.education.map((item) => item.id === id ? saved : item)
      : [...(current.education || []), saved] }));
    return saved;
  };
  const deleteEducation = async (id) => {
    await api.removeQualification(id);
    setProfile((current) => ({ ...current, education: current.education.filter((item) => item.id !== id) }));
  };
  return <ProfileContext.Provider value={{ profile, loading, error, reload, save, saveEducation, deleteEducation }}>{children}</ProfileContext.Provider>;
}
export const useProfile = () => useContext(ProfileContext);
