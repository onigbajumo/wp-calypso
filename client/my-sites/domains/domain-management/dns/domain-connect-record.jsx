import { ToggleControl } from '@wordpress/components';
import { localize } from 'i18n-calypso';
import PropTypes from 'prop-types';
import { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import { domainConnect } from 'calypso/lib/domains/constants';
import { addDns, deleteDns } from 'calypso/state/domains/dns/actions';
import { getNormalizedData } from 'calypso/state/domains/dns/utils';
import { errorNotice, removeNotice, successNotice } from 'calypso/state/notices/actions';
import DnsRecordsListItem from '../dns-records/item';
import DnsRecordsList from '../dns-records/list';

import './domain-connect-record.scss';

class DomainConnectRecord extends Component {
	static propTypes = {
		enabled: PropTypes.bool.isRequired,
		selectedDomainName: PropTypes.string.isRequired,
		hasWpcomNameservers: PropTypes.bool.isRequired,
	};

	state = {
		dnsRecordIsBeingUpdated: false,
	};

	disableDomainConnect = () => {
		const { selectedDomainName, translate } = this.props;
		const record = {
			name: domainConnect.DISCOVERY_TXT_RECORD_NAME,
			data: domainConnect.API_URL,
			type: 'TXT',
		};

		this.props
			.deleteDns( selectedDomainName, record )
			.then(
				() => {
					const successNoticeId = 'domain-connect-disable-success-notice';
					this.props.successNotice( translate( 'The Domain Connect record has been disabled.' ), {
						id: successNoticeId,
						showDismiss: false,
						duration: 5000,
					} );
				},
				( error ) => {
					this.props.errorNotice(
						error.message || translate( 'The Domain Connect record could not be disabled.' )
					);
				}
			)
			.then( () => this.setState( { dnsRecordIsBeingUpdated: false } ) );
	};

	enableDomainConnect() {
		const { translate } = this.props;
		const record = {
			name: domainConnect.DISCOVERY_TXT_RECORD_NAME,
			data: domainConnect.API_URL,
			type: 'TXT',
		};

		const normalizedData = getNormalizedData( record, this.props.selectedDomainName );

		this.props
			.addDns( this.props.selectedDomainName, normalizedData )
			.then(
				() => {
					this.props.successNotice( translate( 'The Domain Connect record has been enabled.' ), {
						showDismiss: false,
						duration: 5000,
					} );
				},
				( error ) => {
					this.props.errorNotice(
						error.message || translate( 'The Domain Connect record could not be enabled.' )
					);
				}
			)
			.then( () => this.setState( { dnsRecordIsBeingUpdated: false } ) );
	}

	handleToggle = () => {
		this.setState( { dnsRecordIsBeingUpdated: true } );
		if ( this.props.enabled ) {
			this.disableDomainConnect();
		} else {
			this.enableDomainConnect();
		}
	};

	render() {
		const { enabled, selectedDomainName, hasWpcomNameservers, translate } = this.props;

		if ( ! hasWpcomNameservers ) {
			return null;
		}

		const name = `${ domainConnect.DISCOVERY_TXT_RECORD_NAME }.${ selectedDomainName }`;

		return (
			<Fragment>
				<DnsRecordsList className="dns__domain-connect-record">
					<DnsRecordsListItem
						disabled={ ! enabled }
						type="TXT"
						name={ name }
						content={ translate( 'Handled by WordPress.com' ) }
						action={
							<form className="dns__domain-connect-toggle">
								<ToggleControl
									id="domain-connect-record"
									name="domain-connect-record"
									onChange={ this.handleToggle }
									checked={ enabled }
									value="active"
									disabled={ this.state.dnsRecordIsBeingUpdated }
								/>
							</form>
						}
					/>
				</DnsRecordsList>
				<div className="dns__domain-connect-explanation">
					<em>
						{ translate(
							'Enabling this special DNS record allows you to automatically configure ' +
								'some third party services. '
						) }
					</em>
				</div>
			</Fragment>
		);
	}
}

export default connect( null, {
	addDns,
	deleteDns,
	errorNotice,
	removeNotice,
	successNotice,
} )( localize( DomainConnectRecord ) );
