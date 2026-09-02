// The design system. Import from "@/components/ui" — not from the individual files —
// so the surface stays swappable.
//
// Everything here reads its colours from the active theme preset via useTokens(), which
// is what keeps a screen consistent across all eight presets without per-screen palettes.

export { default as Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { default as IconButton } from "./IconButton";
export type { IconButtonProps } from "./IconButton";

export { default as Card } from "./Card";
export type { CardProps } from "./Card";

export { default as Input } from "./Input";
export type { InputProps } from "./Input";

export { default as Select } from "./Select";
export type { SelectProps, SelectOption } from "./Select";

export { default as Badge, toneColors } from "./Badge";
export type { BadgeProps, BadgeTone } from "./Badge";

export { default as Alert } from "./Alert";
export type { AlertProps, AlertTone } from "./Alert";

export { default as Modal, ConfirmDialog } from "./Modal";
export type { ModalProps, ConfirmDialogProps } from "./Modal";

export { default as DataTable } from "./DataTable";
export type { DataTableProps, Column } from "./DataTable";

export { default as SearchField } from "./SearchField";
export type { SearchFieldProps } from "./SearchField";

export { default as Tabs } from "./Tabs";
export type { TabsProps, TabItem } from "./Tabs";

export { default as Pagination } from "./Pagination";
export type { PaginationProps } from "./Pagination";

export { default as Screen, Breadcrumbs } from "./Screen";
export type { ScreenProps, Crumb } from "./Screen";

export { Skeleton, SkeletonList, LoadingState, EmptyState, ErrorState } from "./States";
export type { SkeletonProps, EmptyStateProps, ErrorStateProps } from "./States";

export { StatCard, Divider, SectionHeader, ListRow, Avatar } from "./Misc";
export type { StatCardProps, SectionHeaderProps, ListRowProps, AvatarProps } from "./Misc";

// Token access for screens that need a value the primitives don't expose.
export { useTokens } from "@/contexts/ThemeContext";
export type { Tokens } from "@/constants/design/tokens";
