import type { ComponentChildren } from 'preact';

interface EmptyStateProps {
	glyph?: string;
	title: string;
	subtitle?: string;
	children?: ComponentChildren;
}

export function EmptyState({ glyph, title, subtitle, children }: EmptyStateProps) {
	return (
		<div class="empty-state">
			{glyph && <div class="empty-glyph">{glyph}</div>}
			<div class="empty-title">{title}</div>
			{subtitle && <div class="empty-subtitle">{subtitle}</div>}
			{children}
		</div>
	);
}
