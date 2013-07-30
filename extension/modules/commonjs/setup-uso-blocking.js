'use strict';

const { PageMod } = require('sdk/page-mod');

exports.setup = function(IDs) {
  let mod = PageMod({
    include: RegExp('https?://userscripts.org/scripts/[^/]*/(' + IDs.join('|') + ').*'),
    contentScriptFile: 'resource://scriptish/page-mods/blocked-uso-scripts.js',
    contentScriptWhen: 'end',
    attachTo: ['existing', 'top', 'frame']
  });
  return mod;
}
