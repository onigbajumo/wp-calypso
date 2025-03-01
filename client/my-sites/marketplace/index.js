import config from '@automattic/calypso-config';
import page from 'page';
import { makeLayout, render as clientRender } from 'calypso/controller';
import { navigation, siteSelection } from 'calypso/my-sites/controller';
import {
	renderDomainsPage,
	renderMarketplaceProduct,
	renderMarketplaceTestPage,
	renderMarketplaceThankYou,
	renderPluginsSetupStatusPage,
	redirectToHome,
} from './controller';

export default function () {
	if ( config.isEnabled( 'marketplace-test' ) ) {
		page(
			'/marketplace/test/:site?',
			siteSelection,
			navigation,
			renderMarketplaceTestPage,
			makeLayout,
			clientRender
		);
	}

	if ( config.isEnabled( 'marketplace-yoast' ) ) {
		page( '/marketplace/domain/:site?', renderDomainsPage, makeLayout, clientRender );
		page(
			'/marketplace/product/setup/:site?',
			siteSelection,
			renderPluginsSetupStatusPage,
			makeLayout,
			clientRender
		);
		page(
			'/marketplace/product/details/:productGroupSlug/:site?',
			navigation,
			siteSelection,
			renderMarketplaceProduct,
			makeLayout,
			clientRender
		);
		page(
			'/marketplace/product/details/:productGroupSlug/:productSlug/:site?',
			navigation,
			siteSelection,
			renderMarketplaceProduct,
			makeLayout,
			clientRender
		);
		page(
			'/marketplace/thank-you/:site?',
			siteSelection,
			renderMarketplaceThankYou,
			makeLayout,
			clientRender
		);
	}

	page( '/marketplace/*', redirectToHome );
}
