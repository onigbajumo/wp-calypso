import { Gridicon } from '@automattic/components';
import React, { Fragment } from 'react';
import {
	ButtonRow,
	Continue,
	makeTour,
	Quit,
	SiteLink,
	Step,
	Tour,
} from 'calypso/layout/guided-tours/config-elements';
import { getPluginOnSite, isRequesting } from 'calypso/state/plugins/installed/selectors';
import { getSelectedSite } from 'calypso/state/ui/selectors';
import meta from './meta';

const JETPACK_TOGGLE_SELECTOR = '.plugin-item-jetpack .components-form-toggle';

// Wait until the desired DOM element appears. Check every 125ms.
// This function is a Redux action creator, hence the two arrows.
const waitForJetpackToggle = () => async () => {
	while ( ! document.querySelector( JETPACK_TOGGLE_SELECTOR ) ) {
		await new Promise( ( resolve ) => setTimeout( resolve, 125 ) );
	}
};

/* eslint-disable wpcalypso/jsx-classname-namespace */
export const JetpackPluginUpdatesTour = makeTour(
	<Tour
		{ ...meta }
		when={ ( state ) => {
			const site = getSelectedSite( state );
			const isRequestingPlugins = isRequesting( state, site.ID );
			const sitePlugin = getPluginOnSite( state, site.ID, 'jetpack' );
			const res = ! isRequestingPlugins && !! sitePlugin;
			return res;
		} }
	>
		<Step
			name="init"
			target={ JETPACK_TOGGLE_SELECTOR }
			arrow="top-left"
			placement="below"
			wait={ waitForJetpackToggle }
			style={ {
				animationDelay: '0.7s',
				zIndex: 1,
			} }
			shouldScrollTo
		>
			{ ( { translate } ) => (
				<Fragment>
					<p>
						{ translate(
							"Let's activate autoupdates for Jetpack to ensure you're always " +
								'up to date with the latest features and security fixes.'
						) }
					</p>
					<ButtonRow>
						<Continue
							target=".plugin-item-jetpack .components-form-toggle"
							step="finish"
							click
							hidden
						/>
						<SiteLink href="/plans/my-plan/:site">
							{ translate( 'Return to the checklist' ) }
						</SiteLink>
					</ButtonRow>
				</Fragment>
			) }
		</Step>

		<Step name="finish" placement="right">
			{ ( { translate } ) => (
				<Fragment>
					<h1 className="tours__title">
						<span className="tours__completed-icon-wrapper">
							<Gridicon icon="checkmark" className="tours__completed-icon" />
						</span>
						{ translate( 'Excellent, you’re done!' ) }
					</h1>
					<p>
						{ translate(
							'Jetpack will now autoupdate for you. Would you like to continue setting up the security essential features for your site?'
						) }
					</p>
					<ButtonRow>
						<SiteLink isButton href="/plans/my-plan/:site">
							{ translate( "Yes, let's do it." ) }
						</SiteLink>
						<Quit>{ translate( 'No, thanks.' ) }</Quit>
					</ButtonRow>
				</Fragment>
			) }
		</Step>
	</Tour>
);
