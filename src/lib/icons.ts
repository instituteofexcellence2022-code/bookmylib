import { 
  Home, Users, BookOpen, Calendar, DollarSign, Settings, 
  Bell, Search, Plus, Edit, Trash2, Download, Upload,
  ChevronRight, ChevronDown, CheckCircle, XCircle, AlertCircle, Check,
  Info, Mail, Phone, MapPin, Clock, User, Lock, Unlock,
  Eye, EyeOff, LogIn, LogOut, Menu, X, Star, Heart, Share,
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Filter, ArrowUpDown,
  BarChart3, PieChart, TrendingUp, CreditCard, Receipt,
  Camera, Image, FileText, MessageSquare, HelpCircle,
  ThumbsUp, ThumbsDown, Smile, Frown, Meh, Zap,
  Target, Award, Trophy, Crown, Coffee, Wifi, Battery,
  Volume2, VolumeX, Play, Pause, Square, SkipBack, SkipForward,
  Building2, Armchair, MoreVertical, Save, Wind, Car, UserPlus, RefreshCw, Printer, Send
} from 'lucide-react'

export const Icons = {
  // Navigation
  home: Home,
  send: Send,
  userPlus: UserPlus,
  refresh: RefreshCw,
  print: Printer,
  building: Building2,
  armchair: Armchair,
  moreVertical: MoreVertical,
  save: Save,
  wind: Wind,
  car: Car,
  users: Users,
  book: BookOpen,
  calendar: Calendar,
  dollar: DollarSign,
  settings: Settings,
  bell: Bell,
  search: Search,
  
  // Actions
  add: Plus,
  edit: Edit,
  delete: Trash2,
  download: Download,
  upload: Upload,
  
  // Navigation indicators
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  
  // Status
  check: Check,
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  
  // Authentication
  user: User,
  lock: Lock,
  unlock: Unlock,
  eye: Eye,
  eyeOff: EyeOff,
  logIn: LogIn,
  logOut: LogOut,
  
  // UI
  menu: Menu,
  close: X,
  filter: Filter,
  sort: ArrowUpDown,
  
  // Communication
  mail: Mail,
  phone: Phone,
  message: MessageSquare,
  help: HelpCircle,
  
  // Location
  mapPin: MapPin,
  
  // Time
  clock: Clock,
  
  // Feedback
  star: Star,
  heart: Heart,
  thumbsUp: ThumbsUp,
  thumbsDown: ThumbsDown,
  smile: Smile,
  frown: Frown,
  meh: Meh,
  
  // Business
  share: Share,
  barChart: BarChart3,
  pieChart: PieChart,
  trendingUp: TrendingUp,
  creditCard: CreditCard,
  receipt: Receipt,
  
  // Media
  camera: Camera,
  image: Image,
  fileText: FileText,
  
  // System
  zap: Zap,
  target: Target,
  award: Award,
  trophy: Trophy,
  crown: Crown,
  coffee: Coffee,
  wifi: Wifi,
  battery: Battery,
  volume: Volume2,
  volumeMute: VolumeX,
  
  // Player controls
  play: Play,
  pause: Pause,
  stop: Square,
  skipBack: SkipBack,
  skipForward: SkipForward
}

export type IconName = keyof typeof Icons