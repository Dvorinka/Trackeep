import { createSignal, onMount, Show } from 'solid-js';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LearningPathPreviewModal } from '@/components/ui/LearningPathPreviewModal';
import { getMockLearningPaths } from '@/lib/mockData';
import { 
  IconClock, 
  IconUsers, 
  IconStar, 
  IconFilter, 
  IconSearch,
  IconAlertCircle,
  IconCode,
  IconCloud,
  IconPalette,
  IconBriefcase,
  IconCamera,
  IconMusic,
  IconWriting,
  IconLanguage,
  IconDeviceLaptop,
  IconShield,
  IconBrain,
  IconBook
} from '@tabler/icons-solidjs';

interface LearningPath {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: string;
  thumbnail: string;
  is_featured: boolean;
  enrollment_count: number;
  rating: number;
  review_count: number;
  creator: {
    username: string;
    full_name: string;
  };
  tags: Array<{
    name: string;
    color: string;
  }>;
  modules?: Array<{
    id: string;
    title: string;
    description: string;
    completed: boolean;
    resources: Array<{
      type: string;
      title: string;
      url: string;
    }>;
  }>;
  createdAt?: string;
  enrolledAt?: string;
}

export const LearningPaths = () => {
  const [learningPaths, setLearningPaths] = createSignal<LearningPath[]>([]);
  const [categories, setCategories] = createSignal<string[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedCategory, setSelectedCategory] = createSignal('');
  const [selectedDifficulty, setSelectedDifficulty] = createSignal('');
  const [successMessage, setSuccessMessage] = createSignal('');
  const [errorMessage, setErrorMessage] = createSignal('');
  const [enrolledPaths, setEnrolledPaths] = createSignal<Set<number>>(new Set());
  const [isPreviewOpen, setIsPreviewOpen] = createSignal(false);
  const [selectedPath, setSelectedPath] = createSignal<LearningPath | null>(null);

  // Check if we're in demo mode
  const isDemoMode = () => {
    return localStorage.getItem('demoMode') === 'true' || 
           document.title.includes('Demo Mode') ||
           window.location.search.includes('demo=true');
  };

  const fetchData = async () => {
    try {
      if (isDemoMode()) {
        // Use mock data in demo mode
        const mockLearningPaths = getMockLearningPaths();
        const mappedPaths: LearningPath[] = mockLearningPaths.map((path, index) => ({
          id: index + 1,
          title: path.title,
          description: path.description,
          category: path.category,
          difficulty: path.difficulty,
          duration: path.estimatedTime,
          thumbnail: `https://picsum.photos/seed/${path.category.replace(/\s+/g, '-').toLowerCase()}-${index}/400/200.jpg`,
          is_featured: index < 2, // Make first 2 paths featured
          enrollment_count: Math.floor(Math.random() * 2000) + 200,
          rating: 4.0 + Math.random() * 1.0,
          review_count: Math.floor(Math.random() * 200) + 20,
          creator: {
            username: 'instructor',
            full_name: 'Expert Instructor'
          },
          tags: path.tags,
          modules: path.modules,
          createdAt: path.createdAt,
          enrolledAt: path.enrolledAt
        }));
        
        setLearningPaths(mappedPaths);
        
        // Extract unique categories from mock data
        const uniqueCategories = [...new Set(mockLearningPaths.map(path => path.category))];
        setCategories(uniqueCategories);
        
        setIsLoading(false);
        return;
      }

      // Fetch categories
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
      const categoriesResponse = await fetch(`${API_BASE_URL}/learning-paths/categories`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.categories || []);
      }

      // Fetch learning paths
      const params = new URLSearchParams();
      if (searchTerm()) params.append('search', searchTerm());
      if (selectedCategory()) params.append('category', selectedCategory());
      if (selectedDifficulty()) params.append('difficulty', selectedDifficulty());

      const response = await fetch(`${API_BASE_URL}/learning-paths?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLearningPaths(data);
      }
    } catch (error) {
      console.error('Failed to load learning paths:', error);
      setErrorMessage('Failed to load learning paths. Please try again.');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  onMount(fetchData);

  const handleSearch = () => {
    // Refetch with search parameters
    fetchData();
  };

  const getDifficultyColor = (_difficulty: string) => {
    // Use single main project color (blue) for all difficulties
    return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'programming':
      case 'web development':
        return <IconCode class="size-4" />;
      case 'mobile development':
        return <IconDeviceLaptop class="size-4" />;
      case 'data science':
      case 'machine learning':
        return <IconBrain class="size-4" />;
      case 'cybersecurity':
        return <IconShield class="size-4" />;
      case 'devops':
        return <IconCloud class="size-4" />;
      case 'design':
        return <IconPalette class="size-4" />;
      case 'business':
        return <IconBriefcase class="size-4" />;
      case 'marketing':
        return <IconBriefcase class="size-4" />;
      case 'photography':
        return <IconCamera class="size-4" />;
      case 'music':
        return <IconMusic class="size-4" />;
      case 'writing':
        return <IconWriting class="size-4" />;
      case 'languages':
        return <IconLanguage class="size-4" />;
      default:
        return <IconBook class="size-4" />;
    }
  };

  const getCategoryColor = (_category: string) => {
    // Use single main project color (blue) for all categories
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  };

  const handleEnroll = async (pathId: number) => {
    try {
      if (isDemoMode()) {
        // Simulate enrollment in demo mode
        setEnrolledPaths(prev => new Set(prev).add(pathId));
        setSuccessMessage('Successfully enrolled in learning path!');
        setTimeout(() => setSuccessMessage(''), 3000);
        return;
      }

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
      const response = await fetch(`${API_BASE_URL}/learning-paths/${pathId}/enroll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setEnrolledPaths(prev => new Set(prev).add(pathId));
        setSuccessMessage('Successfully enrolled in learning path!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error('Failed to enroll');
      }
    } catch (error) {
      console.error('Error enrolling in learning path:', error);
      setErrorMessage('Failed to enroll. Please try again.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const openPreview = (path: LearningPath) => {
    setSelectedPath(path);
    setIsPreviewOpen(true);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<IconStar class="size-4 fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<IconStar class="size-4 fill-yellow-400/50 text-yellow-400" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<IconStar class="size-4 text-gray-400" />);
    }

    return stars;
  };

  return (
    <div class="p-6 space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-[#fafafa]">Learning Paths</h1>
      </div>

      {/* Success and Error Messages */}
      <Show when={successMessage()}>
        <Card class="p-4 border-primary/20 bg-primary/5">
          <div class="flex items-center gap-2">
            <IconAlertCircle class="size-4 text-primary" />
            <p class="text-primary text-sm">{successMessage()}</p>
          </div>
        </Card>
      </Show>

      <Show when={errorMessage()}>
        <Card class="p-4 border-destructive/20 bg-destructive/5">
          <div class="flex items-center gap-2">
            <IconAlertCircle class="size-4 text-destructive" />
            <p class="text-destructive text-sm">{errorMessage()}</p>
          </div>
        </Card>
      </Show>

      {/* Search and Filters */}
      <div class="bg-[#1a1a1a] rounded-lg p-6 space-y-4">
        <div class="flex flex-col lg:flex-row gap-4">
          <div class="flex-1 relative">
            <IconSearch class="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#a3a3a3] size-4" />
            <Input
              type="text"
              placeholder="Search learning paths..."
              value={searchTerm()}
              onInput={(e) => {
                const target = e.currentTarget as HTMLInputElement;
                if (target) setSearchTerm(target.value);
              }}
              class="pl-10"
            />
          </div>
          
          <select
            value={selectedCategory()}
            onChange={(e) => {
              const target = e.currentTarget as HTMLSelectElement;
              if (target) setSelectedCategory(target.value);
            }}
            class="px-4 py-2 bg-[#262626] text-[#fafafa] border border-[#404040] rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="">All Categories</option>
            {categories().map(category => (
              <option value={category}>{category}</option>
            ))}
          </select>

          <select
            value={selectedDifficulty()}
            onChange={(e) => {
              const target = e.currentTarget as HTMLSelectElement;
              if (target) setSelectedDifficulty(target.value);
            }}
            class="px-4 py-2 bg-[#262626] text-[#fafafa] border border-[#404040] rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <Button onClick={handleSearch} class="whitespace-nowrap">
            <IconFilter class="size-4 mr-2" />
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Learning Paths Grid */}
      {isLoading() ? (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map(() => (
            <Card class="animate-pulse">
              <div class="h-48 bg-[#262626] rounded-t-lg"></div>
              <div class="p-6 space-y-3">
                <div class="h-6 bg-[#262626] rounded"></div>
                <div class="h-4 bg-[#262626] rounded w-3/4"></div>
                <div class="h-4 bg-[#262626] rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {learningPaths().map((path) => (
            <Card class="overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer bg-[#1a1a1a] border-[#404040]">
              {/* Thumbnail */}
              <div class="h-48 bg-[#262626] relative overflow-hidden">
                {path.is_featured && (
                  <div class="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold z-10">
                    Featured
                  </div>
                )}
                <img 
                  src={path.thumbnail} 
                  alt={path.title}
                  class="w-full h-full object-cover filter grayscale"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = `https://placehold.co/600x400/1e293b/ffffff?text=${encodeURIComponent(path.category)}`;
                  }}
                />
                <div class="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                <div class="absolute bottom-4 left-4 right-4">
                  <div class="flex items-center gap-2 mb-2">
                    {getCategoryIcon(path.category)}
                    <span class={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(path.category)}`}>
                      {path.category}
                    </span>
                  </div>
                  <h3 class="text-xl font-bold text-white mb-2 line-clamp-2">{path.title}</h3>
                  <div class="flex items-center gap-2">
                    <span class={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(path.difficulty)}`}>
                      {path.difficulty}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div class="p-6 space-y-4">
                <p class="text-[#a3a3a3] text-sm line-clamp-3">{path.description}</p>

                {/* Stats */}
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center gap-4">
                    <div class="flex items-center gap-1">
                      <IconUsers class="size-4 text-[#a3a3a3]" />
                      <span class="text-[#a3a3a3]">{path.enrollment_count}</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <IconClock class="size-4 text-[#a3a3a3]" />
                      <span class="text-[#a3a3a3]">{path.duration}</span>
                    </div>
                  </div>
                  
                  {path.rating > 0 && (
                    <div class="flex items-center gap-1">
                      {renderStars(path.rating)}
                      <span class="text-[#a3a3a3] text-xs">({path.review_count})</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {path.tags && path.tags.length > 0 && (
                  <div class="flex flex-wrap gap-2">
                    {path.tags.slice(0, 3).map((tag) => (
                      <span 
                        class="px-2 py-1 rounded-full text-xs font-medium"
                        style={`background-color: ${tag.color}20; color: ${tag.color}`}
                      >
                        {tag.name}
                      </span>
                    ))}
                    {path.tags.length > 3 && (
                      <span class="px-2 py-1 rounded-full text-xs bg-[#262626] text-[#a3a3a3]">
                        +{path.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div class="flex gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openPreview(path);
                    }}
                  >
                    Preview
                  </Button>
                  <Button 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEnroll(path.id);
                    }}
                    disabled={enrolledPaths().has(path.id)}
                    class="flex-1"
                  >
                    {enrolledPaths().has(path.id) ? 'Enrolled' : 'Enroll Now'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading() && learningPaths().length === 0 && (
        <div class="text-center py-12">
          <div class="text-[#a3a3a3] text-lg mb-4">
            No learning paths found matching your criteria.
          </div>
          <Button variant="outline" onClick={() => {
            setSearchTerm('');
            setSelectedCategory('');
            setSelectedDifficulty('');
            fetchData();
          }}>
            Clear Filters
          </Button>
        </div>
      )}

      <LearningPathPreviewModal
        isOpen={isPreviewOpen()}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedPath(null);
        }}
        learningPath={selectedPath()}
        onEnroll={handleEnroll}
      />

    </div>
  );
};
