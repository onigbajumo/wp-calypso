import config from '@automattic/calypso-config';
import debugModule from 'debug';
import { isEmpty } from 'lodash';
import page from 'page';
import { createElement } from 'react';
import store from 'store';
import { recordPageView } from 'calypso/lib/analytics/page-view';
import { loadExperimentAssignment } from 'calypso/lib/explat';
import { login } from 'calypso/lib/paths';
import { sectionify } from 'calypso/lib/route';
import { isUserLoggedIn } from 'calypso/state/current-user/selectors';
import { getSignupDependencyStore } from 'calypso/state/signup/dependency-store/selectors';
import { setCurrentFlowName, setPreviousFlowName } from 'calypso/state/signup/flow/actions';
import { getCurrentFlowName } from 'calypso/state/signup/flow/selectors';
import { getSignupProgress } from 'calypso/state/signup/progress/selectors';
import { setSiteType } from 'calypso/state/signup/steps/site-type/actions';
import { getSiteType } from 'calypso/state/signup/steps/site-type/selectors';
import { setSiteVertical } from 'calypso/state/signup/steps/site-vertical/actions';
import {
	getSiteVerticalId,
	getSiteVerticalIsUserInput,
} from 'calypso/state/signup/steps/site-vertical/selectors';
import { requestSite } from 'calypso/state/sites/actions';
import { getSiteId } from 'calypso/state/sites/selectors';
import { setSelectedSiteId } from 'calypso/state/ui/actions';
import { setLayoutFocus } from 'calypso/state/ui/layout-focus/actions';
import { getDotBlogVerticalId } from './config/dotblog-verticals';
import { getStepComponent } from './config/step-components';
import SignupComponent from './main';
import {
	getStepUrl,
	canResumeFlow,
	getFlowName,
	getStepName,
	getStepSectionName,
	getValidPath,
	getFlowPageTitle,
	shouldForceLogin,
	isReskinnedFlow,
} from './utils';

const debug = debugModule( 'calypso:signup' );

/**
 * Constants
 */
const basePageTitle = 'Signup'; // used for analytics, doesn't require translation

/**
 * Module variables
 */
let initialContext;
let previousFlowName;

const removeWhiteBackground = function () {
	if ( ! document ) {
		return;
	}

	document.body.classList.remove( 'is-white-signup' );
};

// eslint-disable-next-line no-unused-vars -- Used for a planned experiment rerun, see newUsersWithFreePlan below.
const gutenbergRedirect = function ( flowName, locale ) {
	const url = new URL( window.location );
	let path = '/new';
	if ( [ 'free', 'personal', 'premium', 'business', 'ecommerce' ].includes( flowName ) ) {
		path += `/${ flowName }`;
	}
	if ( locale ) {
		path += `/${ locale }`;
	}

	url.pathname = path;
	window.location.replace( url.toString() );
};

export const addP2SignupClassName = () => {
	if ( ! document ) {
		return;
	}

	document.body.classList.add( 'is-p2-signup' );
};

export const removeP2SignupClassName = function () {
	if ( ! document ) {
		return;
	}

	document.body.classList.remove( 'is-p2-signup' );
};

export default {
	redirectTests( context, next ) {
		const isLoggedIn = isUserLoggedIn( context.store.getState() );
		const currentFlowName = getFlowName( context.params, isLoggedIn );
		if ( isReskinnedFlow( currentFlowName ) ) {
			next();
		} else if (
			context.pathname.indexOf( 'domain' ) >= 0 ||
			context.pathname.indexOf( 'plan' ) >= 0 ||
			context.pathname.indexOf( 'onboarding-registrationless' ) >= 0 ||
			context.pathname.indexOf( 'wpcc' ) >= 0 ||
			context.pathname.indexOf( 'launch-only' ) >= 0 ||
			context.params.flowName === 'account' ||
			context.params.flowName === 'crowdsignal' ||
			context.params.flowName === 'pressable-nux' ||
			context.params.flowName === 'clone-site'
		) {
			removeWhiteBackground();
			next();
		} else if ( context.pathname.includes( 'p2' ) ) {
			addP2SignupClassName();
			removeWhiteBackground();
			next();
		} else {
			next();
			return;

			// Code for the newUsersWithFreePlan experiment, previously implemented in calypso-abtest.
			// Planned to be rerun see pbxNRc-xd-p2#comment-1949
			// Commented out for eslint, to rerun next() has to be placed below this.
			// const localeFromParams = context.params.lang;
			// const flowName = getFlowName( context.params, isLoggedIn );
			// if (
			// 	flowName === 'free' &&
			//  	// Checking for treatment variation previously happened here:
			// 	false
			// ) {
			// 	gutenbergRedirect( flowName, localeFromParams );
			// 	return;
			// }

			// Code for the variantUserless experiment, previously implemented in calypso-abtest.
			// Planned to be rerun, see pbmo2S-Bv-p2#comment-1382
			// Commented out for eslint, to rerun next() has to be placed below this.
			// if (
			// 	! isLoggedIn &&
			// 	-1 === context.pathname.indexOf( 'free' ) &&
			// 	-1 === context.pathname.indexOf( 'personal' ) &&
			// 	-1 === context.pathname.indexOf( 'premium' ) &&
			// 	-1 === context.pathname.indexOf( 'business' ) &&
			// 	-1 === context.pathname.indexOf( 'ecommerce' ) &&
			// 	-1 === context.pathname.indexOf( 'with-theme' ) &&
			// 	// Checking for treatment variation previously happened here:
			// 	false
			// ) {
			// 	removeWhiteBackground();
			// 	const stepName = getStepName( context.params );
			// 	const stepSectionName = getStepSectionName( context.params );
			// 	const urlWithLocale = getStepUrl(
			// 		'onboarding-registrationless',
			// 		stepName,
			// 		stepSectionName,
			// 		localeFromParams
			// 	);
			// 	window.location = urlWithLocale;
			// } else {
			// 	next();
			// }
		}
	},
	redirectWithoutLocaleIfLoggedIn( context, next ) {
		const userLoggedIn = isUserLoggedIn( context.store.getState() );
		if ( userLoggedIn && context.params.lang ) {
			const flowName = getFlowName( context.params, userLoggedIn );
			const stepName = getStepName( context.params );
			const stepSectionName = getStepSectionName( context.params );
			let urlWithoutLocale = getStepUrl( flowName, stepName, stepSectionName );

			if ( config.isEnabled( 'wpcom-user-bootstrap' ) ) {
				return page.redirect( urlWithoutLocale );
			}

			if ( ! isEmpty( context.query ) ) {
				urlWithoutLocale += '?' + context.querystring;
			}

			if ( ! isEmpty( context.hash ) ) {
				urlWithoutLocale += '#' + context.hashstring;
			}

			window.location = urlWithoutLocale;
			return;
		}

		next();
	},

	saveInitialContext( context, next ) {
		if ( ! initialContext ) {
			initialContext = Object.assign( {}, context );
		}

		next();
	},

	redirectToFlow( context, next ) {
		const userLoggedIn = isUserLoggedIn( context.store.getState() );
		const flowName = getFlowName( context.params, userLoggedIn );
		const localeFromParams = context.params.lang;
		const localeFromStore = ! userLoggedIn ? store.get( 'signup-locale' ) : '';
		const signupProgress = getSignupProgress( context.store.getState() );

		// Special case for the user step which may use oauth2 redirect flow
		// Check if there is a valid flow in progress to resume
		// We're limited in the number of redirect uris we can provide so we only have a single one at /start/user
		if ( context.params.flowName === 'user' ) {
			const alternativeFlowName = getCurrentFlowName( context.store.getState() );
			if (
				alternativeFlowName &&
				alternativeFlowName !== flowName &&
				canResumeFlow( alternativeFlowName, signupProgress, userLoggedIn )
			) {
				window.location =
					getStepUrl(
						alternativeFlowName,
						getStepName( context.params ),
						getStepSectionName( context.params ),
						localeFromStore
					) +
					( context.querystring ? '?' + context.querystring : '' ) +
					( context.hashstring ? '#' + context.hashstring : '' );
				return;
			}
		}

		// Store the previous flow name (so we know from what flow we transitioned from).
		if ( ! previousFlowName ) {
			const persistedFlowName = getCurrentFlowName( context.store.getState() );
			if ( persistedFlowName ) {
				previousFlowName = persistedFlowName;
				context.store.dispatch( setPreviousFlowName( previousFlowName ) );
			}
		}

		context.store.dispatch( setCurrentFlowName( flowName ) );

		if ( ! userLoggedIn && shouldForceLogin( flowName, userLoggedIn ) ) {
			return page.redirect( login( { redirectTo: context.path } ) );
		}

		// if flow can be resumed, use saved locale
		if (
			! userLoggedIn &&
			! localeFromParams &&
			localeFromStore &&
			canResumeFlow( flowName, signupProgress, userLoggedIn )
		) {
			window.location =
				getStepUrl(
					flowName,
					getStepName( context.params ),
					getStepSectionName( context.params ),
					localeFromStore
				) +
				( context.querystring ? '?' + context.querystring : '' ) +
				( context.hashstring ? '#' + context.hashstring : '' );
			return;
		}

		if ( context.pathname !== getValidPath( context.params, userLoggedIn ) ) {
			return page.redirect(
				getValidPath( context.params, userLoggedIn ) +
					( context.querystring ? '?' + context.querystring : '' )
			);
		}

		store.set( 'signup-locale', localeFromParams );

		next();
	},

	async start( context, next ) {
		const userLoggedIn = isUserLoggedIn( context.store.getState() );
		const basePath = sectionify( context.path );
		const flowName = getFlowName( context.params, userLoggedIn );
		const stepName = getStepName( context.params );
		const stepSectionName = getStepSectionName( context.params );

		const { query } = initialContext;

		// wait for the step component module to load
		const stepComponent = await getStepComponent( stepName );

		recordPageView( basePath, basePageTitle + ' > Start > ' + flowName + ' > ' + stepName, {
			flow: flowName,
		} );

		context.store.dispatch( setLayoutFocus( 'content' ) );
		context.store.dispatch( setCurrentFlowName( flowName ) );

		if ( ! [ 'launch-site' ].includes( flowName ) ) {
			context.store.dispatch( setSelectedSiteId( null ) );
		}

		let actualFlowName = flowName;
		if ( flowName === 'onboarding' || flowName === 'with-design-picker' ) {
			const experimentAssignment = await loadExperimentAssignment(
				'design_picker_after_onboarding'
			);
			debug(
				`design_picker_after_onboarding experiment variation: ${ experimentAssignment?.variationName }`
			);
			if ( 'treatment' === experimentAssignment?.variationName ) {
				actualFlowName = 'with-design-picker';
			}
		}

		// ExPlat: Temporarily testing out the effects of prefetching experiments. Delete after 2021 week 31.
		loadExperimentAssignment( 'explat_test_aa_weekly_calypso_2021_week_31' );

		context.primary = createElement( SignupComponent, {
			store: context.store,
			path: context.path,
			initialContext,
			locale: context.params.lang,
			flowName: actualFlowName,
			queryObject: query,
			refParameter: query && query.ref,
			stepName,
			stepSectionName,
			stepComponent,
			pageTitle: getFlowPageTitle( actualFlowName, userLoggedIn ),
		} );

		next();
	},
	setSelectedSiteForSignup( { store: signupStore, query }, next ) {
		const { getState, dispatch } = signupStore;
		const signupDependencies = getSignupDependencyStore( getState() );

		const siteSlug = signupDependencies?.siteSlug || query?.siteSlug;
		if ( ! siteSlug ) {
			next();
			return;
		}
		const siteId = getSiteId( getState(), siteSlug );
		if ( siteId ) {
			dispatch( setSelectedSiteId( siteId ) );
			next();
		} else {
			// Fetch the site by siteSlug and then try to select again
			dispatch( requestSite( siteSlug ) )
				.catch( () => null )
				.then( () => {
					let freshSiteId = getSiteId( getState(), siteSlug );

					if ( ! freshSiteId ) {
						const wpcomStagingFragment = siteSlug.replace(
							/\.wordpress\.com$/,
							'.wpcomstaging.com'
						);
						freshSiteId = getSiteId( getState(), wpcomStagingFragment );
					}

					if ( freshSiteId ) {
						dispatch( setSelectedSiteId( freshSiteId ) );
						next();
					}
				} );
			next();
		}
	},
	importSiteInfoFromQuery( { store: signupStore, query }, next ) {
		const state = signupStore.getState();
		const verticalId = getSiteVerticalId( state );
		const verticalIsUserInput = getSiteVerticalIsUserInput( state );
		const siteType = getSiteType( state );

		if ( ! siteType && query.site_type ) {
			signupStore.dispatch( setSiteType( query.site_type ) );
		}

		if ( ( ! verticalId || ! verticalIsUserInput ) && query.vertical ) {
			signupStore.dispatch(
				setSiteVertical( {
					id: getDotBlogVerticalId( query.vertical ) || query.vertical,
					isUserInput: false,
				} )
			);
		}

		next();
	},
};
