import { healthColor } from '../format.ts';

interface HealthRingProps {
	health: number;
	size?: number;
	strokeWidth?: number;
	showLabel?: boolean;
}

export function HealthRing({
	health,
	size = 64,
	strokeWidth = 5,
	showLabel = true,
}: HealthRingProps) {
	const radius = (size - strokeWidth * 2) / 2;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference * (1 - Math.max(0, Math.min(1, health)));
	const color = healthColor(health);

	return (
		<div class="health-ring" style={{ width: size, height: size }}>
			<svg
				viewBox={`0 0 ${size} ${size}`}
				role="img"
				aria-label={`Health: ${Math.round(health * 100)}%`}
			>
				<title>Health: {Math.round(health * 100)}%</title>
				<circle
					class="health-ring-track"
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke-width={strokeWidth}
				/>
				<circle
					class="health-ring-fill"
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke-width={strokeWidth}
					stroke={color}
					stroke-dasharray={circumference}
					stroke-dashoffset={offset}
					stroke-linecap="round"
					transform={`rotate(-90 ${size / 2} ${size / 2})`}
				/>
			</svg>
			{showLabel && (
				<span class="health-ring-label" style={{ fontSize: size > 50 ? '0.85rem' : '0.65rem' }}>
					{Math.round(health * 100)}
				</span>
			)}
		</div>
	);
}
