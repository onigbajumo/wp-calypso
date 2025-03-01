import { Dialog, Gridicon } from '@automattic/components';
import { localize } from 'i18n-calypso';
import PropTypes from 'prop-types';
import { Component } from 'react';
import { connect } from 'react-redux';
import PulsingDot from 'calypso/components/pulsing-dot';
import { addQueryArgs } from 'calypso/lib/route';
import getCustomizeOrEditFrontPageUrl from 'calypso/state/selectors/get-customize-or-edit-front-page-url';
import getSiteUrl from 'calypso/state/selectors/get-site-url';
import isSiteAtomic from 'calypso/state/selectors/is-site-wpcom-atomic';
import shouldCustomizeHomepageWithGutenberg from 'calypso/state/selectors/should-customize-homepage-with-gutenberg';
import { requestSite } from 'calypso/state/sites/actions';
import { isJetpackSite } from 'calypso/state/sites/selectors';
import { clearActivated } from 'calypso/state/themes/actions';
import {
	getActiveTheme,
	getCanonicalTheme,
	getThemeDetailsUrl,
	getThemeForumUrl,
	isActivatingTheme,
	hasActivatedTheme,
	isWpcomTheme,
} from 'calypso/state/themes/selectors';
import { themeHasAutoLoadingHomepage } from 'calypso/state/themes/selectors/theme-has-auto-loading-homepage';
import { getSelectedSiteId } from 'calypso/state/ui/selectors';
import { trackClick } from './helpers';

import './thanks-modal.scss';

class ThanksModal extends Component {
	static propTypes = {
		// Where is the modal being used?
		source: PropTypes.oneOf( [ 'details', 'list', 'upload' ] ).isRequired,
		// Connected props
		clearActivated: PropTypes.func.isRequired,
		requestSite: PropTypes.func.isRequired,
		currentTheme: PropTypes.shape( {
			author: PropTypes.string,
			author_uri: PropTypes.string,
			id: PropTypes.string,
			name: PropTypes.string,
		} ),
		customizeUrl: PropTypes.string,
		detailsUrl: PropTypes.string,
		forumUrl: PropTypes.string,
		hasActivated: PropTypes.bool.isRequired,
		isActivating: PropTypes.bool.isRequired,
		isThemeWpcom: PropTypes.bool.isRequired,
		siteId: PropTypes.number,
	};

	componentDidUpdate( prevProps ) {
		// re-fetch the site to ensure we have the right cusotmizer link for FSE or not
		if ( prevProps.hasActivated === false && this.props.hasActivated === true ) {
			this.props.requestSite( this.props.siteId );
		}
	}

	onCloseModal = () => {
		this.props.clearActivated( this.props.siteId );
	};

	trackClick = ( eventName, verb ) => {
		trackClick( 'current theme', eventName, verb );
	};

	trackVisitSite = () => {
		this.trackClick( 'visit site' );
	};

	goBack = () => {
		this.trackClick( 'go back' );
		this.onCloseModal();
	};

	onLinkClick = ( link ) => {
		return () => {
			this.onCloseModal();
			this.trackClick( link, 'click' );
		};
	};

	renderBody = () => {
		return (
			<ul>
				<li>
					{ this.props.source === 'list' ? this.renderThemeInfo() : this.renderCustomizeInfo() }
				</li>
				<li>{ this.renderSupportInfo() }</li>
			</ul>
		);
	};

	learnThisTheme = () => {
		this.trackClick( 'learn this theme' );
		this.onCloseModal();
	};

	goToCustomizer = () => {
		this.trackClick( 'thanks modal customize' );
		this.onCloseModal();
	};

	renderThemeInfo = () => {
		return this.props.translate( '{{a}}Learn more about{{/a}} this theme.', {
			components: {
				a: <a href={ this.props.detailsUrl } onClick={ this.onLinkClick( 'theme info' ) } />,
			},
		} );
	};

	renderCustomizeInfo = () => {
		return this.props.translate( '{{a}}Customize{{/a}} this design.', {
			components: {
				a: <a href={ this.props.customizeUrl } onClick={ this.onLinkClick( 'customize' ) } />,
			},
		} );
	};

	renderSupportInfo = () => {
		const { author_uri: authorUri } = this.props.currentTheme;

		if ( this.props.forumUrl ) {
			return this.props.translate( 'Have questions? Stop by our {{a}}support forums{{/a}}.', {
				components: {
					a: <a href={ this.props.forumUrl } onClick={ this.onLinkClick( 'support' ) } />,
				},
			} );
		}

		if ( authorUri ) {
			return this.props.translate( 'Have questions? {{a}}Contact the theme author.{{/a}}', {
				components: {
					a: <a href={ authorUri } onClick={ this.onLinkClick( 'org author' ) } />,
				},
			} );
		}

		return null;
	};

	renderContent = () => {
		const { name: themeName, author: themeAuthor } = this.props.currentTheme;

		return (
			<div>
				<h1>
					{ this.props.translate( 'Thanks for choosing {{br/}} %(themeName)s', {
						args: { themeName },
						components: {
							br: <br />,
						},
					} ) }
				</h1>
				<span>
					{ this.props.translate( 'by %(themeAuthor)s', {
						args: { themeAuthor },
					} ) }
				</span>
			</div>
		);
	};

	renderLoading = () => {
		return (
			<div className="themes__thanks-modal-loading">
				<PulsingDot active={ true } />
			</div>
		);
	};

	getEditSiteLabel = () => {
		const { shouldEditHomepageWithGutenberg, hasActivated } = this.props;
		if ( ! hasActivated ) {
			return this.props.translate( 'Activating theme…' );
		}

		const gutenbergContent = this.props.translate( 'Edit homepage' );
		const customizerContent = (
			<>
				<Gridicon icon="external" />
				{ this.props.translate( 'Customize site' ) }
			</>
		);

		return (
			<span className="thanks-modal__button-customize">
				{ shouldEditHomepageWithGutenberg ? gutenbergContent : customizerContent }
			</span>
		);
	};

	getViewSiteLabel = () => (
		<span className="thanks-modal__button-customize">
			<Gridicon icon="external" />
			{ this.props.translate( 'View site' ) }
		</span>
	);

	getButtons = () => {
		const { shouldEditHomepageWithGutenberg, hasActivated } = this.props;

		const firstButton = shouldEditHomepageWithGutenberg
			? {
					action: 'view',
					label: this.getViewSiteLabel(),
					onClick: this.trackVisitSite,
					href: this.props.siteUrl,
					target: '_blank',
			  }
			: {
					action: 'learn',
					label: this.props.translate( 'Learn about this theme' ),
					onClick: this.learnThisTheme,
					href: this.props.detailsUrl,
			  };

		return [
			{
				...firstButton,
				disabled: ! hasActivated,
			},
			{
				action: 'customizeSite',
				label: this.getEditSiteLabel(),
				isPrimary: true,
				disabled: ! hasActivated,
				onClick: this.goToCustomizer,
				href: this.props.customizeUrl,
				target: shouldEditHomepageWithGutenberg ? null : '_blank',
			},
		];
	};

	render() {
		const { currentTheme, hasActivated, isActivating } = this.props;

		return (
			<Dialog
				className="themes__thanks-modal"
				isVisible={ isActivating || hasActivated }
				buttons={ this.getButtons() }
				onClose={ this.onCloseModal }
			>
				{ hasActivated && currentTheme ? this.renderContent() : this.renderLoading() }
			</Dialog>
		);
	}
}

export default connect(
	( state ) => {
		const siteId = getSelectedSiteId( state );
		const siteUrl = getSiteUrl( state, siteId );
		const currentThemeId = getActiveTheme( state, siteId );
		const currentTheme = currentThemeId && getCanonicalTheme( state, siteId, currentThemeId );

		// Note: Gutenberg buttons will only show if the homepage is a page.
		const shouldEditHomepageWithGutenberg = shouldCustomizeHomepageWithGutenberg( state, siteId );

		const isAtomic = isSiteAtomic( state, siteId );
		const isJetpack = isJetpackSite( state, siteId );
		const hasAutoLoadingHomepage = themeHasAutoLoadingHomepage( state, currentThemeId );

		// Atomic & Jetpack do not have auto-loading-homepage behavior, so we trigger the layout picker for them.
		const customizeUrl =
			( isAtomic || isJetpack ) && hasAutoLoadingHomepage
				? addQueryArgs(
						{ 'new-homepage': true },
						getCustomizeOrEditFrontPageUrl( state, currentThemeId, siteId )
				  )
				: getCustomizeOrEditFrontPageUrl( state, currentThemeId, siteId );

		return {
			siteId,
			siteUrl,
			currentTheme,
			shouldEditHomepageWithGutenberg,
			detailsUrl: getThemeDetailsUrl( state, currentThemeId, siteId ),
			customizeUrl,
			forumUrl: getThemeForumUrl( state, currentThemeId, siteId ),
			isActivating: !! isActivatingTheme( state, siteId ),
			hasActivated: !! hasActivatedTheme( state, siteId ),
			isThemeWpcom: isWpcomTheme( state, currentThemeId ),
		};
	},
	{
		clearActivated,
		requestSite,
	}
)( localize( ThanksModal ) );
