import { localize } from 'i18n-calypso';
import { flowRight } from 'lodash';
import PropTypes from 'prop-types';
import { Component } from 'react';
import { connect } from 'react-redux';
import QueryJetpackModules from 'calypso/components/data/query-jetpack-modules';
import QuerySharingButtons from 'calypso/components/data/query-sharing-buttons';
import QuerySiteSettings from 'calypso/components/data/query-site-settings';
import Notice from 'calypso/components/notice';
import NoticeAction from 'calypso/components/notice/notice-action';
import PageViewTracker from 'calypso/lib/analytics/page-view-tracker';
import { protectForm } from 'calypso/lib/protect-form';
import { recordGoogleEvent, recordTracksEvent } from 'calypso/state/analytics/actions';
import { activateModule } from 'calypso/state/jetpack/modules/actions';
import { successNotice, errorNotice } from 'calypso/state/notices/actions';
import getCurrentRouteParameterized from 'calypso/state/selectors/get-current-route-parameterized';
import getSharingButtons from 'calypso/state/selectors/get-sharing-buttons';
import isFetchingJetpackModules from 'calypso/state/selectors/is-fetching-jetpack-modules';
import isJetpackModuleActive from 'calypso/state/selectors/is-jetpack-module-active';
import isPrivateSite from 'calypso/state/selectors/is-private-site';
import isSavingSharingButtons from 'calypso/state/selectors/is-saving-sharing-buttons';
import isSharingButtonsSaveSuccessful from 'calypso/state/selectors/is-sharing-buttons-save-successful';
import { saveSiteSettings } from 'calypso/state/site-settings/actions';
import {
	getSiteSettings,
	isSavingSiteSettings,
	isSiteSettingsSaveSuccessful,
} from 'calypso/state/site-settings/selectors';
import { isJetpackSite } from 'calypso/state/sites/selectors';
import { saveSharingButtons } from 'calypso/state/sites/sharing-buttons/actions';
import { getSelectedSiteId, getSelectedSiteSlug } from 'calypso/state/ui/selectors';
import ButtonsAppearance from './appearance';
import ButtonsOptions from './options';

class SharingButtons extends Component {
	state = {
		values: {},
		buttonsPendingSave: null,
	};

	static propTypes = {
		buttons: PropTypes.array,
		isSaving: PropTypes.bool,
		isSaveSettingsSuccessful: PropTypes.bool,
		isSaveButtonsSuccessful: PropTypes.bool,
		markSaved: PropTypes.func,
		markChanged: PropTypes.func,
		settings: PropTypes.object,
		siteId: PropTypes.number,
		translate: PropTypes.func,
	};

	saveChanges = ( event ) => {
		const { isJetpack, isLikesModuleActive, siteId, path } = this.props;

		event.preventDefault();

		this.props.saveSiteSettings( this.props.siteId, this.state.values );
		if ( this.state.buttonsPendingSave ) {
			this.props.saveSharingButtons( this.props.siteId, this.state.buttonsPendingSave );
		}
		this.props.recordTracksEvent( 'calypso_sharing_buttons_save_changes_click', { path } );
		this.props.recordGoogleEvent( 'Sharing', 'Clicked Save Changes Button' );

		if ( ! isJetpack || isLikesModuleActive !== false ) {
			return;
		}

		const updatedSettings = this.getUpdatedSettings();
		if ( updatedSettings.disabled_likes ) {
			return;
		}

		this.props.activateModule( siteId, 'likes', true );
	};

	handleChange = ( option, value ) => {
		const pairs = undefined === value ? option : { [ option ]: value };
		this.props.markChanged();
		this.setState( {
			values: Object.assign( {}, this.state.values, pairs ),
		} );
	};

	handleButtonsChange = ( buttons ) => {
		this.props.markChanged();
		this.setState( { buttonsPendingSave: buttons } );
	};

	UNSAFE_componentWillReceiveProps( nextProps ) {
		// Save request has been performed
		if ( this.props.isSaving && ! nextProps.isSaving ) {
			if (
				nextProps.isSaveSettingsSuccessful &&
				( nextProps.isSaveButtonsSuccessful || ! this.state.buttonsPendingSave )
			) {
				nextProps.successNotice( nextProps.translate( 'Settings saved successfully!' ) );
				nextProps.markSaved();
				this.setState( {
					values: {},
					buttonsPendingSave: null,
				} );
			} else {
				nextProps.errorNotice(
					nextProps.translate( 'There was a problem saving your changes. Please, try again.' )
				);
			}
		}
	}

	getUpdatedSettings() {
		const { isJetpack, isLikesModuleActive, settings } = this.props;
		const disabledSettings =
			isJetpack && isLikesModuleActive === false
				? {
						// Like button should be disabled if the Likes Jetpack module is deactivated.
						disabled_likes: true,
				  }
				: {};

		return Object.assign( {}, settings, disabledSettings, this.state.values );
	}

	render() {
		const {
			buttons,
			isJetpack,
			isPrivate,
			isSaving,
			settings,
			siteId,
			siteSlug,
			isSharingButtonsModuleActive,
			isFetchingModules,
			translate,
		} = this.props;
		const updatedSettings = this.getUpdatedSettings();
		const updatedButtons = this.state.buttonsPendingSave || buttons;

		return (
			<form
				onSubmit={ this.saveChanges }
				id="sharing-buttons"
				className="buttons__sharing-settings buttons__sharing-buttons"
			>
				<PageViewTracker
					path="/marketing/sharing-buttons/:site"
					title="Marketing > Sharing Buttons"
				/>
				<QuerySiteSettings siteId={ siteId } />
				<QuerySharingButtons siteId={ siteId } />
				{ isJetpack && <QueryJetpackModules siteId={ siteId } /> }
				{ isJetpack && ! isFetchingModules && ! isSharingButtonsModuleActive && (
					<Notice
						status="is-warning"
						showDismiss={ false }
						text={
							isPrivate
								? translate( 'Adding sharing buttons requires your site to be marked as Public.' )
								: translate(
										'Adding sharing buttons needs the Sharing Buttons module from Jetpack to be enabled.'
								  )
						}
					>
						<NoticeAction
							href={ isPrivate ? '/settings/general/' + siteSlug + '#site-privacy-settings' : null }
							onClick={ isPrivate ? null : () => this.props.activateModule( siteId, 'sharedaddy' ) }
						>
							{ isPrivate ? translate( 'Change settings' ) : translate( 'Enable' ) }
						</NoticeAction>
					</Notice>
				) }
				<ButtonsOptions
					settings={ updatedSettings }
					onChange={ this.handleChange }
					saving={ isSaving }
				/>
				<ButtonsAppearance
					buttons={ updatedButtons }
					values={ updatedSettings }
					onChange={ this.handleChange }
					onButtonsChange={ this.handleButtonsChange }
					initialized={ !! buttons && !! settings }
					saving={ isSaving }
				/>
			</form>
		);
	}
}

const connectComponent = connect(
	( state ) => {
		const siteId = getSelectedSiteId( state );
		const siteSlug = getSelectedSiteSlug( state );
		const settings = getSiteSettings( state, siteId );
		const buttons = getSharingButtons( state, siteId );
		const isJetpack = isJetpackSite( state, siteId );
		const isSharingButtonsModuleActive = isJetpackModuleActive( state, siteId, 'sharedaddy' );
		const isLikesModuleActive = isJetpackModuleActive( state, siteId, 'likes' );
		const isFetchingModules = isFetchingJetpackModules( state, siteId );
		const isSavingSettings = isSavingSiteSettings( state, siteId );
		const isSavingButtons = isSavingSharingButtons( state, siteId );
		const isSaveSettingsSuccessful = isSiteSettingsSaveSuccessful( state, siteId );
		const isSaveButtonsSuccessful = isSharingButtonsSaveSuccessful( state, siteId );
		const isPrivate = isPrivateSite( state, siteId );
		const path = getCurrentRouteParameterized( state, siteId );

		return {
			isJetpack,
			isSharingButtonsModuleActive,
			isLikesModuleActive,
			isFetchingModules,
			isSaving: isSavingSettings || isSavingButtons,
			isSaveSettingsSuccessful,
			isSaveButtonsSuccessful,
			isPrivate,
			settings,
			buttons,
			siteId,
			siteSlug,
			path,
		};
	},
	{
		activateModule,
		errorNotice,
		recordGoogleEvent,
		recordTracksEvent,
		saveSharingButtons,
		saveSiteSettings,
		successNotice,
	}
);

export default flowRight( connectComponent, protectForm, localize )( SharingButtons );
