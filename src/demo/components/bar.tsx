interface BarProps {
	value: number;
	max: number;
	color?: string;
	label?: string;
}

export function Bar({ value, max, color = 'var(--accent)', label }: BarProps) {
	const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
	return (
		<div class="bar-wrap">
			{label && (
				<span class="bar-ctx" style={{ minWidth: 60 }}>
					{label}
				</span>
			)}
			<div class="bar-track">
				<div class="bar-fill" style={{ width: `${pct}%`, background: color }} />
			</div>
			<span class="bar-label">{value}</span>
		</div>
	);
}
