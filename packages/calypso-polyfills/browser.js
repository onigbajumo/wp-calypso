// Polyfills required for the browser build of Calypso.
// Note that these polyfills will not necessarily be included in the build,
// since Calypso makes use of @babel/preset-env and browserslist configs to
// avoid including polyfills for features that are supported across all target
// browsers.

import 'core-js/stable';
import 'regenerator-runtime/runtime';
