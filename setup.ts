// I've added notes and stuff below, let's chat through this at some point after you have a chance to read through it

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

//-----------------
// * how to model logging output that happens all the time? We have specific logic
// * that formats output based on the selected output mode. What's the best way
// * to express it in moments? Is there a way to have a sort of pre-log moment
// * where we could process the object sent to the logger before passing it to the
// * actual log moment?
//-----------------
// * To me that would be different behaviors for different logging scenarios. So a single log moment that gets sent the details, expressed an an interface/type -
// * which the individual logging behaviors would format and output as needed. IF the logging is very similar a single behavior that takes some arguments setting it up
// * would work too. The moment is just what is happening when, all the logic on how you handle it is in the behaviors -
// * so an observer that logs to console could do that and one that logs to say a database would do that. They just get the "message" and process it. Benefit is you 
// * can register multiple of these different loggers (or any moment) and they don't need to know about or depend on each other. As much as possible observers should
// * be pure functions.
//-----------------

const CliMoments = {
  //-----------------
  // * detect if help is requested, if so, set the help flag on the timeline
  // * and remove the help option from the args
  //-----------------
  // * Thinking about this - so you could parse the args into a format and have different observers to process each arg. Similar to the way we pass init through "pre"
  // * in observer you could have some type of init object that each observer set flags or other things on (or register other observers later in the process! - 
  // * think a bunch of logging arg parsers that attach observers to log). So looking at our "execute" in you could have one moment that is "parse args" that transforms
  // * the raw args into something (just have it do what minimist does inside an observer) and then an "understand args" moment that acts on the args.
  // * There could even be an observer that based on the command args registers the correct command behavior within the currently running timeline, the timeline wouldn't
  // * even know what it was doing until it was already running :)
  //-----------------
  preParseArgs: asyncReduce<CliPreParseArgsObserver>(),
  // parse the args array into a ParsedArgs object using minimist
  parseArgs: request<CliParseArgsObserver>(),
  // here we load either 1 or multiple commands (eg when no command name
  // specified or the specified name is a name of a group that matches multiple
  // commands). Do we do this in one moment or would it be better to define
  // separate moments?
  loadCommands: request<CliLoadCommandsObserver>(),
  //-----------------
  // * should this be a moment? If someone requested help for a command or
  // * we loaded multiple commands, we'd show help and then clear the runCommand
  // * observers because there's nothing to run.
  // * how do we deal with showing help of one command vs. showing the list of
  // * available commands either when no command was specified or when no matching
  // * command was found? We also show help when command's validation failed and
  // * the user configured CLI to show help on command's failure.
  //-----------------
  // * IMO, no. taking the discussion above based on the args I'd register some type of a "help" observer AS the current command. So instead of executing it would
  // * just do help stuff.
  //-----------------
  showHelp: asyncReduce<CliShowHelpObserver>(),
  //-----------------
  // * ideally, we'd run telemetry here, so that we won't be calling telemetry
  // * when one command calls another internally, but if the command's validation
  // * fails, then we record that a command was used, while it wasn't really
  // * so what's the best way to handle that?
  //-----------------
  // * This comes back to what we were talking about with commands running other commands - hard to say exactly - why wouldn't you want that second command
  // * to run telemetry? You could leave off the telemetry observer for secondary commands.
  //-----------------
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
  //-----------------
  // * would we call process.exit() in timeline's dispose or should it be a separate moment?
  //-----------------
  // * could be part of the overall framework that starts the timeline would then exit the process.
  //-----------------
} as const;

class CliTimeline extends Timeline<typeof CliMoments> {
  protected execute(init?: any): Promise<any> {
    throw new Error('Method not implemented.');
  }
}

type CommandProcessOptionsObserver = (options: any) => Promise<[any]>;
type CommandRestoreAuthObserver = () => Promise<[]>;
type CommandRunCommandObserver = (command: Command) => Promise<void>;


  //-----------------
  // * You might think about commands as behaviors themselves that then register the needed validators and such on the current timeline in which they are loaded.
  // * So you'd start each command as a timeline, pass it the raw args and then it would take it from there.
  // * 
  // * You could also replace/not register the parse args observer with a like setArgs observer that you just give it the args to run the command
  // * 
  // * Observers/behaviors can maintain their own state either per instance, per behavior instance, or per observer instance, so lots of ways to handle
  // * 
  // * I kinda see each command as a timeline. So cli starts -> that is a timeline that so far has no "command"
  // * It parses the args, then interprets the args, part of that is loading the correct command (expressed as a behavior)
  // * command registers the observers/behaviors it needs, then the timeline keeps running
  // * args are of two kinds (load the command args, and args that the command understands and would parse)
  // * command attaches to like "run", "log", etc.
  //-----------------
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
