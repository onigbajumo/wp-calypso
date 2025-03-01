export interface ErrorParameters {
	/**
	 * A unique string in snakecase describing the error event.
	 *
	 * @example
	 * signin_invalid_password_too_few_characters
	 */
	error: string;

	/**
	 * An optional string describing the position/page/step in the onboarding flow.
	 *
	 * @example
	 * design
	 */
	step?: string;
}

export interface OnboardingCompleteParameters {
	/**
	 * Whether the user is newly signed up
	 */
	isNewUser: boolean;

	/**
	 * Whether a new site is created in the flow
	 */
	isNewSite: boolean;

	/**
	 * The blog id of the newly created site
	 */
	blogId: number | string | undefined;

	/**
	 * Whether the user has a paid plan or other checkout item
	 */
	hasCartItems?: boolean;

	/**
	 * Type of onboarding flow
	 */
	flow?: string;
}

export type TracksAcquireIntentEventProperties = {
	/**
	 * The slug of the selected vertical or undefined if the vertical is free-form user input
	 */
	selected_vertical_slug?: string | undefined;

	/**
	 * Translated label of vertical or free-form user input
	 */
	selected_vertical_label?: string | undefined;

	/**
	 * Whether site title has been entered on the acquire intent page
	 */
	has_selected_site_title: boolean;
};

type TracksStyleSelectEventProperties = {
	/**
	 * The font selected for headings on the style page
	 */
	selected_heading_font: string | undefined;

	/**
	 * The font selected for body text on the style page
	 */
	selected_body_font: string | undefined;
};

type TracksDesignSelectEventProperties = {
	/**
	 * The selected theme
	 */
	selected_design: string | undefined;

	/**
	 * If the selected theme is premium
	 */
	is_selected_design_premium: boolean;
};

type TracksDomainSelectEventProperties = {
	/**
	 * The selected level domain name
	 */
	selected_domain: string | undefined;
};

type TracksPlanSelectEventProperties = {
	/**
	 * The selected plan slug
	 */
	selected_plan: string | undefined;
};

type TracksFeaturesSelectEventProperties = {
	/**
	 * If the user selected features
	 */
	has_selected_features: boolean | undefined;

	/**
	 * If the user seleceted the "Video storage" feature
	 */
	has_selected_video_storage: boolean | undefined;
};

type TracksFseBetaOptInProperties = {
	/**
	 * If the user selected the FSE beta opt-in
	 */
	selected_fse_beta_opt_in: boolean | undefined;
};

export type TracksEventProperties =
	| TracksAcquireIntentEventProperties
	| TracksStyleSelectEventProperties
	| TracksDesignSelectEventProperties
	| TracksDomainSelectEventProperties
	| TracksPlanSelectEventProperties
	| TracksFeaturesSelectEventProperties
	| TracksFseBetaOptInProperties;
