// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Get the current URL.
 *
 * @param {function(string)} callback called when the URL of the current tab
 *   is found.
 */
function getCurrentTabUrl(callback) {
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };
  // See https://developer.chrome.com/extensions/tabs#type-Tab

  chrome.tabs.query(queryInfo, (tabs) => {
    // chrome.tabs.query invokes the callback with a list of tabs that match the
    // query. When the popup is opened, there is certainly a window and at least
    // one tab, so we can safely assume that |tabs| is a non-empty array.
    // A window can only have one active tab at a time, so the array consists of
    // exactly one tab.
    var tab = tabs[0];

    // A tab is a plain object that provides information about the tab.
    var url = tab.url;

    // tab.url is only available if the "activeTab" permission is declared.
    // If you want to see the URL of other tabs (e.g. after removing active:true
    // from |queryInfo|), then the "tabs" permission is required to see their
    // "url" properties.
    console.assert(typeof url == 'string', 'tab.url should be a string');

    callback(url);
  });

  // Most methods of the Chrome extension APIs are asynchronous. This means that
  // you CANNOT do something like this:
  //
  // var url;
  // chrome.tabs.query(queryInfo, (tabs) => {
  //   url = tabs[0].url;
  // });
  // alert(url); // Shows "undefined", because chrome.tabs.query is async.
}

/**
 * Change the text size of the current page.
 *
 * @param {string} size The new text size.
 */
function changeSize(size) {
  var script = 'document.body.style.fontSize="' + size + '";';
  // See https://developer.chrome.com/extensions/tabs#method-executeScript.
  // chrome.tabs.executeScript allows us to programmatically inject JavaScript
  // into a page. Since we omit the optional first argument "tabId", the script
  // is inserted into the active tab of the current window, which serves as the
  // default.
  chrome.tabs.executeScript({
    code: script
  });
}

/**
 * Gets the saved text size for url.
 *
 * @param {string} url URL whose text size is to be retrieved.
 * @param {function(string)} callback called with the saved text size for
 *     the given url on success, or a falsy value if no text size is retrieved.
 */
function getSavedSize(url, callback) {
  // See https://developer.chrome.com/apps/storage#type-StorageArea. We check
  // for chrome.runtime.lastError to ensure correctness even when the API call
  // fails.
  chrome.storage.sync.get(url, (items) => {
    callback(chrome.runtime.lastError ? null : items[url]);
  });
}

/**
 * Sets the given text size for url.
 *
 * @param {string} url URL for which text size is to be saved.
 * @param {string} size The text size to be saved.
 */
function saveSize(url, size) {
  var items = {};
  items[url] = size;
  // See https://developer.chrome.com/apps/storage#type-StorageArea. We omit the
  // optional callback since we don't need to perform any action once the
  // text size is saved.
  chrome.storage.sync.set(items);
}

// This extension loads the saved text size for the current tab if one
// exists. The user can select a new text size from the dropdown for the
// current page, and it will be saved as part of the extension's isolated
// storage. The chrome.storage API is used for this purpose. This is different
// from the window.localStorage API, which is synchronous and stores data bound
// to a document's origin. Also, using chrome.storage.sync instead of
// chrome.storage.local allows the extension data to be synced across multiple
// user devices.
document.addEventListener('DOMContentLoaded', () => {
  getCurrentTabUrl((url) => {
    var dropdown = document.getElementById('dropdown');

    // Load the saved text size for this page and modify the dropdown
    // value, if needed.
    getSavedSize(url, (savedSize) => {
      if (savedSize) {
        changeSize(savedSize);
        dropdown.value = savedSize;
      }
    });

    // Ensure the text size is changed and saved when the dropdown
    // selection changes.
    dropdown.addEventListener('change', () => {
      changeSize(dropdown.value);
      saveSize(url, dropdown.value);
    });
  });
});
