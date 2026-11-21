/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

/** Options that can be passed to a yolkbot WebSocket */
export interface WSOptions {
    /** A socks5(h) proxy; has no effect in browsers */
    proxy?: string | null;
    /** Headers for the connection; has no effect in browsers */
    headers?: Record<string, string | null | undefined>;
}

/** An incoming WebSocket data message */
export interface WSMessageEvent extends Event {
    /** The data the message encodes */
    data: string | ArrayBuffer | Buffer;
}

/** An incoming WebSocket close message */
export interface WSCloseEvent extends Event {
    /** The numeric code that indicates a reason */
    code?: number;
    /** A stringified reason for close (rarely used) */
    reason?: string;
}

/** Indicates an error with the WebSocket connection on the client */
export interface WSErrorEvent extends Event {
    /** The Error */
    error: Error;
}

/** A list of WebSocket events */
export interface WSEventMap {
    /** The WebSocket open event, which has no parameters */
    open: {};
    /** The {@link WSMessageEvent} */
    message: WSMessageEvent;
    /** The {@link WSCloseEvent} */
    close: WSCloseEvent;
    /** The {@link WSErrorEvent} */
    error: WSErrorEvent;
}

/** The different lifecycle states of a WebSocket */
export enum WSReadyState {
    Connecting = 0,
    Live = 1,
    Closing = 2,
    Closed = 3
}

/** The minimal type used to define the crossplatform browser & Node sockets */
export interface WSSocket {
    /** Defines how incoming messages will be processed */
    binaryType: 'blob' | 'arraybuffer' | 'nodebuffer';
    /** The lifecycle state of the WebSocket */
    readyState: WSReadyState;
    /**
     * Sends data to the WebSocket server
     * @param data The data
     */
    send(data: string | Uint8Array<ArrayBuffer>): void;
    /**
     * Closes the WebSocket from the client
     * @param code An optional code to give the server
     */
    close(code?: number): void;
    /**
     * Adds an event listener to the WebSocket
     * @param type An event type
     * @param listener The callback
     * @param options Additional native event listener options
     * @see {@link WSEventMap}
     */
    addEventListener<K extends keyof WSEventMap>(
        type: K,
        listener: (ev: WSEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions,
    ): void;
    /**
     * Adds an event listener to the WebSocket
     * @param type An event type
     * @param listener The callback
     * @param options Additional native event listener options
     * @see {@link WSEventMap}
     */
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void;
    /**
     * Removes an event listener from the WebSocket
     * @param type The original event type
     * @param listener The original callback passed; MUST be a reference to the original function, NOT the same code copy-pasted
     * @param options Additional native event listener options
     * @see {@link WSEventMap}
     */
    removeEventListener<K extends keyof WSEventMap>(
        type: K,
        listener: (ev: WSEventMap[K]) => any,
        options?: boolean | EventListenerOptions,
    ): void;
    /**
     * Removes an event listener from the WebSocket
     * @param type The original event type
     * @param listener The original callback passed; MUST be a reference to the original function, NOT the same code copy-pasted
     * @param options Additional native event listener options
     * @see {@link WSEventMap}
     */
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ): void;
}