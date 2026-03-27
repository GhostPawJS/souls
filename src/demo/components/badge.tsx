interface BadgeProps {
	variant?: 'accent' | 'success' | 'warn' | 'danger' | 'muted';
	children: string | number;
}

export function Badge({ variant = 'muted', children }: BadgeProps) {
	return <span class={`badge badge-${variant}`}>{children}</span>;
}

interface LevelBadgeProps {
	level: number;
	size?: 'sm' | 'md' | 'lg';
}

export function LevelBadge({ level, size = 'md' }: LevelBadgeProps) {
	const cls =
		size === 'sm'
			? 'level-badge level-badge-sm'
			: size === 'lg'
				? 'level-badge level-badge-lg'
				: 'level-badge';
	return <span class={cls}>{level}</span>;
}
