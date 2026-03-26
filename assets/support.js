/* jshint strict: true, esversion: 6, browser: true */
/* exported Support */

class Support {
  is_tag( el, name ) {
		return typeof el !== 'undefined' && el.tagName == name;
	}

	has_class( el, name ) {
		return el.classList.contains(name);
	}

	remove_class( el, name ) {
		el.classList.remove(name);
	}

	add_class( el, name ) {
		el.classList.add(name);
	}

/* Fetch single and multiple elements; */

	id( s ) {
		return document.getElementById(s);
	}

	qs( el, s ) {
		if( 'string' === typeof el ) {
			[ s, el ] = [ el, document ];
		}
		return s === '' ? el : el.querySelector(s);
	}

	qm( el, s ) {
		if( 'string' === typeof el ) {
			[ s, el ] = [ el, document ];
		}
		return Array.from( el.querySelectorAll(s) );
	}

/* apply function to multiple or single elements */

	m( el, s, f ) {
		if( 'string' === typeof el ) {
			[ f, s, el ] = [ s, el, document ];
		}
		this.qm( el, s ).forEach( f );
	}

	s( el, s, f ) {
		if( 'string' === typeof el ) {
			[ f, s, el ] = [ s, el, document ];
		}
		var z = this.qs( el, s );
		if( z ) {
			f( z );
		}
	}

/* Add remove "active" class */

	dis( n ) {
		if( 'string' === typeof n ) {
			n = document.querySelector( n );
		}
		if( n ) {
			n.classList.remove( 'active' );
		}
	}

	act( n ) {
		if( 'string' === typeof n ) {
			n = document.querySelector( n );
		}
		if( n ) {
			n.classList.add( 'active' );
		}
	}

/* Create elements, text, general, name-spaced & svg */

	t( t ) {
		return document.createTextNode(t);
	}

	c( t, a, c ) {
		var n = document.createElement(t);
		return this.u( n, a, c );
	}

	cn( ns, t, a, c ) {
		var n = document.createElementNS(ns, t);
		return this.u( n, a, c );
	}

	cs( t, a, c ) {
		return this.cn( 'http://www.w3.org/2000/svg', t, a, c );
	}

	u( n, a, c ) {
		if( 'undefined' !== typeof a ) {
			if( Array.isArray(a) || 'string' === typeof a ) {
				[ c, a ] = [ a, undefined ];
			}
			if( 'object' === typeof a ) {
				Object.entries(a).forEach( ([k, v]) => n.setAttribute(k, v) );
			}
			if( Array.isArray(c) ) {
				c.forEach(function(x) {
					n.append(x);
				});
			} else if( 'string' === typeof c ) {
				n.innerHTML = c;
			}
		}
		return n;
	}

/* Clear an HTML element, append and prepend */

  clear( el ) {
		while( el.firstChild ) {
			el.removeChild(el.lastChild);
		}
	}

	ap( n, c ) {
		if( Array.isArray(c) ) {
			n.append(...c);
		} else {
			n.append(c);
		}
	}

	pp( n, c ) {
		var fc = n.firstChild;
		if( fc ) {
			n.insertBefore(c, fc);
		} else {
			n.append(c);
		}
	}

/* get set and check attributes */

  a( n, c, d = 0 ) {
		return n.hasAttribute(c) ? n.getAttribute(c) : d;
	}

	sa( n, c, v = null ) {
		if( v === null ) {
			n.removeAttribute(c);
		} else {
			n.setAttribute(c, v);
		}
	}

	ifa( n, c) {
		return n.hasAttribute(c);
	}

/* Find first ancestor of type */

	p_type( el, s ) {
		var n = el.parentElement;
		while( n ) {
			if( n.nodeName === s ) {
				return n;
			}
			n = n.parentElement;
		}
		return;
	}

/* Graphic thing... get mapping from "em" to pixels */

  rem2pixels( rem ) {
		return rem * parseFloat( getComputedStyle( document.documentElement ).fontSize );
	}

}
