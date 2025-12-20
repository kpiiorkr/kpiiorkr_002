import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  BBSEntry,
  RollingImage,
  AppSettings,
  Inquiry,
} from './types';

import {
  INITIAL_BBS_DATA,
  INITIAL_ROLLING_IMAGES,
} from './constants';

import { supabase } from './supabaseClient';

const STORAGE_KEYS = {
  BBS: 'kpii_bbs_data',
  SETTINGS: 'kpii_settings',
  INQUIRIES: 'kpii_inquiries',
} as const;

interface AppContextType {
  bbsData: BBSEntry[];
  inquiries: Inquiry[];
  settings: AppSettings;
  isAdmin: boolean;
  isSyncing: boolean;

  setIsAdmin: (val: boolean) => void;

  addBBSEntry: (entry: BBSEntry) => void;
  updateBBSEntry: (entry: BBSEntry) => void;
  deleteBBSEntry: (id: string) => void;

  addInquiry: (inquiry: Inquiry) => void;
  deleteInquiry: (id: string) => void;

  updateSettings: (updates: Partial<AppSettings>) => void;
  updateAdminPassword: (password: string) => void;

  addRollingImage: (image: Omit<RollingImage, 'id'>) => Promise<void>;
  updateRollingImage: (image: RollingImage) => Promise<void>;
  deleteRollingImage: (id: number) => Promise<void>;
  loadRollingImages: () => Promise<void>;

  updateProfileImage: (
    type: 'founder' | 'chairman' | 'logo',
    url: string
  ) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(
  undefined
);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isSyncing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const [bbsData, setBbsData] =
    useState<BBSEntry[]>(INITIAL_BBS_DATA);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    showSidebar: true,
    rollingImages: INITIAL_ROLLING_IMAGES,
    founderImageUrl:
      'https://raw.githubusercontent.com/kpiiorkr/img/main/founder.png',
    chairmanImageUrl:
      'https://raw.githubusercontent.com/kpiiorkr/img/main/kwon.png',
    logoImageUrl:
      'https://raw.githubusercontent.com/kpiiorkr/img/main/logo.png',
    adminPassword: 'password',
  });
  const [isAdmin, setIsAdminState] = useState(false);
  const [settingsRowId, setSettingsRowId] = useState<
    string | null
  >(null);

  // Supabase에서 rolling images 로드
  const loadRollingImages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('rolling_images')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Failed to load rolling images:', error);
        return;
      }

      if (data && data.length > 0) {
        setSettings(prev => ({
          ...prev,
          rollingImages: data,
        }));
      }
    } catch (e) {
      console.error('Error loading rolling images:', e);
    }
  }, []);

  // localStorage + Supabase settings 로드
  useEffect(() => {
    const loadFromStorageAndSupabase = async () => {
      try {
        const savedBbs = localStorage.getItem(STORAGE_KEYS.BBS);
        const savedSettings = localStorage.getItem(
          STORAGE_KEYS.SETTINGS
        );
        const savedInquiries = localStorage.getItem(
          STORAGE_KEYS.INQUIRIES
        );
        const savedAdmin = localStorage.getItem('kpii_is_admin');

        if (savedBbs) setBbsData(JSON.parse(savedBbs));
        if (savedInquiries)
          setInquiries(JSON.parse(savedInquiries));
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
        }
        if (savedAdmin)
          setIsAdminState(savedAdmin === 'true');

        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (!error && data) {
          setSettings(prev => ({
            ...prev,
            logoImageUrl:
              data.logo_image_url ?? prev.logoImageUrl,
            founderImageUrl:
              data.founder_image_url ?? prev.founderImageUrl,
            chairmanImageUrl:
              data.chairman_image_url ??
              prev.chairmanImageUrl,
          }));
          setSettingsRowId(data.id);
        }

        // Rolling images 로드
        await loadRollingImages();
      } catch (e) {
        console.error('Data recovery failed', e);
      } finally {
        setTimeout(() => setIsInitialized(true), 50);
      }
    };

    loadFromStorageAndSupabase();
  }, [loadRollingImages]);

  // localStorage 저장
  useEffect(() => {
    if (!isInitialized) return;

    try {
      localStorage.setItem(
        STORAGE_KEYS.BBS,
        JSON.stringify(bbsData)
      );
      localStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(settings)
      );
      localStorage.setItem(
        STORAGE_KEYS.INQUIRIES,
        JSON.stringify(inquiries)
      );
    } catch (e) {
      console.warn(
        'Storage quota exceeded. Base64 images may be too large.',
        e
      );
    }
  }, [bbsData, settings, inquiries, isInitialized]);

  const setIsAdmin = useCallback((val: boolean) => {
    setIsAdminState(val);
    localStorage.setItem('kpii_is_admin', String(val));
  }, []);

  // BBS
  const addBBSEntry = useCallback((entry: BBSEntry) => {
    setBbsData(prev => [entry, ...prev]);
  }, []);

  const updateBBSEntry = useCallback(
    (entry: BBSEntry) => {
      setBbsData(prev =>
        prev.map(b => (b.id === entry.id ? entry : b))
      );
    },
    []
  );

  const deleteBBSEntry = useCallback((id: string) => {
    setBbsData(prev =>
      prev.filter(entry => entry.id !== id)
    );
  }, []);

  // Inquiry
  const addInquiry = useCallback((inq: Inquiry) => {
    setInquiries(prev => [inq, ...prev]);
  }, []);

  const deleteInquiry = useCallback((id: string) => {
    setInquiries(prev =>
      prev.filter(inq => inq.id !== id)
    );
  }, []);

  // Settings
  const updateSettings = useCallback(
    (updates: Partial<AppSettings>) => {
      setSettings(prev => ({ ...prev, ...updates }));
    },
    []
  );

  const updateAdminPassword = useCallback(
    (password: string) => {
      setSettings(prev => ({
        ...prev,
        adminPassword: password,
      }));
    },
    []
  );

  // Rolling images with Supabase
  const addRollingImage = useCallback(
    async (image: Omit<RollingImage, 'id'>) => {
      try {
        const { data, error } = await supabase
          .from('rolling_images')
          .insert([image])
          .select()
          .single();

        if (error) {
          console.error('Failed to add rolling image:', error);
          throw error;
        }

        if (data) {
          setSettings(prev => ({
            ...prev,
            rollingImages: [...prev.rollingImages, data],
          }));
        }
      } catch (e) {
        console.error('Error adding rolling image:', e);
        throw e;
      }
    },
    []
  );

  const updateRollingImage = useCallback(
    async (image: RollingImage) => {
      try {
        const { error } = await supabase
          .from('rolling_images')
          .update({
            image_url: image.image_url,
            subtitle: image.subtitle,
            title: image.title,
            button_text: image.button_text,
            button_link: image.button_link,
            link_type: image.link_type,
            display_order: image.display_order,
          })
          .eq('id', image.id);

        if (error) {
          console.error('Failed to update rolling image:', error);
          throw error;
        }

        setSettings(prev => ({
          ...prev,
          rollingImages: prev.rollingImages.map(img =>
            img.id === image.id ? image : img
          ),
        }));
      } catch (e) {
        console.error('Error updating rolling image:', e);
        throw e;
      }
    },
    []
  );

  const deleteRollingImage = useCallback(async (id: number) => {
    try {
      const { error } = await supabase
        .from('rolling_images')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete rolling image:', error);
        throw error;
      }

      setSettings(prev => ({
        ...prev,
        rollingImages: prev.rollingImages.filter(
          img => img.id !== id
        ),
      }));
    } catch (e) {
      console.error('Error deleting rolling image:', e);
      throw e;
    }
  }, []);

  // Profile image URLs (Supabase settings table)
  const updateProfileImage = useCallback(
    async (
      type: 'founder' | 'chairman' | 'logo',
      url: string
    ) => {
      setSettings(prev => ({
        ...prev,
        [`${type}ImageUrl`]: url,
      }) as AppSettings);

      try {
        if (!settingsRowId) return;

        const payload: Record<string, string> = {};
        if (type === 'logo')
          payload.logo_image_url = url;
        if (type === 'founder')
          payload.founder_image_url = url;
        if (type === 'chairman')
          payload.chairman_image_url = url;

        const { error } = await supabase
          .from('settings')
          .update(payload)
          .eq('id', settingsRowId);

        if (error) {
          console.error(
            'Supabase update error:',
            error
          );
          alert(
            'Failed to save image settings.'
          );
        }
      } catch (e) {
        console.error(e);
        alert(
          'Unexpected error while saving image settings.'
        );
      }
    },
    [settingsRowId]
  );

  const value: AppContextType = {
    bbsData,
    inquiries,
    settings,
    isAdmin,
    isSyncing,
    setIsAdmin,
    addBBSEntry,
    updateBBSEntry,
    deleteBBSEntry,
    addInquiry,
    deleteInquiry,
    updateSettings,
    updateAdminPassword,
    addRollingImage,
    updateRollingImage,
    deleteRollingImage,
    loadRollingImages,
    updateProfileImage,
  };

  return React.createElement(
    AppContext.Provider,
    { value },
    children
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error(
      'useApp must be used within AppProvider'
    );
  }
  return context;
};