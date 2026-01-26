"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Upload,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  File,
  FileText,
  FileImage,
  FileAudio,
  FileVideo,
  Folder,
  Plus,
  Share,
  Star,
  Clock,
  User,
  Tag,
  Grid,
  List,
  SortAsc,
  SortDesc,
  BookOpen,
  Users
} from "lucide-react";

interface StudyMaterial {
  id: string;
  title: string;
  description?: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: 'pdf' | 'doc' | 'docx' | 'ppt' | 'pptx' | 'image' | 'audio' | 'video' | 'other';
  category: string;
  tags: string[];
  level: 'beginner' | 'intermediate' | 'advanced';
  is_public: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
  uploader_name: string;
  is_favorite: boolean;
}

interface MaterialCategory {
  id: string;
  name: string;
  count: number;
  color: string;
}

const materialCategories: MaterialCategory[] = [
  { id: 'textbook', name: '교과서', count: 12, color: 'bg-blue-500' },
  { id: 'worksheet', name: '워크시트', count: 8, color: 'bg-green-500' },
  { id: 'audio', name: '오디오', count: 15, color: 'bg-purple-500' },
  { id: 'video', name: '비디오', count: 6, color: 'bg-red-500' },
  { id: 'grammar', name: '문법', count: 10, color: 'bg-yellow-500' },
  { id: 'vocabulary', name: '어휘', count: 14, color: 'bg-indigo-500' },
  { id: 'speaking', name: '회화', count: 9, color: 'bg-pink-500' },
  { id: 'reading', name: '독해', count: 7, color: 'bg-teal-500' }
];

const fileTypeIcons = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  ppt: FileText,
  pptx: FileText,
  image: FileImage,
  audio: FileAudio,
  video: FileVideo,
  other: File
};

export default function MaterialsContent() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'downloads'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'textbook',
    level: 'intermediate' as StudyMaterial['level'],
    tags: [] as string[],
    is_public: true,
    file: null as File | null
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 더미 학습 자료 데이터 (실제로는 study_materials 테이블에서 가져옴)
      const dummyMaterials: StudyMaterial[] = [
        {
          id: '1',
          title: 'English Grammar Basics - Chapter 1',
          description: '영어 기초 문법 교재입니다. 현재시제와 과거시제를 다룹니다.',
          file_name: 'grammar_chapter1.pdf',
          file_url: '/materials/grammar_chapter1.pdf',
          file_size: 2048000,
          file_type: 'pdf',
          category: 'grammar',
          tags: ['문법', '기초', '시제'],
          level: 'beginner',
          is_public: true,
          download_count: 45,
          created_at: '2026-01-05T10:00:00Z',
          updated_at: '2026-01-05T10:00:00Z',
          uploader_name: '김선생님',
          is_favorite: true
        },
        {
          id: '2',
          title: 'Daily Conversation Practice',
          description: '일상 대화 연습용 오디오 파일입니다.',
          file_name: 'daily_conversation.mp3',
          file_url: '/materials/daily_conversation.mp3',
          file_size: 5120000,
          file_type: 'audio',
          category: 'speaking',
          tags: ['회화', '일상대화', '연습'],
          level: 'intermediate',
          is_public: true,
          download_count: 32,
          created_at: '2026-01-04T14:30:00Z',
          updated_at: '2026-01-04T14:30:00Z',
          uploader_name: '박선생님',
          is_favorite: false
        },
        {
          id: '3',
          title: 'Vocabulary Building Worksheet',
          description: '어휘력 향상을 위한 워크시트입니다.',
          file_name: 'vocabulary_worksheet.docx',
          file_url: '/materials/vocabulary_worksheet.docx',
          file_size: 512000,
          file_type: 'docx',
          category: 'vocabulary',
          tags: ['어휘', '워크시트', '연습'],
          level: 'intermediate',
          is_public: false,
          download_count: 18,
          created_at: '2026-01-03T09:15:00Z',
          updated_at: '2026-01-03T09:15:00Z',
          uploader_name: '이선생님',
          is_favorite: true
        },
        {
          id: '4',
          title: 'Advanced Reading Comprehension',
          description: '고급 독해 연습 자료입니다.',
          file_name: 'advanced_reading.pdf',
          file_url: '/materials/advanced_reading.pdf',
          file_size: 3072000,
          file_type: 'pdf',
          category: 'reading',
          tags: ['독해', '고급', '연습'],
          level: 'advanced',
          is_public: true,
          download_count: 67,
          created_at: '2026-01-02T16:45:00Z',
          updated_at: '2026-01-02T16:45:00Z',
          uploader_name: '최선생님',
          is_favorite: false
        },
        {
          id: '5',
          title: 'Pronunciation Training Video',
          description: '발음 훈련 비디오 강의입니다.',
          file_name: 'pronunciation_training.mp4',
          file_url: '/materials/pronunciation_training.mp4',
          file_size: 25600000,
          file_type: 'video',
          category: 'speaking',
          tags: ['발음', '훈련', '비디오'],
          level: 'beginner',
          is_public: true,
          download_count: 89,
          created_at: '2026-01-01T11:20:00Z',
          updated_at: '2026-01-01T11:20:00Z',
          uploader_name: '김선생님',
          is_favorite: true
        }
      ];

      setMaterials(dummyMaterials);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadForm.file || !uploadForm.title.trim()) return;

    try {
      setUploadProgress(0);
      
      // 실제로는 Supabase Storage에 업로드
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      
      // 시뮬레이션을 위한 진행률 업데이트
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // 업로드 완료 시뮬레이션
      setTimeout(() => {
        setUploadProgress(100);
        
        const newMaterial: StudyMaterial = {
          id: Math.random().toString(),
          title: uploadForm.title,
          description: uploadForm.description,
          file_name: uploadForm.file!.name,
          file_url: `/materials/${uploadForm.file!.name}`,
          file_size: uploadForm.file!.size,
          file_type: getFileType(uploadForm.file!.name),
          category: uploadForm.category,
          tags: uploadForm.tags,
          level: uploadForm.level,
          is_public: uploadForm.is_public,
          download_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          uploader_name: '나',
          is_favorite: false
        };

        setMaterials(prev => [newMaterial, ...prev]);
        setShowUploadModal(false);
        resetUploadForm();
        clearInterval(interval);
      }, 2000);
      
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const getFileType = (fileName: string): StudyMaterial['file_type'] => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'pdf';
      case 'doc':
      case 'docx': return 'docx';
      case 'ppt':
      case 'pptx': return 'pptx';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'image';
      case 'mp3':
      case 'wav': return 'audio';
      case 'mp4':
      case 'mov': return 'video';
      default: return 'other';
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      title: '',
      description: '',
      category: 'textbook',
      level: 'intermediate',
      tags: [],
      is_public: true,
      file: null
    });
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadForm(prev => ({ ...prev, file }));
      if (!uploadForm.title) {
        setUploadForm(prev => ({ ...prev, title: file.name.split('.')[0] }));
      }
    }
  };

  const toggleFavorite = (materialId: string) => {
    setMaterials(prev => 
      prev.map(material => 
        material.id === materialId 
          ? { ...material, is_favorite: !material.is_favorite }
          : material
      )
    );
  };

  const deleteMaterial = (materialId: string) => {
    setMaterials(prev => prev.filter(material => material.id !== materialId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const addTag = (tag: string) => {
    if (tag && !uploadForm.tags.includes(tag)) {
      setUploadForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setUploadForm(prev => ({ 
      ...prev, 
      tags: prev.tags.filter(tag => tag !== tagToRemove) 
    }));
  };

  // Filtering and sorting
  const filteredMaterials = materials
    .filter(material => {
      const matchesSearch = searchTerm === '' || 
        material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || material.category === selectedCategory;
      const matchesLevel = selectedLevel === 'all' || material.level === selectedLevel;
      return matchesSearch && matchesCategory && matchesLevel;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'name':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'downloads':
          aValue = a.download_count;
          bValue = b.download_count;
          break;
        case 'date':
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">학습 자료를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">학습 자료</h1>
          <p className="text-gray-600 mt-2">총 {materials.length}개의 학습 자료가 있습니다</p>
        </div>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          자료 업로드
        </button>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">카테고리</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {materialCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`p-3 rounded-lg border transition-colors ${
                selectedCategory === category.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg ${category.color} mb-2 mx-auto`}></div>
              <p className="text-sm font-medium text-gray-900">{category.name}</p>
              <p className="text-xs text-gray-500">{category.count}개</p>
            </button>
          ))}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="자료 제목이나 태그로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex gap-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 카테고리</option>
              {materialCategories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>

            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 레벨</option>
              <option value="beginner">초급</option>
              <option value="intermediate">중급</option>
              <option value="advanced">고급</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split('-');
                setSortBy(sort as any);
                setSortOrder(order as any);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date-desc">최신순</option>
              <option value="date-asc">오래된순</option>
              <option value="name-asc">이름순</option>
              <option value="downloads-desc">다운로드순</option>
            </select>

            <div className="flex rounded-lg border border-gray-300">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Materials Grid/List */}
      <div className={viewMode === 'grid' 
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        : "space-y-3"
      }>
        {filteredMaterials.map((material) => {
          const IconComponent = fileTypeIcons[material.file_type];
          
          if (viewMode === 'grid') {
            return (
              <div key={material.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${
                      materialCategories.find(c => c.id === material.category)?.color || 'bg-gray-500'
                    }`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{material.title}</h3>
                      <p className="text-sm text-gray-500">{material.uploader_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleFavorite(material.id)}
                      className={`p-1 ${material.is_favorite ? 'text-yellow-500' : 'text-gray-400'} hover:text-yellow-500`}
                    >
                      <Star className="w-4 h-4" fill={material.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {material.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{material.description}</p>
                )}

                <div className="flex flex-wrap gap-1 mb-3">
                  {material.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                  {material.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{material.tags.length - 3}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                  <span>{formatFileSize(material.file_size)}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    material.level === 'beginner' 
                      ? 'bg-green-100 text-green-800'
                      : material.level === 'intermediate'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {material.level === 'beginner' ? '초급' : material.level === 'intermediate' ? '중급' : '고급'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                  <span>{formatDate(material.created_at)}</span>
                  <span>{material.download_count} 다운로드</span>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4" />
                    미리보기
                  </button>
                  <button className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    다운로드
                  </button>
                </div>
              </div>
            );
          } else {
            return (
              <div key={material.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${
                    materialCategories.find(c => c.id === material.category)?.color || 'bg-gray-500'
                  }`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">{material.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{material.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {material.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-sm text-gray-500 text-right">
                          <p>{formatFileSize(material.file_size)}</p>
                          <p>{formatDate(material.created_at)}</p>
                          <p>{material.download_count} 다운로드</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleFavorite(material.id)}
                            className={`p-2 ${material.is_favorite ? 'text-yellow-500' : 'text-gray-400'} hover:text-yellow-500`}
                          >
                            <Star className="w-4 h-4" fill={material.is_favorite ? 'currentColor' : 'none'} />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-gray-600">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <Download className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-gray-600">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
        })}
      </div>

      {filteredMaterials.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">자료가 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">
            새로운 학습 자료를 업로드해보세요.
          </p>
          <div className="mt-6">
            <button 
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              자료 업로드
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">학습 자료 업로드</h3>
            
            <div className="space-y-4">
              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {uploadForm.file ? (
                  <div className="flex items-center justify-center gap-3">
                    <File className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{uploadForm.file.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(uploadForm.file.size)}</p>
                    </div>
                    <button
                      onClick={() => setUploadForm(prev => ({ ...prev, file: null }))}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-lg font-medium text-gray-900">파일을 드래그하거나 클릭하여 선택</p>
                    <p className="text-sm text-gray-500">PDF, DOC, PPT, 이미지, 오디오, 비디오 파일</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      파일 선택
                    </button>
                  </>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadForm(prev => ({ ...prev, file }));
                      if (!uploadForm.title) {
                        setUploadForm(prev => ({ ...prev, title: file.name.split('.')[0] }));
                      }
                    }
                  }}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4,.mov"
                />
              </div>

              {/* Upload Progress */}
              {uploadProgress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="자료 제목을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {materialCategories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">레벨</label>
                  <select
                    value={uploadForm.level}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, level: e.target.value as StudyMaterial['level'] }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="beginner">초급</option>
                    <option value="intermediate">중급</option>
                    <option value="advanced">고급</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="자료에 대한 설명을 입력하세요"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">태그</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {uploadForm.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full flex items-center gap-1">
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="태그를 입력하고 Enter를 누르세요"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const value = e.currentTarget.value.trim();
                        if (value) {
                          addTag(value);
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={uploadForm.is_public}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, is_public: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">다른 사용자에게 공개</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleFileUpload}
                disabled={!uploadForm.file || !uploadForm.title.trim() || uploadProgress > 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadProgress > 0 ? '업로드 중...' : '업로드'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}