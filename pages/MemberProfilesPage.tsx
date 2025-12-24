import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store';
import { MemberProfile, MemberRole } from '../types';
import { supabase } from '../supabaseClient';

// Supabase Storage 업로드 함수
function buildUploadPath(folder: string, file: File) {
  const original = file.name || 'image';
  const parts = original.split('.');
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : 'png';
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
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

export const MemberProfilesPage: React.FC = () => {
  const { memberProfiles, isAdmin, addMemberProfile, updateMemberProfile, deleteMemberProfile, updateMemberProfileOrder } = useApp();
  
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
  const [filter, setFilter] = useState<MemberRole | 'ALL'>('ALL');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberProfile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // 행별 레이아웃 설정 (최대 20행, 각 행당 최대 5개)
  const [rowLayout, setRowLayout] = useState<number[]>([5, 5, 5, 5]);
  const [isLayoutMode, setIsLayoutMode] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    org_position: '',
    company: '',
    company_position: '',
    image_url: '',
    category: MemberRole.TEAM_MEMBER,
    description: '',
    specialty: [] as string[],
    email: '',
    row_number: 1,
    display_order: 1,
  });

  const [specialtyInput, setSpecialtyInput] = useState('');

  // 필터링된 멤버
  const filteredMembers = useMemo(() => {
    if (filter === 'ALL') return memberProfiles;
    return memberProfiles.filter(m => m.category === filter);
  }, [filter, memberProfiles]);

  // 행별로 멤버 그룹화
  const memberRows = useMemo(() => {
    if (filter !== 'ALL') {
      return [filteredMembers];
    }
    
    const rows: MemberProfile[][] = [];
    
    rowLayout.forEach((count, rowIdx) => {
      const rowMembers = filteredMembers.filter(m => m.row_number === rowIdx + 1);
      if (rowMembers.length > 0) {
        rows.push(rowMembers.slice(0, count));
      }
    });
    
    const unassignedMembers = filteredMembers.filter(m => !m.row_number || m.row_number > rowLayout.length);
    if (unassignedMembers.length > 0) {
      for (let i = 0; i < unassignedMembers.length; i += 5) {
        rows.push(unassignedMembers.slice(i, i + 5));
      }
    }
    
    return rows;
  }, [filteredMembers, rowLayout, filter]);

  // 행 레이아웃 초기화
  useEffect(() => {
    if (memberProfiles.length > 0) {
      const maxRow = Math.max(...memberProfiles.map(m => m.row_number || 1));
      const initialLayout = Array(Math.min(maxRow, 20)).fill(5);
      setRowLayout(initialLayout);
    }
  }, [memberProfiles.length]);

  // 그리드 컬럼 클래스
  const getGridColsClass = (count: number) => {
    switch (count) {
      case 1: return 'grid-cols-1 max-w-[300px]';
      case 2: return 'grid-cols-2 max-w-[600px]';
      case 3: return 'grid-cols-3 max-w-[900px]';
      case 4: return 'grid-cols-4 max-w-[1200px]';
      case 5: return 'grid-cols-5 max-w-[1500px]';
      default: return 'grid-cols-5';
    }
  };

  // 모달 열기
  const openNewModal = () => {
    setEditingMember(null);
    setFormData({
      name: '',
      org_position: '',
      company: '',
      company_position: '',
      image_url: '',
      category: MemberRole.TEAM_MEMBER,
      description: '',
      specialty: [],
      email: '',
      row_number: 1,
      display_order: memberProfiles.length + 1,
    });
    setSpecialtyInput('');
    setShowAdminModal(true);
  };

  const openEditModal = (member: MemberProfile) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      org_position: member.org_position,
      company: member.company,
      company_position: member.company_position,
      image_url: member.image_url,
      category: member.category as MemberRole,
      description: member.description,
      specialty: member.specialty || [],
      email: member.email,
      row_number: member.row_number,
      display_order: member.display_order,
    });
    setSpecialtyInput('');
    setShowAdminModal(true);
  };

  // 이미지 업로드
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const url = await uploadToSupabase('member_profiles', file);
      setFormData(prev => ({ ...prev, image_url: url }));
      alert('이미지가 업로드되었습니다.');
    } catch (err) {
      console.error('Image upload error:', err);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  // 전문분야 추가
  const addSpecialty = () => {
    if (specialtyInput.trim() && formData.specialty.length < 5) {
      setFormData(prev => ({
        ...prev,
        specialty: [...prev.specialty, specialtyInput.trim()]
      }));
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specialty: prev.specialty.filter((_, i) => i !== index)
    }));
  };

  // 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.company || !formData.image_url) {
      return alert('이름, 소속, 이미지는 필수입니다.');
    }

    try {
      if (editingMember) {
        await updateMemberProfile({
          ...editingMember,
          ...formData,
        });
        alert('프로필이 수정되었습니다.');
      } else {
        await addMemberProfile(formData);
        alert('프로필이 추가되었습니다.');
      }
      setShowAdminModal(false);
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  // 삭제
  const handleDelete = async (id: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteMemberProfile(id);
      alert('프로필이 삭제되었습니다.');
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // 행 레이아웃 변경
  const updateRowConfig = (rowIndex: number, newCount: number) => {
    const newLayout = [...rowLayout];
    while (newLayout.length <= rowIndex) newLayout.push(5);
    newLayout[rowIndex] = newCount;
    setRowLayout(newLayout);
  };

  const addRow = () => {
    if (rowLayout.length >= 20) {
      alert('최대 20개 행까지만 추가할 수 있습니다.');
      return;
    }
    setRowLayout([...rowLayout, 5]);
  };

  const removeRow = (idx: number) => {
    if (rowLayout.length <= 1) {
      alert('최소 1개 행은 유지해야 합니다.');
      return;
    }
    const newLayout = rowLayout.filter((_, i) => i !== idx);
    setRowLayout(newLayout);
  };

  // 레이아웃 저장
  const saveLayout = async () => {
    try {
      const updatedProfiles: MemberProfile[] = [];
      let globalOrder = 1;
      
      rowLayout.forEach((count, rowIdx) => {
        const rowMembers = memberProfiles.filter(m => m.row_number === rowIdx + 1);
        rowMembers.slice(0, count).forEach((member) => {
          updatedProfiles.push({
            ...member,
            row_number: rowIdx + 1,
            display_order: globalOrder++
          });
        });
      });

      await updateMemberProfileOrder(updatedProfiles);
      setIsLayoutMode(false);
      alert('레이아웃이 저장되었습니다.');
    } catch (err) {
      console.error('Layout save error:', err);
      alert('레이아웃 저장에 실패했습니다.');
    }
  };

  // Part 1에서 계속...

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-slate-900 text-white pt-24 pb-20 px-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px]"></div>
          </div>
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter italic uppercase">Member Directory</h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
              대한민국 특허 정보 산업을 이끄는 주역들을 소개합니다.<br/>
              KPIIOR의 핵심 멤버십을 확인해보세요.
            </p>
          </div>
        </section>

        {/* Categories / Filters */}
        <nav className="bg-white border-b border-gray-200 sticky top-16 z-30 shadow-sm backdrop-blur-md bg-white/90">
          <div className="max-w-7xl mx-auto px-4 overflow-x-auto">
            <div className="flex items-center justify-between py-4 min-w-max">
              <div className="flex items-center space-x-1">
                {[
                  { label: '전체보기', value: 'ALL' },
                  { label: '이사진', value: MemberRole.BOARD },
                  { label: '부분장', value: MemberRole.DIVISION_HEAD },
                  { label: '팀장', value: MemberRole.TEAM_LEADER },
                  { label: '팀원', value: MemberRole.TEAM_MEMBER }
                ].map((item) => (
                  <button 
                    key={item.value}
                    onClick={() => setFilter(item.value as any)}
                    className={`px-6 py-2.5 rounded-full text-sm font-black transition-all duration-300 ${
                      filter === item.value 
                      ? 'bg-blue-700 text-white shadow-xl scale-105' 
                      : 'text-slate-400 hover:bg-slate-50 hover:text-blue-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {isAdmin && (
                <div className="flex items-center space-x-4 ml-8">
                  <button 
                    onClick={openNewModal}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white shadow-lg font-bold text-sm hover:bg-blue-600 transition-all"
                  >
                    <i className="fas fa-plus"></i>
                    <span>신규 등록</span>
                  </button>
                  <button 
                    onClick={() => setIsLayoutMode(!isLayoutMode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm ${
                      isLayoutMode ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    <i className="fas fa-grip-horizontal"></i>
                    <span>{isLayoutMode ? '레이아웃 모드 ON' : '레이아웃 설정'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Admin Row Layout Panel */}
        {isAdmin && isLayoutMode && filter === 'ALL' && (
          <div className="bg-orange-50 border-b border-orange-100 py-8 animate-in slide-in-from-top duration-300">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-orange-900 font-black uppercase tracking-widest text-lg">줄별 레이아웃 설정</h3>
                <div className="flex gap-3">
                  <button 
                    onClick={addRow}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-orange-700 transition-all flex items-center gap-2"
                  >
                    <i className="fas fa-plus"></i>
                    줄 추가
                  </button>
                  <button 
                    onClick={saveLayout}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-green-700 transition-all flex items-center gap-2"
                  >
                    <i className="fas fa-check"></i>
                    저장
                  </button>
                  <button 
                    onClick={() => setIsLayoutMode(false)}
                    className="bg-slate-400 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-slate-500 transition-all"
                  >
                    취소
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rowLayout.map((count, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-orange-200 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Row {idx + 1}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(num => (
                          <button
                            key={num}
                            onClick={() => updateRowConfig(idx, num)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                              count === num ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-orange-100'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={() => removeRow(idx)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-orange-600 mt-4 text-center">
                * 최대 20개 행까지, 각 행당 최대 5개 프로필까지 설정 가능합니다.
              </p>
            </div>
          </div>
        )}

        {/* Members Layout */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto flex flex-col items-center gap-12">
            {memberRows.length > 0 && memberRows.some(row => row.length > 0) ? (
              memberRows.map((row, rowIdx) => (
                row.length > 0 && (
                  <div 
                    key={rowIdx} 
                    className={`grid gap-8 justify-center w-full ${getGridColsClass(row.length)}`}
                  >
                    {row.map(member => (
                      <div
                        key={member.id}
                        onClick={() => setSelectedMember(member)}
                        className="group flex flex-col items-center p-8 bg-white rounded-3xl border border-gray-100 cursor-pointer transition-all duration-500 hover:shadow-2xl hover:border-blue-300 hover:-translate-y-2 w-full max-w-[280px]"
                      >
                        <div className="relative mb-6">
                          <div className="w-44 h-44 rounded-full overflow-hidden border-8 border-white shadow-xl group-hover:border-blue-50 transition-all duration-500 ring-1 ring-gray-100">
                            <img 
                              src={member.image_url} 
                              alt={member.name} 
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                          </div>
                          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
                            <span className={`px-4 py-1 text-xs font-bold rounded-full text-white shadow-lg ring-4 ring-white ${
                              member.category === '이사진' ? 'bg-blue-600' : 
                              member.category === '부분장' ? 'bg-indigo-600' : 
                              member.category === '팀장' ? 'bg-teal-600' : 'bg-slate-500'
                            }`}>
                              {member.category}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-center w-full mt-2">
                          <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">{member.name}</h3>
                          <p className="text-blue-600 font-bold text-sm mb-4 tracking-tight">{member.org_position}</p>
                          
                          <div className="pt-4 border-t border-gray-50 flex flex-col items-center">
                            <p className="text-gray-500 text-xs font-semibold truncate max-w-full mb-1" title={member.company}>{member.company}</p>
                            <p className="text-gray-400 text-[11px] truncate max-w-full">{member.company_position}</p>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditModal(member); }}
                              className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600"
                            >
                              수정
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(member.id); }}
                              className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600"
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ))
            ) : (
              <div className="w-full text-center py-32 bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
                <p className="text-slate-300 font-black text-2xl uppercase tracking-tighter">No members found</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Part 2에서 계속... */}

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
          <div 
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-md transition-opacity" 
            onClick={() => setSelectedMember(null)} 
          />
          
          <div className="relative bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col md:flex-row max-h-[90vh]">
            <button 
              onClick={() => setSelectedMember(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 z-20 p-2 hover:bg-gray-100 rounded-full transition-all"
            >
              <i className="fas fa-times text-2xl"></i>
            </button>

            <div className="md:w-5/12 bg-gray-100 flex items-center justify-center overflow-hidden">
              <img 
                src={selectedMember.image_url} 
                alt={selectedMember.name} 
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="md:w-7/12 p-10 md:p-14 overflow-y-auto">
              <div className="mb-8">
                <span className="inline-block px-4 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-black mb-4 uppercase tracking-widest border border-blue-100">
                  {selectedMember.category}
                </span>
                <div className="flex items-baseline space-x-3">
                  <h2 className="text-5xl font-black text-gray-900 tracking-tighter">{selectedMember.name}</h2>
                  <span className="text-2xl text-blue-600 font-bold opacity-80">{selectedMember.org_position}</span>
                </div>
              </div>
              
              <div className="space-y-8">
                <div>
                  <h4 className="text-xs font-black text-blue-900/30 uppercase tracking-[0.2em] mb-3">소속 및 직함</h4>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-xl font-bold text-slate-800 mb-1">{selectedMember.company}</p>
                    <p className="text-slate-500 font-medium">{selectedMember.company_position}</p>
                  </div>
                </div>
                
                {selectedMember.specialty && selectedMember.specialty.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-blue-900/30 uppercase tracking-[0.2em] mb-3">주요 전문 분야</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedMember.specialty.map((s, idx) => (
                        <span key={idx} className="bg-white text-slate-700 px-4 py-1.5 rounded-full text-sm font-bold border border-slate-200 shadow-sm">
                          # {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedMember.description && (
                  <div>
                    <h4 className="text-xs font-black text-blue-900/30 uppercase tracking-[0.2em] mb-3">상세 소개</h4>
                    <p className="text-slate-600 leading-relaxed text-lg font-medium">
                      {selectedMember.description}
                    </p>
                  </div>
                )}

                {selectedMember.email && (
                  <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-blue-900/30 uppercase tracking-[0.2em] mb-1">문의 이메일</h4>
                      <p className="text-blue-600 font-bold hover:underline cursor-pointer text-lg">{selectedMember.email}</p>
                    </div>
                    <button className="bg-blue-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-lg text-sm">
                      메시지 보내기
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Modal */}
      {showAdminModal && isAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAdminModal(false)}></div>
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl relative z-10 p-10 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
              <i className={`fas ${editingMember ? 'fa-pen-to-square text-blue-500' : 'fa-plus-circle text-kpia-orange'}`}></i>
              정회원 프로필 {editingMember ? '수정' : '신규 등록'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">이름 *</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-gray-100 rounded-xl font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">협회 직책</label>
                  <input 
                    type="text" 
                    value={formData.org_position}
                    onChange={(e) => setFormData({...formData, org_position: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-gray-100 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">소속 회사 *</label>
                  <input 
                    type="text" 
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-gray-100 rounded-xl font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">회사 직책</label>
                  <input 
                    type="text" 
                    value={formData.company_position}
                    onChange={(e) => setFormData({...formData, company_position: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-gray-100 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  프로필 이미지 * {isUploading && <span className="text-orange-500">(업로드 중...)</span>}
                </label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="w-full p-3 bg-slate-50 border border-gray-100 rounded-xl text-sm"
                />
                {formData.image_url && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl flex items-center gap-3">
                    <img src={formData.image_url} className="w-16 h-16 rounded-full object-cover" alt="Preview" />
                    <span className="text-xs text-green-600 font-bold">✓ 이미지 업로드 완료</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">카테고리</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value as MemberRole})}
                  className="w-full p-3 bg-slate-50 border border-gray-100 rounded-xl font-bold"
                >
                  <option value={MemberRole.BOARD}>이사진</option>
                  <option value={MemberRole.DIVISION_HEAD}>부분장</option>
                  <option value={MemberRole.TEAM_LEADER}>팀장</option>
                  <option value={MemberRole.TEAM_MEMBER}>팀원</option>
                  <option value={MemberRole.EXECUTIVE}>상임이사</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">이메일</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-gray-100 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">전문 분야 (최대 5개)</label>
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text" 
                    value={specialtyInput}
                    onChange={(e) => setSpecialtyInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                    className="flex-1 p-3 bg-slate-50 border border-gray-100 rounded-xl font-bold"
                    placeholder="전문분야 입력 후 Enter"
                  />
                  <button 
                    type="button"
                    onClick={addSpecialty}
                    className="px-4 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600"
                  >
                    추가
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.specialty.map((s, idx) => (
                    <span key={idx} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                      {s}
                      <button type="button" onClick={() => removeSpecialty(idx)} className="text-blue-400 hover:text-blue-600">
                        <i className="fas fa-times text-xs"></i>
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">상세 소개</label>
                <textarea 
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-gray-100 rounded-xl font-medium"
                  placeholder="회원에 대한 상세 소개를 입력하세요"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">행 번호 (1-20)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="20"
                    value={formData.row_number}
                    onChange={(e) => setFormData({...formData, row_number: parseInt(e.target.value)})}
                    className="w-full p-3 bg-slate-50 border border-gray-100 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">표시 순서</label>
                  <input 
                    type="number" 
                    min="1"
                    value={formData.display_order}
                    onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value)})}
                    className="w-full p-3 bg-slate-50 border border-gray-100 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAdminModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all"
                >
                  취소
                </button>
                <button 
                  type="submit" 
                  disabled={isUploading}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all shadow-xl disabled:bg-slate-400"
                >
                  {editingMember ? '수정 완료' : '등록 하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};