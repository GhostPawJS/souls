export interface SoulsSoulTrait {
	readonly id: string;
	readonly label: string;
	readonly description: string;
}

export interface SoulsSoul {
	readonly identity: string;
	readonly posture: string;
	readonly traits: readonly SoulsSoulTrait[];
}

export function renderSoulsSoulPromptFoundation(): string {
	return [
		'You are operating with access to the Souls engine.',
		'Souls is a structured personality and behavioral framework for agents.',
		'Use the available tools to manage soul state.',
	].join('\n');
}
