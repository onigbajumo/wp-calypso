import {
	applyTestFiltersToPlansList,
	findPlansKeys,
	getPlan as getPlanFromKey,
	getYearlyPlanByMonthly,
	isMonthly,
	TERM_MONTHLY,
} from '@automattic/calypso-products';
import { Button, Gridicon, Popover } from '@automattic/components';
import formatCurrency from '@automattic/format-currency';
import styled from '@emotion/styled';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import InfoPopover from 'calypso/components/info-popover';
import { recordTracksEvent } from 'calypso/state/analytics/actions';
import { getCurrentUserCurrencyCode } from 'calypso/state/currency-code/selectors';
import { getPlan, getPlanBySlug, getPlanRawPrice } from 'calypso/state/plans/selectors';
import './tabbed-plans-style.scss';

function SharedFeatures( { className = '', featureDescription, sharedFeatures } ) {
	const [ showFeatures, setShowFeatures ] = useState( false );
	const isMobileView = className.includes( 'mobile' );
	const featuresString = showFeatures ? 'Hide all features' : 'Show all features';
	const show = showFeatures || ! isMobileView;

	return (
		<div className={ `tabbed-plans__shared-features-grid ${ className }` }>
			{ isMobileView && (
				<div>
					<button onClick={ () => setShowFeatures( ! showFeatures ) }>{ featuresString }</button>
					<span>
						<Gridicon icon={ show ? 'chevron-up' : 'chevron-down' } size={ 12 } />
					</span>
				</div>
			) }
			<SharedFeatureHeader>{ featureDescription }</SharedFeatureHeader>
			{ show &&
				sharedFeatures.map( ( item, index ) => (
					<SharedFeature key={ `sharedFeature${ index }` }>
						<Gridicon icon={ item.icon } size={ 24 } />
						<span>{ item.description }</span>
					</SharedFeature>
				) ) }
		</div>
	);
}

function TermToggleRadioButton( {
	checked,
	children,
	isDisabled = false,
	name,
	popoverMessage = null,
	toggleAction,
} ) {
	const [ showPopover, setShowPopover ] = useState( false );
	const radioPopoverRef = useRef( null );

	const handleClick = () => ( popoverMessage ? setShowPopover( true ) : null );
	const handleClose = () => setShowPopover( false );

	const PopoverMessage = styled.div`
		padding: 10px;
		width: 150px;
		text-align: left;
	`;

	return (
		<RadioButtonLabel isDisabled={ isDisabled } onClick={ handleClick }>
			<input type="radio" checked={ checked } name={ name } onChange={ toggleAction } />
			<Checkmark />
			<span ref={ radioPopoverRef }>{ children }</span>
			{ showPopover && popoverMessage && (
				<Popover
					context={ radioPopoverRef.current }
					isVisible
					onClose={ handleClose }
					position="bottom"
				>
					<PopoverMessage>{ popoverMessage }</PopoverMessage>
				</Popover>
			) }
		</RadioButtonLabel>
	);
}
function TabbedPlans( { onUpgradeClick, planProperties } ) {
	const tabList = getTabList();
	const featureComparisonData = getFeatureComparisonData();
	const sharedFeatures = getSharedFeatures();
	const bestForStrings = getBestForStrings();

	const [ featureComparison, setFeatureComparison ] = useState(
		featureComparisonData.Professional
	);
	const [ planDetails, setPlanDetails ] = useState();
	const [ selectedTab, setSelectedTab ] = useState( tabList[ 1 ] );
	const [ termLength, setTermLength ] = useState( 'annually' );
	const [ primaryButton, setPrimaryButton ] = useState( 'Premium' );
	const dispatch = useDispatch();

	const toggleTab = () => {
		selectedTab === tabList[ 0 ] ? setSelectedTab( tabList[ 1 ] ) : setSelectedTab( tabList[ 0 ] );
	};

	const toggleTerm = () =>
		termLength === 'annually' ? setTermLength( 'monthly' ) : setTermLength( 'annually' );

	const handleUpgradeButtonClick = ( productSlug, productId ) => {
		const args =
			productSlug === 'free_plan' ? null : { product_slug: productSlug, product_id: productId };

		dispatch(
			recordTracksEvent( 'calypso_signup_plans_page_clicks', {
				plan: productSlug,
			} )
		);

		onUpgradeClick( args );
	};

	useEffect( () => {
		const planFilter =
			selectedTab === 'Professional'
				? [ 'Premium', 'Business', 'eCommerce' ]
				: [ 'Free', 'Personal' ];

		const displayedPlans = planProperties
			.filter( ( plan ) => planFilter.includes( plan.planName ) )
			.filter( ( plan ) => plan.termLength === termLength || plan.termLength === null );

		setFeatureComparison( featureComparisonData[ selectedTab ] );
		setPlanDetails( displayedPlans );
	}, [ selectedTab, planProperties, termLength ] );

	useEffect( () => {
		selectedTab === tabList[ 0 ] ? setPrimaryButton( 'Personal' ) : setPrimaryButton( 'Business' );
		setTermLength( 'annually' );
		dispatch(
			recordTracksEvent( 'calypso_signup_plans_page_clicks', {
				tab: selectedTab,
			} )
		);
	}, [ selectedTab ] );

	useEffect( () => {
		dispatch(
			recordTracksEvent( 'calypso_signup_plans_page_clicks', {
				term: termLength,
			} )
		);
	}, [ termLength ] );

	return (
		<>
			<TabWrapper>
				<Tabs>
					{ tabList.map( ( item, index ) =>
						item === selectedTab ? (
							<SelectedTab
								key={ `tab${ index }` }
								className={ `tabbed-plans__tab-${ index + 1 }` }
								onClick={ toggleTab }
							>
								<span>{ item }</span>
							</SelectedTab>
						) : (
							<Tab
								key={ `tab${ index }` }
								className={ `tabbed-plans__tab-${ index + 1 }` }
								onClick={ toggleTab }
							>
								<a href={ `?selectTab=${ tabList[ index ] } ` }>{ item }</a>
							</Tab>
						)
					) }
				</Tabs>
			</TabWrapper>
			<Grid className="tabbed-plans__grid-container">
				<TermToggles className="tabbed-plans__term-toggles">
					<TermToggleRadioButton
						checked={ termLength === 'annually' ? 'checked' : '' }
						name="annually"
						toggleAction={ selectedTab === 'Professional' ? toggleTerm : null }
					>
						<span>Pay annually</span>
					</TermToggleRadioButton>
					<TermToggleRadioButton
						checked={ termLength === 'monthly' ? 'checked' : '' }
						isDisabled={ selectedTab === 'Starter' }
						name="monthly"
						popoverMessage={
							selectedTab === 'Starter'
								? `Monthly payments are only available for our Professional plans.`
								: null
						}
						toggleAction={ selectedTab === 'Professional' ? toggleTerm : null }
					>
						<span>Pay monthly</span>
					</TermToggleRadioButton>
				</TermToggles>

				<PlanBorderOne />
				<PlanBorderTwo featured={ true } />
				{ selectedTab === 'Professional' && (
					<>
						<FeaturedPlanProfessional />
						<PlanBorderThree />
					</>
				) }
				{ selectedTab === 'Starter' && (
					<>
						<FeaturedPlanStarter />
					</>
				) }

				{ planDetails &&
					planDetails.map( ( item, index ) => (
						<React.Fragment key={ `planDetails${ index }` }>
							<PlanHeader
								key={ `planHeader${ index }` }
								className={ `tabbed-plans__header-${ index + 1 }` }
							>
								{ item.planName }
								{ item.planName === 'Personal' && <span>Best to start</span> }
								{ item.planName === 'Business' && <span>Best value</span> }
								<p>{ bestForStrings[ item.planName ] }</p>
							</PlanHeader>
							<PlanPrice
								key={ `planPrice${ index }` }
								className={ `tabbed-plans__price-${ index + 1 }` }
							>
								{ formatCurrency( item.rawPrice, item.currencyCode, { stripZeros: true } ) }
							</PlanPrice>
							<TermDescription className={ `tabbed-plans__term-desc-${ index + 1 }` }>
								{ item.planName === 'Free' && <span>Limited features</span> }
								{ item.termLength === 'annually' && item.planName !== 'Free' && (
									<span>per month, billed annually</span>
								) }
								{ termLength === 'monthly' && item.planName !== 'Free' && (
									<span>per month, billed monthly</span>
								) }
								<Savings>
									{ selectedTab === 'Professional' && termLength === 'annually' ? (
										<>
											{ "You're saving " +
												Math.round(
													( ( item.rawPriceForMonthly - item.rawPrice ) /
														item.rawPriceForMonthly ) *
														100
												) +
												'% by paying annually' }
										</>
									) : (
										<>&nbsp;</>
									) }
								</Savings>
							</TermDescription>
							{ item.planName !== 'Free' && (
								<CtaButton
									key={ `planCtaTop${ index }` }
									className={ `tabbed-plans__top-button-${ index + 1 }` }
									onClick={ () => handleUpgradeButtonClick( item.planSlug, item.planProductId ) }
									primary={ item.planName === primaryButton }
								>
									{ `Start with ${ item.planName }` }
								</CtaButton>
							) }
							<CtaButton
								key={ `planCta${ index }` }
								className={ `tabbed-plans__button-${ index + 1 }` }
								onClick={ () => handleUpgradeButtonClick( item.planSlug, item.planProductId ) }
								primary={ item.planName === primaryButton }
							>
								{ `Start with ${ item.planName }` }
							</CtaButton>
							<SharedFeatures
								featureDescription={
									selectedTab === 'Professional'
										? 'All Professional plans include'
										: 'Personal plan also includes'
								}
								sharedFeatures={ sharedFeatures[ selectedTab ] }
								className={ classNames(
									'tabbed-plans__shared-features-mobile',
									`tabbed-plans__shared-features-${ index + 1 }`
								) }
							/>
						</React.Fragment>
					) ) }

				{ featureComparison.map( ( item, index, arr ) => (
					<React.Fragment key={ `feature${ index }` }>
						<FeatureTitle
							key={ `featureTitle${ index }` }
							className={ `tabbed-plans__feature-title-${ index + 1 }` }
							isLast={ arr.length === index + 1 }
						>
							{ item.featureName }
							<InfoPopover
								className="tabbed-plans__feature-tip-info"
								position="right"
								icon="info"
								iconSize={ 15 }
							>
								{ item.tooltip }
							</InfoPopover>
						</FeatureTitle>
						{ item.planOne && (
							<>
								<Feature
									key={ `featureItemOne${ index }` }
									className={ `tabbed-plans__feature-1-${ index + 1 }` }
									included={ item.planOne[ termLength ].included }
									isLast={ arr.length === index + 1 }
								>
									<span>{ item.planOne[ termLength ].copy }</span>
									{ item.planOne[ termLength ].mobileCopy && (
										<span>{ item.planOne[ termLength ].mobileCopy }</span>
									) }
								</Feature>
							</>
						) }
						{ item.planTwo && (
							<Feature
								key={ `featureItemTwo${ index }` }
								className={ `tabbed-plans__feature-2-${ index + 1 }` }
								included={ item.planTwo[ termLength ].included }
								isLast={ arr.length === index + 1 }
							>
								<span>{ item.planTwo[ termLength ].copy }</span>
								{ item.planTwo[ termLength ].mobileCopy && (
									<span>{ item.planTwo[ termLength ].mobileCopy }</span>
								) }
							</Feature>
						) }
						{ item.planThree && (
							<Feature
								key={ `featureItemThree${ index }` }
								className={ `tabbed-plans__feature-3-${ index + 1 }` }
								included={ item.planThree[ termLength ].included }
								isLast={ arr.length === index + 1 }
							>
								<span>{ item.planThree[ termLength ].copy }</span>
								{ item.planThree[ termLength ].mobileCopy && (
									<span>{ item.planThree[ termLength ].mobileCopy }</span>
								) }
							</Feature>
						) }
					</React.Fragment>
				) ) }
				<FreeBanner>
					{ selectedTab === 'Professional' && (
						<>
							Need something simple to start?{ ' ' }
							<button href="#" onClick={ () => toggleTab() }>
								Explore our Starter plans
							</button>
						</>
					) }
					{ selectedTab === 'Starter' && (
						<>
							Need eCommerce or professional features?{ ' ' }
							<button href="#" onClick={ () => toggleTab() }>
								Explore our Professional plans
							</button>
						</>
					) }
				</FreeBanner>
				<SharedFeatures
					featureDescription={
						selectedTab === 'Professional'
							? 'All Professional plans include'
							: 'Personal plan also includes'
					}
					sharedFeatures={ sharedFeatures[ selectedTab ] }
				/>
			</Grid>
		</>
	);
}

TabbedPlans.propTypes = {
	onUpgradeClick: PropTypes.func,
	planProperties: PropTypes.array,
};

const mapStateToProps = ( state, ownProps ) => {
	const { plans } = ownProps;
	// eslint-disable-next-line wpcalypso/redux-no-bound-selectors
	const planProperties = plans.map( ( plan ) => {
		const planConstantObj = applyTestFiltersToPlansList( plan, undefined );
		const planProductId = planConstantObj.getProductId();
		const planObject = getPlan( state, planProductId );
		const rawPrice = getPlanRawPrice( state, planProductId, true );
		const isMonthlyPlan = isMonthly( plan );
		let annualPricePerMonth = rawPrice;
		if ( isMonthlyPlan ) {
			// Get annual price per month for comparison
			const yearlyPlan = getPlanBySlug( state, getYearlyPlanByMonthly( plan ) );
			if ( yearlyPlan ) {
				annualPricePerMonth = getPlanRawPrice( state, yearlyPlan.product_id, true );
			}
		}
		const monthlyPlanKey = findPlansKeys( {
			group: planConstantObj.group,
			term: TERM_MONTHLY,
			type: planConstantObj.type,
		} )[ 0 ];
		const monthlyPlanProductId = getPlanFromKey( monthlyPlanKey )?.getProductId();
		// This is the per month price of a monthly plan. E.g. $14 for Premium monthly.
		const rawPriceForMonthly = getPlanRawPrice( state, monthlyPlanProductId, true );

		return {
			annualPricePerMonth,
			currencyCode: getCurrentUserCurrencyCode( state ),
			planName: planObject?.product_name_short,
			planObject,
			planProductId,
			planSlug: planObject?.product_slug,
			rawPrice,
			rawPriceForMonthly,
			termLength: isMonthlyPlan ? 'monthly' : 'annually',
		};
	} );
	planProperties.unshift( {
		annualPricePerMonth: 0,
		currencyCode: getCurrentUserCurrencyCode( state ),
		planName: 'Free',
		planObject: {},
		planProductId: 1,
		planSlug: 'free_plan',
		rawPrice: 0,
		rawPriceForMonthly: 0,
		termLength: null,
	} );
	return {
		planProperties,
	};
};

export default connect( mapStateToProps )( TabbedPlans );

function getTabList() {
	return [ 'Starter', 'Professional' ];
}

function getBestForStrings() {
	return {
		Free: 'Ads displayed on all sites',
		Personal: 'Best for small sites & blogs',
		Premium: 'Best for customized sites & blogs',
		Business: 'Best for professional sites & blogs',
		eCommerce: 'Best for online stores',
	};
}

function getFeatureComparisonData() {
	const data = {
		Professional: [
			{
				featureName: 'Install plugins',
				tooltip:
					'Plugins are like apps for your site. They add new functionality and features to expand your site. There are over 58,000+ WordPress plugins available for anything you need.',
				planOne: {
					annually: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
					monthly: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
				},
				planTwo: {
					annually: {
						included: true,
						copy: '58,000+ available',
						mobileCopy: '58,000+ plugins available',
						monthly: { available: true, explainer: null },
					},
					monthly: {
						included: true,
						copy: '58,000+ available',
						mobileCopy: '58,000+ plugins available',
						monthly: { available: true, explainer: null },
					},
				},
				planThree: {
					annually: {
						included: true,
						copy: '58,000+ available',
						monthlyCopy: '58,000+ Available',
					},
					monthly: {
						included: true,
						copy: '58,000+ available',
						monthlyCopy: '58,000+ Available',
					},
				},
			},
			{
				featureName: 'Install themes',
				tooltip:
					'Themes change the design of your site. We provide dozens of free professional themes for a wide range of uses. On the Business and eCommerce plan, you can also install any 3rd party WordPress theme, free or paid, from the 8,000 custom themes made by 3rd party designers.',
				planOne: {
					annually: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
					monthly: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
				},
				planTwo: {
					annually: {
						included: true,
						copy: '8,000 to choose from',
						mobileCopy: '8,000 themes to choose from',
					},
					monthly: {
						included: true,
						copy: '8,000 to choose from',
						mobileCopy: '8,000 themes to choose from',
					},
				},
				planThree: {
					annually: {
						included: true,
						copy: '8,000 to choose from',
						mobileCopy: '8,000 themes to choose from',
					},
					monthly: {
						included: true,
						copy: '8,000 to choose from',
						mobileCopy: '8,000 themes to choose from',
					},
				},
			},
			{
				featureName: 'eCommerce',
				tooltip:
					'Build, manage, and scale your online store with unlimited products or services, multiple currencies, integrations with top shipping carriers, and eCommerce marketing tools.',
				planOne: {
					annually: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
					monthly: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
				},
				planTwo: {
					annually: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
					monthly: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
				},
				planThree: {
					annually: {
						included: true,
						copy: 'Complete eCommerce platform',
						mobileCopy: 'Complete eCommerce platform',
					},
					monthly: {
						included: true,
						copy: 'Complete eCommerce platform',
						mobileCopy: 'Complete eCommerce platform',
					},
				},
			},
			{
				featureName: 'Custom domain name',
				tooltip:
					'Remove “.wordpress.com” from your site address with a custom domain of your choosing. Free for one year (will renew at its regular price).',
				planOne: {
					annually: {
						included: true,
						copy: 'Free for the first year',
						mobileCopy: 'Free domain for the first year.',
					},
					monthly: {
						included: false,
						copy: 'Included with annual plans',
						mobileCopy: null,
					},
				},
				planTwo: {
					annually: {
						included: true,
						copy: 'Free for the first year',
						mobileCopy: 'Free domain for the first year',
					},
					monthly: {
						included: false,
						copy: 'Included with annual plans',
						mobileCopy: null,
					},
				},
				planThree: {
					annually: {
						included: true,
						copy: 'Free for the first year',
						mobileCopy: 'Free domain for the first year',
					},
					monthly: {
						included: false,
						copy: 'Included with annual plans',
						mobileCopy: null,
					},
				},
			},
			{
				featureName: 'SEO',
				tooltip:
					'SEO (Search Engine Optimization) helps your site rank higher, and more accurately in search engines, so more people can find your site.',
				planOne: {
					annually: {
						included: true,
						copy: 'Simple',
						mobileCopy: 'Simple SEO',
					},
					monthly: {
						included: true,
						copy: 'Simple',
						mobileCopy: 'Simple SEO',
					},
				},
				planTwo: {
					annually: {
						included: true,
						copy: 'Professional',
						mobileCopy: 'Professional SEO',
					},
					monthly: {
						included: true,
						copy: 'Professional',
						mobileCopy: 'Professional SEO',
					},
				},
				planThree: {
					annually: {
						included: true,
						copy: 'Professional',
						mobileCopy: 'Professional SEO',
					},
					monthly: {
						included: true,
						copy: 'Professional',
						mobileCopy: 'Professional SEO',
					},
				},
			},
			{
				featureName: 'Customer support',
				tooltip:
					'Keep moving forward with your site at any time. Our Happiness Engineers will help you via email, live chat, or 24/7 priority live chat, depending on the plan you choose.',
				planOne: {
					annually: {
						included: true,
						copy: 'Live chat and email support',
						mobileCopy: 'Live chat and email support',
					},
					monthly: {
						included: true,
						copy: 'Email support',
						mobileCopy: 'Email support',
					},
				},
				planTwo: {
					annually: {
						included: true,
						copy: '24/7 priority live chat',
						mobileCopy: '24/7 priority live chat',
					},
					monthly: {
						included: true,
						copy: 'Email support',
						mobileCopy: 'Email support',
					},
				},
				planThree: {
					annually: {
						included: true,
						copy: '24/7 priority live chat',
						mobileCopy: '24/7 Priority live chat',
					},
					monthly: {
						included: true,
						copy: 'Email support',
						mobileCopy: 'Email support',
					},
				},
			},
			{
				featureName: 'Storage',
				tooltip:
					'With increased storage space, you’ll be able to upload more images, audio, and documents to your website. Professional plans also include video hosting.',
				planOne: {
					annually: { included: true, copy: '13GB storage', mobileCopy: '13GB storage' },
					monthly: { included: true, copy: '13GB storage', mobileCopy: '13GB storage' },
				},
				planTwo: {
					annually: { included: true, copy: '200GB storage', mobileCopy: '200GB storage' },
					monthly: { included: true, copy: '200GB storage', mobileCopy: '200GB storage' },
				},
				planThree: {
					annually: { included: true, copy: '200GB storage', mobileCopy: '200GB storage' },
					monthly: { included: true, copy: '200GB storage', mobileCopy: '200GB storage' },
				},
			},
		],
		Starter: [
			{
				featureName: 'Install plugins',
				tooltip:
					'Plugins are like apps for your site. They add new functionality and features to expand your site. There are over 58,000+ WordPress plugins available for anything you need.',
				planOne: {
					annually: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
					monthly: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
				},
				planTwo: {
					annually: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
					monthly: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
				},
			},
			{
				featureName: 'Install themes',
				tooltip:
					'Themes change the design of your site. We provide dozens of free professional themes for a wide range of uses. On the Business and eCommerce plan, you can also install any 3rd party WordPress theme, free or paid, from the 8,000 custom themes made by 3rd party designers.',
				planOne: {
					annually: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
					monthly: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
				},
				planTwo: {
					annually: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
					monthly: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
				},
			},
			{
				featureName: 'eCommerce',
				tooltip:
					'Build, manage, and scale your online store with unlimited products or services, multiple currencies, integrations with top shipping carriers, and eCommerce marketing tools.',
				planOne: {
					annually: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
					monthly: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
				},
				planTwo: {
					annually: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
					monthly: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
				},
			},
			{
				featureName: 'Custom domain name',
				tooltip:
					'Remove “.wordpress.com” from your site address with a custom domain of your choosing. Free for one year (will renew at its regular price).',
				planOne: {
					annually: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
					monthly: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
				},
				planTwo: {
					annually: {
						included: true,
						copy: 'Free for the first year',
						mobileCopy: 'Free domain for the first year',
					},
					monthly: {
						included: false,
						copy: 'Included with annual plans',
						mobileCopy: 'Included with annual plans',
					},
				},
			},
			{
				featureName: 'SEO',
				tooltip:
					'SEO (Search Engine Optimization) helps your site rank higher, and more accurately in search engines, so more people can find your site.',
				planOne: {
					annually: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
					monthly: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
				},
				planTwo: {
					annually: {
						included: true,
						copy: 'Simple',
						mobileCopy: 'Simple SEO',
					},
					monthly: {
						included: true,
						copy: 'Simple',
						mobileCopy: 'Simple SEO',
					},
				},
			},
			{
				featureName: 'Customer support',
				tooltip:
					'Keep moving forward with your site at any time. Our Happiness Engineers will help you via email, live chat, or 24/7 priority live chat, depending on the plan you choose.',
				planOne: {
					annually: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
					monthly: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
				},
				planTwo: {
					annually: {
						included: true,
						copy: 'Email support',
						mobileCopy: 'Email support',
					},
					monthly: {
						included: true,
						copy: 'Email support',
						mobileCopy: 'Email support',
					},
				},
			},
			{
				featureName: 'Remove Ads',
				tooltip:
					'Allow your visitors to visit and read your website without seeing any WordPress.com advertising.',
				planOne: {
					annually: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
					monthly: {
						included: false,
						copy: <Gridicon icon="cross" size={ 18 } />,
						mobileCopy: null,
					},
				},
				planTwo: {
					annually: { included: true, copy: 'Ads removed', mobileCopy: null },
					monthly: { included: true, copy: 'Ads removed', mobileCopy: null },
				},
			},
		],
	};

	return data;
}

function getSharedFeatures() {
	const data = {
		Starter: [
			{
				icon: 'pages',
				description: 'Spam protection',
			},
			{
				icon: 'cloud',
				description: 'World-class managed hosting',
			},
			{
				icon: 'lock',
				description: 'Free SSL certificate',
			},
			{
				icon: 'image',
				description: '6GB of storage',
			},
			{
				icon: 'image-remove',
				description: 'Ads removed',
			},
			{
				icon: 'cart',
				description: 'Accept payments and donations',
			},
		],
		Professional: [
			{
				icon: 'pages',
				description: 'Spam protection',
			},
			{
				icon: 'cloud',
				description: 'World-class hosting',
			},
			{
				icon: 'image-remove',
				description: 'Ads removed',
			},
			{
				icon: 'play',
				description: 'Video hosting',
			},
			{
				icon: 'cart',
				description: 'Accept payments and donations',
			},
			{
				icon: 'star',
				description: 'Earn ad revenue',
			},
			{
				icon: 'stats-alt',
				description: 'Google Analytics',
			},
			{
				icon: 'mail',
				description: 'Email marketing integration',
			},
		],
	};

	return data;
}

const SharedFeatureHeader = styled.div`
	grid-column: 1 / 4;
	grid-row: 1;
	justify-self: stretch;
	margin: 25px 0;
	padding: 10px 24px;
	border-bottom: 1px solid rgba( 220, 220, 222, 0.5 );
	font-weight: 500;

	@media ( max-width: 600px ) {
		display: none;
	}
`;
const SharedFeature = styled.div`
	padding: 5px 0;
	font-weight: 400;
	font-size: 14px;

	svg {
		vertical-align: middle;
		color: #c3c4c7;
	}

	svg + span {
		margin-left: 15px;
	}

	@media ( max-width: 600px ) {
		svg {
			display: none;
		}

		svg + span {
			margin-left: 0;
		}
	}
`;

const CtaButton = styled( Button )`
	margin: 15px 24px 32px 24px;
	border: 1px solid #c3c4c7;
	box-sizing: border-box;
	box-shadow: 0px 1px 2px rgba( 0, 0, 0, 0.05 );
	border-radius: 4px;
	font-weight: 500;
	font-size: 14px;
	letter-spacing: 0.32px;
	background: ${ ( props ) => ( props.primary ? '#117ac9' : '#fff' ) };
	color: ${ ( props ) => ( props.primary ? '#fff' : '#2b2d2f' ) };

	@media ( max-width: 600px ) {
		height: 40px;
		margin: 24px 56px;
		font-size: 14px !important;
		padding: 0 !important;
	}
`;

const Feature = styled.div`
	padding: 15px 24px;
	border-bottom: ${ ( props ) => ( props.isLast ? '0' : '1px solid rgba( 220, 220, 222, 0.2 )' ) };
	font-weight: 500;
	font-size: 14px;
	letter-spacing: -0.16px;
	color: ${ ( props ) => ( props.included ? '#2c3338' : '#a7aaad' ) };

	span:first-of-type {
		display: block;

		& + span {
			display: none;
		}
	}
	@media ( max-width: 600px ) {
		margin: 0 56px;
		padding: 7px 0;
		border: 0;

		span:first-of-type {
			display: none;

			& + span {
				display: block;
			}
		}
	}
`;

const FeatureTitle = styled.div`
	justify-self: stretch;
	padding: 15px 36px 15px 0;
	border-bottom: ${ ( props ) => ( props.isLast ? '0' : '1px solid rgba( 220, 220, 222, 0.2 )' ) };
	align-self: center;
	font-weight: 500;
	text-align: end;
	font-size: 14px;
	letter-spacing: -0.16px;
	color: #2c3338;

	button {
		margin-left: 8px;
		font-size: 1em;
		vertical-align: middle;
	}

	@media ( max-width: 600px ) {
		display: none;
	}
`;

const Grid = styled.div`
	padding: 0 0 36px 0;
`;
const PlanHeader = styled.div`
	padding: 24px 24px 0 24px;
	font-weight: normal;
	font-size: 18px;
	line-height: 24px;
	letter-spacing: 0.32px;
	color: #101517;

	p {
		font-size: 12px;
	}

	span {
		float: right;
		padding: 1px 8px;
		color: #00450c;
		font-size: 12px;
		font-weight: 500;
		letter-spacing: 0.2px;
		line-height: 20px;
		background: rgba( 184, 230, 191, 0.64 );
		border-radius: 4px;
	}

	@media ( max-width: 600px ) {
		padding: 56px 0 0 56px;

		span {
			margin-right: 60px;
		}
	}
`;

const PlanPrice = styled.div`
	padding: 0 24px;
	font-family: Recoleta;
	font-style: normal;
	font-weight: normal;
	font-size: 44px;
	letter-spacing: 2px;
	color: #000;

	@media ( max-width: 600px ) {
		padding-left: 56px;
	}
`;

const TermDescription = styled.div`
	padding: 0 24px 24px 24px;
	font-size: 10px;
	color: #787c82;
	letter-spacing: -0.16px;

	@media ( max-width: 600px ) {
		padding-left: 56px;
	}
`;

const Savings = styled.p`
	margin: 5px 0 0 0;
	padding: 0;
	font-weight: 600;
	font-size: 10px;
	color: #007017;
`;

const TabWrapper = styled.div`
	display: flex;
	align-content: space-between;
`;

const Tabs = styled.ul`
	display: flex;
	margin: 0 auto;
	padding: 3px;
	margin-bottom: 35px;
	list-style: none;
	font-size: 14px;
	font-weight: 500;
	line-height: 20px;
	background-color: #f2f2f2;
	border-radius: 6px;
	color: #1d2327;
`;

const Tab = styled.li`
	padding: 6px 0;
	box-sizing: border-box;
	text-align: center;
	width: 150px;
	cursor: pointer;

	a {
		color: #1d2327;
	}
`;

const SelectedTab = styled( Tab )`
	background-color: #fff;
	border: 0.5px solid rgba( 0, 0, 0, 0.04 );
	box-shadow: 0px 3px 8px rgba( 0, 0, 0, 0.12 ), 0px 3px 1px rgba( 0, 0, 0, 0.04 );
	border-radius: 5px;
`;

const FeaturedPlanProfessional = styled.div`
	grid-column: 3;
	grid-row: 1 / button-1;
	background: rgba( 187, 224, 250, 0.3 );
	border-radius: 2px;
`;

const FeaturedPlanStarter = styled.div`
	grid-column: 3;
	grid-row: 1 / button-1;
	background: rgba( 187, 224, 250, 0.3 );
	border-radius: 2px;
`;

const TermToggles = styled.div`
	padding-top: 24px;
	display: flex;
	flex-flow: column nowrap;
	justify-content: flex-start;

	@media ( max-width: 600px ) {
		padding-left: 24px;
	}
`;

const RadioButtonLabel = styled.label`
	display: flex;
	justify-content: flex-start;
	align-items: center;
	margin-bottom: 13px;
	cursor: pointer;
	font-size: 22px;

	span:last-child {
		order: 2;
		margin-left: 15px;
		font-weight: 500;
		font-size: 14px;
		letter-spacing: -0.16px;
		color: ${ ( props ) => ( props.isDisabled ? '#a8aaad' : '#2c3338' ) };
	}

	input {
		order: 1;
		margin: 0;
		opacity: 0;
		width: 0;
		height: 0;
		cursor: pointer;

		&:checked + span {
			background-color: #f2f2f2;
		}
		/** Show indicator dot when checked */
		&:checked + span:after {
			display: block;
		}
		:not( :checked ) ~ span:nth-of-type( 3 ) {
			color: #a7aaad;
		}
	}

	&:hover input + span {
		background-color: ${ ( props ) => ( props.isDisabled ? '' : '#ccc' ) };
	}

	/** Indicator dot styling */
	span:after {
		margin-top: 4px;
		margin-left: 4px;
		width: 8px;
		height: 8px;
		background: #000;
		border-radius: 40px;
	}
`;

const Checkmark = styled.span`
	order: 1;
	height: 16px;
	width: 16px;
	background-color: #fff;
	border-radius: 40px;
	border: 1px solid #dcdcde;

	&:after {
		content: '';
		display: none;
	}
`;

const PlanBorderOne = styled.div`
	@media ( max-width: 600px ) {
		margin: 24px 24px 0 24px;
		grid-column: 1;
		grid-row: plan-header-1 / shared-features-1;
		border-radius: 2px;
		background: ${ ( props ) => ( props.featured ? '#f1f5f8' : '#fff' ) };
		border: ${ ( props ) => ( props.featured ? '0' : '1px solid #dcdcde' ) };
	}
`;

const PlanBorderTwo = styled.div`
	@media ( max-width: 600px ) {
		margin: 24px 24px 0 24px;
		grid-column: 1;
		grid-row: plan-header-2 / shared-features-2;
		background: ${ ( props ) => ( props.featured ? '#f1f5f8' : '#fff' ) };
		border: ${ ( props ) => ( props.featured ? '0' : '1px solid #dcdcde' ) };
		border-radius: 2px;
	}
`;

const PlanBorderThree = styled.div`
	@media ( max-width: 600px ) {
		margin: 24px 24px 0 24px;
		grid-column: 1;
		grid-row: plan-header-3 / shared-features-3;
		border-radius: 2px;
		background: ${ ( props ) => ( props.featured ? '#f1f5f8' : '#fff' ) };
		border: ${ ( props ) => ( props.featured ? '0' : '1px solid #dcdcde' ) };
	}
`;
const FreeBanner = styled.p`
	grid-area: free-banner;
	margin: 48px 0 24px 0;
	padding: 15px 0;
	text-align: center;
	font-size: 14px;
	background: rgba( 246, 247, 247, 0.5 );
	border-radius: 2px;

	& > button {
		font-size: 14px;
		color: #0675c4;
		cursor: pointer;
		text-decoration: underline;
	}

	@media ( max-width: 600px ) {
		margin: 24px 24px;
	}
`;
