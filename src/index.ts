import './style.css';
import { Subject, bufferCount, bufferTime, filter, fromEvent, map, mergeAll, switchMap, takeUntil, tap } from "rxjs";

interface IMessage {
    message: string;
    level: LogLevel;
    timestamp: Date;
}

export enum LogLevel {
    INFO = 1,
    WARN = 2,
    ERR = 4,
}

export interface ILoggerOptions {
    messageLimit?: number;
    minHeight?: number;
    minLevel?: LogLevel;
}

const DEFAULT_MESSAGE_LIMIT = 50;
const MIN_HEIGHT = 200;
const DEFAULT_HEIGHT = 400;

let loggerEl: HTMLElement;
let loggerMessagesEl: HTMLElement;

let messageQueue$: Subject<IMessage>;

/**
 * Attaches a logger to the DOM.
 * 
 * @param options - The logger options.
 */
export function attachLogger({ messageLimit = DEFAULT_MESSAGE_LIMIT, minHeight = DEFAULT_HEIGHT, minLevel = LogLevel.INFO }: ILoggerOptions) {
    loggerEl = document.createElement('div');
    loggerEl.id = 'log-panel';

    const sizeHandle = document.createElement('button');
    sizeHandle.id = 'size-handle';
    loggerEl.appendChild(sizeHandle);
    loggerEl.style.height = `${Math.max(minHeight, MIN_HEIGHT)}px`;

    loggerMessagesEl = document.createElement('div');
    loggerMessagesEl.id = 'log-panel-messages';
    loggerEl.appendChild(loggerMessagesEl);

    document.body.appendChild(loggerEl);



    setupResize(sizeHandle);
    setupQueue(messageLimit, minLevel);
}

/**
 * Sets up a message queue with the specified message limit and minimum log level.
 * The message queue buffers log messages and performs various operations on them, such as filtering, mapping, and attaching to the DOM.
 * Once the message count reaches the message limit, the oldest log is removed from the queue.
 * @param messageLimit The maximum number of log messages to keep in the queue.
 * @param minLevel The minimum log level required for a log message to be pushed to the queue.
 */
function setupQueue(messageLimit: number, minLevel: LogLevel) {
    messageQueue$ = new Subject<IMessage>();
    messageQueue$
        .pipe(
            filter(({ level }) => level >= minLevel), // only push messages with level >= minLevel
            bufferTime(500), // only push logs every 500ms
            filter(messages => messages.length > 0), // only push if there are messages
            map(messages => messages.filter((_, i) => i < messageLimit)), // only keep the last messageLimit messages
            map(messages => createLogs(messages)), // create log html elements
            tap(logs => attachLogs(logs!)), // attach logs to DOM
            tap(() => scrollToNewest()), // scroll to newest log
            mergeAll(), // flatten the array of logs
            bufferCount(messageLimit + 1, 1), // buffer until logs count <= messageLimit, then push the buffer
            tap(log => removeLog(log[0])) // remove the oldest log
        )
        .subscribe({
            error: (err) => {
                console.error('Logger error:', err);
            },
            complete: () => {
                console.log('Logger complete');
            }
        });
}

/**
 * Sets up the resize functionality for the logger element.
 * 
 * @param sizeHandle - The HTMLElement representing the size handle.
 */
function setupResize(sizeHandle: HTMLElement) {
    const mouseDown$ = fromEvent(sizeHandle, 'mousedown');
    const mouseMove$ = fromEvent(document, 'mousemove');
    const mouseUp$ = fromEvent(document, 'mouseup');

    mouseDown$
        .pipe(
            switchMap(_ =>
                mouseMove$
                    .pipe(
                        map((moveEvent) => {
                            return (moveEvent as MouseEvent).clientY;
                        }),
                        tap((offsetY) => {
                            const newHeight = Math.min(Math.max(window.innerHeight - offsetY, MIN_HEIGHT), window.innerHeight);
                            loggerEl.style.height = `${newHeight}px`;
                        }),
                        takeUntil(mouseUp$),
                    )
            )
        )
        .subscribe();
}

/**
 * Detaches the logger element from the document body and completes the message queue.
 */
export function detachLogger() {
    if (loggerEl) {
        document.body.removeChild(loggerEl);
    }

    messageQueue$.complete();
}

/**
 * Logs a message with the specified log level.
 * @param level - The log level.
 * @param message - The message to be logged.
 */
export function log(level: LogLevel, message: string) {
    messageQueue$.next({ message, level, timestamp: new Date() });
}

/**
 * Logs an informational message.
 * @param message - The message to log.
 */
export function info(message: string) {
    log(LogLevel.INFO, message);
}

/**
 * Logs an error message.
 * @param message - The error message to log.
 */
export function err(message: string) {
    log(LogLevel.ERR, message);
}

/**
 * Logs a warning message.
 * 
 * @param message - The warning message to log.
 */
export function warn(message: string) {
    log(LogLevel.WARN, message);
}

/**
 * Creates log elements based on the provided messages.
 * @param messages - An array of log messages.
 * @returns An array of HTMLDivElement elements representing the logs.
 * @throws {Error} If the logger is not initialized.
 */
function createLogs(messages: IMessage[]): HTMLDivElement[] {
    if (!loggerMessagesEl) {
        throw new Error('Logger not initialized');
    }

    return messages.map(({ level, message, timestamp }) => {
        const logEl = document.createElement('div');
        logEl.classList.add('log');
        logEl.appendChild(createTimestamp(timestamp));
        logEl.appendChild(createLevel(level));
        logEl.appendChild(createLogMessage(message));
        return logEl;
    })
}

/**
 * Creates a timestamp element with the given date.
 * @param date - The date to be displayed in the timestamp.
 * @returns The created timestamp element.
 */
function createTimestamp(date: Date): HTMLElement {
    return createElementWithClassAndText('span', 'timestamp', `[${date.toLocaleString()}]`);
}

/**
 * Creates an HTML element representing the log level.
 * 
 * @param level - The log level.
 * @returns The HTML element representing the log level.
 */
function createLevel(level: LogLevel): HTMLElement {
    return createElementWithClassAndText('span', `level-${LogLevel[level].toLowerCase()}`, ` [${LogLevel[level]}]`);
}

/**
 * Creates an HTML element with a log message.
 * 
 * @param message - The log message to be displayed.
 * @returns The HTML element containing the log message.
 */
function createLogMessage(message: string): HTMLElement {
    return createElementWithClassAndText('span', 'message', ' ' + message);
}

/**
 * Creates an HTML element with the specified tag, class name, and text content.
 * 
 * @param {string} tag - The HTML tag name of the element.
 * @param {string} className - The class name to be added to the element.
 * @param {string} textContent - The text content to be set for the element.
 * @returns {HTMLElement} The created HTML element.
 */
function createElementWithClassAndText(tag: string, className: string, textContent: string): HTMLElement {
    const el = document.createElement(tag);
    el.textContent = textContent;
    el.classList.add(className);
    return el;
}

/**
 * Attaches logs to the loggerMessagesEl element.
 * 
 * @param logs - An array of HTMLElements representing the logs to be attached.
 */
function attachLogs(logs: HTMLElement[]) {
    loggerMessagesEl.append(...logs)
}

/**
 * Scrolls to the newest message in the logger.
 */
function scrollToNewest() {
    loggerMessagesEl.scroll({ top: loggerMessagesEl!.scrollHeight, behavior: 'instant' });
}

/**
 * Removes a log element from the loggerMessagesEl container.
 * 
 * @param log - The log element to be removed.
 */
function removeLog(log: HTMLElement) {
    loggerMessagesEl.removeChild(log);
}
