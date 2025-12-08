// Available interest tags for better matching
export const AVAILABLE_INTERESTS = [
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'movies', label: 'Movies & TV', emoji: '🎬' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'coding', label: 'Programming', emoji: '💻' },
  { id: 'art', label: 'Art & Design', emoji: '🎨' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'cooking', label: 'Cooking', emoji: '🍳' },
  { id: 'books', label: 'Books', emoji: '📚' },
  { id: 'fitness', label: 'Fitness', emoji: '💪' },
  { id: 'photography', label: 'Photography', emoji: '📷' },
  { id: 'fashion', label: 'Fashion', emoji: '👗' },
  { id: 'pets', label: 'Pets & Animals', emoji: '🐶' },
  { id: 'anime', label: 'Anime & Manga', emoji: '🎌' },
  { id: 'science', label: 'Science', emoji: '🔬' },
  { id: 'memes', label: 'Memes', emoji: '😂' },
] as const;

export const QUEUE_TYPES = [
  {
    id: 'casual',
    label: 'Casual Chat',
    description: 'Random fun conversations',
    icon: '💬',
  },
  {
    id: 'serious',
    label: 'Deep Talk',
    description: 'Meaningful conversations',
    icon: '🧠',
  },
  {
    id: 'language',
    label: 'Language Exchange',
    description: 'Practice languages together',
    icon: '🗣️',
  },
  {
    id: 'gaming',
    label: 'Gaming',
    description: 'Talk about games',
    icon: '🎮',
  },
] as const;

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
] as const;

// Premium feature: Region filtering
export const REGIONS = [
  { id: 'global', name: 'Anywhere', emoji: '🌍', description: 'Match with anyone worldwide' },
  { id: 'us-east', name: 'US East', emoji: '🗽', description: 'New York, Florida, etc.' },
  { id: 'us-west', name: 'US West', emoji: '🌉', description: 'California, Washington, etc.' },
  { id: 'europe', name: 'Europe', emoji: '🇪🇺', description: 'UK, Germany, France, etc.' },
  { id: 'asia', name: 'Asia', emoji: '🏯', description: 'Japan, Korea, Singapore, etc.' },
  { id: 'latam', name: 'Latin America', emoji: '🌴', description: 'Mexico, Brazil, Argentina, etc.' },
] as const;

