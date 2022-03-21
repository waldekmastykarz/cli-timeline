import { asyncReduce, request, Timeline, TimelinePipe } from '@pnp/core';

// mock CLI types
// from minimist
type ParsedArgs = {};
// CLI's command
type Command = {};

type CliPreParseArgsObserver = (args: string[]) => Promise<[string[]]>;
type CliParseArgsObserver = (args: string[]) => Promise<[ParsedArgs]>;
type CliLoadCommandsObserver = (args: ParsedArgs) => Promise<[Command[]]>;
type CliShowHelpObserver = (commands?: Command[]) => Promise<[Command[]]>;
type CliPreRunCommandObserver = (command: Command) => Promise<[Command]>;
type CliRunCommandObserver = (command: Command) => Promise<void>;

// how to model logging output that happens all the time? We have specific logic
// that formats output based on the selected output mode. What's the best way
// to express it in moments? Is there a way to have a sort of pre-log moment
// where we could process the object sent to the logger before passing it to the
// actual log moment?
const CliMoments = {
  // detect if help is requested, if so, set the help flag on the timeline
  // and remove the help option from the args
  preParseArgs: asyncReduce<CliPreParseArgsObserver>(),
  // parse the args array into a ParsedArgs object using minimist
  parseArgs: request<CliParseArgsObserver>(),
  // here we load either 1 or multiple commands (eg when no command name
  // specified or the specified name is a name of a group that matches multiple
  // commands). Do we do this in one moment or would it be better to define
  // separate moments?
  loadCommands: request<CliLoadCommandsObserver>(),
  // should this be a moment? If someone requested help for a command or
  // we loaded multiple commands, we'd show help and then clear the runCommand
  // observers because there's nothing to run.
  // how do we deal with showing help of one command vs. showing the list of
  // available commands either when no command was specified or when no matching
  // command was found? We also show help when command's validation failed and
  // the user configured CLI to show help on command's failure.
  showHelp: asyncReduce<CliShowHelpObserver>(),
  // ideally, we'd run telemetry here, so that we won't be calling telemetry
  // when one command calls another internally, but if the command's validation
  // fails, then we record that a command was used, while it wasn't really
  // so what's the best way to handle that?
  preRunCommand: asyncReduce<CliPreRunCommandObserver>(),
  // run the command. Initiate and start a CommandTimeline with the command's info
  runCommand: request<CliRunCommandObserver>(),
  // web request configuration shared by all commands and requests.
  // what's the right place to handle things like throttling or paging: in the
  // request or the postRequest moment?
  // Axios uses interceptors for requests and responses. For consistency, would
  // we drop them in favor of pre- and postRequest moments?
  //
  // behaviors:
  // - set default headers
  // - ensure access token if the request is not marked as anonymous. If this
  //   fails, command should stop execution with the error logged in the output
  // - configure proxy? (we don't have it yet, but would this be the right place?)
  preRequest: asyncReduce<any>(),
  // execute the request
  request: request<any>(),
  postRequest: asyncReduce<any>(),
  // would we call process.exit() in timeline's dispose or should it be a separate moment?
} as const;

class CliTimeline extends Timeline<typeof CliMoments> {
  protected execute(init?: any): Promise<any> {
    throw new Error('Method not implemented.');
  }
}

type CommandProcessOptionsObserver = (options: any) => Promise<[any]>;
type CommandRestoreAuthObserver = () => Promise<[]>;
type CommandRunCommandObserver = (command: Command) => Promise<void>;

const CommandMoments = {
  // Currently in the CLI in the validation we take ParsedArgs as argument
  // and return a bool true if validation passed and a string with error if it
  // failed. when validation fails, we should stop the command's timeline, show
  // the validation error and, depending on the CLI's configuration, command's help
  // how can we express this with moments?
  //
  // behaviors:
  // - validate unknown options
  // - when enabled, prompt for required options that are missing a value
  // - validate required options
  // Currently we run the following two validations after processOptions. We do this
  // for performance reasons so that we don't do unnecessary validation in case
  // something's wrong. The question is if we should keep it that way or if
  // the overhead is negligible. If we should keep it, then probably processOptions
  // should be the first moment
  // - validate option sets
  // - run command-specific validation
  validate: asyncReduce<any>(),
  // behaviors:
  // - remove short options
  // - replace values staring with @ with file contents
  // - expand server-relative URLs in SPO commands
  // - set default output if configured by the user
  processOptions: asyncReduce<CommandProcessOptionsObserver>(),
  // we have anonymous commands that don't need to restore auth. Should this be
  // a separate moment they would have no observers for?
  restoreAuth: request<CommandRestoreAuthObserver>(),
  // run the command. If a command runs another command internally, it should
  // instantiate a new CommandTimeline
  runCommand: request<CommandRunCommandObserver>(),
  // command-specific behaviors:
  //
  // - add unknown options to the request
  // - handle request digest? (right now we handle it manually ourselves where needed)
  preRequest: asyncReduce<any>(),
  // after each command ran, when in verbose mode, we show 'DONE' in the console
  // would we do that in dispose or should we do it in a separate moment?
} as const;

class CommandTimeline extends Timeline<typeof CommandMoments> {
  protected execute(init?: any): Promise<any> {
    throw new Error('Method not implemented.');
  }
}