import { TERM_ANNUALLY } from '@automattic/calypso-products';
import { Button, ProductIcon, Gridicon } from '@automattic/components';
import classNames from 'classnames';
import { TranslateResult, useTranslate } from 'i18n-calypso';
import React, { createElement, ReactNode, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import InfoPopover from 'calypso/components/info-popover';
import { preventWidows } from 'calypso/lib/formatting';
import PlanPrice from 'calypso/my-sites/plan-price';
import { INTRO_PRICING_DISCOUNT_PERCENTAGE } from 'calypso/my-sites/plans/jetpack-plans/constants';
import { getJetpackSaleCouponDiscountRatio } from 'calypso/state/marketing/selectors';
import starIcon from './assets/star.svg';
import JetpackProductCardFeatures, { Props as FeaturesProps } from './features';
import JetpackProductCardTimeFrame from './time-frame';
import type {
	Duration,
	ScrollCardIntoViewCallback,
} from 'calypso/my-sites/plans/jetpack-plans/types';
import type { Moment } from 'moment';

import './style.scss';

type OwnProps = {
	iconSlug?: string;
	productSlug: string;
	productName: TranslateResult;
	subheader?: TranslateResult;
	headingLevel?: number;
	description?: ReactNode;
	currencyCode?: string | null;
	originalPrice: number;
	discountedPrice?: number;
	belowPriceText?: TranslateResult;
	billingTerm: Duration;
	buttonLabel: TranslateResult;
	buttonPrimary: boolean;
	onButtonClick: React.MouseEventHandler;
	buttonURL?: string;
	expiryDate?: Moment;
	isFeatured?: boolean;
	isFree?: boolean;
	isOwned?: boolean;
	isIncludedInPlan?: boolean;
	isDeprecated?: boolean;
	isAligned?: boolean;
	isDisabled?: boolean;
	disabledMessage?: TranslateResult | null;
	displayFrom?: boolean;
	tooltipText?: TranslateResult | ReactNode;
	aboveButtonText?: TranslateResult | ReactNode;
	featuredLabel?: TranslateResult;
	hideSavingLabel?: boolean;
	scrollCardIntoView?: ScrollCardIntoViewCallback;
};

export type Props = OwnProps & Partial< FeaturesProps >;

const FRESHPACK_PERCENTAGE = 1 - 0.4; // 40% off

const DisplayPrice = ( {
	isDeprecated,
	isOwned,
	isIncludedInPlan,
	isFree,
	discountedPrice,
	currencyCode,
	originalPrice,
	belowPriceText,
	displayFrom,
	expiryDate,
	billingTerm,
	tooltipText,
	productName,
	hideSavingLabel,
} ) => {
	const translate = useTranslate();
	const jetpackSaleDiscountRatio = useSelector( getJetpackSaleCouponDiscountRatio );
	const DISCOUNT_PERCENTAGE =
		billingTerm === TERM_ANNUALLY && jetpackSaleDiscountRatio
			? 1 - jetpackSaleDiscountRatio
			: FRESHPACK_PERCENTAGE;

	if ( isDeprecated ) {
		return (
			<div className="jetpack-product-card__price">
				<p className="jetpack-product-card__price-deprecated">
					{ translate( 'The %(productName)s plan is no longer available', {
						args: {
							productName,
						},
						comment: 'productName is the name of Jetpack plan such as Personal',
					} ) }
				</p>
			</div>
		);
	}

	if ( isOwned ) {
		return (
			<div className="jetpack-product-card__price">
				<p className="jetpack-product-card__you-own-this">
					<Gridicon
						className="jetpack-product-card__you-own-this-icon"
						icon="checkmark-circle"
						size={ 48 }
					/>
					{ translate( 'You own this product' ) }
				</p>
			</div>
		);
	}

	if ( isIncludedInPlan ) {
		return (
			<div className="jetpack-product-card__price">
				<p className="jetpack-product-card__you-own-this">
					<Gridicon
						className="jetpack-product-card__you-own-this-icon"
						icon="checkmark-circle"
						size={ 48 }
					/>
					{ translate( 'Part of your current plan' ) }
				</p>
			</div>
		);
	}

	if ( isFree ) {
		return (
			<div className="jetpack-product-card__price">
				<div>
					<span className="jetpack-product-card__price-free">{ translate( 'Free' ) }</span>
					{ belowPriceText && (
						<span className="jetpack-product-card__billing-time-frame">{ belowPriceText }</span>
					) }
					<span className="jetpack-product-card__get-started">
						{ translate( 'Get started for free' ) }
					</span>
				</div>
			</div>
		);
	}

	const couponOriginalPrice = parseFloat( ( discountedPrice ?? originalPrice ).toFixed( 2 ) );
	const couponDiscountedPrice = parseFloat(
		( ( discountedPrice ?? originalPrice ) * DISCOUNT_PERCENTAGE ).toFixed( 2 )
	);
	const discountElt =
		billingTerm === TERM_ANNUALLY
			? translate( 'Save %(percent)d%% for the first year ✢', {
					args: {
						percent: ( ( originalPrice - couponDiscountedPrice ) / originalPrice ) * 100,
					},
					comment: '✢ clause describing the displayed price adjustment',
			  } )
			: translate( 'You Save %(percent)d%% ✢', {
					args: {
						percent: INTRO_PRICING_DISCOUNT_PERCENTAGE,
					},
					comment: '✢ clause describing the displayed price adjustment',
			  } );

	return (
		<div className="jetpack-product-card__price">
			{ currencyCode && originalPrice ? (
				<>
					{ displayFrom && <span className="jetpack-product-card__price-from">from</span> }
					{ /*
					 * Price should be displayed from left-to-right, even in right-to-left
					 * languages. `PlanPrice` seems to keep the ltr direction no matter
					 * what when seen in the dev docs page, but somehow it doesn't in
					 * the pricing page.
					 */ }
					<span dir="ltr">
						<PlanPrice
							original
							className="jetpack-product-card__original-price"
							rawPrice={
								( billingTerm === TERM_ANNUALLY ? originalPrice : couponOriginalPrice ) as number
							}
							currencyCode={ currencyCode }
						/>
					</span>
					<span dir="ltr">
						<PlanPrice
							discounted
							rawPrice={ couponDiscountedPrice as number }
							currencyCode={ currencyCode }
						/>
					</span>
					{ tooltipText && (
						<InfoPopover position="top" className="jetpack-product-card__price-tooltip">
							{ tooltipText }
						</InfoPopover>
					) }
					<JetpackProductCardTimeFrame expiryDate={ expiryDate } billingTerm={ billingTerm } />
					{ ! hideSavingLabel && (
						<span className="jetpack-product-card__you-save">{ discountElt }</span>
					) }
				</>
			) : (
				<>
					<div className="jetpack-product-card__price-placeholder" />
					<div className="jetpack-product-card__time-frame-placeholder" />
				</>
			) }
		</div>
	);
};

const JetpackProductCard: React.FC< Props > = ( {
	iconSlug,
	productSlug,
	productName,
	subheader,
	headingLevel,
	description,
	currencyCode,
	originalPrice,
	discountedPrice,
	billingTerm,
	buttonLabel,
	buttonPrimary,
	onButtonClick,
	buttonURL,
	expiryDate,
	isFeatured,
	isOwned,
	isIncludedInPlan,
	isFree,
	isDeprecated,
	isAligned,
	features,
	isDisabled,
	disabledMessage,
	displayFrom,
	belowPriceText,
	tooltipText,
	featuredLabel,
	hideSavingLabel,
	aboveButtonText = null,
	scrollCardIntoView,
}: Props ) => {
	const translate = useTranslate();
	const parsedHeadingLevel = Number.isFinite( headingLevel )
		? Math.min( Math.max( Math.floor( headingLevel as number ), 1 ), 6 )
		: 2;
	const parsedSubheadingLevel = Math.min( parsedHeadingLevel + 1, 6 );

	const anchorRef = useRef< HTMLDivElement >( null );

	useEffect( () => {
		// The <DisplayPrice /> appearance changes the layout of the page and breaks the scroll into view behavior. Therefore, we will only scroll the element into view once the price is fully loaded.
		if ( anchorRef && anchorRef.current && originalPrice ) {
			scrollCardIntoView && scrollCardIntoView( anchorRef.current, productSlug );
		}
	}, [ originalPrice ] );

	return (
		<div
			className={ classNames( 'jetpack-product-card', {
				'is-disabled': isDisabled,
				'is-owned': isOwned,
				'is-deprecated': isDeprecated,
				'is-aligned': isAligned,
				'is-featured': isFeatured,
				'without-icon': ! iconSlug,
			} ) }
			data-e2e-product-slug={ productSlug }
		>
			<div className="jetpack-product-card__scroll-anchor" ref={ anchorRef }></div>
			{ isFeatured && (
				<div className="jetpack-product-card__header">
					<img className="jetpack-product-card__header-icon" src={ starIcon } alt="" />
					<span>{ featuredLabel || translate( 'Recommended' ) }</span>
				</div>
			) }
			<div className="jetpack-product-card__body">
				{ iconSlug && <ProductIcon className="jetpack-product-card__icon" slug={ iconSlug } /> }
				{ createElement(
					`h${ parsedHeadingLevel }`,
					{ className: 'jetpack-product-card__product-name' },
					<>{ productName }</>
				) }
				{ subheader &&
					createElement(
						`h${ parsedSubheadingLevel }`,
						{ className: 'jetpack-product-card__product-subheader' },
						<>{ subheader }</>
					) }

				<DisplayPrice
					isDeprecated={ isDeprecated }
					isOwned={ isOwned }
					isIncludedInPlan={ isIncludedInPlan }
					isFree={ isFree }
					discountedPrice={ discountedPrice }
					currencyCode={ currencyCode }
					originalPrice={ originalPrice }
					displayFrom={ displayFrom }
					belowPriceText={ belowPriceText }
					expiryDate={ expiryDate }
					billingTerm={ billingTerm }
					tooltipText={ tooltipText }
					productName={ productName }
					hideSavingLabel={ hideSavingLabel }
				/>

				{ aboveButtonText && (
					<p className="jetpack-product-card__above-button">{ aboveButtonText }</p>
				) }
				{ isDisabled && disabledMessage && (
					<p className="jetpack-product-card__disabled-message">
						{ preventWidows( disabledMessage ) }
					</p>
				) }
				{ ! isDisabled &&
					( buttonURL ? (
						<Button
							primary={ buttonPrimary }
							className="jetpack-product-card__button"
							onClick={ onButtonClick }
							href={ buttonURL }
							disabled={ isDeprecated }
						>
							{ buttonLabel }
						</Button>
					) : (
						<Button
							primary={ buttonPrimary }
							className="jetpack-product-card__button"
							onClick={ onButtonClick }
							disabled={ isDeprecated }
						>
							{ buttonLabel }
						</Button>
					) ) }

				{ description && <p className="jetpack-product-card__description">{ description }</p> }
				{ features && features.items.length > 0 && (
					<JetpackProductCardFeatures features={ features } />
				) }
			</div>
		</div>
	);
};

export default JetpackProductCard;
