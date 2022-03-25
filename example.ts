// goal here is to highlight some thoughts to further our discussion

// idea of this example is to have a timeline that does some of the work and then loads a command that does the actual work

import { Timeline, asyncReduce, request } from "@pnp/core";

// export type QueryablePreObserver = (this: IQueryableInternal, url: string, init: RequestInit, result: any) => Promise<[string, RequestInit, any]>;

// export type QueryableAuthObserver = (this: IQueryableInternal, url: URL, init: RequestInit) => Promise<[URL, RequestInit]>;

// export type QueryableSendObserver = (this: IQueryableInternal, url: URL, init: RequestInit) => Promise<Response>;

// export type QueryableParseObserver = (this: IQueryableInternal, url: URL, response: Response, result: any | undefined) => Promise<[URL, Response, any]>;

// export type QueryablePostObserver = (this: IQueryableInternal, url: URL, result: any | undefined) => Promise<[URL, any]>;

// export type QueryableDataObserver<T = any> = (this: IQueryableInternal, result: T) => void;

// const DefaultMoments = {
//     pre: asyncReduce<QueryablePreObserver>(),
//     auth: asyncReduce<QueryableAuthObserver>(),
//     send: request<QueryableSendObserver>(),
//     parse: asyncReduce<QueryableParseObserver>(),
//     post: asyncReduce<QueryablePostObserver>(),
//     data: broadcast<QueryableDataObserver>(),
// } as const;




const CommandMoments = {
    // this would determine what command to load, and load it as a behavior applying it to the current timeline
    initCommand: request<any>(),
    parseArgs: asyncReduce<any>(),    
    pre: asyncReduce<any>(),
    run: asyncReduce<any>(),
    post: asyncReduce<any>(),
    data: asyncReduce<any>(),
} as const;

export class CommandLifecycle extends Timeline<typeof CommandMoments> {

    protected InternalResolveEvent = Symbol.for("Queryable_Resolve");
    protected InternalRejectEvent = Symbol.for("Queryable_Reject");

    protected execute(init?: any): Promise<any> {

    }
    
}




