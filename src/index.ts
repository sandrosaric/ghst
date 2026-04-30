import { Command } from 'commander';
import { installCommand } from './commands/install.js';
import { scanCommand } from './commands/scan.js';

const program = new Command();

program
  .name('ghst')
  .description('AI-aware pre-push leak protection for developers')
  .version('1.0.0', '-v, --version', 'output the version number');

program.addCommand(scanCommand);
program.addCommand(installCommand);

program.parse();
