import { planHasFeature, FEATURE_UPLOAD_THEMES_PLUGINS } from '@automattic/calypso-products';
import { getUrlParts } from '@automattic/calypso-url';
import { Button } from '@automattic/components';
import { isDesktop } from '@automattic/viewport';
import classNames from 'classnames';
import { localize } from 'i18n-calypso';
import { intersection } from 'lodash';
import PropTypes from 'prop-types';
import { parse as parseQs } from 'qs';
import { Component } from 'react';
import { connect } from 'react-redux';
import AsyncLoad from 'calypso/components/async-load';
import QueryPlans from 'calypso/components/data/query-plans';
import PulsingDot from 'calypso/components/pulsing-dot';
import { getTld, isSubdomain } from 'calypso/lib/domains';
import { Experiment } from 'calypso/lib/explat';
import { getSiteTypePropertyValue } from 'calypso/lib/signup/site-type';
import PlansFeaturesMain from 'calypso/my-sites/plans-features-main';
import StepWrapper from 'calypso/signup/step-wrapper';
import { recordTracksEvent } from 'calypso/state/analytics/actions';
import { isTreatmentPlansReorderTest } from 'calypso/state/marketing/selectors';
import hasInitializedSites from 'calypso/state/selectors/has-initialized-sites';
import { saveSignupStep, submitSignupStep } from 'calypso/state/signup/progress/actions';
import { getSiteGoals } from 'calypso/state/signup/steps/site-goals/selectors';
import { getSiteType } from 'calypso/state/signup/steps/site-type/selectors';
import { getSiteBySlug } from 'calypso/state/sites/selectors';
import './style.scss';

export class PlansStep extends Component {
	componentDidMount() {
		this.props.saveSignupStep( { stepName: this.props.stepName } );
	}

	onSelectPlan = ( cartItem ) => {
		const { additionalStepData, stepSectionName, stepName, flowName } = this.props;

		if ( cartItem ) {
			this.props.recordTracksEvent( 'calypso_signup_plan_select', {
				product_slug: cartItem.product_slug,
				free_trial: cartItem.free_trial,
				from_section: stepSectionName ? stepSectionName : 'default',
			} );

			// If we're inside the store signup flow and the cart item is a Business or eCommerce Plan,
			// set a flag on it. It will trigger Automated Transfer when the product is being
			// activated at the end of the checkout process.
			if (
				flowName === 'ecommerce' &&
				planHasFeature( cartItem.product_slug, FEATURE_UPLOAD_THEMES_PLUGINS )
			) {
				cartItem.extra = Object.assign( cartItem.extra || {}, {
					is_store_signup: true,
				} );
			}
		} else {
			this.props.recordTracksEvent( 'calypso_signup_free_plan_select', {
				from_section: stepSectionName ? stepSectionName : 'default',
			} );
		}

		const step = {
			stepName,
			stepSectionName,
			cartItem,
			...additionalStepData,
		};

		this.props.submitSignupStep( step, {
			cartItem,
		} );
		this.props.goToNextStep();
	};

	getDomainName() {
		return (
			this.props.signupDependencies.domainItem && this.props.signupDependencies.domainItem.meta
		);
	}

	getCustomerType() {
		if ( this.props.customerType ) {
			return this.props.customerType;
		}

		const siteGoals = this.props.siteGoals.split( ',' );
		const customerType =
			getSiteTypePropertyValue( 'slug', this.props.siteType, 'customerType' ) ||
			( intersection( siteGoals, [ 'sell', 'promote' ] ).length > 0 ? 'business' : 'personal' );

		return customerType;
	}

	handleFreePlanButtonClick = () => {
		this.onSelectPlan( null ); // onUpgradeClick expects a cart item -- null means Free Plan.
	};

	getIntervalType() {
		const urlParts = getUrlParts( typeof window !== 'undefined' ? window.location?.href : '' );
		const intervalType = urlParts?.searchParams.get( 'intervalType' );

		if ( [ 'yearly', 'monthly' ].includes( intervalType ) ) {
			return intervalType;
		}

		// Default value
		return 'yearly';
	}

	plansFeaturesList() {
		const {
			disableBloggerPlanWithNonBlogDomain,
			hideFreePlan,
			isLaunchPage,
			selectedSite,
			planTypes,
			flowName,
			showTreatmentPlansReorderTest,
			isInVerticalScrollingPlansExperiment,
			isReskinned,
		} = this.props;

		const loadingPlanDisplay = (
			<div className="plans__loading-container">
				<PulsingDot delay={ 400 } active />
			</div>
		);

		const treatmentPlanDisplay = (
			<AsyncLoad
				require="calypso/signup/steps/plans/tabbed-plans"
				flowName={ flowName }
				onUpgradeClick={ this.onSelectPlan }
				plans={ [
					'personal-bundle',
					'value_bundle',
					'business-bundle',
					'ecommerce-bundle',
					'personal-bundle-monthly',
					'value_bundle_monthly',
					'business-bundle-monthly',
					'ecommerce-bundle-monthly',
				] }
			/>
		);
		const defaultPlanDisplay = (
			<PlansFeaturesMain
				site={ selectedSite || {} } // `PlanFeaturesMain` expects a default prop of `{}` if no site is provided
				hideFreePlan={ hideFreePlan }
				isInSignup={ true }
				isLaunchPage={ isLaunchPage }
				intervalType={ this.getIntervalType() }
				onUpgradeClick={ this.onSelectPlan }
				showFAQ={ false }
				domainName={ this.getDomainName() }
				customerType={ this.getCustomerType() }
				disableBloggerPlanWithNonBlogDomain={ disableBloggerPlanWithNonBlogDomain }
				plansWithScroll={ isDesktop() }
				planTypes={ planTypes }
				flowName={ flowName }
				showTreatmentPlansReorderTest={ showTreatmentPlansReorderTest }
				isAllPaidPlansShown={ true }
				isInVerticalScrollingPlansExperiment={ isInVerticalScrollingPlansExperiment }
				shouldShowPlansFeatureComparison={ isDesktop() } // Show feature comparison layout in signup flow and desktop resolutions
				isReskinned={ isReskinned }
			/>
		);

		return (
			<div>
				<QueryPlans />
				<Experiment
					name="tabbed_layout_plans_signup"
					defaultExperience={ defaultPlanDisplay }
					treatmentExperience={ treatmentPlanDisplay }
					loadingExperience={ loadingPlanDisplay }
				/>
			</div>
		);
	}

	getHeaderText() {
		const { headerText, translate } = this.props;

		if ( isDesktop() ) {
			return translate( 'Choose a plan' );
		}

		return headerText || translate( "Pick a plan that's right for you." );
	}

	getSubHeaderText() {
		const { hideFreePlan, subHeaderText, translate } = this.props;

		if ( ! hideFreePlan ) {
			if ( isDesktop() ) {
				return translate(
					"Pick one that's right for you and unlock features that help you grow. Or {{link}}start with a free site{{/link}}.",
					{
						components: {
							link: <Button onClick={ this.handleFreePlanButtonClick } borderless={ true } />,
						},
					}
				);
			}

			return translate( 'Choose a plan or {{link}}start with a free site{{/link}}.', {
				components: {
					link: <Button onClick={ this.handleFreePlanButtonClick } borderless={ true } />,
				},
			} );
		}

		if ( isDesktop() ) {
			return translate( "Pick one that's right for you and unlock features that help you grow." );
		}

		return subHeaderText || translate( 'Choose a plan. Upgrade as you grow.' );
	}

	getHeaderTextForExperiment() {
		const defaultHeaderText = this.getHeaderText();
		const experimentHeaderText = 'Choose the right plan for you';

		return (
			<Experiment
				name="tabbed_layout_plans_signup"
				defaultExperience={ defaultHeaderText }
				treatmentExperience={ experimentHeaderText }
				loadingExperience={ '\u00A0' } // &nbsp;
			/>
		);
	}
	getSubHeaderTextForExperiment() {
		const defaultSubHeaderText = this.getSubHeaderText();
		const experimentSubHeaderText =
			'There’s a plan for everybody. Pick between our Professional or Starter plans.';

		return (
			<Experiment
				name="tabbed_layout_plans_signup"
				defaultExperience={ defaultSubHeaderText }
				treatmentExperience={ experimentSubHeaderText }
				loadingExperience={ '\u00A0' } // &nbsp;
			/>
		);
	}

	plansFeaturesSelection() {
		const {
			flowName,
			stepName,
			positionInFlow,
			translate,
			hasInitializedSitesBackUrl,
		} = this.props;

		const headerText = this.getHeaderTextForExperiment();
		const fallbackHeaderText = this.props.fallbackHeaderText || headerText;
		const subHeaderText = this.getSubHeaderTextForExperiment();
		const fallbackSubHeaderText = this.props.fallbackSubHeaderText || subHeaderText;

		let backUrl;
		let backLabelText;

		if ( 0 === positionInFlow && hasInitializedSitesBackUrl ) {
			backUrl = hasInitializedSitesBackUrl;
			backLabelText = translate( 'Back to My Sites' );
		}

		return (
			<>
				<StepWrapper
					flowName={ flowName }
					stepName={ stepName }
					positionInFlow={ positionInFlow }
					headerText={ headerText }
					fallbackHeaderText={ fallbackHeaderText }
					subHeaderText={ subHeaderText }
					fallbackSubHeaderText={ fallbackSubHeaderText }
					isWideLayout={ true }
					stepContent={ this.plansFeaturesList() }
					allowBackFirstStep={ !! hasInitializedSitesBackUrl }
					backUrl={ backUrl }
					backLabelText={ backLabelText }
				/>
			</>
		);
	}

	render() {
		const classes = classNames( 'plans plans-step', {
			'in-vertically-scrolled-plans-experiment': this.props.isInVerticalScrollingPlansExperiment,
			'has-no-sidebar': true,
			'is-wide-layout': true,
		} );

		return <div className={ classes }>{ this.plansFeaturesSelection() }</div>;
	}
}

PlansStep.propTypes = {
	additionalStepData: PropTypes.object,
	disableBloggerPlanWithNonBlogDomain: PropTypes.bool,
	goToNextStep: PropTypes.func.isRequired,
	hideFreePlan: PropTypes.bool,
	selectedSite: PropTypes.object,
	stepName: PropTypes.string.isRequired,
	stepSectionName: PropTypes.string,
	customerType: PropTypes.string,
	translate: PropTypes.func.isRequired,
	planTypes: PropTypes.array,
	flowName: PropTypes.string,
	isTreatmentPlansReorderTest: PropTypes.bool,
};

/**
 * Checks if the domainItem picked in the domain step is a top level .blog domain -
 * we only want to make Blogger plan available if it is.
 *
 * @param {object} domainItem domainItem object stored in the "choose domain" step
 * @returns {boolean} is .blog domain registration
 */
export const isDotBlogDomainRegistration = ( domainItem ) => {
	if ( ! domainItem ) {
		return false;
	}
	const { is_domain_registration, meta } = domainItem;

	return is_domain_registration && getTld( meta ) === 'blog';
};

export default connect(
	(
		state,
		{ path, signupDependencies: { siteSlug, domainItem, plans_reorder_abtest_variation } }
	) => ( {
		// Blogger plan is only available if user chose either a free domain or a .blog domain registration
		disableBloggerPlanWithNonBlogDomain:
			domainItem && ! isSubdomain( domainItem.meta ) && ! isDotBlogDomainRegistration( domainItem ),
		// This step could be used to set up an existing site, in which case
		// some descendants of this component may display discounted prices if
		// they apply to the given site.
		selectedSite: siteSlug ? getSiteBySlug( state, siteSlug ) : null,
		customerType: parseQs( path.split( '?' ).pop() ).customerType,
		siteGoals: getSiteGoals( state ) || '',
		siteType: getSiteType( state ),
		hasInitializedSitesBackUrl: hasInitializedSites( state ) ? '/sites/' : false,
		showTreatmentPlansReorderTest:
			'treatment' === plans_reorder_abtest_variation || isTreatmentPlansReorderTest( state ),
		isLoadingExperiment: false,
		// IMPORTANT NOTE: The following is always set to true. It's a hack to resolve the bug reported
		// in https://github.com/Automattic/wp-calypso/issues/50896, till a proper cleanup and deploy of
		// treatment for the `vertical_plan_listing_v2` experiment is implemented.
		isInVerticalScrollingPlansExperiment: true,
	} ),
	{ recordTracksEvent, saveSignupStep, submitSignupStep }
)( localize( PlansStep ) );
