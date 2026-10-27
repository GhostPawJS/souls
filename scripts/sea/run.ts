import { soulsCliOptions } from '../../src/surface/souls_cli_options.ts';
import { runToolCli } from '../../src/surfaces/cli.ts';

export const run = (): Promise<void> =>
	runToolCli(process.argv.slice(2), soulsCliOptions).then(
		(code) => {
			process.exitCode = code;
		},
		(error: unknown) => {
			process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
			process.exitCode = 1;
		},
	);
