import { Button, ScreenReaderText, Gridicon } from '@automattic/components';
import { useTranslate } from 'i18n-calypso';
import { Moment } from 'moment';
import React, { FunctionComponent } from 'react';
import ButtonGroup from 'calypso/components/button-group';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

interface Props {
	startDate: Date | Moment | null | undefined;
	endDate: Date | Moment | null | undefined;
	startDateText: string;
	endDateText: string;
	buttonRef: Record< string, unknown >;
	onTriggerClick: () => void;
	onClearClick: () => void;
	triggerText: ( startDateText: string, endDateText: string ) => string;
	showClearBtn: boolean;
	isCompact: boolean;
}

const DateRangeTrigger: FunctionComponent< Props > = ( {
	onTriggerClick = noop,
	onClearClick = noop,
	isCompact = false,
	showClearBtn = true,
	startDate,
	endDate,
	startDateText,
	endDateText,
	triggerText,
	buttonRef,
} ) => {
	const translate = useTranslate();

	const canReset = Boolean( startDate || endDate );

	let dateRangeText;
	if ( triggerText ) {
		dateRangeText = triggerText( startDateText, endDateText );
	} else {
		dateRangeText = translate( '%(startDateText)s - %(endDateText)s', {
			context: 'Date range text for DateRange input trigger',
			args: {
				startDateText,
				endDateText,
			},
		} );
	}

	return (
		<ButtonGroup className="date-range__trigger">
			<Button
				className="date-range__trigger-btn"
				ref={ buttonRef }
				onClick={ onTriggerClick }
				compact={ isCompact }
				aria-haspopup={ true }
			>
				<Gridicon className="date-range__trigger-btn-icon" icon="calendar" aria-hidden="true" />
				<span className="date-range__trigger-btn-text">{ dateRangeText }</span>
				{ ! showClearBtn && <Gridicon aria-hidden="true" icon="chevron-down" /> }
			</Button>
			{ showClearBtn && (
				<Button
					className="date-range__clear-btn"
					compact={ isCompact }
					onClick={ onClearClick }
					disabled={ ! canReset }
					title="Clear date selection"
				>
					<ScreenReaderText>{ translate( 'Clear date selection' ) }</ScreenReaderText>
					<Gridicon aria-hidden="true" icon="cross" />
				</Button>
			) }
		</ButtonGroup>
	);
};

export default DateRangeTrigger;
