/* Popup: read and save settings */
(function () {
  "use strict";
  const api = (typeof browser !== "undefined") ? browser : chrome;

  const enabledEl = document.getElementById("toggle-enabled");
  const fontEl = document.getElementById("toggle-font");

  // storageGet: works with both Promise (Firefox) and callback (Chrome)
  function storageGet(keys, cb) {
    var result = api.storage.local.get(keys);
    if (result && typeof result.then === "function") {
      result.then(function (res) { cb(res || {}); });
    } else {
      // Chrome passes result directly to callback (already handled above
      // when api === chrome), but in case the branch hits a callback path:
      cb(result || {});
    }
  }

  // Load saved state
  storageGet(["enabled", "font"], function (res) {
    enabledEl.checked = (typeof res.enabled === "boolean") ? res.enabled : true;
    fontEl.checked    = (typeof res.font    === "boolean") ? res.font    : true;
  });

  // Save on change
  enabledEl.addEventListener("change", function () {
    api.storage.local.set({ enabled: enabledEl.checked });
  });

  fontEl.addEventListener("change", function () {
    api.storage.local.set({ font: fontEl.checked });
  });
})();
