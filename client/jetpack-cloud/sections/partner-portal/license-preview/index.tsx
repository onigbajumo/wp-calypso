import { getUrlParts } from '@automattic/calypso-url';
import { Button, Gridicon } from '@automattic/components';
import { getQueryArg, removeQueryArgs } from '@wordpress/url';
import classnames from 'classnames';
import { useTranslate } from 'i18n-calypso';
import moment from 'moment';
import page from 'page';
import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import FormattedDate from 'calypso/components/formatted-date';
import ClipboardButton from 'calypso/components/forms/clipboard-button';
import LicenseDetails from 'calypso/jetpack-cloud/sections/partner-portal/license-details';
import LicenseListItem from 'calypso/jetpack-cloud/sections/partner-portal/license-list-item';
import { LicenseState, LicenseFilter } from 'calypso/jetpack-cloud/sections/partner-portal/types';
import { getLicenseState } from 'calypso/jetpack-cloud/sections/partner-portal/utils';
import { recordTracksEvent } from 'calypso/state/analytics/actions';
import { infoNotice } from 'calypso/state/notices/actions';
import './style.scss';

interface Props {
	licenseKey: string;
	product: string;
	username: string | null;
	blogId: number | null;
	siteUrl: string | null;
	issuedAt: string;
	attachedAt: string | null;
	revokedAt: string | null;
	filter: LicenseFilter;
}

export default function LicensePreview( {
	licenseKey,
	product,
	username,
	blogId,
	siteUrl,
	issuedAt,
	attachedAt,
	revokedAt,
	filter,
}: Props ): ReactElement {
	const translate = useTranslate();
	const dispatch = useDispatch();
	const isHighlighted = getQueryArg( window.location.href, 'highlight' ) === licenseKey;
	const [ isOpen, setOpen ] = useState( isHighlighted );
	const licenseState = getLicenseState( attachedAt, revokedAt );
	const domain = siteUrl ? getUrlParts( siteUrl ).hostname || siteUrl : '';
	const showDomain =
		domain && [ LicenseState.Attached, LicenseState.Revoked ].indexOf( licenseState ) !== -1;
	const justIssued =
		moment.utc( issuedAt, 'YYYY-MM-DD HH:mm:ss' ) > moment.utc().subtract( 1, 'minute' );

	const open = useCallback( () => {
		setOpen( ! isOpen );
		dispatch( recordTracksEvent( 'calypso_partner_portal_license_list_preview_toggle' ) );
	}, [ dispatch, isOpen ] );

	const onCopyLicense = useCallback( () => {
		dispatch( infoNotice( translate( 'License copied!' ), { duration: 2000 } ) );
		dispatch( recordTracksEvent( 'calypso_partner_portal_license_list_copy_license_click' ) );
	}, [ dispatch, translate ] );

	useEffect( () => {
		if ( isHighlighted ) {
			page.redirect(
				removeQueryArgs( window.location.pathname + window.location.search, 'highlight' )
			);
		}
	}, [] );

	return (
		<div
			className={ classnames( {
				'license-preview': true,
				'license-preview--is-open': isOpen,
			} ) }
		>
			<LicenseListItem
				className={ classnames( {
					'license-preview__card': true,
					'license-preview__card--is-detached': licenseState === LicenseState.Detached,
					'license-preview__card--is-revoked': licenseState === LicenseState.Revoked,
				} ) }
			>
				<div>
					<h3 className="license-preview__domain">
						{ showDomain && <span>{ domain }</span> }

						{ licenseState === LicenseState.Detached && (
							<span className="license-preview__tag license-preview__tag--is-detached">
								<Gridicon icon="info-outline" size={ 18 } />
								{ translate( 'Unassigned' ) }
							</span>
						) }

						{ licenseState === LicenseState.Revoked && (
							<span className="license-preview__tag license-preview__tag--is-revoked">
								<Gridicon icon="block" size={ 18 } />
								{ translate( 'Revoked' ) }
							</span>
						) }

						{ justIssued && (
							<span className="license-preview__tag license-preview__tag--is-just-issued">
								<Gridicon icon="checkmark-circle" size={ 18 } />
								{ translate( 'Just issued' ) }
							</span>
						) }
					</h3>

					<span className="license-preview__product">
						<span>{ translate( 'Product:' ) } </span>
						{ product }
					</span>
				</div>

				<div>
					<div className="license-preview__label">{ translate( 'Issued on:' ) }</div>

					<FormattedDate date={ issuedAt } format="YYYY-MM-DD" />
				</div>

				{ filter !== LicenseFilter.Revoked ? (
					<div>
						<div className="license-preview__label">{ translate( 'Assigned on:' ) }</div>

						{ licenseState === LicenseState.Attached && (
							<FormattedDate date={ attachedAt } format="YYYY-MM-DD" />
						) }

						{ licenseState !== LicenseState.Attached && (
							<Gridicon icon="minus" className="license-preview__no-value" />
						) }
					</div>
				) : (
					<div>
						<div className="license-preview__label">{ translate( 'Revoked on:' ) }</div>

						{ licenseState === LicenseState.Revoked && (
							<FormattedDate date={ revokedAt } format="YYYY-MM-DD" />
						) }

						{ licenseState !== LicenseState.Revoked && (
							<Gridicon icon="minus" className="license-preview__no-value" />
						) }
					</div>
				) }

				<div>
					{ licenseState === LicenseState.Detached && (
						<ClipboardButton
							text={ licenseKey }
							className="license-preview__copy-license-key"
							compact
							onCopy={ onCopyLicense }
						>
							{ translate( 'Copy License' ) }
						</ClipboardButton>
					) }
				</div>

				<div>
					<Button onClick={ open } className="license-preview__toggle" borderless>
						<Gridicon icon={ isOpen ? 'chevron-up' : 'chevron-down' } />
					</Button>
				</div>
			</LicenseListItem>

			{ isOpen && (
				<LicenseDetails
					licenseKey={ licenseKey }
					product={ product }
					siteUrl={ siteUrl }
					username={ username }
					blogId={ blogId }
					issuedAt={ issuedAt }
					attachedAt={ attachedAt }
					revokedAt={ revokedAt }
					onCopyLicense={ onCopyLicense }
				/>
			) }
		</div>
	);
}

export function LicensePreviewPlaceholder(): ReactElement {
	const translate = useTranslate();

	return (
		<div className="license-preview license-preview--placeholder">
			<LicenseListItem className="license-preview__card">
				<div>
					<h3 className="license-preview__domain">{ translate( 'Loading' ) }</h3>

					<div className="license-preview__product" />
				</div>

				<div>
					<div className="license-preview__label">{ translate( 'Issued on:' ) }</div>

					<div />
				</div>

				<div>
					<div className="license-preview__label">{ translate( 'Assigned on:' ) }</div>

					<div />
				</div>

				<div>
					<div className="license-preview__label">{ translate( 'Revoked on:' ) }</div>

					<div />
				</div>

				<div>
					<div className="license-preview__copy-license-key" />
				</div>

				<div />
			</LicenseListItem>
		</div>
	);
}
