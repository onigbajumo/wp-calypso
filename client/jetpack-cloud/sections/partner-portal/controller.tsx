import page from 'page';
import React from 'react';
import BillingDashboard from 'calypso/jetpack-cloud/sections/partner-portal/primary/billing-dashboard';
import IssueLicense from 'calypso/jetpack-cloud/sections/partner-portal/primary/issue-license';
import LandingPage from 'calypso/jetpack-cloud/sections/partner-portal/primary/landing-page';
import Licenses from 'calypso/jetpack-cloud/sections/partner-portal/primary/licenses';
import PartnerAccess from 'calypso/jetpack-cloud/sections/partner-portal/primary/partner-access';
import PaymentMethodAdd from 'calypso/jetpack-cloud/sections/partner-portal/primary/payment-method-add';
import PaymentMethodList from 'calypso/jetpack-cloud/sections/partner-portal/primary/payment-method-list';
import SelectPartnerKey from 'calypso/jetpack-cloud/sections/partner-portal/primary/select-partner-key';
import TermsOfServiceConsent from 'calypso/jetpack-cloud/sections/partner-portal/primary/terms-of-service-consent';
import PartnerPortalSidebar from 'calypso/jetpack-cloud/sections/partner-portal/sidebar';
import {
	LicenseFilter,
	LicenseSortDirection,
	LicenseSortField,
} from 'calypso/jetpack-cloud/sections/partner-portal/types';
import {
	publicToInternalLicenseFilter,
	publicToInternalLicenseSortField,
	valueToEnum,
	ensurePartnerPortalReturnUrl,
} from 'calypso/jetpack-cloud/sections/partner-portal/utils';
import JetpackComFooter from 'calypso/jetpack-cloud/sections/pricing/jpcom-footer';
import { addQueryArgs } from 'calypso/lib/route';
import {
	getCurrentPartner,
	hasActivePartnerKey,
} from 'calypso/state/partner-portal/partner/selectors';
import { ToSConsent } from 'calypso/state/partner-portal/types';
import Header from './header';
import type PageJS from 'page';

export function partnerContext( context: PageJS.Context, next: () => void ): void {
	context.header = <Header />;
	context.primary = <PartnerAccess />;
	context.footer = <JetpackComFooter />;
	next();
}

export function termsOfServiceContext( context: PageJS.Context, next: () => void ): void {
	context.header = <Header />;
	context.primary = <TermsOfServiceConsent />;
	context.footer = <JetpackComFooter />;
	next();
}

export function partnerKeyContext( context: PageJS.Context, next: () => void ): void {
	context.header = <Header />;
	context.primary = <SelectPartnerKey />;
	context.footer = <JetpackComFooter />;
	next();
}

export function billingDashboardContext( context: PageJS.Context, next: () => void ): void {
	context.header = <Header />;
	context.secondary = <PartnerPortalSidebar path={ context.path } />;
	context.primary = <BillingDashboard />;
	context.footer = <JetpackComFooter />;
	next();
}

export function licensesContext( context: PageJS.Context, next: () => void ): void {
	const { s: search, sort_field, sort_direction, page } = context.query;
	const filter = publicToInternalLicenseFilter( context.params.filter, LicenseFilter.NotRevoked );
	const currentPage = parseInt( page ) || 1;
	const sortField = publicToInternalLicenseSortField( sort_field, LicenseSortField.IssuedAt );
	const sortDirection = valueToEnum< LicenseSortDirection >(
		LicenseSortDirection,
		sort_direction,
		LicenseSortDirection.Descending
	);

	context.header = <Header />;
	context.secondary = <PartnerPortalSidebar path={ context.path } />;
	context.primary = (
		<Licenses
			filter={ filter }
			search={ search || '' }
			currentPage={ currentPage }
			sortDirection={ sortDirection }
			sortField={ sortField }
		/>
	);
	context.footer = <JetpackComFooter />;
	next();
}

export function issueLicenseContext( context: PageJS.Context, next: () => void ): void {
	context.header = <Header />;
	context.secondary = <PartnerPortalSidebar path={ context.path } />;
	context.primary = <IssueLicense />;
	context.footer = <JetpackComFooter />;
	next();
}

export function paymentMethodListContext( context: PageJS.Context, next: () => void ): void {
	context.header = <Header />;
	context.secondary = <PartnerPortalSidebar path={ context.path } />;
	context.primary = <PaymentMethodList />;
	context.footer = <JetpackComFooter />;
	next();
}

export function paymentMethodAddContext( context: PageJS.Context, next: () => void ): void {
	context.header = <Header />;
	context.secondary = <PartnerPortalSidebar path={ context.path } />;
	context.primary = <PaymentMethodAdd />;
	context.footer = <JetpackComFooter />;
	next();
}

export function landingPageContext( context: PageJS.Context, next: () => void ): void {
	context.header = <Header />;
	context.primary = <LandingPage />;
	context.footer = <JetpackComFooter />;
	next();
}

/**
 * Require the user to have a partner with at least 1 active partner key.
 *
 * @param {PageJS.Context} context PageJS context.
 * @param {() => void} next Next context callback.
 */
export function requireAccessContext( context: PageJS.Context, next: () => void ): void {
	const state = context.store.getState();
	const partner = getCurrentPartner( state );
	const { pathname, search } = window.location;

	if ( partner ) {
		next();
		return;
	}

	page.redirect(
		addQueryArgs(
			{
				return: ensurePartnerPortalReturnUrl( pathname + search ),
			},
			'/partner-portal/partner'
		)
	);
}

/**
 * Require the user to have consented to the terms of service.
 *
 * @param {PageJS.Context} context PageJS context.
 * @param {() => void} next Next context callback.
 */
export function requireTermsOfServiceConsentContext(
	context: PageJS.Context,
	next: () => void
): void {
	const { pathname, search } = window.location;
	const state = context.store.getState();
	const partner = getCurrentPartner( state );

	if ( partner && partner.tos !== ToSConsent.NotConsented ) {
		next();
		return;
	}

	const returnUrl = ensurePartnerPortalReturnUrl( pathname + search );

	page.redirect(
		addQueryArgs(
			{
				return: returnUrl,
			},
			'/partner-portal/terms-of-service'
		)
	);
}

/**
 * Require the user to have selected a partner key to use.
 *
 * @param {PageJS.Context} context PageJS context.
 * @param {() => void} next Next context callback.
 */
export function requireSelectedPartnerKeyContext(
	context: PageJS.Context,
	next: () => void
): void {
	const state = context.store.getState();
	const hasKey = hasActivePartnerKey( state );
	const { pathname, search } = window.location;

	if ( hasKey ) {
		next();
		return;
	}

	const returnUrl = ensurePartnerPortalReturnUrl( pathname + search );

	page.redirect(
		addQueryArgs(
			{
				return: returnUrl,
			},
			'/partner-portal/partner-key'
		)
	);
}
