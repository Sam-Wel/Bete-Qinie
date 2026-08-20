import {
  AlertCircle,
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Gamepad2,
  GraduationCap,
  LayoutGrid,
  List,
  LogIn,
  LogOut,
  Newspaper,
  Pencil,
  PlusCircle,
  Search,
  ShieldCheck,
  Trophy,
  UserCircle,
  UserPlus,
} from "lucide-react-native";
import { colors } from "../../theme";

const ICONS = {
  "book-outline": BookOpen,
  "list-outline": List,
  "grid-outline": LayoutGrid,
  "school-outline": GraduationCap,
  "game-controller-outline": Gamepad2,
  "newspaper-outline": Newspaper,
  "person-circle-outline": UserCircle,
  "shield-checkmark-outline": ShieldCheck,
  "log-out-outline": LogOut,
  "log-in-outline": LogIn,
  "person-add-outline": UserPlus,
  "search-outline": Search,
  "trophy-outline": Trophy,
  "bookmark-outline": Bookmark,
  "alert-circle-outline": AlertCircle,
  "document-text-outline": FileText,
  "add-circle-outline": PlusCircle,
  "create-outline": Pencil,
  "chevron-forward": ChevronRight,
  "chevron-back": ChevronLeft,
  "chevron-down": ChevronDown,
  checkmark: Check,
};

export function Icon({ name, size = 20, color = colors.textPrimary, strokeWidth = 1.75, style }) {
  const LucideIcon = ICONS[name];
  if (!LucideIcon) return null;
  return <LucideIcon size={size} color={color} strokeWidth={strokeWidth} style={style} />;
}
