import { soulsCliOptions } from './surface/souls_cli_options.ts';
import { runToolCli } from './surfaces/cli.ts';
import { markPackageCli } from './surfaces/cli_version.ts';

markPackageCli();

process.exitCode = await runToolCli(process.argv.slice(2), soulsCliOptions);
