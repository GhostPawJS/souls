interface XpBarProps {
	current: number;
	max: number;
	label?: string;
}

export function XpBar({ current, max, label }: XpBarProps) {
	const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
	const full = current >= max;

	return (
		<div>
			<div class="bar-wrap">
				<div class="bar-track">
					<div class={`bar-fill ${full ? 'bar-fill-full' : ''}`} style={{ width: `${pct}%` }} />
				</div>
				<span class="bar-label">
					{current}/{max}
				</span>
			</div>
			{label && <div class="bar-ctx">{label}</div>}
		</div>
	);
}
