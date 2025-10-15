// firebase-adapter.js
// Lightweight runtime adapter: rewrites outgoing requests targeting Base44 hosts
// to your Firebase Functions host (emulator in dev, deployed function in prod).
(function () {
  const CONFIG = {
    // change these to match your deployed project when ready
    // The emulator default for Functions when using `firebase emulators:start` is http://localhost:5001/<project>/us-central1
    // We include a flexible emulatedFunctionsBase; the adapter will preserve the original path after the functions base.
    emulatedFunctionsBase: 'http://localhost:5001', // emulator base (will append project/region if needed)
    // Replace with your actual deployed functions domain (region + project) when ready
    deployedFunctionsBase: 'https://us-central1-life-app-db4fd.cloudfunctions.net',
    base44Hosts: ['app.base44.com', 'base44.app', 'app--preview.base44.app']
  };

  function isBase44HostHost(host) {
    return CONFIG.base44Hosts.some(h => host.includes(h));
  }

  function rewriteUrlStr(urlStr) {
    try {
      const url = new URL(urlStr, window.location.origin);
      if (isBase44HostHost(url.hostname)) {
        // Keep path and query, prepend functions base and function name 'api'
        // Example: https://app.base44.com/api/apps -> <functionsBase>/api/apps
        // If your deployed functions export differently adjust accordingly.
        const path = url.pathname + (url.search || '');
        const useEmulator = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const base = useEmulator ? CONFIG.emulatedFunctionsBase : CONFIG.deployedFunctionsBase;
        // The functions export is at <functionsBase>/<project>/(region)/api in emulator; allow adapter to work with either by not injecting extra segments.
        // If your emulator exposes functions at http://localhost:5001/<project>/us-central1/api then the developer should set emulatedFunctionsBase accordingly.
        return base.replace(/\/$/, '') + path;
      }
    } catch (e) {
      // Ignore
    }
    return urlStr;
  }

  // Patch fetch
  const _fetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    let url = input;
    if (typeof input === 'string') {
      url = rewriteUrlStr(input);
    } else if (input && input.url) {
      const newUrl = rewriteUrlStr(input.url);
      if (newUrl !== input.url) {
        input = new Request(newUrl, input);
      }
    }
    return _fetch(input, init);
  };

  // Patch XHR open
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    try {
      const newUrl = rewriteUrlStr(url);
      return _open.call(this, method, newUrl, ...Array.prototype.slice.call(arguments, 2));
    } catch (e) {
      return _open.apply(this, arguments);
    }
  };

  // Patch WebSocket if needed
  if (window.WebSocket) {
    const _WS = window.WebSocket;
    window.WebSocket = function (url, protocols) {
      const newUrl = rewriteUrlStr(url);
      return new _WS(newUrl, protocols);
    };
    window.WebSocket.prototype = _WS.prototype;
  }

  console.info('[firebase-adapter] initialized');
})();
