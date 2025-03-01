import config from '@automattic/calypso-config';
import { useTranslate } from 'i18n-calypso';
import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import DocumentHead from 'calypso/components/data/document-head';
import FormattedHeader from 'calypso/components/formatted-header';
import InlineSupportLink from 'calypso/components/inline-support-link';
import Main from 'calypso/components/main';
import PageViewTracker from 'calypso/lib/analytics/page-view-tracker';
import CancelPurchase from 'calypso/me/purchases/cancel-purchase';
import ConfirmCancelDomain from 'calypso/me/purchases/confirm-cancel-domain';
import ManagePurchase from 'calypso/me/purchases/manage-purchase';
import ChangePaymentMethod from 'calypso/me/purchases/manage-purchase/change-payment-method';
import titles from 'calypso/me/purchases/titles';
import PurchasesNavigation from 'calypso/my-sites/purchases/navigation';
import SiteLevelPurchasesErrorBoundary from 'calypso/my-sites/purchases/site-level-purchases-error-boundary';
import MySitesSidebarNavigation from 'calypso/my-sites/sidebar-navigation';
import { logToLogstash } from 'calypso/state/logstash/actions';
import { getSelectedSiteSlug } from 'calypso/state/ui/selectors';
import {
	getPurchaseListUrlFor,
	getCancelPurchaseUrlFor,
	getConfirmCancelDomainUrlFor,
	getManagePurchaseUrlFor,
	getAddNewPaymentMethodUrlFor,
} from './paths';
import Subscriptions from './subscriptions';
import { getChangeOrAddPaymentMethodUrlFor } from './utils';

function useLogPurchasesError( message: string ) {
	const reduxDispatch = useDispatch();

	return useCallback(
		( error ) => {
			reduxDispatch(
				logToLogstash( {
					feature: 'calypso_client',
					message,
					severity: config( 'env_id' ) === 'production' ? 'error' : 'debug',
					extra: {
						env: config( 'env_id' ),
						type: 'site_level_purchases',
						message: String( error ),
					},
				} )
			);
		},
		[ reduxDispatch, message ]
	);
}

export function Purchases(): JSX.Element {
	const translate = useTranslate();
	const siteSlug = useSelector( getSelectedSiteSlug );
	const logPurchasesError = useLogPurchasesError( 'site level purchases load error' );

	return (
		<Main wideLayout className="purchases">
			<MySitesSidebarNavigation />
			<DocumentHead title={ titles.sectionTitle } />
			<FormattedHeader
				brandFont
				className="purchases__page-heading"
				headerText={ titles.sectionTitle }
				subHeaderText={ translate(
					'View, manage, or cancel your plan and other purchases for this site. {{learnMoreLink}}Learn more{{/learnMoreLink}}.',
					{
						components: {
							learnMoreLink: <InlineSupportLink supportContext="purchases" showIcon={ false } />,
						},
					}
				) }
				align="left"
			/>
			<PurchasesNavigation sectionTitle={ 'Active Upgrades' } siteSlug={ siteSlug } />

			<SiteLevelPurchasesErrorBoundary
				errorMessage={ translate( 'Sorry, there was an error loading this page.' ) }
				onError={ logPurchasesError }
			>
				<Subscriptions />
			</SiteLevelPurchasesErrorBoundary>
		</Main>
	);
}

export function PurchaseDetails( {
	purchaseId,
	siteSlug,
}: {
	purchaseId: number;
	siteSlug: string;
} ): JSX.Element {
	const translate = useTranslate();
	const logPurchasesError = useLogPurchasesError( 'site level purchase details load error' );

	return (
		<Main wideLayout className="purchases">
			<DocumentHead title={ titles.managePurchase } />
			<FormattedHeader
				brandFont
				className="purchases__page-heading"
				headerText={ titles.sectionTitle }
				align="left"
			/>
			<PageViewTracker
				path="/purchases/subscriptions/:site/:purchaseId"
				title="Purchases > Manage Purchase"
			/>

			<SiteLevelPurchasesErrorBoundary
				errorMessage={ translate( 'Sorry, there was an error loading this page.' ) }
				onError={ logPurchasesError }
			>
				<ManagePurchase
					cardTitle={ titles.managePurchase }
					purchaseId={ purchaseId }
					siteSlug={ siteSlug }
					showHeader={ false }
					purchaseListUrl={ getPurchaseListUrlFor( siteSlug ) }
					redirectTo={ getManagePurchaseUrlFor( siteSlug, purchaseId ) }
					getCancelPurchaseUrlFor={ getCancelPurchaseUrlFor }
					getAddNewPaymentMethodUrlFor={ getAddNewPaymentMethodUrlFor }
					getChangePaymentMethodUrlFor={ getChangeOrAddPaymentMethodUrlFor }
					getManagePurchaseUrlFor={ getManagePurchaseUrlFor }
				/>
			</SiteLevelPurchasesErrorBoundary>
		</Main>
	);
}

export function PurchaseCancel( {
	purchaseId,
	siteSlug,
}: {
	purchaseId: number;
	siteSlug: string;
} ): JSX.Element {
	const translate = useTranslate();
	const logPurchasesError = useLogPurchasesError( 'site level purchase cancel load error' );

	return (
		<Main wideLayout className="purchases">
			<DocumentHead title={ titles.cancelPurchase } />
			<FormattedHeader
				brandFont
				className="purchases__page-heading"
				headerText={ titles.sectionTitle }
				align="left"
			/>

			<SiteLevelPurchasesErrorBoundary
				errorMessage={ translate( 'Sorry, there was an error loading this page.' ) }
				onError={ logPurchasesError }
			>
				<CancelPurchase
					purchaseId={ purchaseId }
					siteSlug={ siteSlug }
					getManagePurchaseUrlFor={ getManagePurchaseUrlFor }
					getConfirmCancelDomainUrlFor={ getConfirmCancelDomainUrlFor }
					purchaseListUrl={ getPurchaseListUrlFor( siteSlug ) }
				/>
			</SiteLevelPurchasesErrorBoundary>
		</Main>
	);
}

export function PurchaseChangePaymentMethod( {
	purchaseId,
	siteSlug,
	cardId,
}: {
	purchaseId: number;
	siteSlug: string;
	cardId: string;
} ): JSX.Element {
	const translate = useTranslate();
	const logPurchasesError = useLogPurchasesError(
		'site level purchase edit payment method load error'
	);

	return (
		<Main wideLayout className="purchases">
			<DocumentHead title={ titles.changePaymentMethod } />
			<FormattedHeader
				brandFont
				className="purchases__page-heading"
				headerText={ titles.sectionTitle }
				align="left"
			/>

			<SiteLevelPurchasesErrorBoundary
				errorMessage={ translate( 'Sorry, there was an error loading this page.' ) }
				onError={ logPurchasesError }
			>
				<ChangePaymentMethod
					cardId={ cardId }
					purchaseId={ purchaseId }
					siteSlug={ siteSlug }
					getManagePurchaseUrlFor={ getManagePurchaseUrlFor }
					purchaseListUrl={ getPurchaseListUrlFor( siteSlug ) }
					isFullWidth={ true }
				/>
			</SiteLevelPurchasesErrorBoundary>
		</Main>
	);
}

export function PurchaseCancelDomain( {
	purchaseId,
	siteSlug,
}: {
	purchaseId: number;
	siteSlug: string;
} ): JSX.Element {
	const translate = useTranslate();
	const logPurchasesError = useLogPurchasesError( 'site level purchase cancel domain load error' );

	return (
		<Main wideLayout className="purchases">
			<DocumentHead title={ titles.confirmCancelDomain } />
			<FormattedHeader
				brandFont
				className="purchases__page-heading"
				headerText={ titles.sectionTitle }
				align="left"
			/>

			<SiteLevelPurchasesErrorBoundary
				errorMessage={ translate( 'Sorry, there was an error loading this page.' ) }
				onError={ logPurchasesError }
			>
				<ConfirmCancelDomain
					purchaseId={ purchaseId }
					siteSlug={ siteSlug }
					getCancelPurchaseUrlFor={ getCancelPurchaseUrlFor }
					purchaseListUrl={ getPurchaseListUrlFor( siteSlug ) }
				/>
			</SiteLevelPurchasesErrorBoundary>
		</Main>
	);
}
