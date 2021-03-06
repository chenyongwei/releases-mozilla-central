/**
 * Handling native paths.
 *
 * This module contains a number of functions destined to simplify
 * working with native paths through a cross-platform API. Functions
 * of this module will only work with the following assumptions:
 *
 * - paths are valid;
 * - paths are defined with one of the grammars that this module can
 *   parse (see later);
 * - all path concatenations go through function |join|.
 *
 * Limitations of this implementation.
 *
 * Windows supports 6 distinct grammars for paths. For the moment, this
 * implementation supports the following subset:
 *
 * - drivename:backslash-separated components
 * - backslash-separated components
 * - \\drivename\ followed by backslash-separated components
 *
 * Additionally, |normalize| can convert a path containing slash-
 * separated components to a path containing backslash-separated
 * components.
 */

"use strict";

// Boilerplate used to be able to import this module both from the main
// thread and from worker threads.
if (typeof Components != "undefined") {
  // Global definition of |exports|, to keep everybody happy.
  // In non-main thread, |exports| is provided by the module
  // loader.
  this.exports = {};
} else if (typeof "module" == "undefined" || typeof "exports" == "undefined") {
  throw new Error("Please load this module using require()");
}

let EXPORTED_SYMBOLS = [
  "basename",
  "dirname",
  "join",
  "normalize",
  "split",
  "winGetDrive",
  "winIsAbsolute"
];

/**
 * Return the final part of the path.
 * The final part of the path is everything after the last "\\".
 */
let basename = function(path) {
  if (path.startsWith("\\\\")) {
    // UNC-style path
    let index = path.lastIndexOf("\\");
    if (index != 1) {
      return path.slice(index + 1);
    }
    return ""; // Degenerate case
  }
  return path.slice(Math.max(path.lastIndexOf("\\"),
                             path.lastIndexOf(":")) + 1);
};
exports.basename = basename;

/**
 * Return the directory part of the path.
 *
 * If the path contains no directory, return the drive letter,
 * or "." if the path contains no drive letter or if option
 * |winNoDrive| is set.
 *
 * Otherwise, return everything before the last backslash,
 * including the drive/server name.
 *
 *
 * @param {string} path The path.
 * @param {*=} options Platform-specific options controlling the behavior
 * of this function. This implementation supports the following options:
 *  - |winNoDrive| If |true|, also remove the letter from the path name.
 */
let dirname = function(path, options) {
  let noDrive = (options && options.winNoDrive);

  // Find the last occurrence of "\\"
  let index = path.lastIndexOf("\\");
  if (index == -1) {
    // If there is no directory component...
    if (!noDrive) {
      // Return the drive path if possible, falling back to "."
      return this.winGetDrive(path) || ".";
    } else {
      // Or just "."
      return ".";
    }
  }

  if (index == 1 && path.charAt(0) == "\\") {
    // The path is reduced to a UNC drive
    if (noDrive) {
      return ".";
    } else {
      return path;
    }
  }

  // Ignore any occurrence of "\\: immediately before that one
  while (index >= 0 && path[index] == "\\") {
    --index;
  }

  // Compute what is left, removing the drive name if necessary
  let start;
  if (noDrive) {
    start = (this.winGetDrive(path) || "").length;
  } else {
    start = 0;
  }
  return path.slice(start, index + 1);
};
exports.dirname = dirname;

/**
 * Join path components.
 * This is the recommended manner of getting the path of a file/subdirectory
 * in a directory.
 *
 * Example: Obtaining $TMP/foo/bar in an OS-independent manner
 *  var tmpDir = OS.Constants.Path.tmpDir;
 *  var path = OS.Path.join(tmpDir, "foo", "bar");
 *
 * Under Windows, this will return "$TMP\foo\bar".
 */
let join = function(...path) {
  let paths = [];
  let root;
  let absolute = false;
  for each(let subpath in path) {
    let drive = this.winGetDrive(subpath);
    let abs   = this.winIsAbsolute(subpath);
    if (drive) {
      root = drive;
      let component = trimBackslashes(subpath.slice(drive.length));
      if (component) {
        paths = [component];
      } else {
        paths = [];
      }
      absolute = abs;
    } else if (abs) {
      paths = [trimBackslashes(subpath)];
      absolute = true;
    } else {
      paths.push(trimBackslashes(subpath));
    }
  }
  let result = "";
  if (root) {
    result += root;
  }
  if (absolute) {
    result += "\\";
  }
  result += paths.join("\\");
  return result;
};
exports.join = join;

/**
 * Return the drive name of a path, or |null| if the path does
 * not contain a drive name.
 *
 * Drive name appear either as "DriveName:..." (the return drive
 * name includes the ":") or "\\\\DriveName..." (the returned drive name
 * includes "\\\\").
 */
let winGetDrive = function(path) {
  if (path.startsWith("\\\\")) {
    // UNC path
    if (path.length == 2) {
      return null;
    }
    let index = path.indexOf("\\", 2);
    if (index == -1) {
      return path;
    }
    return path.slice(0, index);
  }
  // Non-UNC path
  let index = path.indexOf(":");
  if (index <= 0) return null;
  return path.slice(0, index + 1);
};
exports.winGetDrive = winGetDrive;

/**
 * Return |true| if the path is absolute, |false| otherwise.
 *
 * We consider that a path is absolute if it starts with "\\"
 * or "driveletter:\\".
 */
let winIsAbsolute = function(path) {
  let index = path.indexOf(":");
  return path.length > index + 1 && path[index + 1] == "\\";
};
exports.winIsAbsolute = winIsAbsolute;

/**
 * Normalize a path by removing any unneeded ".", "..", "\\".
 * Also convert any "/" to a "\\".
 */
let normalize = function(path) {
  let stack = [];

  // Remove the drive (we will put it back at the end)
  let root = this.winGetDrive(path);
  if (root) {
    path = path.slice(root.length);
  }

  // Remember whether we need to restore a leading "\\" or drive name.
  let absolute = this.winIsAbsolute(path);

  // Normalize "/" to "\\"
  path = path.replace("/", "\\");

  // And now, fill |stack| from the components,
  // popping whenever there is a ".."
  path.split("\\").forEach(function loop(v) {
    switch (v) {
    case "":  case ".": // Ignore
      break;
    case "..":
      if (stack.length == 0) {
        if (absolute) {
          throw new Error("Path is ill-formed: attempting to go past root");
        } else {
         stack.push("..");
        }
      } else {
        if (stack[stack.length - 1] == "..") {
          stack.push("..");
        } else {
          stack.pop();
        }
      }
      break;
    default:
      stack.push(v);
    }
  });

  // Put everything back together
  let result = stack.join("\\");
  if (absolute) {
    result = "\\" + result;
  }
  if (root) {
    result = root + result;
  }
  return result;
};
exports.normalize = normalize;

/**
 * Return the components of a path.
 * You should generally apply this function to a normalized path.
 *
 * @return {{
 *   {bool} absolute |true| if the path is absolute, |false| otherwise
 *   {array} components the string components of the path
 *   {string?} winDrive the drive or server for this path
 * }}
 *
 * Other implementations may add additional OS-specific informations.
 */
let split = function(path) {
  return {
    absolute: this.winIsAbsolute(path),
    winDrive: this.winGetDrive(path),
    components: path.split("\\")
  };
};
exports.split = split;

/**
* Utility function: Remove any leading/trailing backslashes
* from a string.
*/
let trimBackslashes = function trimBackslashes(string) {
  return string.replace(/^\\+|\\+$/g,'');
};

//////////// Boilerplate
if (typeof Components != "undefined") {
  this.EXPORTED_SYMBOLS = EXPORTED_SYMBOLS;
  for (let symbol of EXPORTED_SYMBOLS) {
    this[symbol] = exports[symbol];
  }
}
