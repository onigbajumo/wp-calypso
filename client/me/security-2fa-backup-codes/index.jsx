import { Button, Card } from '@automattic/components';
import { localize } from 'i18n-calypso';
import { Component } from 'react';
import { connect } from 'react-redux';
import Notice from 'calypso/components/notice';
import SectionHeader from 'calypso/components/section-header';
import twoStepAuthorization from 'calypso/lib/two-step-authorization';
import Security2faBackupCodesList from 'calypso/me/security-2fa-backup-codes-list';
import Security2faBackupCodesPrompt from 'calypso/me/security-2fa-backup-codes-prompt';
import { recordGoogleEvent } from 'calypso/state/analytics/actions';
import getUserSetting from 'calypso/state/selectors/get-user-setting';

import './style.scss';

class Security2faBackupCodes extends Component {
	constructor( props ) {
		super( props );

		const printed = this.props.backupCodesPrinted;

		this.state = {
			printed,
			verified: printed,
			showPrompt: ! printed,
			backupCodes: [],
			generatingCodes: false,
		};
	}

	handleGenerateButtonClick = () => {
		this.props.recordGoogleEvent( 'Me', 'Clicked on Generate New Backup Codes Button' );

		this.setState( {
			generatingCodes: true,
			verified: false,
			showPrompt: true,
		} );

		twoStepAuthorization.backupCodes( this.onRequestComplete );
	};

	onRequestComplete = ( error, data ) => {
		if ( error ) {
			return;
		}

		this.setState( {
			backupCodes: data.codes,
			generatingCodes: false,
		} );
	};

	onNextStep = () => {
		this.setState( {
			backupCodes: [],
			printed: true,
		} );
	};

	onVerified = () => {
		this.setState( {
			printed: true,
			verified: true,
			showPrompt: false,
		} );
	};

	renderStatus() {
		if ( ! this.state.printed ) {
			return (
				<Notice
					isCompact
					status="is-error"
					text={ this.props.translate( 'Backup codes have not been verified.' ) }
				/>
			);
		}

		if ( ! this.state.verified ) {
			return (
				<Notice
					isCompact
					text={ this.props.translate(
						'New backup codes have just been generated, but need to be verified.'
					) }
				/>
			);
		}

		return (
			<Notice
				isCompact
				status="is-success"
				text={ this.props.translate( 'Backup codes have been verified' ) }
			/>
		);
	}

	renderList() {
		return (
			<Security2faBackupCodesList
				backupCodes={ this.state.backupCodes }
				onNextStep={ this.onNextStep }
				showList
			/>
		);
	}

	renderPrompt() {
		return (
			<div>
				<p>
					{ this.props.translate(
						'Backup codes let you access your account if your phone is ' +
							'lost, stolen, or if you run it through the washing ' +
							"machine and the bag of rice trick doesn't work."
					) }
				</p>

				{ this.renderStatus() }

				{ this.state.showPrompt && <Security2faBackupCodesPrompt onSuccess={ this.onVerified } /> }
			</div>
		);
	}

	render() {
		return (
			<div className="security-2fa-backup-codes">
				<SectionHeader label={ this.props.translate( 'Backup codes' ) }>
					<Button
						compact
						disabled={ this.state.generatingCodes || !! this.state.backupCodes.length }
						onClick={ this.handleGenerateButtonClick }
					>
						{ this.props.translate( 'Generate new backup codes' ) }
					</Button>
				</SectionHeader>
				<Card>
					{ this.state.generatingCodes || this.state.backupCodes.length
						? this.renderList()
						: this.renderPrompt() }
				</Card>
			</div>
		);
	}
}

export default connect(
	( state ) => ( {
		backupCodesPrinted: getUserSetting( state, 'two_step_backup_codes_printed' ),
	} ),
	{
		recordGoogleEvent,
	}
)( localize( Security2faBackupCodes ) );
