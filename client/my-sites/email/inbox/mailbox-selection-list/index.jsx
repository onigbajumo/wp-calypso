import { Button, Card, Gridicon } from '@automattic/components';
import { useTranslate } from 'i18n-calypso';
import page from 'page';
import PropTypes from 'prop-types';
import React, { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { useSelector } from 'react-redux';
import googleWorkspaceIcon from 'calypso/assets/images/email-providers/google-workspace/icon.svg';
import FormattedHeader from 'calypso/components/formatted-header';
import { getMailboxesCacheKey, useGetMailboxes } from 'calypso/data/emails/use-get-mailboxes';
import errorIllustration from 'calypso/landing/browsehappy/illustration.svg';
import {
	getEmailAddress,
	isEmailForwardAccount,
	isGoogleEmailAccount,
	isTitanMailAccount,
} from 'calypso/lib/emails';
import { getGmailUrl } from 'calypso/lib/gsuite';
import { getTitanEmailUrl } from 'calypso/lib/titan';
import { CALYPSO_CONTACT } from 'calypso/lib/url/support';
import { getSelectedSite } from 'calypso/state/ui/selectors';
import ProgressLine from './progress-line';

import './style.scss';

const getExternalUrl = ( mailbox ) => {
	if ( isTitanMailAccount( mailbox ) ) {
		return getTitanEmailUrl( getEmailAddress( mailbox ) );
	}

	if ( isGoogleEmailAccount( mailbox ) ) {
		return getGmailUrl( getEmailAddress( mailbox ) );
	}

	return '';
};

const MailboxItemIcon = ( { mailbox } ) => {
	const translate = useTranslate();

	if ( isTitanMailAccount( mailbox ) ) {
		return (
			<span className="mailbox-selection-list__icon-circle">{ mailbox.mailbox[ 0 ] ?? 'T' }</span>
		);
	}

	if ( isGoogleEmailAccount( mailbox ) ) {
		return <img src={ googleWorkspaceIcon } alt={ translate( 'Google Workspace icon' ) } />;
	}

	return null;
};

MailboxItemIcon.propType = {
	mailbox: PropTypes.object.isRequired,
};

const MailboxItem = ( { mailbox } ) => {
	if ( isEmailForwardAccount( mailbox ) ) {
		return null;
	}

	return (
		<Card
			className="mailbox-selection-list__item"
			href={ getExternalUrl( mailbox ) }
			target="external"
		>
			<span className="mailbox-selection-list__icon">
				<MailboxItemIcon mailbox={ mailbox } />
			</span>
			<div className="mailbox-selection-list__mailbox">
				<h2>{ getEmailAddress( mailbox ) }</h2>
			</div>
		</Card>
	);
};

MailboxItem.propType = {
	mailbox: PropTypes.object.isRequired,
};

const NewMailboxUpsell = () => {
	const translate = useTranslate();
	const selectedSite = useSelector( getSelectedSite );
	const selectedSiteSlug = selectedSite?.slug;

	const handleCreateNewMailboxClick = useCallback( () => {
		page( `/email/${ selectedSiteSlug }` );
	}, [ selectedSiteSlug ] );

	return (
		<div className="mailbox-selection-list__new-mailbox-upsell-container">
			<div className="mailbox-selection-list__new-mailbox-upsell-messages">
				<h2>{ translate( 'Need another mailbox?' ) }</h2>
				<div>{ translate( 'Create new and activate immediately' ) }</div>
			</div>
			<div className="mailbox-selection-list__new-mailbox-upsell-cta">
				<Button onClick={ handleCreateNewMailboxClick }>
					{ translate( 'Create a new mailbox' ) }
				</Button>
			</div>
		</div>
	);
};

const MailboxItems = ( { mailboxes } ) => {
	const translate = useTranslate();

	return (
		<>
			<FormattedHeader
				align="center"
				brandFont
				className="mailbox-selection-list__header"
				headerText={ translate( 'Welcome to Inbox!' ) }
				subHeaderText={ translate( 'Choose the mailbox you’d like to open.' ) }
			/>

			{ mailboxes.map( ( mailbox, index ) => (
				<MailboxItem mailbox={ mailbox } key={ index } />
			) ) }

			<NewMailboxUpsell />
		</>
	);
};

MailboxItems.propType = {
	mailboxes: PropTypes.arrayOf( PropTypes.object ).isRequired,
};

const MailboxListStatus = ( { isError, statusMessage } ) => {
	return (
		<div className="mailbox-selection-list__status">
			<div className="mailbox-selection-list__status-content">
				<Gridicon icon={ isError ? 'cross-circle' : 'notice' } />
			</div>
			<div className="mailbox-selection-list__status-text">{ statusMessage }</div>
		</div>
	);
};

MailboxListStatus.propType = {
	isError: PropTypes.bool,
	statusMessage: PropTypes.node.isRequired,
};

const MailboxLoaderError = ( { refetchMailboxes, siteId } ) => {
	const translate = useTranslate();
	const queryClient = useQueryClient();

	const reloadMailboxes = () => {
		queryClient.removeQueries( getMailboxesCacheKey( siteId ) );
		refetchMailboxes();
	};

	return (
		<div className="mailbox-selection-list__loader-error-container">
			<section>
				<img src={ errorIllustration } alt={ translate( 'Error image' ) } />
				<FormattedHeader
					align="center"
					brandFont
					headerText={ translate( "Something's broken" ) }
					subHeaderText={ translate(
						'There has been an error in loading your mailboxes. Please use the reload button, and reach out to support if the issue persists.'
					) }
				/>
				<footer>
					<Button primary onClick={ reloadMailboxes }>
						{ translate( 'Reload mailboxes' ) }
					</Button>
					<Button borderless primary href={ CALYPSO_CONTACT }>
						{ translate( 'Contact support' ) }
					</Button>
				</footer>
			</section>
		</div>
	);
};

MailboxLoaderError.propType = {
	refetchMailboxes: PropTypes.func.isRequired,
	siteId: PropTypes.number.isRequired,
};

const MailboxSelectionList = () => {
	const translate = useTranslate();
	const selectedSite = useSelector( getSelectedSite );
	const selectedSiteId = selectedSite?.ID ?? null;

	const { data, isError, isLoading, refetch } = useGetMailboxes( selectedSiteId, {
		retry: 2,
	} );

	if ( isLoading || selectedSiteId === null ) {
		return <ProgressLine statusText={ translate( 'Loading your mailboxes' ) } />;
	}

	if ( isError ) {
		return <MailboxLoaderError refetchMailboxes={ refetch } siteId={ selectedSiteId } />;
	}

	const mailboxes = data?.mailboxes ?? [];

	return (
		<div className="mailbox-selection-list__container">
			<div className="mailbox-selection-list">
				{ mailboxes.length > 0 ? (
					<MailboxItems mailboxes={ mailboxes } />
				) : (
					<MailboxListStatus statusMessage={ translate( 'You have no mailboxes yet.' ) } />
				) }
			</div>
		</div>
	);
};

export default MailboxSelectionList;
