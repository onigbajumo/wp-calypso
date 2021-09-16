import { Button, Gridicon } from '@automattic/components';
import { withMobileBreakpoint } from '@automattic/viewport-react';
import { __ } from '@wordpress/i18n';
import classNames from 'classnames';
import { localize } from 'i18n-calypso';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import InlineHelpContactView from 'calypso/blocks/inline-help/inline-help-contact-view';
import QuerySupportTypes from 'calypso/blocks/inline-help/inline-help-query-support-types';
import { recordTracksEvent } from 'calypso/state/analytics/actions';
import getSearchQuery from 'calypso/state/inline-help/selectors/get-search-query';
import { VIEW_CONTACT, VIEW_RICH_RESULT } from './constants';
import InlineHelpRichResult from './inline-help-rich-result';
import InlineHelpSearchCard from './inline-help-search-card';
import InlineHelpSearchResults from './inline-help-search-results';
import './popover-content.scss';

class InlineHelpPopoverContent extends Component {
	static propTypes = {
		onClose: PropTypes.func.isRequired,
		showVideoResult: PropTypes.func.isRequired,
	};

	secondaryViewRef = React.createRef();

	state = {
		activeSecondaryView: null,
		selectedResult: null,
	};

	openSecondaryView = ( secondaryViewKey ) => {
		this.props.recordTracksEvent( `calypso_inlinehelp_${ secondaryViewKey }_show`, {
			location: 'inline-help-popover',
		} );
		// Focus the secondary popover contents after the state is set
		this.setState( { activeSecondaryView: secondaryViewKey }, () => {
			const contentTitle = this.secondaryViewRef.current.querySelector( 'h2' );

			if ( contentTitle ) {
				contentTitle.focus();
			}
		} );
	};

	closeSecondaryView = () => {
		this.props.recordTracksEvent( `calypso_inlinehelp_${ this.state.activeSecondaryView }_hide`, {
			location: 'inline-help-popover',
		} );
		this.setState( {
			activeSecondaryView: null,
			selectedResult: null,
		} );
	};

	openContactView = () => {
		this.openSecondaryView( VIEW_CONTACT );
	};

	openResultView = ( event, result ) => {
		event.preventDefault();
		this.setState( { selectedResult: result } );
		this.openSecondaryView( VIEW_RICH_RESULT );
	};

	setAdminSection = () => {
		const { isBreakpointActive: isMobile, onClose } = this.props;
		if ( isMobile ) {
			onClose();
		}
	};

	moreHelpClicked = () => {
		this.props.onClose();
		this.props.recordTracksEvent( 'calypso_inlinehelp_morehelp_click', {
			location: 'inline-help-popover',
		} );
	};

	renderSecondaryView() {
		const { onClose, showVideoResult } = this.props;
		const { selectedResult } = this.state;
		const classes = classNames(
			'inline-help__secondary-view',
			`inline-help__${ this.state.activeSecondaryView }`
		);

		return (
			<section ref={ this.secondaryViewRef } className={ classes }>
				{
					{
						[ VIEW_CONTACT ]: (
							<>
								<h2 className="inline-help__title" tabIndex="-1">
									{ __( 'Get Support' ) }
								</h2>
								<InlineHelpContactView />
							</>
						),
						[ VIEW_RICH_RESULT ]: (
							<InlineHelpRichResult
								result={ selectedResult }
								showVideoResult={ showVideoResult }
								closePopover={ onClose }
							/>
						),
					}[ this.state.activeSecondaryView ]
				}
			</section>
		);
	}

	renderPopoverContent() {
		return (
			<>
				<QuerySupportTypes />
				<div className="inline-help__search">
					<InlineHelpSearchCard
						query={ this.props.searchQuery }
						isVisible={ ! this.state.activeSecondaryView }
					/>
					<InlineHelpSearchResults
						onSelect={ this.openResultView }
						onAdminSectionSelect={ this.setAdminSection }
						searchQuery={ this.props.searchQuery }
					/>
				</div>
				{ this.renderSecondaryView() }
			</>
		);
	}

	renderPopoverFooter() {
		const { translate } = this.props;
		return (
			<div className="inline-help__footer">
				<Button
					onClick={ this.moreHelpClicked }
					className="inline-help__more-button"
					borderless
					href="/help"
				>
					<Gridicon icon="help" className="inline-help__gridicon-left" />
					{ translate( 'More help' ) }
				</Button>

				<Button onClick={ this.openContactView } className="inline-help__contact-button" borderless>
					<Gridicon icon="chat" className="inline-help__gridicon-left" />
					{ translate( 'Contact us' ) }
					<Gridicon icon="chevron-right" className="inline-help__gridicon-right" />
				</Button>

				<Button
					onClick={ this.closeSecondaryView }
					className="inline-help__cancel-button"
					borderless
				>
					<Gridicon icon="chevron-left" className="inline-help__gridicon-left" />
					{ translate( 'Back' ) }
				</Button>
			</div>
		);
	}

	render() {
		const className = classNames( 'inline-help__popover-content', {
			'is-secondary-view-active': this.state.activeSecondaryView,
		} );

		return (
			<div className={ className }>
				{ this.renderPopoverContent() }
				{ this.renderPopoverFooter() }
			</div>
		);
	}
}

export default withMobileBreakpoint(
	connect(
		( state ) => ( {
			searchQuery: getSearchQuery( state ),
		} ),
		{
			recordTracksEvent,
		}
	)( localize( InlineHelpPopoverContent ) )
);
