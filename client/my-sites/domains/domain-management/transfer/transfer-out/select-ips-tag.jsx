import { Card, Dialog, Suggestions } from '@automattic/components';
import debugFactory from 'debug';
import { localize } from 'i18n-calypso';
import { find, isEmpty, startsWith } from 'lodash';
import { Component } from 'react';
import { connect } from 'react-redux';
import FormButton from 'calypso/components/forms/form-button';
import Notice from 'calypso/components/notice';
import NoticeAction from 'calypso/components/notice/notice-action';
import SearchCard from 'calypso/components/search-card';
import { saveDomainIpsTag } from 'calypso/state/domains/transfer/actions';
import getGainingRegistrar from 'calypso/state/selectors/get-gaining-registrar';
import getIpsTagSaveStatus from 'calypso/state/selectors/get-ips-tag-save-status';

const debug = debugFactory( 'calypso:domains:select-ips-tag' );

class SelectIpsTag extends Component {
	static ipsTagListUrl = 'https://widgets.wp.com/domains/ips-tag-list.min.json';

	state = {
		currentQuery: '',
		ipsTagInput: '',
		ipsTagList: [],
		selectedRegistrar: {},
		showDialog: false,
	};

	componentDidMount() {
		// eslint-disable-next-line no-undef
		fetch( SelectIpsTag.ipsTagListUrl )
			.then( async ( response ) => {
				this.receiveIpsTagList( await response.json() );
			} )
			.catch( ( error ) => {
				debug( 'Failed to load IPS tag list! ' + error );
			} );
	}

	componentDidUpdate() {
		if ( this.state.currentQuery && this.state.currentQuery !== this.state.ipsTagInput ) {
			this.hideSuggestions();
		}
	}

	receiveIpsTagList = ( ipsTagList ) => {
		this.setState( { ipsTagList } );
	};

	handleKeyDown = ( event ) => this.suggestionsRef.handleKeyEvent( event );

	handleSearchInputChange = ( query ) =>
		this.setState( { currentQuery: query, ipsTagInput: query } );

	handleSuggestionClick = ( position ) => {
		const parsedLabel = position.label.split( ' ' );
		this.setState( { ipsTagInput: parsedLabel[ 0 ] } );
	};

	handleSubmit = () => {
		this.props.saveDomainIpsTag( this.props.selectedDomainName, this.state.selectedRegistrar );
	};

	getRegistrarInfo( ipsTag, ipsTagList ) {
		return find( ipsTagList, [ 'tag', ipsTag ] );
	}

	getSuggestions() {
		return this.state.ipsTagList
			.filter(
				( hint ) =>
					this.state.currentQuery && startsWith( hint.tag, this.state.currentQuery.toUpperCase() )
			)
			.map( ( hint ) => ( { label: hint.tag + '  (' + hint.registrarName + ')' } ) );
	}

	setSuggestionsRef = ( ref ) => ( this.suggestionsRef = ref );

	hideSuggestions = () => this.setState( { currentQuery: '' } );

	popOverDialog = () => {
		const { ipsTagInput, ipsTagList } = this.state;
		let selectedRegistrar = this.getRegistrarInfo( ipsTagInput, ipsTagList );

		if ( isEmpty( selectedRegistrar ) ) {
			selectedRegistrar = { tag: ipsTagInput.toUpperCase(), registrarName: '', registrarUrl: '' };
		}

		this.setState( {
			selectedRegistrar,
			showDialog: true,
		} );
	};

	onCloseDialog = ( action ) => {
		if ( 'submit' === action ) {
			this.handleSubmit();
		}

		this.setState( { showDialog: false } );
	};

	renderGoToGainingRegistrar() {
		const {
			translate,
			gainingRegistrar: { registrarUrl },
		} = this.props;

		return (
			<Notice
				status="is-success"
				text={
					registrarUrl
						? translate( 'Success! Please visit your new registrar to complete the transfer.' )
						: translate( 'Success! Contact your new registrar to complete the transfer.' )
				}
				showDismiss={ false }
			>
				{ registrarUrl && this.renderNoticeAction() }
			</Notice>
		);
	}

	renderNoticeAction() {
		const {
			translate,
			gainingRegistrar: { registrarUrl },
		} = this.props;

		return (
			<NoticeAction href={ registrarUrl } external={ true }>
				{ translate( 'Open' ) }
			</NoticeAction>
		);
	}

	renderIpsTagSelect() {
		const { saveStatus, selectedDomainName, translate } = this.props;

		return (
			<div>
				<p>
					{ translate(
						'Please enter the IPS tag of the registrar you wish to transfer ' +
							'{{strong}}%(selectedDomainName)s{{/strong}} to.',
						{ args: { selectedDomainName }, components: { strong: <strong /> } }
					) }
				</p>

				<SearchCard
					disableAutocorrect
					onSearch={ this.handleSearchInputChange }
					onBlur={ this.hideSuggestions }
					onKeyDown={ this.handleKeyDown }
					placeholder={ translate( 'Start typing an IPS tag…' ) }
					value={ this.state.ipsTagInput }
				/>
				<Suggestions
					ref={ this.setSuggestionsRef }
					query={ this.state.currentQuery }
					suggestions={ this.getSuggestions() }
					suggest={ this.handleSuggestionClick }
				/>
				<FormButton onClick={ this.popOverDialog } disabled={ 'saving' === saveStatus }>
					{ translate( 'Submit' ) }
				</FormButton>

				{ this.state.showDialog && this.renderDialog() }
			</div>
		);
	}

	renderDialog() {
		const { selectedDomainName, translate } = this.props;
		const { selectedRegistrar, showDialog } = this.state;
		const buttons = [
			{ action: 'cancel', label: translate( 'Cancel' ) },
			{ action: 'submit', label: translate( 'Yes, Submit!' ), isPrimary: true },
		];

		return (
			<Dialog
				additionalClassNames="transfer-out__select-ips-tag-dialog"
				buttons={ buttons }
				isVisible={ showDialog }
				onClose={ this.onCloseDialog }
			>
				<h1>{ translate( 'Transfer Confirmation' ) }</h1>
				<p>
					{
						// translators: %s is a domain name. eg newDomain.com
						translate(
							'Please verify you wish to set the registrar for ' +
								'{{strong}}%(selectedDomainName)s{{/strong}} to the following:',
							{ args: { selectedDomainName }, components: { strong: <strong /> } }
						)
					}
				</p>
				<p>
					<strong>{ selectedRegistrar.tag }</strong>
					&nbsp;&nbsp;
					{ selectedRegistrar.registrarName ? '(' + selectedRegistrar.registrarName + ')' : '' }
				</p>
				<p>
					{ translate(
						'After submitting this tag change, the domain will no longer be in our system. ' +
							'You will need to contact the new registrar to complete the transfer and regain ' +
							'control of the domain.'
					) }
				</p>
			</Dialog>
		);
	}

	render() {
		const { translate, saveStatus } = this.props;

		return (
			<div>
				<Card>
					<p>
						{ translate(
							"{{strong}}.uk{{/strong}} domains are transferred by setting the domain's IPS tag here to the " +
								'value provided by the new registrar and then contacting the {{em}}new registrar{{/em}} to ' +
								'complete the transfer.',
							{ components: { strong: <strong />, em: <em /> } }
						) }
					</p>
					{ 'success' === saveStatus
						? this.renderGoToGainingRegistrar()
						: this.renderIpsTagSelect() }
				</Card>
			</div>
		);
	}
}

export default connect(
	( state, ownProps ) => ( {
		gainingRegistrar: getGainingRegistrar( state, ownProps.selectedDomainName ),
		saveStatus: getIpsTagSaveStatus( state, ownProps.selectedDomainName ),
	} ),
	{ saveDomainIpsTag }
)( localize( SelectIpsTag ) );
