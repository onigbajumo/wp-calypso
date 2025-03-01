import accessibleFocus from '@automattic/accessible-focus';
import config from '@automattic/calypso-config';
import { getUrlParts } from '@automattic/calypso-url';
import debugFactory from 'debug';
import page from 'page';
import { createElement } from 'react';
import ReactDom from 'react-dom';
import Modal from 'react-modal';
import store from 'store';
import emailVerification from 'calypso/components/email-verification';
import { ProviderWrappedLayout } from 'calypso/controller';
import { initializeAnalytics } from 'calypso/lib/analytics/init';
import { bumpStat } from 'calypso/lib/analytics/mc';
import getSuperProps from 'calypso/lib/analytics/super-props';
import { tracksEvents } from 'calypso/lib/analytics/tracks';
import Logger from 'calypso/lib/catch-js-errors';
import DesktopListeners from 'calypso/lib/desktop-listeners';
import detectHistoryNavigation from 'calypso/lib/detect-history-navigation';
import { getLanguageSlugs } from 'calypso/lib/i18n-utils/utils';
import isJetpackCloud from 'calypso/lib/jetpack/is-jetpack-cloud';
import setupGlobalKeyboardShortcuts from 'calypso/lib/keyboard-shortcuts/global';
import { attachLogmein } from 'calypso/lib/logmein';
import { getToken } from 'calypso/lib/oauth-token';
import { checkFormHandler } from 'calypso/lib/protect-form';
import { setReduxStore as setReduxBridgeReduxStore } from 'calypso/lib/redux-bridge';
import { getSiteFragment, normalize } from 'calypso/lib/route';
import { isLegacyRoute } from 'calypso/lib/route/legacy-routes';
import { hasTouch } from 'calypso/lib/touch-detect';
import { isOutsideCalypso } from 'calypso/lib/url';
import { JETPACK_PRICING_PAGE } from 'calypso/lib/url/support';
import { initializeCurrentUser } from 'calypso/lib/user/shared-utils';
import { onDisablePersistence } from 'calypso/lib/user/store';
import { setSupportSessionReduxStore } from 'calypso/lib/user/support-user-interop';
import { setupRoutes } from 'calypso/sections-middleware';
import { createReduxStore } from 'calypso/state';
import { setCurrentUser } from 'calypso/state/current-user/actions';
import { getCurrentUserId, isUserLoggedIn } from 'calypso/state/current-user/selectors';
import { initConnection as initHappychatConnection } from 'calypso/state/happychat/connection/actions';
import wasHappychatRecentlyActive from 'calypso/state/happychat/selectors/was-happychat-recently-active';
import { requestHappychatEligibility } from 'calypso/state/happychat/user/actions';
import { getHappychatAuth } from 'calypso/state/happychat/utils';
import { getInitialState, persistOnChange, loadAllState } from 'calypso/state/initial-state';
import { init as pushNotificationsInit } from 'calypso/state/push-notifications/actions';
import { requestUnseenStatus } from 'calypso/state/reader-ui/seen-posts/actions';
import initialReducer from 'calypso/state/reducer';
import { setStore } from 'calypso/state/redux-store';
import { setRoute } from 'calypso/state/route/actions';
import { setNextLayoutFocus } from 'calypso/state/ui/layout-focus/actions';
import { getSelectedSiteId, getSectionName } from 'calypso/state/ui/selectors';
import { setupLocale } from './locale';

const debug = debugFactory( 'calypso' );

const setupContextMiddleware = ( reduxStore ) => {
	page( '*', ( context, next ) => {
		// page.js url parsing is broken so we had to disable it with `decodeURLComponents: false`
		const parsed = getUrlParts( context.canonicalPath );
		const path = parsed.pathname + parsed.search || null;
		context.prevPath = path === context.path ? false : path;
		context.query = Object.fromEntries( parsed.searchParams.entries() );

		context.hashstring = ( parsed.hash && parsed.hash.substring( 1 ) ) || '';
		// set `context.hash` (we have to parse manually)
		if ( context.hashstring ) {
			try {
				context.hash = Object.fromEntries(
					new globalThis.URLSearchParams( context.hashstring ).entries()
				);
			} catch ( e ) {
				debug( 'failed to query-string parse `location.hash`', e );
				context.hash = {};
			}
		} else {
			context.hash = {};
		}

		context.store = reduxStore;

		// client version of the isomorphic method for redirecting to another page
		context.redirect = ( httpCode, newUrl = null ) => {
			if ( isNaN( httpCode ) && ! newUrl ) {
				newUrl = httpCode;
			}

			return page.replace( newUrl, context.state, false, false );
		};

		// Break routing and do full load for logout link in /me
		if ( context.pathname === '/wp-login.php' ) {
			window.location.href = context.path;
			return;
		}

		// Some paths live outside of Calypso and should be opened separately
		// Examples: /support, /forums
		if ( isOutsideCalypso( context.pathname ) ) {
			window.location.href = context.path;
			return;
		}

		next();
	} );

	page.exit( '*', ( context, next ) => {
		if ( ! context.store ) {
			context.store = reduxStore;
		}
		next();
	} );
};

/**
 * If the URL sets `flags=oauth` explicitly, persist that setting to session storage so
 * that it persists across redirects and reloads. The `calypso-config` module will pick
 * them up automatically on init.
 */
function saveOauthFlags() {
	if ( ! window.location.search ) {
		return;
	}

	const flags = new URLSearchParams( window.location.search ).get( 'flags' );
	if ( ! flags ) {
		return;
	}

	const oauthFlag = flags.split( ',' ).find( ( flag ) => /^[+-]?oauth$/.test( flag ) );
	if ( ! oauthFlag ) {
		return;
	}

	window.sessionStorage.setItem( 'flags', oauthFlag );
}

function authorizePath() {
	const redirectUri = new URL(
		isJetpackCloud() ? '/connect/oauth/token' : '/api/oauth/token',
		window.location
	);
	redirectUri.search = new URLSearchParams( {
		next: window.location.pathname + window.location.search,
	} ).toString();

	const authUri = new URL( 'https://public-api.wordpress.com/oauth2/authorize' );
	authUri.search = new URLSearchParams( {
		response_type: 'token',
		client_id: config( 'oauth_client_id' ),
		redirect_uri: redirectUri.toString(),
		scope: 'global',
		blog_id: 0,
	} ).toString();

	return authUri.toString();
}

const oauthTokenMiddleware = () => {
	if ( config.isEnabled( 'oauth' ) ) {
		const loggedOutRoutes = [ '/start', '/api/oauth/token', '/connect' ];

		if ( isJetpackCloud() && config.isEnabled( 'jetpack/pricing-page' ) ) {
			loggedOutRoutes.push( '/pricing', '/plans' );
			getLanguageSlugs().forEach( ( slug ) =>
				loggedOutRoutes.push( `/${ slug }/pricing`, `/${ slug }/plans` )
			);
		}

		// Forces OAuth users to the /login page if no token is present
		page( '*', function ( context, next ) {
			const isValidSection = loggedOutRoutes.some( ( route ) => context.path.startsWith( route ) );

			// Check we have an OAuth token, otherwise redirect to auth/login page
			if ( getToken() === false && ! isValidSection ) {
				window.location = authorizePath();
				return;
			}

			next();
		} );
	}
};

const setRouteMiddleware = () => {
	page( '*', ( context, next ) => {
		context.store.dispatch( setRoute( context.pathname, context.query ) );

		next();
	} );
};

const unsavedFormsMiddleware = () => {
	// warn against navigating from changed, unsaved forms
	page.exit( '*', checkFormHandler );
};

const utils = () => {
	debug( 'Executing Calypso utils.' );

	// Infer touch screen by checking if device supports touch events
	// See touch-detect/README.md
	if ( hasTouch() ) {
		document.documentElement.classList.add( 'touch' );
	} else {
		document.documentElement.classList.add( 'notouch' );
	}

	// Add accessible-focus listener
	accessibleFocus();

	// Configure app element that React Modal will aria-hide when modal is open
	Modal.setAppElement( document.getElementById( 'wpcom' ) );
};

const configureReduxStore = ( currentUser, reduxStore ) => {
	debug( 'Executing Calypso configure Redux store.' );

	if ( currentUser ) {
		// Set current user in Redux store
		reduxStore.dispatch( setCurrentUser( currentUser ) );
	}

	if ( config.isEnabled( 'network-connection' ) ) {
		asyncRequire( 'calypso/lib/network-connection', ( networkConnection ) =>
			networkConnection.init( reduxStore )
		);
	}

	setSupportSessionReduxStore( reduxStore );
	setReduxBridgeReduxStore( reduxStore );

	if ( currentUser ) {
		if ( config.isEnabled( 'push-notifications' ) ) {
			// If the browser is capable, registers a service worker & exposes the API
			reduxStore.dispatch( pushNotificationsInit() );
		}
	}
};

function setupErrorLogger( reduxStore ) {
	if ( ! config.isEnabled( 'catch-js-errors' ) ) {
		return;
	}

	const errorLogger = new Logger();

	// Save errorLogger to a singleton for use in arbitrary logging.
	require( 'calypso/lib/catch-js-errors/log' ).registerLogger( errorLogger );

	// Save data to JS error logger
	errorLogger.saveDiagnosticData( {
		user_id: getCurrentUserId( reduxStore.getState() ),
		calypso_env: config( 'env_id' ),
	} );

	errorLogger.saveDiagnosticReducer( function () {
		const state = reduxStore.getState();
		return {
			blog_id: getSelectedSiteId( state ),
			calypso_section: getSectionName( state ),
		};
	} );

	tracksEvents.on( 'record-event', ( eventName, lastTracksEvent ) =>
		errorLogger.saveExtraData( { lastTracksEvent } )
	);

	page( '*', function ( context, next ) {
		errorLogger.saveNewPath(
			context.canonicalPath.replace( getSiteFragment( context.canonicalPath ), ':siteId' )
		);
		next();
	} );
}

const setupMiddlewares = ( currentUser, reduxStore ) => {
	debug( 'Executing Calypso setup middlewares.' );

	setupContextMiddleware( reduxStore );
	oauthTokenMiddleware();
	setupRoutes();
	setRouteMiddleware();
	unsavedFormsMiddleware();

	// The analytics module requires user (when logged in) and superProps objects. Inject these here.
	initializeAnalytics( currentUser ? currentUser : undefined, getSuperProps( reduxStore ) );

	setupErrorLogger( reduxStore );

	// If `?sb` or `?sp` are present on the path set the focus of layout
	// This can be removed when the legacy version is retired.
	page( '*', function ( context, next ) {
		if ( [ 'sb', 'sp' ].indexOf( context.querystring ) !== -1 ) {
			const layoutSection = context.querystring === 'sb' ? 'sidebar' : 'sites';
			reduxStore.dispatch( setNextLayoutFocus( layoutSection ) );
			page.replace( context.pathname );
		}

		next();
	} );

	page( '*', function ( context, next ) {
		// Don't normalize legacy routes - let them fall through and be unhandled
		// so that page redirects away from Calypso
		if ( isLegacyRoute( context.pathname ) ) {
			return next();
		}

		return normalize( context, next );
	} );

	page( '*', function ( context, next ) {
		const path = context.pathname;

		// Bypass this global handler for legacy routes
		// to avoid bumping stats and changing focus to the content
		if ( isLegacyRoute( path ) ) {
			return next();
		}

		// Bump general stat tracking overall Newdash usage
		bumpStat( { newdash_pageviews: 'route' } );

		next();
	} );

	page( '*', function ( context, next ) {
		if ( '/me/account' !== context.path && currentUser.phone_account ) {
			page( '/me/account' );
		}

		next();
	} );

	page( '*', emailVerification );

	// delete any lingering local storage data from signup
	if ( ! window.location.pathname.startsWith( '/start' ) ) {
		[ 'signupProgress', 'signupDependencies' ].forEach( ( item ) => store.remove( item ) );
	}

	if ( ! currentUser ) {
		// Dead-end the sections the user can't access when logged out
		page( '*', function ( context, next ) {
			// see server/pages/index for prod redirect
			if ( '/plans' === context.pathname ) {
				const queryFor = context.query && context.query.for;
				if ( queryFor && 'jetpack' === queryFor ) {
					window.location =
						'https://wordpress.com/wp-login.php?redirect_to=https%3A%2F%2Fwordpress.com%2Fplans';
				} else {
					// pricing page is outside of Calypso, needs a full page load
					window.location = isJetpackCloud()
						? JETPACK_PRICING_PAGE
						: 'https://wordpress.com/pricing';
				}
				return;
			}

			next();
		} );
	}

	const state = reduxStore.getState();
	// get reader unread status
	if ( config.isEnabled( 'reader/seen-posts' ) ) {
		reduxStore.dispatch( requestUnseenStatus() );
	}

	if ( config.isEnabled( 'happychat' ) ) {
		reduxStore.dispatch( requestHappychatEligibility() );
	}
	if ( wasHappychatRecentlyActive( state ) ) {
		reduxStore.dispatch( initHappychatConnection( getHappychatAuth( state )() ) );
	}

	if ( config.isEnabled( 'keyboard-shortcuts' ) ) {
		setupGlobalKeyboardShortcuts();
	}

	if ( window.electron ) {
		DesktopListeners.init( reduxStore );
	}

	if ( config.isEnabled( 'dev/auth-helper' ) && document.querySelector( '.environment.is-auth' ) ) {
		asyncRequire( 'calypso/lib/auth-helper', ( authHelper ) => {
			authHelper( document.querySelector( '.environment.is-auth' ), reduxStore );
		} );
	}
	if (
		config.isEnabled( 'dev/preferences-helper' ) &&
		document.querySelector( '.environment.is-prefs' )
	) {
		asyncRequire( 'calypso/lib/preferences-helper', ( prefHelper ) => {
			prefHelper( document.querySelector( '.environment.is-prefs' ), reduxStore );
		} );
	}
	if (
		config.isEnabled( 'dev/features-helper' ) &&
		document.querySelector( '.environment.is-features' )
	) {
		asyncRequire( 'calypso/lib/features-helper', ( featureHelper ) => {
			featureHelper( document.querySelector( '.environment.is-features' ) );
		} );
	}

	if ( config.isEnabled( 'logmein' ) && isUserLoggedIn( reduxStore.getState() ) ) {
		// Attach logmein handler if we're currently logged in
		attachLogmein( reduxStore );
	}
};

function renderLayout( reduxStore ) {
	const layoutElement = createElement( ProviderWrappedLayout, {
		store: reduxStore,
	} );

	ReactDom.render( layoutElement, document.getElementById( 'wpcom' ) );

	debug( 'Main layout rendered.' );
}

const boot = ( currentUser, registerRoutes ) => {
	saveOauthFlags();
	utils();
	loadAllState().then( () => {
		const initialState = getInitialState( initialReducer, currentUser?.ID );
		const reduxStore = createReduxStore( initialState, initialReducer );
		setStore( reduxStore, currentUser?.ID );
		onDisablePersistence( persistOnChange( reduxStore, currentUser?.ID ) );
		setupLocale( currentUser, reduxStore );
		configureReduxStore( currentUser, reduxStore );
		setupMiddlewares( currentUser, reduxStore );
		detectHistoryNavigation.start();
		if ( registerRoutes ) {
			registerRoutes();
		}

		// Render initial `<Layout>` for non-isomorphic sections.
		// Isomorphic sections will take care of rendering their `<Layout>` themselves.
		if ( ! document.getElementById( 'primary' ) ) {
			renderLayout( reduxStore );
		}

		page.start( { decodeURLComponents: false } );
	} );
};

export const bootApp = async ( appName, registerRoutes ) => {
	const user = await initializeCurrentUser();
	debug( `Starting ${ appName }. Let's do this.` );
	boot( user, registerRoutes );
};
