import { createSignal } from 'solid-js';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconX, IconClock, IconUsers, IconStar, IconBook, IconVideo, IconFileText, IconCode, IconCheck } from '@tabler/icons-solidjs';

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
}

interface LearningPathPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  learningPath: LearningPath | null;
  onEnroll: (pathId: number) => void;
}

export const LearningPathPreviewModal = (props: LearningPathPreviewModalProps) => {
  const [isEnrolling, setIsEnrolling] = createSignal(false);

  const handleEnroll = async () => {
    if (!props.learningPath) return;
    
    setIsEnrolling(true);
    try {
      await props.onEnroll(props.learningPath.id);
      props.onClose();
    } catch (error) {
      console.error('Failed to enroll:', error);
    } finally {
      setIsEnrolling(false);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return <IconVideo class="size-4" />;
      case 'article': return <IconFileText class="size-4" />;
      case 'project': return <IconCode class="size-4" />;
      case 'lab': return <IconBook class="size-4" />;
      default: return <IconFileText class="size-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'advanced': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (!props.isOpen || !props.learningPath) return null;

  return (
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-[#1a1a1a] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4 my-4">
        {/* Header */}
        <div class="relative">
          {/* Thumbnail */}
          <div class="h-64 bg-[#262626] relative overflow-hidden">
            <img 
              src={props.learningPath.thumbnail} 
              alt={props.learningPath.title}
              class="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                target.src = `https://placehold.co/600x400/1e293b/ffffff?text=${encodeURIComponent(props.learningPath?.title || 'Learning Path')}`;
              }}
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            
            {props.learningPath.is_featured && (
              <div class="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold z-10">
                Featured
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={props.onClose}
              class="absolute top-4 right-4 text-white hover:bg-white/20"
            >
              <IconX class="size-5" />
            </Button>
            
            <div class="absolute bottom-6 left-6 right-6">
              <h2 class="text-3xl font-bold text-white mb-2">{props.learningPath.title}</h2>
              <div class="flex items-center gap-3">
                <span class={`px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(props.learningPath.difficulty)}`}>
                  {props.learningPath.difficulty}
                </span>
                <span class="text-white/80">{props.learningPath.category}</span>
                <div class="flex items-center gap-1 text-white/80">
                  <IconClock class="size-4" />
                  <span class="text-sm">{props.learningPath.duration}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div class="p-6 space-y-6">
          {/* Description and Stats */}
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2">
              <h3 class="text-xl font-semibold text-white mb-3">About this Learning Path</h3>
              <p class="text-[#a3a3a3] leading-relaxed">{props.learningPath.description}</p>
            </div>
            
            <div class="space-y-4">
              <Card class="p-4 bg-[#262626] border-[#404040]">
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-[#a3a3a3] text-sm">Instructor</span>
                    <span class="text-white font-medium">{props.learningPath.creator.full_name}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[#a3a3a3] text-sm">Students</span>
                    <div class="flex items-center gap-1">
                      <IconUsers class="size-4 text-[#a3a3a3]" />
                      <span class="text-white font-medium">{props.learningPath.enrollment_count}</span>
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[#a3a3a3] text-sm">Rating</span>
                    <div class="flex items-center gap-1">
                      <IconStar class="size-4 fill-yellow-400 text-yellow-400" />
                      <span class="text-white font-medium">{props.learningPath.rating.toFixed(1)}</span>
                      <span class="text-[#a3a3a3] text-sm">({props.learningPath.review_count})</span>
                    </div>
                  </div>
                </div>
              </Card>
              
              {/* Enroll Button */}
              <Button 
                onClick={handleEnroll} 
                disabled={isEnrolling()}
                class="w-full"
                size="lg"
              >
                {isEnrolling() ? (
                  <span class="flex items-center gap-2">
                    <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Enrolling...
                  </span>
                ) : (
                  'Enroll Now'
                )}
              </Button>
            </div>
          </div>

          {/* Tags */}
          {props.learningPath.tags && props.learningPath.tags.length > 0 && (
            <div>
              <h3 class="text-xl font-semibold text-white mb-3">Tags</h3>
              <div class="flex flex-wrap gap-2">
                {props.learningPath.tags.map((tag) => (
                  <span 
                    class="px-3 py-1 rounded-full text-sm font-medium"
                    style={`background-color: ${tag.color}20; color: ${tag.color}`}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Modules */}
          {props.learningPath.modules && props.learningPath.modules.length > 0 && (
            <div>
              <h3 class="text-xl font-semibold text-white mb-4">Course Content</h3>
              <div class="space-y-3">
                {props.learningPath.modules.map((module, index) => (
                  <Card class="p-4 bg-[#262626] border-[#404040] hover:border-[#525252] transition-colors">
                    <div class="flex items-start gap-3">
                      <div class="flex-shrink-0 w-8 h-8 bg-[#404040] rounded-full flex items-center justify-center text-sm font-medium text-white">
                        {index + 1}
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                          <h4 class="font-semibold text-white">{module.title}</h4>
                          {module.completed && (
                            <IconCheck class="size-4 text-green-400" />
                          )}
                        </div>
                        <p class="text-[#a3a3a3] text-sm mb-3">{module.description}</p>
                        
                        {module.resources && module.resources.length > 0 && (
                          <div class="space-y-2">
                            <p class="text-xs text-[#a3a3a3] font-medium">Resources:</p>
                            <div class="flex flex-wrap gap-2">
                              {module.resources.map((resource) => (
                                <div class="flex items-center gap-1 px-2 py-1 bg-[#404040] rounded text-xs text-[#a3a3a3]">
                                  {getResourceIcon(resource.type)}
                                  <span>{resource.title}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
