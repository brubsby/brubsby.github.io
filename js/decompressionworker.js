importScripts('lz-string.min.js');
onmessage = function(e) {
  postMessage(JSON.parse(LZString.decompressFromUTF16(e.data)));
}
