import React, { useState } from 'react';
import { useApp } from '../store';
import { MenuType, BBSEntry, Inquiry, RollingImage } from '../types';
import { supabase } from '../supabaseClient';
import { MENUS } from '../constants';

function buildUploadPath(folder: string, file: File) {
  const original = file.name || 'image';
  const parts = original.split('.');
  const ext =
    parts.length > 1 ? parts.pop()!.toLowerCase() : 'png';
  const fileName =
    `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  return `${folder}/${fileName}`;
}

async function uploadToSupabase(folder: string, file: File) {
  const path = buildUploadPath(folder, file);

  const { data, error } = await supabase.storage
    .from('images')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error || !data) {
    console.error('Supabase upload error:', error);
    throw new Error('Failed to upload image to Supabase.');
  }

  const { data: publicData } = supabase.storage
    .from('images')
    .getPublicUrl(path);

  const publicUrl = publicData?.publicUrl;
  if (!publicUrl) {
    throw new Error('Failed to get public URL from Supabase.');
  }

  return publicUrl;
}

export const AdminPanel: React.FC = () => {
  const {
    isAdmin,
    setIsAdmin,
    addBBSEntry,
    updateBBSEntry,
    deleteBBSEntry,
    updateProfileImage,
    settings,
    updateAdminPassword,
    bbsData,
    inquiries,
    deleteInquiry,
    addRollingImage,
    updateRollingImage,
    deleteRollingImage,
  } = useApp();

  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedInquiry, setSelectedInquiry] =
    useState<Inquiry | null>(null);

  // BBS states
  const [editingId, setEditingId] = useState<string | null>(
    null
  );
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] =
    useState<MenuType>('공지사항');
  const [newContent, setNewContent] = useState('');
  const [newBbsImageUrl, setNewBbsImageUrl] =
    useState<string>('');

  // Rolling Image states
  const [editingRollingId, setEditingRollingId] = useState<number | null>(null);
  const [rollingFormData, setRollingFormData] = useState<Partial<RollingImage>>({
    image_url: '',
    subtitle: '',
    title: '',
    button_text: '',
    button_link: '',
    link_type: 'internal',
    display_order: 1,
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pass === (settings.adminPassword || 'password')) {
      setIsAdmin(true);
      setError('');
    } else {
      setError('비밀번호가 올바르지 않습니다.');
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      alert('비밀번호는 4자리 이상이어야 합니다.');
      return;
    }
    updateAdminPassword(newPassword);
    setNewPassword('');
    alert('비밀번호가 성공적으로 변경되었습니다.');
  };

  const handleRollingImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadToSupabase('rolling', file);
      setRollingFormData(prev => ({ ...prev, image_url: url }));
      alert('이미지가 업로드되었습니다.');
    } catch (err) {
      console.error(err);
      alert('이미지 업로드에 실패했습니다.');
    }
  };

  const handleSaveRollingImage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rollingFormData.image_url || !rollingFormData.subtitle || !rollingFormData.title || 
        !rollingFormData.button_text || !rollingFormData.button_link) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      if (editingRollingId !== null) {
        // Update existing
        await updateRollingImage({
          id: editingRollingId,
          image_url: rollingFormData.image_url!,
          subtitle: rollingFormData.subtitle!,
          title: rollingFormData.title!,
          button_text: rollingFormData.button_text!,
          button_link: rollingFormData.button_link!,
          link_type: rollingFormData.link_type!,
          display_order: rollingFormData.display_order!,
        });
        alert('롤링이미지가 수정되었습니다.');
      } else {
        // Add new
        await addRollingImage({
          image_url: rollingFormData.image_url!,
          subtitle: rollingFormData.subtitle!,
          title: rollingFormData.title!,
          button_text: rollingFormData.button_text!,
          button_link: rollingFormData.button_link!,
          link_type: rollingFormData.link_type!,
          display_order: rollingFormData.display_order!,
        });
        alert('롤링이미지가 추가되었습니다.');
      }
      
      // Reset form
      setEditingRollingId(null);
      setRollingFormData({
        image_url: '',
        subtitle: '',
        title: '',
        button_text: '',
        button_link: '',
        link_type: 'internal',
        display_order: settings.rollingImages.length + 1,
      });
    } catch (err) {
      console.error(err);
      alert('저장에 실패했습니다.');
    }
  };

  const handleEditRollingImage = (image: RollingImage) => {
    setEditingRollingId(image.id);
    setRollingFormData({
      image_url: image.image_url,
      subtitle: image.subtitle,
      title: image.title,
      button_text: image.button_text,
      button_link: image.button_link,
      link_type: image.link_type,
      display_order: image.display_order,
    });
  };

  const handleDeleteRollingImage = async (id: number) => {
    if (!confirm('이 롤링이미지를 삭제하시겠습니까?')) return;
    
    try {
      await deleteRollingImage(id);
      alert('롤링이미지가 삭제되었습니다.');
    } catch (err) {
      console.error(err);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleLogoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadToSupabase('logo', file);
      await updateProfileImage('logo', url);
      alert('로고가 성공적으로 업데이트되었습니다.');
    } catch (err) {
      console.error(err);
      alert(
        'Failed to upload logo image. Please try again.'
      );
    }
  };

  const handleProfileImageUpload = async (
    type: 'founder' | 'chairman',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const folder =
      type === 'founder' ? 'founder' : 'chairman';

    try {
      const url = await uploadToSupabase(folder, file);
      await updateProfileImage(type, url);
      alert(
        `${type === 'founder' ? '설립자' : '회장'} 이미지가 성공적으로 업데이트되었습니다.`
      );
    } catch (err) {
      console.error(err);
      alert(
        'Failed to upload profile image. Please try again.'
      );
    }
  };

  const handlePostBBS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    const entry: BBSEntry = {
      id: editingId || Date.now().toString(),
      category: newCategory,
      title: newTitle,
      content: newContent,
      author: '관리자',
      date: editingId
        ? bbsData.find(b => b.id === editingId)?.date ||
          new Date().toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      imageUrl: newBbsImageUrl,
    };

    if (editingId) {
      updateBBSEntry(entry);
      setEditingId(null);
    } else {
      addBBSEntry(entry);
    }
    setNewTitle('');
    setNewContent('');
    setNewBbsImageUrl('');
    alert('게시글이 성공적으로 저장되었습니다.');
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-[40px] shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-20 h-20 bg-kpia-orange text-white rounded-[24px] flex items-center justify-center text-3xl mb-6 shadow-2xl shadow-orange-100">
            <i className="fas fa-lock" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Admin Login
          </h2>
          <p className="text-slate-400 text-sm font-medium mt-1 uppercase tracking-widest">
            Authorized Personnel Only
          </p>
        </div>
        <form
          onSubmit={handleLogin}
          className="space-y-6"
        >
          <input
            type="password"
            value={pass}
            onChange={e => setPass(e.target.value)}
            className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-50 transition-all outline-none font-bold"
            placeholder="관리자 비밀번호"
          />
          {error && (
            <p className="text-red-500 text-xs font-bold bg-red-50 p-4 rounded-xl border border-red-100">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full bg-slate-900 text-white py-5 rounded-[20px] font-black text-lg shadow-2xl hover:bg-black transition-all"
          >
            Sign In
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end border-b-2 border-kpia-orange pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">
            관리자 센터
          </h2>
          <p className="text-slate-400 font-medium mt-1">
            사이트 설정 및 문의 관리
          </p>
        </div>
        <button
          onClick={() => setIsAdmin(false)}
          className="bg-slate-100 hover:bg-slate-200 px-8 py-3 rounded-xl text-sm font-black text-slate-600 transition-colors"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Inbox Section */}
        <section className="lg:col-span-2 bg-white p-10 rounded-[40px] shadow-2xl border border-gray-100">
          <div className="flex items-center mb-8">
            <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center mr-4 shadow-lg">
              <i className="fas fa-inbox" />
            </div>
            <h3 className="text-xl font-black">
              고객 문의함 (Inbox)
            </h3>
          </div>

          <div className="space-y-4">
            {inquiries.length > 0 ? (
              inquiries.map(iq => (
                <div
                  key={iq.id}
                  className="group p-6 bg-slate-50 hover:bg-white border border-slate-100 hover:border-indigo-200 rounded-3xl transition-all cursor-pointer"
                  onClick={() => setSelectedInquiry(iq)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {iq.title}
                    </h4>
                    <span className="text-[10px] font-black text-slate-300 uppercase">
                      {iq.date}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">
                    {iq.content}
                  </p>
                </div>
              ))
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[32px] text-slate-300 font-bold italic">
                접수된 문의 내역이 없습니다.
              </div>
            )}
          </div>
        </section>

        {/* Global Settings */}
        <section className="bg-white p-10 rounded-[40px] shadow-2xl border border-gray-100 space-y-8">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center mr-4 shadow-lg">
              <i className="fas fa-cog" />
            </div>
            <h3 className="text-xl font-black">
              시스템 설정
            </h3>
          </div>

          <div className="space-y-6">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">
                Logo Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="text-xs w-full"
              />
              <div className="mt-3 h-10 flex items-center bg-white p-2 rounded-lg border border-gray-100">
                <img
                  src={settings.logoImageUrl}
                  className="h-full object-contain mx-auto"
                  alt="Logo"
                />
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">
                Founder Profile Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={e =>
                  handleProfileImageUpload('founder', e)
                }
                className="text-xs w-full"
              />
              <div className="mt-3 h-10 flex items-center bg-white p-2 rounded-lg border border-gray-100">
                <img
                  src={settings.founderImageUrl}
                  className="h-full object-contain mx-auto"
                  alt="Founder"
                />
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">
                Chairman Profile Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={e =>
                  handleProfileImageUpload('chairman', e)
                }
                className="text-xs w-full"
              />
              <div className="mt-3 h-10 flex items-center bg-white p-2 rounded-lg border border-gray-100">
                <img
                  src={settings.chairmanImageUrl}
                  className="h-full object-contain mx-auto"
                  alt="Chairman"
                />
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">
                Admin Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e =>
                  setNewPassword(e.target.value)
                }
                className="w-full p-3 border border-gray-200 rounded-xl mb-3 text-sm"
                placeholder="새 비밀번호"
              />
              <button
                onClick={handlePasswordChange}
                className="w-full bg-red-500 text-white py-2.5 rounded-xl text-xs font-black"
              >
                Change Password
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Rolling Images Management Section */}
      <section className="bg-white p-10 rounded-[40px] shadow-2xl border border-gray-100">
        <div className="flex items-center mb-8">
          <div className="w-10 h-10 bg-kpia-orange text-white rounded-xl flex items-center justify-center mr-4 shadow-lg">
            <i className="fas fa-images" />
          </div>
          <h3 className="text-xl font-black">
            메인 롤링 이미지 관리
          </h3>
        </div>

        {/* Rolling Images List */}
        <div className="space-y-4 mb-8">
          {settings.rollingImages.map((img) => (
            <div key={img.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-6">
              <img src={img.image_url} alt={img.title} className="w-32 h-20 object-cover rounded-2xl" />
              <div className="flex-1">
                <h4 className="font-black text-slate-800 mb-1">{img.title}</h4>
                <p className="text-xs text-slate-400">{img.subtitle}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] bg-slate-200 px-2 py-1 rounded font-bold">
                    순서: {img.display_order}
                  </span>
                  <span className="text-[10px] bg-slate-200 px-2 py-1 rounded font-bold">
                    {img.link_type === 'internal' ? '내부링크' : '외부링크'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditRollingImage(img)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-black hover:bg-blue-600"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDeleteRollingImage(img.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-black hover:bg-red-600"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Rolling Image Form */}
        <form onSubmit={handleSaveRollingImage} className="p-8 bg-gradient-to-br from-orange-50 to-slate-50 rounded-3xl border-2 border-kpia-orange/20">
          <h4 className="text-lg font-black text-slate-800 mb-6">
            {editingRollingId !== null ? '롤링이미지 수정' : '새 롤링이미지 추가'}
          </h4>
          
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-600 mb-2">이미지 업로드</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleRollingImageUpload}
                className="w-full text-sm"
              />
              {rollingFormData.image_url && (
                <img src={rollingFormData.image_url} alt="Preview" className="mt-3 w-full h-32 object-cover rounded-xl" />
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 mb-2">부제목 (Subtitle)</label>
              <input
                type="text"
                value={rollingFormData.subtitle || ''}
                onChange={e => setRollingFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm"
                placeholder="Better Process, Better Innovation"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 mb-2">제목 (Title)</label>
              <textarea
                value={rollingFormData.title || ''}
                onChange={e => setRollingFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm"
                placeholder="Revolutionize Your&#10;Business Future"
                rows={2}
              />
              <p className="text-[10px] text-slate-400 mt-1">줄바꿈을 원하면 Enter를 입력하세요</p>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 mb-2">버튼 텍스트</label>
              <input
                type="text"
                value={rollingFormData.button_text || ''}
                onChange={e => setRollingFormData(prev => ({ ...prev, button_text: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm"
                placeholder="Learn More"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 mb-2">링크 타입</label>
              <select
                value={rollingFormData.link_type || 'internal'}
                onChange={e => setRollingFormData(prev => ({ ...prev, link_type: e.target.value as 'internal' | 'external' }))}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm font-bold"
              >
                <option value="internal">내부 페이지</option>
                <option value="external">외부 링크</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 mb-2">
                {rollingFormData.link_type === 'internal' ? '이동할 페이지' : '외부 URL'}
              </label>
              {rollingFormData.link_type === 'internal' ? (
                <select
                  value={rollingFormData.button_link || ''}
                  onChange={e => setRollingFormData(prev => ({ ...prev, button_link: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm font-bold"
                >
                  <option value="">페이지 선택</option>
                  {MENUS.map(menu => (
                    <option key={menu} value={menu}>{menu}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="url"
                  value={rollingFormData.button_link || ''}
                  onChange={e => setRollingFormData(prev => ({ ...prev, button_link: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm"
                  placeholder="https://example.com"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 mb-2">표시 순서</label>
              <input
                type="number"
                value={rollingFormData.display_order || 1}
                onChange={e => setRollingFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm"
                min="1"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-kpia-orange text-white py-4 rounded-2xl font-black text-sm hover:bg-orange-600 transition-all"
              >
                {editingRollingId !== null ? '수정 완료' : '추가하기'}
              </button>
              {editingRollingId !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRollingId(null);
                    setRollingFormData({
                      image_url: '',
                      subtitle: '',
                      title: '',
                      button_text: '',
                      button_link: '',
                      link_type: 'internal',
                      display_order: settings.rollingImages.length + 1,
                    });
                  }}
                  className="px-8 bg-slate-200 text-slate-600 py-4 rounded-2xl font-black text-sm hover:bg-slate-300 transition-all"
                >
                  취소
                </button>
              )}
            </div>
          </div>
        </form>
      </section>

      {/* Inquiry Detail Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedInquiry(null)}
          />
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl relative z-10 p-10 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">
                  Customer Inquiry
                </p>
                <h3 className="text-2xl font-black text-slate-800">
                  {selectedInquiry.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedInquiry.date}
                </p>
              </div>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="text-slate-300 hover:text-slate-600 transition-colors"
              >
                <i className="fas fa-times text-xl" />
              </button>
            </div>

            <div className="bg-slate-50 p-8 rounded-3xl text-slate-600 font-medium leading-loose whitespace-pre-wrap mb-8 max-h-80 overflow-y-auto">
              {selectedInquiry.content}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  deleteInquiry(selectedInquiry.id);
                  setSelectedInquiry(null);
                }}
                className="flex-1 py-4 bg-red-50 text-red-500 rounded-2xl font-black hover:bg-red-500 hover:text-white transition-all"
              >
                삭제하기
              </button>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black"
              >
                확인 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};