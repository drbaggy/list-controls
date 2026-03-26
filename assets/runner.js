/* jshint strict: true, esversion: 6, browser: true */
/* globals Support: false, Debug: true, ListControls: true */

(function() {
  "use strict";
  var s = new Support();
  var d = new Debug();
  window.ctls = s.qm('.list-container').map( (el) => new ListControls( el, d, s ) );
}() );  
