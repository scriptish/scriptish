/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is DownThemAll! RegExp optimizing merger
 *
 * The Initial Developer of the Original Code is Nils Maier
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Nils Maier <MaierMan@web.de>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

"use strict";

const EXPORTED_SYMBOLS = ['merge'];

const RE_GROUPSTRIP = /\(.*\)/g;

/**
 * Return a good prefix, without out bracket mismatches
 *
 * @param string Calculate the prefix from
 * @return {String} Calculated safe prefix without bracket mismatches
 */
function killInvalidBrackets(string) {
  let c = 0; // num of unclosed (
  let C = 0; // num of unclosed [
  let good = -1; // last good position
  let strLen = string.length;

  for (let i = 0; i < strLen; ++i) {
    let ch = string[i];

    if (ch == "\\") {
      // step over escaping
      ++i;
      continue;
    }

    // ()
    if (ch == '(') {
      if (!C) {
        // not in a character class []
        if (!c) {
          // not open yet
          good = i - 1;
        }
        ++c;
      }
      continue;
    }
    if (ch == ')') {
      if (!C) {
        // not in a character class []
        --c;
        if (c < 0) {
          // cannot be valid and negative at the same time
          // At this point the regex would be bad
          break;
        }
        if (!c && !C) {
          // all closed
          good = i;
        }
      }
      continue;
    }

    // []
    if (ch == '[') {
      if (!C && !c) {
        // last good (nothing open)
        good = i - 1;
      }
      ++C;
    }
    if (ch == ']') {
      --C;
      if (C < 0) {
        // cannot be valid and negative at the same time
        break;
      }
      if (!C && !c) {
        // all closed now
        good = i;
      }
    }
  }

  if (c == 0 && C == 0) {
    // all closed, use whole string
    return string;
  }
  if (good >= 0) {
    // something is bad, but we got a good position
    return string.substring(0, good + 1);
  }

  // whole string is invalid
  return "";
}

/**
 * Recursively determine the the largest group with a common prefix
 * The group is guaranteed to contain at least 3 items
 *
 * @param patterns Patterns to process. Must be sorted.
 * @param low Optional. Low bound. Default = 0
 * @param high Optional. High bound. Default = patterns.length
 * @param level Optional. Recursion level. Default = length
 */
function largestPrefixGroup(patterns, low, high, level) {
  level = level || 0;
  low = low || 0;
  high = high || patterns.length;

  // split patterns in heading char and tails
  let heads = patterns.map(function(p) p.charAt(0));
  let tails = patterns.map(function(p) p.substring(1));

  let besti = -1; // best starting match
  let beste = 0;  // best ending match
  let bestc = 0; // num of matches

  for (let i = low; i < high - 1; ++i) {
    let allgood = true;
    for (let e = i + 1; e < high; ++e) {
      if (heads[i] == heads[e]) {
        continue;
      }

      // mismatched!
      let c = e - i;
      if (bestc < c) {
        bestc = c;
        beste = e;
        besti = i;
      }
      allgood = false;
      break;
    }

    if (allgood) {
      let c = high - i;
      if (bestc < c) {
        bestc = c;
        besti = i;
        beste = high;
      }
    }
  }

  if (bestc < Math.min(4, Math.max(2, patterns.length))) {
    // at least 3 items in the group are required
    return [0,0,0];
  }

  let head = heads[besti];

  if (tails.some(function(p) p.length == 0)) {
    return [besti, beste, head];
  }

  let [nlow, nhigh, np] = largestPrefixGroup(tails, besti, beste, level + 1);
  if (nhigh) {
    let prefix = head + np;
    if (!level) {
      // root level needs to check for bracket mismatches
      // this might cause the group to get smaller than it has to be
      // Consumers should/will account for this
      prefix = killInvalidBrackets(prefix);
    }
    return [nlow, nhigh, prefix];
  }

  return [besti, beste, head];
}

/**
 * Merge prefix group with set of patterns according to bounds and prefix
 *
 * @param patterns {array} Set of patterns
 * @param low {int} Lower bound
 * @param high {int} Higher bound
 * @param prefix {string} Prefix of the group
 * @return {array} mutated & reduced patterns array where the patterns specified
 *                 by the low & high params are merged.
 */
function mergePatterns(patterns, low, high, prefix) {
  let pl = prefix.length;

  // splice the patterns to be merged, and chop off their common prefix
  let tails = patterns.splice(low, high - low).map(function(p) p.substring(pl));

  // build a tail pattern
  let tail = tails.map(function(p) {
    // strip out group expressions so that their inner '|'s are ignored
    // TODO: atm "() | ()".replace(RE_GROUPSTRIP, '') == "" is bad
    if (p.replace(RE_GROUPSTRIP, '').indexOf('|') == -1) {
      return p;
    }

    return "(?:" + p + ")";
  }).join("|");

  // add merged pattern
  if (prefix) {
    patterns.push(prefix + "(?:" + tail + ")");
  } else {
    patterns.push(tail);
  }

  // need to return sorted as largestPrefixGroup relies on sorting
  return patterns.sort();
}

/**
 * Merge patterns with optimizations (prefixes)
 * @param patterns Patterns to merge
 * @returns {String} Resulting merged and optimized pattern
 */
function merge(patterns) {
  patterns = patterns.slice(0);

  if (patterns.length < 2) {
    return patterns[0];
  }

  patterns.sort();

  for (;;) {
    let [i, e, prefix] = largestPrefixGroup(patterns);
    if (!e) {
      // no common prefix found in (remaining) patterns
      break;
    }
    patterns = mergePatterns(patterns, i, e, prefix);
  }

  let len = patterns.length;
  if (len == 1) {
    // already merged in to a single pattern
    return patterns[0];
  }

  // not yet a single pattern (i.e. not all patterns shared a common prefix)
  // merge without a prefix to get a single pattern
  return mergePatterns(patterns, 0, len, "")[0];
}
