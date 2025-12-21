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
  toggleSidebar: () => void;

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
    rollingImageInterval: 5000,
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
        const transformedData = data.map((item: any) => ({
          id: item.id,
          image_url: item.image_url,
          subtitle: item.subtitle || undefined,
          title: item.title || undefined,
          button_text: item.button_text || undefined,
          button_link: item.button_link || undefined,
          link_type: item.link_type || 'internal',
          display_order: item.display_order || 1,
        }));

        console.log('Loaded rolling images:', transformedData);

        setSettings(prev => ({
          ...prev,
          rollingImages: transformedData,
        }));
      }
    } catch (e) {
      console.error('Error loading rolling images:', e);
    }
  }, []);

  // Supabase에서 inquiries 로드
  const loadInquiries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load inquiries:', error);
        return;
      }

      if (data && data.length > 0) {
        setInquiries(data);
        console.log('Loaded inquiries from Supabase:', data.length);
      }
    } catch (e) {
      console.error('Error loading inquiries:', e);
    }
  }, []);

  // Supabase에서 admin password 로드
  const loadAdminPassword = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('setting_key', 'admin_password')
        .single();

      if (!error && data) {
        const password = data.setting_value?.password || 'password';
        setSettings(prev => ({ ...prev, adminPassword: password }));
        console.log('Loaded admin password from Supabase');
      }
    } catch (e) {
      console.error('Error loading admin password:', e);
    }
  }, []);

  // localStorage + Supabase settings 로드
  useEffect(() => {
    const loadFromStorageAndSupabase = async () => {
      try {
        const savedBbs = localStorage.getItem(STORAGE_KEYS.BBS);
        const savedAdmin = localStorage.getItem('kpii_is_admin');

        if (savedBbs) setBbsData(JSON.parse(savedBbs));
        if (savedAdmin) setIsAdminState(savedAdmin === 'true');

        // Supabase settings를 먼저 로드 (우선순위)
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

        // localStorage settings는 Supabase 이미지를 덮어쓰지 않도록 주의
        const savedSettings = localStorage.getItem(
          STORAGE_KEYS.SETTINGS
        );
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          const { logoImageUrl, founderImageUrl, chairmanImageUrl, adminPassword, ...otherSettings } = parsed;
          setSettings(prev => ({ ...prev, ...otherSettings }));
        }

        // Rolling images 로드
        await loadRollingImages();

        // Inquiries 로드 (Supabase 우선)
        await loadInquiries();

        // Admin password 로드
        await loadAdminPassword();

      } catch (e) {
        console.error('Data recovery failed', e);
      } finally {
        setTimeout(() => setIsInitialized(true), 50);
      }
    };

    loadFromStorageAndSupabase();
  }, [loadRollingImages, loadInquiries, loadAdminPassword]);

  // localStorage 저장 (비밀번호 제외)
  useEffect(() => {
    if (!isInitialized) return;

    try {
      localStorage.setItem(
        STORAGE_KEYS.BBS,
        JSON.stringify(bbsData)
      );
      
      // settings에서 adminPassword 제외하고 저장
      const { adminPassword, ...settingsToSave } = settings;
      localStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(settingsToSave)
      );
      
      // inquiries는 localStorage에 저장하지 않음 (Supabase만 사용)
    } catch (e) {
      console.warn(
        'Storage quota exceeded. Base64 images may be too large.',
        e
      );
    }
  }, [bbsData, settings, isInitialized]);

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

  // Inquiry (Supabase 동기화)
  const addInquiry = useCallback(async (inq: Inquiry) => {
    try {
      // Supabase에 저장
      const { error } = await supabase
        .from('inquiries')
        .insert([{
          id: inq.id,
          title: inq.title,
          content: inq.content,
          date: inq.date,
          status: inq.status,
        }]);

      if (error) {
        console.error('Failed to save inquiry to Supabase:', error);
        throw error;
      }

      // 로컬 state 업데이트
      setInquiries(prev => [inq, ...prev]);
      console.log('Inquiry saved to Supabase successfully');
    } catch (e) {
      console.error('Error adding inquiry:', e);
      alert('문의 저장에 실패했습니다. 다시 시도해주세요.');
    }
  }, []);

  const deleteInquiry = useCallback(async (id: string) => {
    try {
      // Supabase에서 삭제
      const { error } = await supabase
        .from('inquiries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete inquiry from Supabase:', error);
        throw error;
      }

      // 로컬 state 업데이트
      setInquiries(prev =>
        prev.filter(inq => inq.id !== id)
      );
      console.log('Inquiry deleted from Supabase successfully');
    } catch (e) {
      console.error('Error deleting inquiry:', e);
      alert('문의 삭제에 실패했습니다.');
    }
  }, []);

  // Settings
  const updateSettings = useCallback(
    (updates: Partial<AppSettings>) => {
      setSettings(prev => ({ ...prev, ...updates }));
    },
    []
  );

  const toggleSidebar = useCallback(() => {
    setSettings(prev => ({ ...prev, showSidebar: !prev.showSidebar }));
  }, []);

  const updateAdminPassword = useCallback(
    async (password: string) => {
      try {
        // Supabase에 저장
        const { error } = await supabase
          .from('admin_settings')
          .upsert({
            setting_key: 'admin_password',
            setting_value: { password },
          }, {
            onConflict: 'setting_key'
          });

        if (error) {
          console.error('Failed to save password to Supabase:', error);
          throw error;
        }

        // 로컬 state 업데이트
        setSettings(prev => ({
          ...prev,
          adminPassword: password,
        }));
        
        console.log('Admin password saved to Supabase successfully');
      } catch (e) {
        console.error('Error updating admin password:', e);
        alert('비밀번호 저장에 실패했습니다.');
      }
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
          const transformedData: RollingImage = {
            id: data.id,
            image_url: data.image_url,
            subtitle: data.subtitle || undefined,
            title: data.title || undefined,
            button_text: data.button_text || undefined,
            button_link: data.button_link || undefined,
            link_type: data.link_type,
            display_order: data.display_order,
          };

          setSettings(prev => ({
            ...prev,
            rollingImages: [...prev.rollingImages, transformedData],
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
    toggleSidebar,
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