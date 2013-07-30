'use strict';

(function() {
  let installDiv = document.getElementById('install_script');
  if (!installDiv)
    return;

  let installLink = document.evaluate(".//a[@class='userjs']", installDiv, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  if (!installLink)
    return;
  installLink.href = '#';
  installLink.textContent = 'Blocked';
  installLink.style.background = 'no-repeat scroll right -130px red';

  let installHelp = document.evaluate(".//a[@class='help']", installDiv, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  if (!installHelp)
    return;
  installHelp.parentNode.removeChild(installHelp);
})();
