/* eslint-disable wpcalypso/jsx-classname-namespace */

import { Tooltip } from '@wordpress/components';
import { useI18n } from '@wordpress/react-i18n';
import classnames from 'classnames';
import React from 'react';
import { getAvailableDesigns, getDesignUrl, mShotOptions, isBlankCanvasDesign } from '../utils';
import MShotsImage from './mshots-image';
export { default as MShotsImage } from './mshots-image';
import type { Design } from '../types';

import './style.scss';

const makeOptionId = ( { slug }: Design ): string => `design-picker__option-name__${ slug }`;

interface DesignPreviewImageProps {
	design: Design;
	locale: string;
	highRes: boolean;
}

const DesignPreviewImage: React.FC< DesignPreviewImageProps > = ( { design, locale, highRes } ) => (
	<MShotsImage
		url={ getDesignUrl( design, locale ) }
		aria-labelledby={ makeOptionId( design ) }
		alt=""
		options={ mShotOptions( design, highRes ) }
		scrollable={ design.preview !== 'static' }
	/>
);

interface DesignButtonProps {
	design: Design;
	locale: string;
	onSelect: ( design: Design ) => void;
	premiumBadge?: React.ReactNode;
	highRes: boolean;
}

const DesignButton: React.FC< DesignButtonProps > = ( {
	locale,
	onSelect,
	design,
	premiumBadge,
	highRes,
} ) => {
	const { __ } = useI18n();

	const isBlankCanvas = isBlankCanvasDesign( design );

	const defaultTitle = design.title;
	const blankCanvasTitle = __( 'Start with an empty page', __i18n_text_domain__ );
	const designTitle = isBlankCanvas ? blankCanvasTitle : defaultTitle;

	return (
		<button
			className="design-picker__design-option"
			data-e2e-button={ design.is_premium ? 'paidOption' : 'freeOption' }
			onClick={ () => onSelect( design ) }
		>
			<span
				className={ classnames(
					'design-picker__image-frame',
					'design-picker__image-frame-landscape',
					design.preview === 'static' ? 'design-picker__static' : 'design-picker__scrollable',
					{ 'design-picker__image-frame-blank': isBlankCanvas }
				) }
			>
				{ isBlankCanvas ? (
					<div className="design-picker__image-frame-blank-canvas__title">
						{ __( 'Blank Canvas' ) }
					</div>
				) : (
					<div className="design-picker__image-frame-inside">
						<DesignPreviewImage design={ design } locale={ locale } highRes={ highRes } />
					</div>
				) }
			</span>
			<span className="design-picker__option-overlay">
				<span id={ makeOptionId( design ) } className="design-picker__option-meta">
					<span className="design-picker__option-name">{ designTitle }</span>
					{ design.is_premium && premiumBadge && (
						<Tooltip
							position="bottom center"
							text={ __( 'Requires a Personal plan or above', __i18n_text_domain__ ) }
						>
							<div className="design-picker__premium-container">{ premiumBadge }</div>
						</Tooltip>
					) }
				</span>
			</span>
		</button>
	);
};

export interface DesignPickerProps {
	locale: string;
	onSelect: ( design: Design ) => void;
	designs?: Design[];
	premiumBadge?: React.ReactNode;
	isGridMinimal?: boolean;
	theme?: 'dark' | 'light';
	className?: string;
	highResThumbnails?: boolean;
}
const DesignPicker: React.FC< DesignPickerProps > = ( {
	locale,
	onSelect,
	designs = getAvailableDesigns().featured.filter(
		// By default, exclude anchorfm-specific designs
		( design ) => design.features.findIndex( ( f ) => f === 'anchorfm' ) < 0
	),
	premiumBadge,
	isGridMinimal,
	theme = 'light',
	className,
	highResThumbnails = false,
} ) => {
	return (
		<div className={ classnames( 'design-picker', `design-picker--theme-${ theme }`, className ) }>
			<div className={ isGridMinimal ? 'design-picker__grid-minimal' : 'design-picker__grid' }>
				{ designs.map( ( design ) => (
					<DesignButton
						key={ design.slug }
						design={ design }
						locale={ locale }
						onSelect={ onSelect }
						premiumBadge={ premiumBadge }
						highRes={ highResThumbnails }
					/>
				) ) }
			</div>
		</div>
	);
};

export default DesignPicker;
