/** @jest-environment jsdom */

jest.mock( 'calypso/lib/analytics/tracks', () => ( {} ) );
jest.mock( 'calypso/lib/analytics/page-view', () => ( {} ) );
jest.mock( 'calypso/lib/analytics/page-view-tracker', () => 'PageViewTracker' );
jest.mock( 'calypso/components/main', () => 'MainComponent' );
jest.mock( 'calypso/blocks/upsell-nudge', () => 'UpsellNudge' );
jest.mock( 'calypso/components/notice', () => 'Notice' );
jest.mock( 'calypso/components/notice/notice-action', () => 'NoticeAction' );

import {
	PLAN_FREE,
	PLAN_BUSINESS,
	PLAN_BUSINESS_2_YEARS,
	PLAN_PREMIUM,
	PLAN_PREMIUM_2_YEARS,
	PLAN_PERSONAL,
	PLAN_PERSONAL_2_YEARS,
	PLAN_BLOGGER,
	PLAN_BLOGGER_2_YEARS,
} from '@automattic/calypso-products';
import { shallow } from 'enzyme';
import { PluginsBrowser } from '../';

const props = {
	pluginsByCategory: [],
	pluginsByCategoryNew: [],
	pluginsByCategoryPopular: [],
	pluginsByCategoryFeatured: [],
	pluginsBySearchTerm: [],
	site: {
		plan: PLAN_FREE,
	},
	selectedSite: {},
	selectedSiteId: 123,
	translate: ( x ) => x,
};

describe( 'PluginsBrowser basic tests', () => {
	test( 'should not blow up and have proper CSS class', () => {
		const comp = shallow( <PluginsBrowser { ...props } /> );
		expect( comp.find( 'MainComponent' ).length ).toBe( 1 );
	} );
	test( 'should show upsell nudge when appropriate', () => {
		const comp = shallow(
			<PluginsBrowser
				{ ...props }
				selectedSiteId={ 12 }
				sitePlan={ PLAN_PREMIUM }
				isJetpackSite={ false }
				hasBusinessPlan={ false }
			/>
		);
		expect( comp.find( 'UpsellNudge[event="calypso_plugins_browser_upgrade_nudge"]' ).length ).toBe(
			1
		);
	} );
	test( 'should not show upsell nudge if no site is selected', () => {
		const comp = shallow(
			<PluginsBrowser
				{ ...props }
				selectedSiteId={ null }
				sitePlan={ { product_slug: PLAN_PREMIUM } }
				isJetpackSite={ false }
				hasBusinessPlan={ false }
			/>
		);
		expect( comp.find( 'UpsellNudge[event="calypso_plugins_browser_upgrade_nudge"]' ).length ).toBe(
			0
		);
	} );
	test( 'should not show upsell nudge if no sitePlan', () => {
		const comp = shallow(
			<PluginsBrowser
				{ ...props }
				selectedSiteId={ 10 }
				sitePlan={ null }
				isJetpackSite={ true }
				hasBusinessPlan={ false }
			/>
		);
		expect( comp.find( 'UpsellNudge[event="calypso_plugins_browser_upgrade_nudge"]' ).length ).toBe(
			0
		);
	} );
	test( 'should not show upsell nudge if non-atomic jetpack site', () => {
		const comp = shallow(
			<PluginsBrowser
				{ ...props }
				selectedSiteId={ 10 }
				sitePlan={ { product_slug: PLAN_PREMIUM } }
				jetpackNonAtomic={ true }
				hasBusinessPlan={ false }
			/>
		);
		expect( comp.find( 'UpsellNudge[event="calypso_plugins_browser_upgrade_nudge"]' ).length ).toBe(
			0
		);
	} );
	test( 'should not show upsell nudge has business plan', () => {
		const comp = shallow(
			<PluginsBrowser
				{ ...props }
				selectedSiteId={ 10 }
				sitePlan={ { product_slug: PLAN_PREMIUM } }
				isJetpackSite={ false }
				hasBusinessPlan={ true }
			/>
		);
		expect( comp.find( 'UpsellNudge[event="calypso_plugins_browser_upgrade_nudge"]' ).length ).toBe(
			0
		);
	} );
} );

describe( 'Upsell Nudge should get appropriate plan constant', () => {
	const myProps = {
		...props,
		showUpgradeNudge: true,
		isJetpackSite: false,
		hasBusinessPlan: false,
	};

	[ PLAN_FREE, PLAN_BLOGGER, PLAN_PERSONAL, PLAN_PREMIUM ].forEach( ( product_slug ) => {
		test( `Business 1 year for (${ product_slug })`, () => {
			const comp = shallow( <PluginsBrowser { ...myProps } sitePlan={ { product_slug } } /> );
			expect(
				comp.find( 'UpsellNudge[event="calypso_plugins_browser_upgrade_nudge"]' ).length
			).toBe( 1 );
			expect(
				comp.find( 'UpsellNudge[event="calypso_plugins_browser_upgrade_nudge"]' ).props().plan
			).toBe( PLAN_BUSINESS );
		} );
	} );

	[ PLAN_BLOGGER_2_YEARS, PLAN_PERSONAL_2_YEARS, PLAN_PREMIUM_2_YEARS ].forEach(
		( product_slug ) => {
			test( `Business 2 year for (${ product_slug })`, () => {
				const comp = shallow( <PluginsBrowser { ...myProps } sitePlan={ { product_slug } } /> );
				expect(
					comp.find( 'UpsellNudge[event="calypso_plugins_browser_upgrade_nudge"]' ).length
				).toBe( 1 );
				expect(
					comp.find( 'UpsellNudge[event="calypso_plugins_browser_upgrade_nudge"]' ).props().plan
				).toBe( PLAN_BUSINESS_2_YEARS );
			} );
		}
	);
} );
