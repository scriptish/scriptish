
function GM_addStyle(css, node) {
  node = node || document.getElementsByTagName("head")[0];
  if (node) {
    var style = document.createElement("style");
    style.textContent = css;
    style.type = "text/css";
    node.appendChild(style);
  }

  return style;
}
