/* jshint strict: true, esversion: 6, browser: true */
/* exported Debug */

class Debug {
  
  constructor( ) {
    this.key   = 'debug';
    this.level = 0;
    this.time_last   = Date.now();
    this.time_flags  = {};
  }

  init( key, level ) {
    this.key   = key;
    this.level = level;
/* jshint ignore:start */
    console.time( this.key );
/* jshint ignore:end */
    return this;
  }

  out( msg ) {
    msg = '**'+this.key+'**  ' +msg+'         -~~ '+((Date.now()-this.time_last)/1000 )+'sec';
    this.time_last = Date.now();
    /* jshint ignore:start */
    switch( this.debug ) {
      case 2:
        console.timeLog(this.key, msg, this);
        break;
      case 1:
        console.timeLog(this.key, msg);
        break;
    }
    /* jshint ignore:end */
    return this;
  }

  msg( msg ) {
    return this.out( ' - '+msg );
  }

  start( code ) {
    this.time_flags[ code ] = Date.now();
    return this.out( 'Starting: '+code );
  }

  end( code ) {
    return this.out( 'Finishing: '+code+ ' - time taken '+(( Date.now() - this.time_flags[code])/1000)+'sec' );
  }
}
