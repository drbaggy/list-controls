/* jshint bitwise: true, strict: true, esversion: 6, browser: true */
/* exported ListControls */

const LIST_CONTROLS_DEFAULTS = {
  TIMEOUT:        1500,
  PAGE_SIZE:      12,
  PAGE_TYPE:      'pages',
  DATA_KEY:       'items',
  INDEX_PAD_SIZE: 10,
  AUTO_ENTRIES:   5,
  DEFAULT_BEBUG:  1,
};

class ListControls {

//    debug                   - whether to log fn calls and/or object
//    container_element             - HTML element containing list
//    data_key                - Key for hash parameter
//    filter_keys             - Keys of those filter elements
//    filter_info             - Info about keys.

//    sorter_elements               - Sorter HTML elements
//    sort_keys               - Keys of sorter elements - IN sort order
//    sort_direction          - Sort direction whether ascending or descending

//    pagination_type   = ''  - type of pagination none, more or pages
//    page_size         = 0   - Page size for pagination
//    current_page      = 0   - Current page in view (or number of pages in infini mode)

//    items             = []  - Array of items with their meta data
//    n_items           = 0   - number of items.
//    n_filtered_items  = 0   - Number of visible items because of filter
//    default_hash            - Hash which would appear if no images are selected.
//    pad_size          = 8

  constructor( element, debug, support ) {
    this.debug              = debug;
    this.support            = support;
    this.container_element  = element;
    this.data_key           = ( 'key' in element.dataset ) ?
                                element.dataset.key : LIST_CONTROLS_DEFAULTS.DATA_KEY;

    this.filter_keys        = [];
    this.filter_info        = {};

    this.sorter_elements    = [];
    this.sort_keys          = [];
    this.sort_direction     = {};

    this.pagination_type    = LIST_CONTROLS_DEFAULTS.PAGE_TYPE;
    this.page_size          = LIST_CONTROLS_DEFAULTS.PAGE_SIZE;
    this.current_page       = 0;

    this.items              = [];
    this.n_items            = 0;
    this.n_filtered_items   = 0;

    this.default_hash       = '';
    this.pad_size           = LIST_CONTROLS_DEFAULTS.INDEX_PAD_SIZE;

    this.debug.start('constructor');
    this.process_pagination()     // Work out what form of pagination there is
        .process_filters()        // Work out what the filters are and values
        .process_sorters()        // Work out if we have any sorters...
        .store_defaults()         // Used to work out if the hash has to be set!
        .process_items()          // Get items and
        .set_sort_order_values()  // Create sort index strings...
        .process_location()       // Parse process and update
        .update_location()        // Rewrite location
                                  //  `--- check against default...
        .generate_pagination()    // Generate pagination links
        .add_functions()          // Add onclick, onkeyup & onchange events
        .display_filter_counts()  // Display filter counts in select boxes
        .display_cards()          // Activate cards which are visible...
        .enable_cards()
        ;
    this.debug.end('constructor');
  }

/*
* Part I - process the HTML structure
*
*   - process_pagination    - look for "pagination elements" and collect information
*   - process_filters       - look for filter inputs and collect information
*   - process_sorters       - look for sorter inputs/elements and collect information
*   - store_defaults        - store default options
*   - process_items         - look for list items, parse and store
*   - set_sort_order_values - create "index strings" for each item.
*/

  // Process the parameter hash passed int #{} part of URL.
  process_pagination( ) {
    this.debug.msg( "process_pagination" );
    var _ = this.support;
    // Get pagination options
    this.pagination_type = 'none';
    this.current_page    = 0;

    this.page_size       = 'batchSize' in this.container_element.dataset            ?
                            parseInt( this.container_element.dataset.batchSize, 10 ) :
                            LIST_CONTROLS_DEFAULTS.PAGE_SIZE;
    _.s(this.container_element,'.list-page-size select', (x) => x.value = this.page_size );

    if( _.qs(         this.container_element, '.list-pagination'  ) ) {
      this.pagination_type = 'page';
    } else if( _.qs(  this.container_element, '.list-expand'      ) ) {
      this.pagination_type = 'more';
    }

    return this;
  }

  process_filters( ) {
    var _ = this.support;
    this.debug.msg( "process_filters" );
    var self = this;
    var filt   = _.qm(this.container_element,'.list-filters > label > select, .list-filters > label > input, .list-filters > div.list-span-filter');
    this.filter_info = {};
    filt.forEach( function(x) {
      var o = {
        type:             x.dataset.filterType,
        value:            '',
        filtered_entries: 0,
        element:          x,
        entries:          'entries' in x.dataset ?
                            x.dataset.entries :
                            LIST_CONTROLS_DEFAULTS.AUTO_ENTRIES,
      };
      if( o.type == 'lookup' || o.type == 'array' ) {
        o.counts          = {};
        o.filtered_counts = {};
        if(_.has_class( x, 'list-span-filter' )) {
          _.m(x,'span[data-value]',function(sp) {
            var v = sp.dataset.value;
            if( v !== '' ) {
              o.counts[          v ] = 0;
              o.filtered_counts[ v ] = 0;
            }
          });
        } else {
          _.m(x,'option', function( opt ) {
            var v = _.a(opt,'value');
            if( v !== '' ) {
              o.counts[          v ] = 0;
              o.filtered_counts[ v ] = 0;
            }
            opt.innerHTML = opt.innerHTML+' (<span></span>)';
          });
        }
      }
      self.filter_info[ x.dataset.filter ] = o;
    });
    this.filter_keys = Object.keys( this.filter_info );
    return this;
  }

  process_sorters() {
    var _ = this.support;
    this.debug.msg( "process_sorters" );
    var self = this;
    this.sort_direction = {};
    if( _.qs(this.container_element,'.list-sorters select' ) ) {
      this.sorter_elements = _.qs(this.container_element,'.list-sorters select');
      this.sort_keys = [];
      Array.from(this.sorter_elements.options)
        .forEach( function(f) {
          var field = f.value;
          var direction ='up';
          if( field.startsWith('-')) {
            field = field.substring(1);
            direction = 'down';
          }
          if( ! self.sort_keys.includes(field) ) {
            self.sort_keys.push(field);
          }
          if( ! (field in self.sort_direction) ) {
            self.sort_direction[field] = direction;
          }
        });
    } else {
      this.sorter_elements = _.qm(this.container_element,'.list-sorters span[data-sorter], .list-sorters th[data-sorter]');
      this.sort_keys = this.sorter_elements.map( (x) => x.dataset.sorter );
      this.sorter_elements.forEach( function( x ) {
        if( x.dataset.sorter ) {
          self.sort_direction[ x.dataset.sorter ] =
            'direction' in x.dataset ? x.dataset.direction : 'up';
        }
      } );
    }
    this.sort_keys.unshift( 'index' );
    this.sort_direction = Object.assign(
      { index: 'up' },
      this.sort_direction
    );
    return this;
  }

  store_defaults() {
    this.debug.msg( "set_defaults" );
    var self = this;
    this.default_hash = {
      current_page: 0,
      page_size:    this.page_size,
      sorters:      this.sort_keys.reduce(   function(a,k) {
        a[k] = self.sort_direction[k];
        return a;
      }, {} ),
      filters:      this.filter_keys.reduce( function(a,k) {
        a[k] = self.filter_info[k].value;
        return a;
      }, {} ),
    };
    return this;
  }

  process_items() {
    var _ = this.support;
    this.debug.msg( "process_items" );
    // Fetch and process data on items to return data structure
    var els               = _.qm(this.container_element,'.list-items > *');
    _.qs(this.container_element,'.list-items' ).innerHTML = '';
    var self              = this;
    this.n_items          = els.length;
    this.n_filtered_items = els.length;
    this.pad_size         = Math.ceil( Math.log10( 2 * els.length) );
    this.filter_keys.forEach( function( x ) {
      self.filter_info[x].filtered_entries = self.n_items;
    } );
    this.items            = els.map( function(e,i){
      // Create proxy card
      var ret = {
        idx:          {
          index: self.rank_string( i )
        },
        rev_idx:      {
          index: self.rank_string( self.n_items - i )
        },
        data:         Object.assign( {}, e.dataset ),
        not_visible:  0,
        element:      e
      };
      Object.entries(ret.data)
        .forEach( function([k,v]) {
          if( v.startsWith('{') || v.startsWith('[') ) {
            try {
              ret.data[k] = JSON.parse( v );
            } catch(err) {}
          }
        } );
      e.dataset.index = i;
      // Compute counts...
      self.filter_keys.forEach( function( x ) {
        var d = self.filter_info[x];
        switch( d.type ) {
          case 'lookup':
            if( ret.data[x] in d.counts ) {
              d.counts[ ret.data[x] ] ++;
            } else {
              d.counts[ ret.data[x] ] = 1;
            }
          break;
          case 'array':
            Object.keys(ret.data[x]).forEach(function(k) {
              if( k in d.counts ) {
                d.counts[ k ] ++;
              } else {
                d.counts[ k ] = 1;
              }
            } );
          break;
        }
      } );
      return ret;
    } );
    self.filter_keys.forEach( function(x) {
      var d = self.filter_info[x];
      if( 'counts' in d ) {
        Object.entries(d.counts)
        .forEach( (k) => d.filtered_counts[k[0]] = k[1] );
      }
    });
    return this;
  }

  reset_popup_delay() {
    var self = this;
    if( this.timeout ) {
      window.clearTimeout( this.timeout );
    }
    this.timeout = window.setTimeout( function() {
        self.reset_popup();
      },
      LIST_CONTROLS_DEFAULTS.TIMEOUT );
    return false;
  }

  reset_popup( ) {
    var _ = this.support;
    if( this.timeout ) {
      window.clearTimeout( this.timeout );
    }
    var popup = _.qs( this.container_element, '.popup' );
    var filter_name = popup.dataset.filter;
    popup.remove();
    var filter = this.filter_info[ filter_name ];
    if( filter.value == '' ) {
      filter.element.value = '';
    } else {
      filter.element.value = filter.value + ' (' + filter.filtered_counts[filter.value] + ')';
    }
    return false;
  }

  create_popup( el ) {
    var _ = this.support;
    var self   = this;
    var needle = el.value.toLowerCase()
                          .replace( / \(\d+\)$/, '' );
    var filter = this.filter_info[ el.dataset.filter ];
    var values = Object.keys(filter.filtered_counts)
      .filter(
        (x) => filter.filtered_counts[x] > 0 &&
          x.toLowerCase().includes(needle)
      ).sort( (a,b) => filter.filtered_counts[b] - filter.filtered_counts[a] );
    var x = _.qs(el.parentElement,'.popup');
    if( !x ) {
      x = _.c('ul',{
        'data-filter': el.dataset.filter,
        class:'popup'
      });
      _.ap( el.parentElement, x );
      x.addEventListener( 'mouseleave', function () {
        self.reset_popup_delay();
      } );
      x.addEventListener( 'mouseenter', function () {
        if( self.timeout ) {
          window.clearTimeout( self.timeout );
        }
      } );
    }
    x.innerHTML = '';

    _.ap( x, _.c( 'li', {
        'data-field': el.dataset.filter,
        'data-value': ''
      },
      filter.element.getAttribute('placeholder') ) );
    _.ap( x, values.slice(0,3)
                    .map( (v) => _.c('li', {
                        'data-value': v
                      }, v+' ('+filter.filtered_counts[v]+')' ) ) );
    return false;
  }

  set_sort_order_values() {
    this.debug.msg( "set_sort_order_values" );
    // Process each sort column and create two indecies
    // - idx & rev_idx for each column - are padded ranks
    //   so that sorting can be done as strings - we just
    //   concatenate column indexes...
    // - Means we don't need a complex sort function, just
    //   a schwartzian tranform effectively.
    var self = this;
    var l    = self.items.length;

    this.sort_keys.forEach( function(k) {
      if( k != 'index' ) {
        var s = new Set( self.items.map( (x) => x.data[k] ) );
        var rank = {};
        Array.from(s)
          .sort()
          .forEach( function(v,i) {
            rank[v] = [ self.rank_string( i ), self.rank_string( l-i ) ];
        });
        self.items.forEach( function( item ) {
          item.idx[k]     = rank[item.data[k]][0];
          item.rev_idx[k] = rank[item.data[k]][1];
        } );
      }
    });
    return this;
  }
/*
* Part II - Process the location string
*
*   - process_location      - parse # and update parameters
*   - update_location       -
*/

  process_location() {
    var _ = this.support;
    this.debug.start( "process_location" );
    var self = this;
    var json = document.location.hash;
    if( !json && !json.startsWith('#{') ) {   // No json parameter in hash
      json = '#{}';
    }
    try {           // Decode json parameter and return unless valid
      json = JSON.parse( decodeURI( json.substring(1) ) );
    } catch(error) {
      json = {};
    }
    if( typeof json !== "object" ) {
      json = {};
    }
    if( !( this.data_key in json ) ) {
      return this;
    }
    json = json[ this.data_key ];
    if( typeof json != 'object' ) {
      json = {};
    }
    if( 'page_size'    in json ) {
      this.page_size    = json.page_size;
      _.s(this.container_element,'.list-page-size select', x => x.value = self.page_size );
    }
    if( 'current_page' in json ) {
      this.current_page = json.current_page;
    }
    if( 'filters'      in json ) {
      // Set filters from json
      Object.entries( json.filters )
        .forEach( function( [k,v] ) {
          self.change_filter( k, v );
          var f = self.filter_info[ k ];
          f.value = v;
          if( f.element.tagName == 'INPUT' || f.element.tagName == 'SELECT' ) {
            f.element.value = v;
          }
        } );
    }
    this.after_filter_change();
    if( 'sorters' in json ) {
      Object.keys( json.sorters )
        .reverse()
        .forEach( function(k) {
          if( k in self.sort_direction ) {
            self.sort_keys = self.sort_keys.filter( (v) => v != k );
            self.sort_keys.unshift( k );
            self.sort_direction[ k ] = json.sorters[ k ];
          }
        });
      this.after_sorter_change();
      // Set sorters from json
    }
    this.debug.end( "process_location" );
    return this;
  }

  // Update location string when options change.
  update_location() {
    this.debug.msg( "update_location" );

    var self = this;
    var json = document.location.hash;
    if( !json ) {
      json = '#{}';
    }

    try {           // Decode json parameter and return unless valid
      json = JSON.parse( decodeURI( json.substring(1) ) );
    } catch(error) {
      json = {};
    }
    if( typeof json != 'object' ) {
      json = {};
    }

    var t = {};
    // Check page size is not default
    // if( this.page_size !== '' ) {  }
    // Check current page is not 0
    if( this.current_page > 0 ) {
      t.current_page = this.current_page;
    }
    if( this.page_size != this.default_hash.page_size ) {
      t.page_size = this.page_size;
    }
    // Check filters do not have default value
    var q = this.filter_keys.reduce( function(a,k) {
      if( self.filter_info[k].value != self.default_hash.filters[k] ) {
        a[k] = self.filter_info[k].value;
      }
      return a;
    }, {} );
    if( Object.keys(q).length > 0 ) {
      t.filters = q;
    }

    // Check sorters do not have default direction
    if(                this.sort_keys.join(             '|') !==
        Object.keys(   this.default_hash.sorters ).join('|') ||
        Object.values( this.sort_direction       ).join('|') !==
        Object.values( this.default_hash.sorters ).join('|')
    ) {
      t.sorters = this.sort_keys.reduce( function(a,k) {
        a[k] = self.sort_direction[k];
        return a;
      }, {} );
    }

    if( Object.keys(t).length ) {
      json[ this.data_key ] = t;
    } else {
      delete json[ this.data_key ];
    }
    document.location.hash =  Object.keys(json).length ?
                              encodeURI( JSON.stringify( json ) ) :
                              '';
    return this;
  }

/*
* Part III - Manage pagination
* ----------------------------
*
*   - generate_pagination       - add pagination lnks into page...
*   - generate_pagination_links - add individual button links
*/
  generate_pagination() {
    var _ = this.support;
    this.debug.msg( "generate_pagination" );
    if( this.pagination_type == 'page' ) {
      // Create divs to contain markup
      var pag_divs = _.qm( this.container_element, '.list-pagination' ); // Might have top and bottom...
      pag_divs.forEach( (x) => _.ap( x,[
        _.c( 'input', {
          type:               'hidden',
          value:              0,
          class:              'list-filter',
          'data-filter':      'page',
          'data-filter-type': 'page'
        } ),
        _.c( 'div',   {
          class:              'list-pagination-links'
        } )
      ] ) );
    }
    this.generate_pagination_links();
    return this;
  }

  generate_pagination_links() {
    var _ = this.support;
    this.debug.msg( "generate_pagination_links" );
    // No pagination...
    if( this.pagination_type == 'none' ) {
      return this;
    }
    // Show more style pagination...
    if( this.pagination_type == 'more' ) {
      _.s( this.container_element, '.list-expand span',
        (x) => x.style.display = this.page_size * ( this.current_page + 1 ) > this.n_filtered_items ? 'none' : ''
      );
      return this;
    }

    // Reset current links...
    _.s( this.container_element, '.list-pagination-links', (x) => _.clear( x ) );
    // Compute the number of nodes.
    var last_page = Math.ceil( this.n_filtered_items / this.page_size ) - 1;
    var nodes     = [];
    // If not first page add "<<" go to end link
    if( this.current_page > 0 ) {
      nodes.push( _.c( 'span', {
        'data-page': 0
      }, '&laquo;' ) );
    }
    // Compute start and end page of links....
    var start_page = this.current_page - 2;
    if( start_page < 0 ) {
      start_page = 0;
    }
    var end_page = start_page + 4;
    if( end_page > last_page ) {
      end_page   = last_page;
      start_page = end_page - 4;
      if( start_page < 0 ) {
        start_page = 0;
      }
    }
    // If gap to first page add ellipsis
    if( start_page > 0 ) {
      nodes.push( _.c( 'span', '&hellip;' ) );
    }
    // Add start end page links...
    var i;
    for( i=start_page; i<=end_page; i++ ) {
      var at = {
        'data-page': i
      };
      if( i == this.current_page ) {
        at.class = 'active';
      }
      nodes.push( _.c( 'span', at, [ _.t(i+1) ] ) );
    }
    // Add an ellipsis if there are pages before the end page
    if( end_page < last_page ) {
      nodes.push( _.c( 'span', '&hellip;' ) );
    }
    // If not last page add ">>" go to end link
    if( this.current_page < last_page) {
      nodes.push( _.c( 'span', {
        'data-page': last_page
      }, '&raquo;' ) );
    }
    // Push all the navigation nodes...
    _.s( this.container_element, '.list-pagination-links',
      (x) => _.ap( x, nodes ) );
    return this;
  }

/*
* Part IV - Actions
* -----------------
*
*   - add_functions             - add actions to elements...
*   - follow_link               - add link on whole card/row based on link in card/row
*   - change_page_size          - change number of cards/rows displayed
*   - change_sort_order         - update sort ordering meta data when "buttons pressed"
*   -   after_sorter_change     - what to do when order meta changes
*   - change_filter             - update filter meta data when "inputs changed"
*   -   update_span_filter      - handling a span based filter (add remove/active flags)
*   - clear_filters             - clear filter meta when "button pressed"
*   -   after_filter_change     - what to do when filter meta changes
*   - grow_list                 - if using "view more" add a batch...
*   - change_page               - update page meta where "buttons pressed"
*   -   after_page_change       - what to do when page meta changes
*
*   - rest_pagination           - set current page to 0 and update page
*   - update_filter_counts      - after changing filters - modify filter counts
*   - display_filter_counts     - modify select/spans to show counts...
*   - enable_cards              -
*   - filter_cards              -
*   - display_cards             - make cards invisible/visible.
*   - show_more                 -
*   - display_cards             -
*
*   - debug.init                -
*   - rank_string               -
*
*/
  add_functions() {
    var _ = this.support;
    this.debug.msg( "add_functions" );
    var self = this;
    // Add onclick, onkeyup & onchange events for sorters, filters & pagination
// MOUSE LEAVE EVENT TO CLOSE AUTOCOMPLETER
    this.container_element.addEventListener( 'mouseleave', function() {
      if( _.qs( self.container_element, '.popup' ) ) {
        self.reset_popup();
      }
    });
// CLICK EVENT
    this.container_element.addEventListener( 'click', function(e) {
      var el = e.target;
      if( _.qs( self.container_element, '.popup' ) &&
          ! _.has_class( el, '.popup' )            &&
          ! el.closest( '.popup' ) ) {
        self.reset_popup();
      }
      if( el.closest('.list-sorters' ) && 'sorter' in el.dataset ) {  // Button style sorter...
        if( 'sorter' in el.dataset ) {
          e.preventDefault();
          return self.change_sort_order( el.dataset.sorter, el );
        }
      } else if( el.closest('.list-span-filter') ) {                  // Button style filter...
        if( 'value' in el.dataset && ! _.a(el,'title').endsWith('(0)') ) {
          e.preventDefault();
          return self.change_filter(
            el.closest('.list-span-filter').dataset.filter,
            el.dataset.value );
        }
      } else if( el.classList.contains( 'list-auto-filter' ) ) {
        e.preventDefault();
        return self.create_popup( el );
      } else if( el.closest('label') &&
        _.qs( el.closest('label'),' .list-auto-filter' )
      ) {                  // Button style filter...
        if( 'value' in el.dataset && ! el.innerHTML.endsWith('(0)') ) {
          e.preventDefault();
          return self.change_auto_filter( el );
        }
      } else if( el.closest('.list-pagination-links') ) {             // Pagination links...
        if( 'page' in el.dataset ) {
          e.preventDefault();
          return self.change_page(     el.dataset.page );
        }
      } else if( el.closest('.list-expand') ) {                       // Show more links
        if( el.tagName == 'SPAN' ) {
          e.preventDefault();
          return self.grow_list( );
        }
      } else if( el.closest('.list-items') ) {
        if( _.has_class( el.parentElement, 'list-items' ) ) {
          e.preventDefault();
          return self.follow_link( el );
        } else {
          e.preventDefault();
          return self.follow_link( el.closest( '.list-items > *' ) );
        }
      }
    });
// KEY UP EVENT
    this.container_element.addEventListener( 'keyup', function(e) {
      self.debug.msg(["ON KEYUP",e.target]);
      var el = e.target;
      if( el.closest('.list-filters') && _.has_class( el, 'list-auto-filter' ) ) {    // Text filter box
        e.preventDefault();
        return self.create_popup( el );
      } else if( el.closest('.list-filters') && el.dataset.filterType == 'text' ) {    // Text filter box
        e.preventDefault();
        return self.change_filter(     el.dataset.filter, el.value );
      }
    });
// ON CHANGE EVENT
    this.container_element.addEventListener( 'change', function(e) {
      self.debug.msg(["ON CHANGE",e.target]);
      var el = e.target;
      if( el.closest('.list-sorters') ) {                             // Select form of list sorter
        e.preventDefault();
        return self.change_sort_order( el.value, el );
      } else if( el.closest('.list-page-size') ) {
        e.preventDefault();
        return self.change_page_size( el.value );
      } else if( el.closest('.list-filters') && el.classList.contains( 'list-auto-filter' ) ) {
        e.preventDefault();
      } else if( el.closest('.list-filters') ) {                      // Select for of list filters
        e.preventDefault();
        return self.change_filter(     el.dataset.filter, el.value );
      }
    });
    return this;
  }

  follow_link( card ) {
    var _ = this.support;
    this.debug.start( "follow_link" );
    var link = _.qs(card,'a.list-item-link');
    if( ! link ) {
      var t = _.qm(card,'a[href]');
      if( t.length ) {
        link = t.pop();
      }
    }
    if( link ) {
      this.debug.end( "follow_link" );
      document.location.href = _.a(link,'href');
      return false;
    }
    this.debug.end( "follow_link" );
    return false;
  }

  //
  change_page_size( size ) {
    this.debug.start( "change_page_size '" + size + "'" );
    var current_start_of_page = this.current_page * this.page_size;
    this.page_size = parseInt(size,10);
    this.current_page = Math.floor( current_start_of_page / this.page_size );
    this.generate_pagination_links()
        .display_cards()
        .update_location();
    this.debug.end( "change_page_size '" + size + "'" );
  }

  change_sort_order( field, el = 0 ) {
    this.debug.start( "change_sort_order '" + field+ "'" );
    if( el.tagName === 'SELECT' ) { // Select for....
      var direction ='up';
      if( field.startsWith('-')) {
        field = field.substring(1);
        direction = 'down';
      }
      this.sort_keys = this.sort_keys.filter( (v) => v != field );
      this.sort_keys.unshift( field );
      this.sort_direction[ field ] = direction;
    } else {
      if( field == this.sort_keys[0] ) { // Flip direction...
        this.sort_direction[ field ] = this.sort_direction[ field ] == 'down' ? 'up' : 'down';
        if( el ) {
          el.dataset.direction = this.sort_direction[ field ];
        }
      } else {
        this.sort_keys = this.sort_keys.filter( (v) => v != field );
        this.sort_keys.unshift( field );
      }
    }
    this.after_sorter_change()
        .display_cards()
        .update_location()
    ;
    this.debug.end( "change_sort_order '" + field+ "'" );
    return false;
  }

  after_sorter_change( ) {
    this.debug.msg( "after_sorter_change" );
    var self = this;

    this.items.forEach( function(e) {
      e.sort_index =
        self.sort_keys.map( (i) =>
          self.sort_direction[ i ] == 'up' ? e.idx[ i ] : e.rev_idx[ i ]
        ).join( '.' );
    } );
    this.debug.msg( "- indexed" );
    this.items = this.items.sort(function( a, b ) {
      return a.sort_index < b.sort_index ? -1 : (a.sort_index == b.sort_index ? 0 : 1);
    } );
    this.debug.msg( "- sorted" );
    // Re-order elements according to ordering...
    //var x = ...this.items.map( (e) => e.element );

    //_.qs(this.container_element,'.list-items' ).append( ...this.items.map( (e) => e.element ) );
    this.debug.msg( "- re-ordered" );
    // Need to update display as list will have changed
    this.display_cards();             // Change cards displayed
    return this;
  }

  change_auto_filter( el ) {
    var _ = this.support;
    var field       = _.qs( el.closest('label'),'.list-auto-filter' );
    var filter_name = field.dataset.filter;
    var value       = el.dataset.value;
    var filter      = this.filter_info[ filter_name ];
    el.closest('.popup')
      .remove();
    if( value === '' ) {
      field.value = '';
      return this.change_filter( filter_name, value );
    } else if ( value in filter.filtered_counts ) {
      // Check value...
      field.value = value + ' ('+filter.filtered_counts[value]+')';
      return this.change_filter( filter_name, value );
    }
    return this;
  }

  change_filter( field, value ) {
    var _ = this.support;
    this.debug.start( "change_filters '" + field + "' -> '" + value + "'" );
    var t = this.filter_info[field];
    t.value = value;
    if( _.has_class( t.element, 'list-span-filter') ) {
      this.update_span_filter( t.element, value );
    }
    this.after_filter_change();       // Apply filters
    this.debug.end( "change_filters '" + field + "' -> '" + value + "'" );
    return false;
  }

  update_span_filter( el, value ) {
    var _ = this.support;
    Array.from(el.children)
      .forEach( function(n) {
        if( n.dataset.value !== '' ) {
          if( n.dataset.value == value ) {
            _.add_class( n, 'active' );
          } else {
            _.remove_class( n, 'active' );
          }
        }
      } );
  }

  clear_filters( ) {
    this.debug.start( "clear_filters" );
    this.filter_info.forEach( (f) => f.value = '' ); // Reset filter values;
    this.after_filter_change();
    this.debug.end( "clear_filters" );
    return false;
  }

  after_filter_change() {
    this.debug.msg( "after_filter_change" );
    this.filter_cards()              // Mark cards as filtered
        .update_filter_counts()      // Update filter counts
        .display_filter_counts()
        .reset_pagination()          // Return to page 0/batch 0
        .generate_pagination_links() // Change pagination links
        .display_cards()             // Change cards displayed
        .update_location();
  }

  grow_list( ) {
    var _ = this.support;
    this.debug.start( "grow_list" );
    // Change to different page
    // Needs to check in range
    this.current_page++;
    this.generate_pagination_links()
        .display_cards()
        .update_location();
    if( (1+this.current_page) * this.page_size > this.n_filtered_items ) {
      _.s( this.container_element, '.list-expand span', (x) => x.style.display = 'none' );
    }
    this.debug.end( "grow_list" );
    return false;
  }

  change_page( n ) {
    this.debug.start( "change_page '" + n + "'" );
    // Change to different page
    // Needs to check in range
    this.current_page = n;
    this.after_page_change();
    this.debug.end( "change_page '" + n + "'" );
    return false;
  }

  after_page_change() {
    this.generate_pagination_links()
        .display_cards()
        .update_location();
    return this;
  }

  reset_pagination() {
    this.debug.msg( "reset_pagination");
    this.current_page = 0;
    return this.after_page_change( );
  }

  update_filter_counts( ) {
    this.debug.msg( "update_filter_counts" );
    var self = this;
    Object.entries( this.filter_info )
      .forEach( function([k,f]) {
        f.filtered_entries = 0;
        if( 'filtered_counts' in f ) {
          Object.keys(f.filtered_counts)
            .forEach( function( v ) {
              f.filtered_counts[v]=0;
            });
        }
    });
    this.n_filtered_items = this.items.filter( (i) => i.not_visible == 0 ).length;
    this.items.forEach(function(x) {
      var xx = 1;
      Object.entries( self.filter_info )
        .forEach( function([k,f]) {
          if( (x.not_visible | xx) == xx ) {
            f.filtered_entries++;
            switch( f.type ) {
              case 'lookup':
                f.filtered_counts[ x.data[k] ]++;
              break;
              case 'array' :
                x.data[k].forEach( (y) => f.filtered_counts[ y ]++ );
              break;
            }
          }
          xx *= 2;
        });
    });
    return this;
  }
  /** Methods which update the display - change filter counts */
  display_filter_counts( ) {
    var _ = this.support;
    this.debug.msg( "display_filter_counts" );
    // Update counts in filter dropdowns
    Object.entries(this.filter_info)
      .forEach( function(k) {
        var o = k[1];
        if( 'SELECT' === o.element.tagName ) {
          if( o.type == 'lookup' || o.type == 'array' ) {
            _.m( o.element,'option', function( opt ) {
              _.s( opt,'span', function( y ) {
                y.innerHTML = _.a(opt,'value') == '' ?
                              o.filtered_entries  :
                              o.filtered_counts[ _.a(opt,'value') ];
              });
            });
          }
        } else if( _.has_class( o.element, 'list-span-filter' )) {
          _.m( o.element, 'span[data-value]',function(sp) {
            _.sa(sp,'title', sp.innerHTML + ' ('+
              ( sp.dataset.value ? o.filtered_counts[ sp.dataset.value ] : o.filtered_entries )+
              ')' );
          });
          //}
        } else if( _.has_class( o.element, 'list-auto-filter') ) {
          var t = o.element.getAttribute('placeholder');
          o.element.setAttribute( 'placeholder', t.replace( / \(\d+\)$/, '' ) +
            ' ('+ o.filtered_entries+')' );
          if( o.value ) {
            o.element.value = o.value + ' ('+o.filtered_counts[o.value]+')';
          }
        }
      });
    return this;
  }

  enable_cards() {
    var _ = this.support;
    this.debug.msg( "enable_cards" );
    _.add_class( _.qs(this.container_element,'.list-items'), 'initialised');
    return this;
  }

  filter_cards() {
    this.debug.msg( "filter_cards" );
    var self = this;
    this.items.forEach( function(el) {
      el.not_visible = 0;
      var xx = 1;
      Object.entries(self.filter_info)
        .forEach( function(k) {
          if( k[1].value != '' ) {
            switch( k[1].type ) {
              case 'array':
                if( ! el.data[k[0]].includes( k[1].value ) ) {
                  el.not_visible |= xx;
                }
              break;
              case 'text':
                if( ! el.data[k[0]].includes( k[1].value.toLowerCase() ) ) {
                  el.not_visible |= xx;
                }
              break;
              default: // Lookup..
                if( el.data[k[0]] != k[1].value ) {
                  el.not_visible |= xx;
                }
            }
          }
          xx *= 2;
        });
    });
    return this;
  }

  show_more( ) {
    // Show more entries in...
    this.current_page++;
    this.update_display();
    return this;
  }
  // Imported all entries

  display_cards( ) {
    var _ = this.support;
    this.debug.msg( "display_cards" );
    var skip_entries = 0;
    var show_entries = this.n_items;
    switch( this.pagination_type ) {
      case 'page':
        skip_entries = this.page_size * this.current_page;
        show_entries = skip_entries + this.page_size;
        break;
      case 'more':
        show_entries = ( 1 + this.current_page ) * this.page_size;
        break;
      default:
    }
    var i = 0;
    var to_add = [];
    this.items.forEach( function( x ) {
      if( ! x.not_visible ) {
        if( i >= skip_entries && i < show_entries ) {
          to_add.push(x.element);
        }
        i++;
      }
    });
    _.qs(      this.container_element, '.list-items' ).innerHTML = '';
    _.ap( _.qs(this.container_element, '.list-items' ), to_add );
    return this;
  }

  // Pads rank to "pad_size" characters so can concatenate and string
  // join. If we have more than about 10000 entries then this code will
  // perform badly anyway!

  rank_string( n ) {
    return n.toString( 10 )
      .padStart( this.pad_size, 0 );
  }
}

// Initialise controllers based on elements in DOM.


/*
* Notes:
* ------
*
* We add just three listeners - onclick, onkeyup & onchange on the
* container object itself rather than adding individual actions on
* each "input element"... This saves a lot of CPU/memory.
*
* Example Markup
* --------------
*
* This uses a table to represent the data, an alternative uses card based rendering.
*
<div class="list-container card-container" data-key="news" data-batch-size="6" data-debug="1">
<div class="list-filters">
  <label>Year:
  <select data-filter-type="lookup" data-filter="year">
    <option value="">All years</option>
    <option value="2026">2026</option>
    ...
    <option value="2021">2021</option>
  </select>
  </label>
  <label>Type:
  <select data-filter-type="lookup" data-filter="type">
    <option value="">All types</option>
    <option value="Collaboration">Collaboration</option>
    ...
    <option value="Group">Group</option>
  </select>
  </label>
  <label>Programme:
  <select data-filter-type="array" data-filter="programme">
    <option value="">All programmes</option>
    <option value="Parasites and Microbes">Parasites and Microbes</option>
    ...
    <option value="Tree of Life">Tree of Life</option>
  </select>
  </label>
  <label>Search:
  <input type="text" placeholder="Keyword" data-filter-type="text" data-filter="text" >
  </label>
  <div class="list-span-filter" data-filter-type="lookup" data-filter="letter">
    <span data-value="">All</span>
    <span data-value="a">A</span>
    ...
    <span data-value="z">Z</span>
    <span data-value="-">Other</span>
  </div>
</div>
<table>
  <thead>
    <tr class="list-sorters">
      <th data-sorter="title" data-direction="up">Title</th>
      <th data-sorter="type" data-direction="up">Type</th>
      <th data-sorter="date" data-direction="down">Year</th>
      <th>Programme</th>
      <th>&nbsp;</th>
    </tr>
  </thead>
  <tbody class="list-items">
    <tr data-date="2026-03-01" data-year="2026" data-type="Collaboration"
        data-letter="p" data-title="Project A"
        data-programme="[&quot;Somatic Genomics&quot;]"
        data-text="project a collaboration somatic genomics">
      <td>Project A</td>
      <td>Collaboration</td>
      <td>2026-03-01</span></td>
      <td>Somatic Genomics</td>
      <td><a href="https://tools.baggy.me.uk/new-list/link.php/project_a"
        aria-label="See more about Project A">See more</a></td>
    </tr>
    ....
  </tbody>
</table>
<p class="list-empty">There are no matches for your search criteria</p>
<div class="list-pagination"></div>
<div class="list-page-size"><label>
  Entries per page:
  <select>
    <option value="6">6</option>
    <option value="12">12</option>
    <option value="24">24</option>
    <option value="48">48</option>
    <option value="48">96</option>
    <option value="1000000000">All</option>
  </select>
</label></div>
</div>
*/

