importScripts('lz-string.min.js');
onmessage = function(e) {
  postMessage(LZString.compressToUTF16(JSON.stringify(e.data)));
}
