import { Button } from '@automattic/components';
import { addQueryArgs } from '@wordpress/url';
import { useTranslate } from 'i18n-calypso';
import React, { ReactElement, FunctionComponent } from 'react';
import { useSelector } from 'react-redux';
import JetpackScanSVG from 'calypso/assets/images/illustrations/jetpack-scan.svg';
import VaultPressLogo from 'calypso/assets/images/jetpack/vaultpress-logo.svg';
import DocumentHead from 'calypso/components/data/document-head';
import FormattedHeader from 'calypso/components/formatted-header';
import JetpackDisconnectedWPCOM from 'calypso/components/jetpack/jetpack-disconnected-wpcom';
import SecurityIcon from 'calypso/components/jetpack/security-icon';
import Main from 'calypso/components/main';
import Notice from 'calypso/components/notice';
import PromoCard from 'calypso/components/promo-section/promo-card';
import PromoCardCTA from 'calypso/components/promo-section/promo-card/cta';
import PageViewTracker from 'calypso/lib/analytics/page-view-tracker';
import { preventWidows } from 'calypso/lib/formatting';
import useTrackCallback from 'calypso/lib/jetpack/use-track-callback';
import SidebarNavigation from 'calypso/my-sites/sidebar-navigation';
import { canCurrentUser } from 'calypso/state/selectors/can-current-user';
import { getSelectedSiteSlug, getSelectedSiteId } from 'calypso/state/ui/selectors';
import './style.scss';

const ScanMultisiteBody: FunctionComponent = () => {
	const translate = useTranslate();
	return (
		<PromoCard
			title={ preventWidows( translate( 'WordPress multi-sites are not supported' ) ) }
			image={ <SecurityIcon icon="info" /> }
			isPrimary
		>
			<p>
				{ preventWidows(
					translate(
						"We're sorry, Jetpack Scan is not compatible with multisite WordPress installations at this time."
					)
				) }
			</p>
		</PromoCard>
	);
};

const ScanVPActiveBody: FunctionComponent = () => {
	const onUpgradeClick = useTrackCallback( undefined, 'calypso_jetpack_scan_vaultpress_click' );
	const translate = useTranslate();
	return (
		<PromoCard
			title={ preventWidows( translate( 'Your site has VaultPress' ) ) }
			image={ { path: VaultPressLogo } }
			isPrimary
		>
			<p>
				{ preventWidows(
					translate(
						'Your site already is protected by VaultPress. You can find a link to your VaultPress dashboard below.'
					)
				) }
			</p>
			<div className="scan__wpcom-ctas">
				<Button
					className="scan__wpcom-cta"
					href="https://dashboard.vaultpress.com"
					onClick={ onUpgradeClick }
					selfTarget={ true }
					primary
				>
					{ translate( 'Visit Dashboard' ) }
				</Button>
			</div>
		</PromoCard>
	);
};

const ScanUpsellBody: FunctionComponent = () => {
	const onUpgradeClick = useTrackCallback( undefined, 'calypso_jetpack_scan_upsell' );
	const siteSlug = useSelector( getSelectedSiteSlug );
	const siteId = useSelector( getSelectedSiteId );
	const isAdmin = useSelector(
		( state ) => siteId && canCurrentUser( state, siteId, 'manage_options' )
	);
	const translate = useTranslate();
	const postCheckoutUrl = window.location.pathname + window.location.search;

	return (
		<PromoCard
			title={ translate( 'We guard your site. You run your business.' ) }
			image={ { path: JetpackScanSVG } }
			isPrimary
		>
			<p>
				{ translate(
					'Scan gives you automated scanning and one-click fixes ' +
						'to keep your site ahead of security threats.'
				) }
			</p>

			{ ! isAdmin && (
				<Notice
					status="is-warning"
					text={ translate( 'Only site administrators can upgrade to access daily scanning.' ) }
					showDismiss={ false }
				/>
			) }

			{ isAdmin && (
				<PromoCardCTA
					cta={ {
						text: translate( 'Get daily scanning' ),
						action: {
							url: addQueryArgs( `/checkout/${ siteSlug }/jetpack_scan`, {
								redirect_to: postCheckoutUrl,
							} ),
							onClick: onUpgradeClick,
							selfTarget: true,
						},
					} }
				/>
			) }
		</PromoCard>
	);
};

export default function WPCOMScanUpsellPage( { reason }: { reason?: string } ): ReactElement {
	const translate = useTranslate();
	let body;
	switch ( reason ) {
		case 'multisite_not_supported':
			body = <ScanMultisiteBody />;
			break;
		case 'vp_active_on_site':
			body = <ScanVPActiveBody />;
			break;
		case 'no_connected_jetpack':
			body = <JetpackDisconnectedWPCOM />;
			break;
		default:
			body = <ScanUpsellBody />;
	}
	return (
		<Main className="scan scan__wpcom-upsell">
			<DocumentHead title="Scanner" />
			<SidebarNavigation />
			<PageViewTracker path="/scan/:site" title="Scanner" />

			<FormattedHeader
				headerText={ translate( 'Jetpack Scan' ) }
				id="scan-header"
				align="left"
				brandFont
			/>

			{ body }
		</Main>
	);
}
