import { runTxToolCommand, TxToolCommandError } from './tx-tool-command.js';

export { TxToolCommandError as IssueCommandError };

export function runIssue(payload, options = {}) {
  return runTxToolCommand({
    subcommand: 'issue',
    fileFlag: '--asset-file',
    payload,
    extraArgs: options.extraArgs || [],
  });
}

