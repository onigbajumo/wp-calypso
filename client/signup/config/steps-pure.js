import config from '@automattic/calypso-config';
import {
	PLAN_PERSONAL,
	PLAN_PREMIUM,
	PLAN_BUSINESS,
	PLAN_ECOMMERCE,
	PLAN_PERSONAL_MONTHLY,
	PLAN_PREMIUM_MONTHLY,
	PLAN_BUSINESS_MONTHLY,
	PLAN_ECOMMERCE_MONTHLY,
	TYPE_FREE,
	TYPE_PERSONAL,
	TYPE_PREMIUM,
	TYPE_BUSINESS,
	TYPE_ECOMMERCE,
} from '@automattic/calypso-products';
import i18n from 'i18n-calypso';

const noop = () => {};

export function generateSteps( {
	addPlanToCart = noop,
	createAccount = noop,
	createSite = noop,
	createWpForTeamsSite = noop,
	createSiteOrDomain = noop,
	createSiteWithCart = noop,
	currentPage = noop,
	setDesignOnSite = noop,
	setThemeOnSite = noop,
	addDomainToCart = noop,
	launchSiteApi = noop,
	isPlanFulfilled = noop,
	isDomainFulfilled = noop,
	isSiteTypeFulfilled = noop,
	isSiteTopicFulfilled = noop,
	maybeRemoveStepForUserlessCheckout = noop,
} = {} ) {
	return {
		survey: {
			stepName: 'survey',
			props: {
				surveySiteType:
					currentPage && currentPage.toString().match( /\/start\/blog/ ) ? 'blog' : 'site',
			},
			providesDependencies: [ 'surveySiteType', 'surveyQuestion' ],
		},

		themes: {
			stepName: 'themes',
			dependencies: [ 'siteSlug' ],
			providesDependencies: [ 'themeSlugWithRepo', 'useThemeHeadstart' ],
			optionalDependencies: [ 'useThemeHeadstart' ],
		},

		'portfolio-themes': {
			stepName: 'portfolio-themes',
			props: {
				designType: 'grid',
			},
			dependencies: [ 'siteSlug' ],
			providesDependencies: [ 'themeSlugWithRepo' ],
		},

		'template-first-themes': {
			stepName: 'template-first-themes',
			props: {
				designType: 'template-first',
				quantity: 18,
			},
			dependencies: [ 'siteSlug' ],
			providesDependencies: [ 'themeSlugWithRepo', 'useThemeHeadstart' ],
		},

		// `themes` does not update the theme for an existing site as we normally
		// do this when the site is created. In flows where a site is merely being
		// updated, we need to use a different API request function.
		'themes-site-selected': {
			stepName: 'themes-site-selected',
			dependencies: [ 'siteSlug', 'themeSlugWithRepo' ],
			providesDependencies: [ 'themeSlugWithRepo', 'useThemeHeadstart' ],
			apiRequestFunction: setThemeOnSite,
			props: {
				headerText: i18n.translate( 'Choose a theme for your new site.' ),
			},
		},

		'domains-launch': {
			stepName: 'domains-launch',
			apiRequestFunction: addDomainToCart,
			fulfilledStepCallback: isDomainFulfilled,
			providesDependencies: [ 'domainItem', 'shouldHideFreePlan' ],
			optionalDependencies: [ 'shouldHideFreePlan' ],
			props: {
				isDomainOnly: false,
				showExampleSuggestions: false,
				includeWordPressDotCom: false,
				showSkipButton: true,
				headerText: i18n.translate( 'Getting ready to launch, pick a domain' ),
				subHeaderText: i18n.translate( 'Select a domain name for your website' ),
			},
			dependencies: [ 'siteSlug' ],
		},

		'plans-site-selected': {
			stepName: 'plans-site-selected',
			apiRequestFunction: addPlanToCart,
			dependencies: [ 'siteSlug' ],
			providesDependencies: [ 'cartItem' ],
		},

		site: {
			stepName: 'site',
			apiRequestFunction: createSite,
			providesDependencies: [ 'siteSlug' ],
		},

		'rebrand-cities-welcome': {
			stepName: 'rebrand-cities-welcome',
			apiRequestFunction: createSiteWithCart,
			providesDependencies: [ 'siteId', 'siteSlug', 'domainItem', 'themeItem' ],
			props: {
				isDomainOnly: false,
			},
			delayApiRequestUntilComplete: true,
		},

		about: {
			stepName: 'about',
			providesDependencies: [ 'designType', 'themeSlugWithRepo', 'siteTitle', 'surveyQuestion' ],
		},

		user: {
			stepName: 'user',
			apiRequestFunction: createAccount,
			providesToken: true,
			providesDependencies: [
				'bearer_token',
				'username',
				'marketing_price_group',
				'plans_reorder_abtest_variation',
				'redirect',
			],
			optionalDependencies: [ 'plans_reorder_abtest_variation', 'redirect' ],
			props: {
				isSocialSignupEnabled: config.isEnabled( 'signup/social' ),
			},
		},

		'user-new': {
			stepName: 'user-new',
			apiRequestFunction: createAccount,
			fulfilledStepCallback: maybeRemoveStepForUserlessCheckout,
			providesToken: true,
			dependencies: [ 'cartItem', 'domainItem' ],
			providesDependencies: [
				'bearer_token',
				'username',
				'marketing_price_group',
				'plans_reorder_abtest_variation',
				'allowUnauthenticated',
			],
			optionalDependencies: [
				'bearer_token',
				'username',
				'marketing_price_group',
				'plans_reorder_abtest_variation',
				'allowUnauthenticated',
			],
			props: {
				isSocialSignupEnabled: config.isEnabled( 'signup/social' ),
			},
		},

		'site-title': {
			stepName: 'site-title',
			providesDependencies: [ 'siteTitle' ],
		},

		test: {
			stepName: 'test',
		},

		plans: {
			stepName: 'plans',
			apiRequestFunction: addPlanToCart,
			dependencies: [ 'siteSlug' ],
			optionalDependencies: [ 'emailItem' ],
			providesDependencies: [ 'cartItem' ],
			fulfilledStepCallback: isPlanFulfilled,
		},

		'plans-new': {
			stepName: 'plans',
			providesDependencies: [ 'cartItem' ],
			fulfilledStepCallback: isPlanFulfilled,
		},

		'plans-ecommerce': {
			stepName: 'plans-ecommerce',
			apiRequestFunction: addPlanToCart,
			dependencies: [ 'siteSlug' ],
			providesDependencies: [ 'cartItem' ],
			fulfilledStepCallback: isPlanFulfilled,
			props: {
				hideFreePlan: true,
				planTypes: [ TYPE_BUSINESS, TYPE_ECOMMERCE ],
			},
		},

		'plans-import': {
			stepName: 'plans-import',
			apiRequestFunction: addPlanToCart,
			dependencies: [ 'siteSlug' ],
			providesDependencies: [ 'cartItem' ],
			fulfilledStepCallback: isPlanFulfilled,
			props: {
				planTypes: [ TYPE_FREE, TYPE_PERSONAL, TYPE_PREMIUM, TYPE_BUSINESS ],
			},
		},

		'plans-personal': {
			stepName: 'plans-personal',
			apiRequestFunction: addPlanToCart,
			fulfilledStepCallback: isPlanFulfilled,
			dependencies: [ 'siteSlug' ],
			providesDependencies: [ 'cartItem' ],
			defaultDependencies: {
				cartItem: PLAN_PERSONAL,
			},
		},

		'plans-premium': {
			stepName: 'plans-premium',
			apiRequestFunction: addPlanToCart,
			fulfilledStepCallback: isPlanFulfilled,
			dependencies: [ 'siteSlug' ],
			providesDependencies: [ 'cartItem' ],
			defaultDependencies: {
				cartItem: PLAN_PREMIUM,
			},
		},

		'plans-business': {
			stepName: 'plans-business',
			apiRequestFunction: addPlanToCart,
			fulfilledStepCallback: isPlanFulfilled,
			dependencies: [ 'siteSlug' ],
			providesDependencies: [ 'cartItem' ],
			defaultDependencies: {
				cartItem: PLAN_BUSINESS,
			},
		},

		'plans-ecommerce-fulfilled': {
			stepName: 'plans-ecommerce-fulfilled',
			apiRequestFunction: addPlanToCart,
			fulfilledStepCallback: isPlanFulfilled,
			dependencies: [ 'siteSlug' ],
			providesDependencies: [ 'cartItem' ],
			defaultDependencies: {
				cartItem: PLAN_ECOMMERCE,
			},
		},

		'plans-launch': {
			stepName: 'plans-launch',
			apiRequestFunction: addPlanToCart,
			fulfilledStepCallback: isPlanFulfilled,
			dependencies: [ 'siteSlug' ],
			providesDependencies: [ 'cartItem' ],
			props: {
				headerText: i18n.translate( 'Getting ready to launch your website' ),
				subHeaderText: i18n.translate( "Pick a plan that's right for you. Upgrade as you grow." ),
				isLaunchPage: true,
			},
		},

		'plans-store-nux': {
			stepName: 'plans-store-nux',
			apiRequestFunction: addPlanToCart,
			dependencies: [ 'siteSlug', 'domainItem' ],
			providesDependencies: [ 'cartItem' ],
		},
		domains: {
			stepName: 'domains',
			apiRequestFunction: createSiteWithCart,
			providesDependencies: [
				'siteId',
				'siteSlug',
				'domainItem',
				'themeItem',
				'shouldHideFreePlan',
				'isManageSiteFlow',
			],
			optionalDependencies: [ 'shouldHideFreePlan', 'isManageSiteFlow' ],
			props: {
				isDomainOnly: false,
			},
			delayApiRequestUntilComplete: true,
		},
		emails: {
			stepName: 'emails',
			dependencies: [ 'domainItem', 'siteSlug' ],
			providesDependencies: [ 'domainItem', 'emailItem', 'shouldHideFreePlan' ],
			props: {
				isDomainOnly: false,
			},
		},
		'domain-only': {
			stepName: 'domain-only',
			providesDependencies: [ 'siteId', 'siteSlug', 'domainItem' ],
			props: {
				isDomainOnly: true,
				forceHideFreeDomainExplainerAndStrikeoutUi: true,
			},
		},

		'select-domain': {
			stepName: 'select-domain',
			providesDependencies: [ 'siteId', 'siteSlug', 'domainItem' ],
			props: {
				isAllDomains: true,
				isDomainOnly: true,
				forceHideFreeDomainExplainerAndStrikeoutUi: true,
			},
		},

		'domains-store': {
			stepName: 'domains',
			apiRequestFunction: createSiteWithCart,
			providesDependencies: [ 'siteId', 'siteSlug', 'domainItem', 'themeItem' ],
			props: {
				isDomainOnly: false,
				forceDesignType: 'store',
			},
			delayApiRequestUntilComplete: true,
		},

		'domains-theme-preselected': {
			stepName: 'domains-theme-preselected',
			apiRequestFunction: createSiteWithCart,
			providesDependencies: [
				'siteId',
				'siteSlug',
				'domainItem',
				'themeItem',
				'useThemeHeadstart',
				'shouldHideFreePlan',
			],
			optionalDependencies: [ 'shouldHideFreePlan', 'useThemeHeadstart' ],
			props: {
				isDomainOnly: false,
			},
			delayApiRequestUntilComplete: true,
		},

		'jetpack-user': {
			stepName: 'jetpack-user',
			apiRequestFunction: createAccount,
			providesToken: true,
			props: {
				headerText: i18n.translate( 'Create an account for Jetpack' ),
				subHeaderText: i18n.translate( "You're moments away from connecting Jetpack." ),
			},
			providesDependencies: [ 'bearer_token', 'username' ],
		},

		'oauth2-user': {
			stepName: 'oauth2-user',
			apiRequestFunction: createAccount,
			props: {
				oauth2Signup: true,
			},
			providesToken: true,
			providesDependencies: [
				'bearer_token',
				'username',
				'oauth2_client_id',
				'oauth2_redirect',
				'marketing_price_group',
				'plans_reorder_abtest_variation',
			],
			optionalDependencies: [ 'plans_reorder_abtest_variation' ],
		},

		'oauth2-name': {
			stepName: 'oauth2-name',
			apiRequestFunction: createAccount,
			providesToken: true,
			providesDependencies: [
				'bearer_token',
				'username',
				'oauth2_client_id',
				'oauth2_redirect',
				'marketing_price_group',
				'plans_reorder_abtest_variation',
			],
			optionalDependencies: [ 'plans_reorder_abtest_variation' ],
			props: {
				isSocialSignupEnabled: config.isEnabled( 'signup/social' ),
				oauth2Signup: true,
				displayNameInput: true,
				displayUsernameInput: false,
			},
		},

		displayname: {
			stepName: 'displayname',
			apiRequestFunction: createAccount,
			providesToken: true,
			providesDependencies: [ 'bearer_token', 'username' ],
			props: {
				isSocialSignupEnabled: config.isEnabled( 'signup/social' ),
				displayNameInput: true,
				displayUsernameInput: false,
			},
		},

		// Currently, these two steps explicitly submit other steps to skip them, and
		// should not be used outside of the `domain-first` flow.
		'site-or-domain': {
			stepName: 'site-or-domain',
			props: {
				headerText: i18n.translate( 'Choose how you want to use your domain.' ),
				subHeaderText: i18n.translate(
					"Don't worry you can easily add a site later if you're not ready."
				),
			},
			providesDependencies: [
				'designType',
				'siteId',
				'siteSlug',
				'siteUrl',
				'domainItem',
				'themeSlugWithRepo',
			],
		},
		'site-picker': {
			stepName: 'site-picker',
			apiRequestFunction: createSiteOrDomain,
			props: {
				headerText: i18n.translate( 'Choose your site?' ),
			},
			providesDependencies: [ 'siteId', 'siteSlug', 'domainItem', 'themeSlugWithRepo' ],
			dependencies: [ 'cartItem', 'designType', 'domainItem', 'siteUrl', 'themeSlugWithRepo' ],
			delayApiRequestUntilComplete: true,
		},

		'creds-complete': {
			stepName: 'creds-complete',
			providesDependencies: [],
		},

		'creds-confirm': {
			stepName: 'creds-confirm',
			providesDependencies: [ 'rewindconfig' ],
		},

		'creds-permission': {
			stepName: 'creds-permission',
			providesDependencies: [ 'rewindconfig' ],
		},

		'rewind-migrate': {
			stepName: 'rewind-migrate',
			providesDependencies: [ 'rewindconfig' ],
		},

		'rewind-were-backing': {
			stepName: 'rewind-were-backing',
			providesDependencies: [],
		},

		'rewind-form-creds': {
			stepName: 'rewind-form-creds',
			providesDependencies: [ 'rewindconfig' ],
		},

		'clone-start': {
			stepName: 'clone-start',
			providesDependencies: [ 'originSiteSlug', 'originSiteName', 'originBlogId' ],
		},

		'clone-destination': {
			stepName: 'clone-destination',
			providesDependencies: [ 'destinationSiteName', 'destinationSiteUrl' ],
		},

		'clone-credentials': {
			stepName: 'clone-credentials',
			providesDependencies: [ 'roleName' ],
		},

		'clone-point': {
			stepName: 'clone-point',
			providesDependencies: [ 'clonePoint' ],
		},

		'clone-jetpack': {
			stepName: 'clone-jetpack',
			providesDependencies: [ 'cloneJetpack' ],
		},

		'clone-ready': {
			stepName: 'clone-ready',
			providesDependencies: [],
		},

		'clone-cloning': {
			stepName: 'clone-cloning',
			providesDependencies: [],
		},

		/* Imports */
		'from-url': {
			stepName: 'from-url',
			providesDependencies: [
				'importSiteEngine',
				'importSiteFavicon',
				'importSiteUrl',
				'siteTitle',
				'suggestedDomain',
				'themeSlugWithRepo',
			],
		},

		/* Import onboarding */
		'import-url': {
			stepName: 'import-url',
			providesDependencies: [
				'importSiteEngine',
				'importSiteFavicon',
				'importSiteUrl',
				'siteTitle',
				'suggestedDomain',
				'themeSlugWithRepo',
			],
		},

		'import-preview': {
			stepName: 'import-preview',
			dependencies: [ 'importSiteEngine', 'importSiteFavicon', 'importSiteUrl', 'siteTitle' ],
		},

		'reader-landing': {
			stepName: 'reader-landing',
			providesDependencies: [],
		},

		/* Improved Onboarding */
		'site-type': {
			stepName: 'site-type',
			providesDependencies: [ 'siteType', 'themeSlugWithRepo' ],
			fulfilledStepCallback: isSiteTypeFulfilled,
		},

		'site-type-with-theme': {
			stepName: 'site-type',
			providesDependencies: [ 'siteType' ],
			fulfilledStepCallback: isSiteTypeFulfilled,
		},

		'site-topic': {
			stepName: 'site-topic',
			providesDependencies: [ 'siteTopic', 'themeSlugWithRepo' ],
			optionalDependencies: [ 'themeSlugWithRepo' ],
			fulfilledStepCallback: isSiteTopicFulfilled,
		},

		'site-topic-with-theme': {
			stepName: 'site-topic',
			providesDependencies: [ 'siteTopic' ],
			fulfilledStepCallback: isSiteTopicFulfilled,
		},

		'site-title-without-domains': {
			stepName: 'site-title-without-domains',
			apiRequestFunction: createSiteWithCart,
			delayApiRequestUntilComplete: true,
			dependencies: [ 'themeSlugWithRepo' ],
			providesDependencies: [ 'siteTitle', 'siteId', 'siteSlug', 'domainItem', 'themeItem' ],
			props: {
				showSiteMockups: true,
			},
		},

		'site-style': {
			stepName: 'site-style',
			providesDependencies: [ 'siteStyle', 'themeSlugWithRepo' ],
		},

		// Steps with preview
		// These can be removed once we make the preview the default
		'site-topic-with-preview': {
			stepName: 'site-topic-with-preview',
			providesDependencies: [ 'siteTopic', 'themeSlugWithRepo' ],
			optionalDependencies: [ 'themeSlugWithRepo' ],
			fulfilledStepCallback: isSiteTopicFulfilled,
			props: {
				showSiteMockups: true,
			},
		},

		'site-style-with-preview': {
			stepName: 'site-style-with-preview',
			providesDependencies: [ 'siteStyle', 'themeSlugWithRepo' ],
			props: {
				showSiteMockups: true,
			},
		},

		'domains-with-preview': {
			stepName: 'domains-with-preview',
			apiRequestFunction: createSiteWithCart,
			providesDependencies: [
				'siteId',
				'siteSlug',
				'domainItem',
				'themeItem',
				'shouldHideFreePlan',
			],
			optionalDependencies: [ 'shouldHideFreePlan' ],
			props: {
				showSiteMockups: true,
				isDomainOnly: false,
			},
			dependencies: [ 'themeSlugWithRepo' ],
			delayApiRequestUntilComplete: true,
		},

		'site-title-with-preview': {
			stepName: 'site-title-with-preview',
			providesDependencies: [ 'siteTitle' ],
			props: {
				showSiteMockups: true,
			},
		},

		launch: {
			stepName: 'launch',
			apiRequestFunction: launchSiteApi,
			dependencies: [ 'siteSlug' ],
			props: {
				nonInteractive: true,
			},
		},

		passwordless: {
			stepName: 'passwordless',
			providesToken: true,
			providesDependencies: [ 'bearer_token', 'email', 'username' ],
			unstorableDependencies: [ 'bearer_token' ],
		},

		'p2-details': {
			stepName: 'p2-details',
		},

		'p2-site': {
			stepName: 'p2-site',
			apiRequestFunction: createWpForTeamsSite,
			providesDependencies: [ 'siteSlug' ],
		},

		'plans-personal-monthly': {
			stepName: 'plans-personal-monthly',
			apiRequestFunction: addPlanToCart,
			fulfilledStepCallback: isPlanFulfilled,
			dependencies: [ 'siteSlug' ],
			providesDependencies: [ 'cartItem' ],
			defaultDependencies: {
				cartItem: PLAN_PERSONAL_MONTHLY,
			},
		},

		'plans-premium-monthly': {
			stepName: 'plans-premium-monthly',
			apiRequestFunction: addPlanToCart,
			fulfilledStepCallback: isPlanFulfilled,
			dependencies: [ 'siteSlug' ],
			providesDependencies: [ 'cartItem' ],
			defaultDependencies: {
				cartItem: PLAN_PREMIUM_MONTHLY,
			},
		},

		'plans-business-monthly': {
			stepName: 'plans-business-monthly',
			apiRequestFunction: addPlanToCart,
			fulfilledStepCallback: isPlanFulfilled,
			dependencies: [ 'siteSlug' ],
			providesDependencies: [ 'cartItem' ],
			defaultDependencies: {
				cartItem: PLAN_BUSINESS_MONTHLY,
			},
		},

		'plans-ecommerce-monthly': {
			stepName: 'plans-ecommerce-monthly',
			apiRequestFunction: addPlanToCart,
			fulfilledStepCallback: isPlanFulfilled,
			dependencies: [ 'siteSlug' ],
			providesDependencies: [ 'cartItem' ],
			defaultDependencies: {
				cartItem: PLAN_ECOMMERCE_MONTHLY,
			},
		},

		design: {
			stepName: 'design-picker',
			dependencies: [ 'siteSlug' ],
			providesDependencies: [ 'selectedDesign' ],
			optionalDependencies: [ 'selectedDesign' ],
		},

		'design-setup-site': {
			stepName: 'design-setup-site',
			props: {
				largeThumbnails: true,
				showOnlyThemes: true,
			},
			apiRequestFunction: setDesignOnSite,
			dependencies: [ 'siteSlug' ],
			providesDependencies: [ 'selectedDesign' ],
			optionalDependencies: [ 'selectedDesign' ],
		},
		'site-info-collection': {
			stepName: 'site-info-collection',
			dependencies: [ 'siteSlug' ],
			providesDependencies: [ 'cartItem' ],
			apiRequestFunction: addPlanToCart,
		},
	};
}

const steps = generateSteps();
export default steps;
