import { createStoreModule } from '../create-store';

import * as util from '../util';

/**
 * @typedef ToastMessage
 * @prop {('error'|'success'|'notice')} type
 * @prop {string} id
 * @prop {string} message
 * @prop {string} moreInfoURL
 * @prop {boolean} isDismissed
 */

/**
 * A store module for managing a collection of toast messages. This module
 * maintains state only; it's up to other layers to handle the management
 * and interactions with these messages.
 */

const initialState = {
  /** @type {ToastMessage[]} */
  messages: [],
};

const reducers = {
  ADD_MESSAGE: function (state, action) {
    return {
      messages: state.messages.concat({ ...action.message }),
    };
  },

  REMOVE_MESSAGE: function (state, action) {
    const updatedMessages = state.messages.filter(
      message => message.id !== action.id
    );
    return { messages: updatedMessages };
  },

  UPDATE_MESSAGE: function (state, action) {
    const updatedMessages = state.messages.map(message => {
      if (message.id && message.id === action.message.id) {
        return { ...action.message };
      }
      return message;
    });
    return { messages: updatedMessages };
  },
};

const actions = util.actionTypes(reducers);

/** Actions */

/**
 * @param {ToastMessage} message
 */
function addMessage(message) {
  return { type: actions.ADD_MESSAGE, message };
}

/**
 * Remove the `message` with the corresponding `id` property value.
 *
 * @param {string} id
 */
function removeMessage(id) {
  return { type: actions.REMOVE_MESSAGE, id };
}

/**
 * Update the `message` object (lookup is by `id`).
 *
 * @param {ToastMessage} message
 */
function updateMessage(message) {
  return { type: actions.UPDATE_MESSAGE, message };
}

/** Selectors */

/**
 * Retrieve a message by `id`
 *
 * @param {string} id
 * @return {Object|undefined}
 */
function getMessage(state, id) {
  return state.messages.find(message => message.id === id);
}

/**
 * Retrieve all current messages
 *
 * @return {Object[]}
 */
function getMessages(state) {
  return state.messages;
}

/**
 * Return boolean indicating whether a message with the same type and message
 * text exists in the state's collection of messages. This matches messages
 * by content, not by ID (true uniqueness).
 *
 * @param {string} type
 * @param {string} text
 * @return {boolean}
 */
function hasMessage(state, type, text) {
  return state.messages.some(message => {
    return message.type === type && message.message === text;
  });
}

export default createStoreModule(initialState, {
  namespace: 'toastMessages',
  reducers,
  actionCreators: {
    addToastMessage: addMessage,
    removeToastMessage: removeMessage,
    updateToastMessage: updateMessage,
  },
  selectors: {
    getToastMessage: getMessage,
    getToastMessages: getMessages,
    hasToastMessage: hasMessage,
  },
});
