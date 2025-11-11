import { EventEmitter } from 'node:events';

export const tokenEvents = new EventEmitter();
tokenEvents.setMaxListeners(0);

export const emitTokenEvent = (eventName, payload) => {
  tokenEvents.emit(eventName, payload);
};

