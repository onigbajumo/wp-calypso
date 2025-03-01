import { ActionButtons } from '@automattic/onboarding';
import classNames from 'classnames';
import { localize } from 'i18n-calypso';
import PropTypes from 'prop-types';
import { Component } from 'react';
import FormattedHeader from 'calypso/components/formatted-header';
import NavigationLink from 'calypso/signup/navigation-link';
import { isReskinnedFlow } from '../utils';
import './style.scss';

class StepWrapper extends Component {
	static propTypes = {
		shouldHideNavButtons: PropTypes.bool,
		translate: PropTypes.func.isRequired,
		hideFormattedHeader: PropTypes.bool,
		hideBack: PropTypes.bool,
		hideSkip: PropTypes.bool,
		hideNext: PropTypes.bool,
		// Allows to force a back button in the first step for example.
		// You should only force this when you're passing a backUrl.
		allowBackFirstStep: PropTypes.bool,
		skipLabelText: PropTypes.string,
		skipHeadingText: PropTypes.string,
		skipButtonAlign: PropTypes.oneOf( [ 'top', 'bottom' ] ),
		nextLabelText: PropTypes.string,
		// Displays an <hr> above the skip button and adds more white space
		isLargeSkipLayout: PropTypes.bool,
		isExternalBackUrl: PropTypes.bool,
		headerButton: PropTypes.node,
	};

	static defaultProps = {
		allowBackFirstStep: false,
		skipButtonAlign: 'bottom',
		hideNext: true,
	};

	renderBack() {
		if ( this.props.shouldHideNavButtons ) {
			return null;
		}
		return (
			<NavigationLink
				direction="back"
				flowName={ this.props.flowName }
				positionInFlow={ this.props.positionInFlow }
				stepName={ this.props.stepName }
				stepSectionName={ this.props.stepSectionName }
				backUrl={ this.props.backUrl }
				rel={ this.props.isExternalBackUrl ? 'external' : '' }
				labelText={ this.props.backLabelText }
				allowBackFirstStep={ this.props.allowBackFirstStep }
				backIcon={ isReskinnedFlow( this.props.flowName ) ? 'chevron-left' : undefined }
			/>
		);
	}

	renderSkip( { borderless, forwardIcon } ) {
		const {
			shouldHideNavButtons,
			skipHeadingText,
			skipLabelText,
			defaultDependencies,
			flowName,
			stepName,
			goToNextStep,
		} = this.props;

		if ( shouldHideNavButtons || ! goToNextStep ) {
			return null;
		}

		return (
			<div className="step-wrapper__skip-wrapper">
				{ skipHeadingText && <div className="step-wrapper__skip-heading">{ skipHeadingText }</div> }
				<NavigationLink
					direction="forward"
					goToNextStep={ goToNextStep }
					defaultDependencies={ defaultDependencies }
					flowName={ flowName }
					stepName={ stepName }
					labelText={ skipLabelText }
					cssClass={ classNames( 'step-wrapper__navigation-link', 'has-underline', {
						'has-skip-heading': skipHeadingText,
					} ) }
					borderless={ borderless }
					forwardIcon={ forwardIcon }
				/>
			</div>
		);
	}

	renderNext() {
		const {
			shouldHideNavButtons,
			nextLabelText,
			defaultDependencies,
			flowName,
			stepName,
			goToNextStep,
			translate,
		} = this.props;

		if ( shouldHideNavButtons || ! goToNextStep ) {
			return null;
		}

		return (
			<NavigationLink
				direction="forward"
				goToNextStep={ goToNextStep }
				defaultDependencies={ defaultDependencies }
				flowName={ flowName }
				stepName={ stepName }
				labelText={ nextLabelText || translate( 'Continue' ) }
				cssClass="step-wrapper__navigation-link"
				borderless={ false }
				primary
				forwardIcon={ null }
			/>
		);
	}

	headerText() {
		if ( this.props.positionInFlow === 0 ) {
			if ( this.props.headerText !== undefined ) {
				return this.props.headerText;
			}

			return this.props.translate( "Let's get started" );
		}

		if ( this.props.fallbackHeaderText !== undefined ) {
			return this.props.fallbackHeaderText;
		}
	}

	subHeaderText() {
		if ( this.props.positionInFlow === 0 ) {
			if ( this.props.subHeaderText !== undefined ) {
				return this.props.subHeaderText;
			}

			return this.props.translate( 'Welcome to the best place for your WordPress website.' );
		}

		if ( this.props.fallbackSubHeaderText !== undefined ) {
			return this.props.fallbackSubHeaderText;
		}
	}

	render() {
		const {
			flowName,
			stepContent,
			headerButton,
			hideFormattedHeader,
			hideBack,
			hideSkip,
			hideNext,
			isLargeSkipLayout,
			isWideLayout,
			skipButtonAlign,
			align,
		} = this.props;

		const hasNavigation = ! hideBack || ( ! hideSkip && skipButtonAlign === 'top' ) || ! hideNext;
		const classes = classNames( 'step-wrapper', this.props.className, {
			'is-wide-layout': isWideLayout,
			'is-large-skip-layout': isLargeSkipLayout,
			'has-navigation': hasNavigation,
		} );

		return (
			<>
				<div className={ classes }>
					{ hasNavigation && (
						<ActionButtons
							className="step-wrapper__navigation"
							sticky={ isReskinnedFlow( flowName ) ? null : false }
						>
							{ ! hideBack && this.renderBack() }
							{ ! hideSkip &&
								skipButtonAlign === 'top' &&
								this.renderSkip( { borderless: true, forwardIcon: null } ) }
							{ ! hideNext && this.renderNext() }
						</ActionButtons>
					) }

					{ ! hideFormattedHeader && (
						<div className="step-wrapper__header">
							<FormattedHeader
								id={ 'step-header' }
								headerText={ this.headerText() }
								subHeaderText={ this.subHeaderText() }
								align={ align }
							/>
							{ headerButton && (
								<div className="step-wrapper__header-button">{ headerButton }</div>
							) }
						</div>
					) }

					<div className="step-wrapper__content">{ stepContent }</div>

					{ ! hideSkip && skipButtonAlign === 'bottom' && (
						<div className="step-wrapper__buttons">
							{ isLargeSkipLayout && <hr className="step-wrapper__skip-hr" /> }
							{ this.renderSkip( { borderless: true } ) }
						</div>
					) }
				</div>
			</>
		);
	}
}

export default localize( StepWrapper );
