import styled from '@emotion/styled';
import PropTypes from 'prop-types';
import React from 'react';
import joinClasses from '../lib/join-classes';
import type { LineItem } from '../types';

/* eslint-disable @typescript-eslint/no-use-before-define */

export function OrderReviewSection( {
	children,
	className,
}: {
	children?: React.ReactNode;
	className?: string;
} ): JSX.Element {
	return (
		<OrderReviewSectionArea className={ joinClasses( [ className, 'order-review-section' ] ) }>
			{ children }
		</OrderReviewSectionArea>
	);
}

OrderReviewSection.propTypes = {
	className: PropTypes.string,
};

const OrderReviewSectionArea = styled.div`
	margin-bottom: 16px;
`;

function OrderReviewLineItemUnstyled( { item, className }: LineItemProps ) {
	const itemSpanId = `checkout-line-item-${ item.id }`;
	return (
		<div className={ joinClasses( [ className, 'checkout-line-item' ] ) }>
			<span id={ itemSpanId }>{ item.label }</span>
			<span aria-labelledby={ itemSpanId }>{ item.amount.displayValue }</span>
		</div>
	);
}

interface LineItemProps {
	className?: string;
	total?: boolean;
	isSummaryVisible?: boolean;
	item: LineItem;
}

const OrderReviewLineItem = styled( OrderReviewLineItemUnstyled )< LineItemProps >`
	display: flex;
	width: 100%;
	justify-content: space-between;
	font-weight: ${ ( { theme, total } ) => ( total ? theme.weights.bold : theme.weights.normal ) };
	color: ${ ( { theme, total } ) => ( total ? theme.colors.textColorDark : 'inherit' ) };
	font-size: ${ ( { total } ) => ( total ? '1.2em' : '1em' ) };
	padding: ${ ( { total, isSummaryVisible } ) => ( isSummaryVisible || total ? 0 : '24px 0' ) };
	border-bottom: ${ ( { theme, total, isSummaryVisible } ) =>
		isSummaryVisible || total ? 0 : '1px solid ' + theme.colors.borderColorLight };

	:first-of-type {
		padding-top: 0;
	}
`;

export function OrderReviewTotal( {
	total,
	className,
}: {
	total: LineItem;
	className?: string;
} ): JSX.Element {
	return (
		<div className={ joinClasses( [ className, 'order-review-total' ] ) }>
			<OrderReviewLineItem total item={ total } />
		</div>
	);
}

export function OrderReviewLineItems( {
	items,
	className,
	isSummaryVisible,
}: OrderReviewLineItemsProps ): JSX.Element {
	return (
		<div className={ joinClasses( [ className, 'order-review-line-items' ] ) }>
			{ items.map( ( item ) => (
				<OrderReviewLineItem isSummaryVisible={ isSummaryVisible } key={ item.id } item={ item } />
			) ) }
		</div>
	);
}

interface OrderReviewLineItemsProps {
	className?: string;
	isSummaryVisible?: boolean;
	items: LineItem[];
}

OrderReviewLineItems.propTypes = {
	className: PropTypes.string,
	isSummaryVisible: PropTypes.bool,
	items: PropTypes.arrayOf(
		PropTypes.shape( {
			label: PropTypes.string,
			amount: PropTypes.shape( {
				displayValue: PropTypes.string,
			} ),
		} )
	),
};
