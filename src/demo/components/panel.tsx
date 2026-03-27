import type { ComponentChildren } from 'preact';

interface PanelProps {
	title?: string;
	subtitle?: string;
	children: ComponentChildren;
	class?: string;
}

export function Panel({ title, subtitle, children, class: cls }: PanelProps) {
	return (
		<section class={`panel ${cls ?? ''}`}>
			{title && (
				<div class="panel-header">
					<div>
						<h2 class="panel-title">{title}</h2>
						{subtitle && <p class="panel-subtitle">{subtitle}</p>}
					</div>
				</div>
			)}
			<div class="panel-body">{children}</div>
		</section>
	);
}
