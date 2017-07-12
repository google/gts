
import * as meow from 'meow';
import * as updateNotifier from 'update-notifier';
import {init} from './init';

export class Options {
  dryRun: boolean;
  targetRootDir: string;
  yes: boolean;
}

const cli = meow(`
	Usage
	  $ gts <verb> [options]

    Verb can be:
      init        Adds default npm scripts to your package.json.

  Options
    --help        Prints this help message.
    -y, --yes     Assume a yes answer for every prompt.
    --dry-run     Don't make any acutal changes.

	Examples
	  $ gts init
`);

function usage(msg?: string): void {
  if (msg) {
    console.error(msg);
  }
  cli.showHelp(1);
}

updateNotifier({pkg: cli.pkg}).notify();

if (cli.input.length !== 1) {
  usage();
}

const verb = cli.input[0];
const options: Options = {
  dryRun: cli.flags.dryRun || false,
  targetRootDir: process.cwd(),
  yes: cli.flags.yes || cli.flags.y || false
};

switch (verb) {
  case 'init':
    init(options);
    break;

  default:
    usage(`Unknown verb: ${verb}`);
    break;
}
