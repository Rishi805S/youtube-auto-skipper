// inject.js
(function grabYtcfg() {
  const data = window.ytcfg?.data_;
  window.postMessage({ type: 'SPONSORSKIP_YTCFG', data }, '*');
})();