interface ConditionCheckProps {
	label: string;
	pass: boolean;
	actual: string | number;
	required: string | number;
}

export function ConditionCheck({ label, pass, actual, required }: ConditionCheckProps) {
	return (
		<div class="condition-row">
			<span class={`condition-icon ${pass ? 'condition-pass' : 'condition-fail'}`}>
				{pass ? '+' : '-'}
			</span>
			<span class="condition-label">{label}</span>
			<span class="condition-value">
				{actual} / {required}
			</span>
		</div>
	);
}
