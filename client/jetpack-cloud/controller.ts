import page from 'page';
import React from 'react';
import { NoJetpackSitesMessage } from 'calypso/components/jetpack/no-jetpack-sites-message';
import { makeLayout, render as clientRender, setSectionMiddleware } from 'calypso/controller';
import { recordPageView } from 'calypso/lib/analytics/page-view';
import { addQueryArgs, getSiteFragment, sectionify } from 'calypso/lib/route';
import {
	redirectToPrimary,
	updateRecentSitesPreferences,
	renderNoVisibleSites,
	showMissingPrimaryError,
} from 'calypso/my-sites/controller';
import { getCurrentUser } from 'calypso/state/current-user/selectors';
import getPrimarySiteId from 'calypso/state/selectors/get-primary-site-id';
import { requestSite } from 'calypso/state/sites/actions';
import { getSiteId, getSiteSlug } from 'calypso/state/sites/selectors';
import { setSelectedSiteId, setAllSitesSelected } from 'calypso/state/ui/actions';
import type { UserData } from 'calypso/lib/user/user';
import type PageJS from 'page';

/**
 * Parse site slug from path.
 *
 * @param {PageJS.Context} context Route context
 * @returns {string} Site slug
 */
const parseSiteFragment = ( context: PageJS.Context ): string | undefined => {
	return context.params.site || getSiteFragment( context.path ) || undefined;
};

/**
 * Fetch site data.
 *
 * @param {PageJS.Context} context Route context
 * @param {number|string} siteIdOrSlug Site id or slug
 * @returns {Promise} Promise that resolves with the site id and slug
 */
const fetchSite = (
	context: PageJS.Context,
	siteIdOrSlug: number | string
): Promise< { id: number | undefined; slug: string | undefined } > => {
	const { getState, dispatch } = context.store;

	return dispatch( requestSite( siteIdOrSlug ) )
		.catch( () => null )
		.then( () => ( {
			id: getSiteId( getState(), siteIdOrSlug ),
			slug: getSiteSlug( getState(), siteIdOrSlug ),
		} ) );
};

/**
 * Store site id in state, and add site to the list of most recent sites.
 *
 * @param {PageJS.Context} context Route context
 * @param {number|string} siteId Site id
 */
const selectSite = ( context: PageJS.Context, siteId: number ): void => {
	const { dispatch } = context.store;

	dispatch( setSelectedSiteId( siteId ) );
	updateRecentSitesPreferences( context );
};

/**
 * Handle case when path contains no site slug. If the current user has only
 * one site, we try to use this site for context. Otherwise, the user must
 * select one of their sites.
 *
 * @param {PageJS.Context} context Route context
 * @param {Function} next Next middleware function
 */
const siteSelectionWithoutFragment = ( context: PageJS.Context, next: () => void ): void => {
	const { getState, dispatch } = context.store;
	const currentUser = getCurrentUser( getState() ) as UserData;
	const hasOneSite = currentUser?.visible_site_count === 1;

	// User has only one site
	if ( hasOneSite ) {
		const primarySiteId = getPrimarySiteId( getState() ) as NonNullable< number >;
		const primarySiteSlug = getSiteSlug( getState(), primarySiteId );

		// Site is already available in state
		if ( primarySiteSlug ) {
			// Redirect to the single site context
			redirectToPrimary( context, primarySiteSlug );
		} else {
			fetchSite( context, primarySiteId ).then( ( { slug } ) => {
				if ( slug ) {
					// Redirect to the single site context
					redirectToPrimary( context, slug );
				} else {
					// Display error notification
					showMissingPrimaryError( currentUser, dispatch );
				}
			} );
		}
	} else {
		// Show all sites
		dispatch( setAllSitesSelected() );
		next();
	}
};

/**
 * Select site when path contains a site slug.
 *
 * @param {string} siteFragment Parsed site slug
 * @param {PageJS.Context} context Route context
 * @param {Function} next Next middleware function
 */
const siteSelectionWithFragment = async (
	siteFragment: string,
	context: PageJS.Context,
	next: () => void
): Promise< void > => {
	const { getState } = context.store;
	const siteId = getSiteId( getState(), siteFragment );

	// Site is already available in state
	if ( siteId ) {
		selectSite( context, siteId );
		next();
	} else {
		const { id } = await fetchSite( context, siteFragment );

		if ( id ) {
			selectSite( context, id );
			next();
		} else if ( '1' === context.query.unlinked ) {
			// The user is not linked to that Jetpack site, we'll do that later on when needed.
			next();
		} else {
			const allSitesPath = addQueryArgs(
				{ site: siteFragment },
				sectionify( context.path, siteFragment )
			);

			page.redirect( allSitesPath );
		}
	}
};

/**
 * Render a screen to indicate that there are no Jetpack sites.
 *
 * @param {PageJS.Context} context Route context
 * @param {string} siteSlug Site slug
 */
const renderNoJetpackSites = ( context: PageJS.Context, siteSlug?: string ) => {
	setSectionMiddleware( { group: 'sites' } )( context );

	context.primary = React.createElement( NoJetpackSitesMessage, { siteSlug } );

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	makeLayout( context, () => {} );
	clientRender( context );
};

/**
 * Record a page view for no Jetpack sites.
 *
 * @param {PageJS.Context} context Route context
 * @param {string} siteFragment Parsed site slug
 */
function recordNoJetpackSitesPageView( context: PageJS.Context, siteFragment: string | undefined ) {
	recordPageView( '/landing', 'No Jetpack Sites', {
		base_path: sectionify( context.path, siteFragment ),
	} );
}

/**
 * Record a page view for no visible Jetpack sites.
 *
 * @param {PageJS.Context} context Route context
 * @param {string} siteFragment Parsed site slug
 */
function recordNoVisibleJetpackSitesPageView(
	context: PageJS.Context,
	siteFragment: string | undefined
) {
	recordPageView( '/landing', 'All Jetpack Sites Hidden', {
		base_path: sectionify( context.path, siteFragment ),
	} );
}

/**
 * Show dedicated screen if user has no Jetpack site, or no visible Jetpack site
 *
 * @param {string} siteFragment Parsed site slug
 * @param {PageJS.Context} context Route context
 * @returns {boolean} True if user has neither Jetpack sites nor visible Jetpack sites
 */
export function noSite(
	siteFragment: string | undefined,
	context: PageJS.Context
): boolean | undefined {
	const { getState } = context.store;
	const currentUser = getCurrentUser( getState() ) as UserData;

	if ( 0 === currentUser?.jetpack_site_count ) {
		renderNoJetpackSites( context, currentUser.primarySiteSlug );
		recordNoJetpackSitesPageView( context, siteFragment );
		return true;
	}

	if ( 0 === currentUser?.jetpack_visible_site_count ) {
		renderNoVisibleSites( context );
		recordNoVisibleJetpackSitesPageView( context, siteFragment );
		return true;
	}
}

/**
 * Parse site slug from path and call the proper middleware.
 *
 * @param {PageJS.Context} context Route context
 * @param {Function} next Next middleware function
 */
export async function cloudSiteSelection(
	context: PageJS.Context,
	next: () => void
): Promise< void > {
	const siteFragment = parseSiteFragment( context );

	if ( noSite( siteFragment, context ) ) {
		return;
	}

	if ( siteFragment ) {
		if ( context.path.startsWith( '/pricing' ) ) {
			const { id } = await fetchSite( context, siteFragment );
			if ( ! id ) {
				await siteSelectionWithoutFragment( context, next );
				return;
			}
		}
		await siteSelectionWithFragment( siteFragment, context, next );
	} else {
		await siteSelectionWithoutFragment( context, next );
	}
}
