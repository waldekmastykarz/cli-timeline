import { TimelinePipe } from "@pnp/core";
import { CommandLifecycle } from "../example";

// there would be a bunch of generic shared arg parses
function urlArg(name: string | number) {

}

function stringArg(name: string | number) {
    
}

function numberArg(name: string | number) {
    
}

function boolArg(name: string | number) {
    
}

// and a behavior to get the standard args
function DefaultArgs(): TimelinePipe<CommandLifecycle> {
    return (instance) => {

        instance.on.parseArgs(boolArg("help"));

        return instance;
    };
}

export function GetWeb(): TimelinePipe<CommandLifecycle> {

    return (instance) => {

        instance.using(DefaultArgs());
        instance.on.parseArgs(stringArg(0));
        instance.on.parseArgs(urlArg("href"));
        instance.on.parseArgs(numberArg("timeout"));
        instance.on.parseArgs(stringArg(5));

        instance.on.run(function() {

            // actual impl for the command
        })

        return instance;
    };
}

