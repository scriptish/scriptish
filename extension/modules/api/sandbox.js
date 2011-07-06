// These script bits will only run unprivileged in a sandbox

const GM_updatingEnabled = true;

function GM_addStyle(css) {
  var head = document.getElementsByTagName("head")[0];
  if (head) {
    var style = document.createElement("style");
    style.textContent = css;
    style.type = "text/css";
    head.appendChild(style);
  }
  return style;
}
