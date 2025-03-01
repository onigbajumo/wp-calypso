const { promisify } = require( 'util' ); // eslint-disable-line import/no-nodejs-modules
const { ipcMain: ipc, Notification } = require( 'electron' );
const { debounce } = require( 'lodash' );
const Config = require( '../../lib/config' );
const isCalypso = require( '../../lib/is-calypso' );
const log = require( '../../lib/logger' )( 'desktop:notifications' );
const ViewModel = require( '../../lib/notifications/viewmodel' );
const Platform = require( '../../lib/platform' );
const Settings = require( '../../lib/settings' );

const webBase = Config.baseURL();

const delay = promisify( setTimeout );

let notificationBadgeCount = 0;

function updateNotificationBadge() {
	const badgeEnabled = Settings.getSetting( 'notification-badge' );
	if ( ! badgeEnabled ) {
		return;
	}

	const bounceEnabled = Settings.getSetting( 'notification-bounce' );

	if ( notificationBadgeCount > 0 ) {
		Platform.showNotificationsBadge( notificationBadgeCount, bounceEnabled );
	} else {
		Platform.clearNotificationsBadge();
	}
}

module.exports = function ( { window, view } ) {
	ipc.on( 'clear-notices-count', function () {
		if ( notificationBadgeCount > 0 ) {
			log.info( 'Notification badge count reset' );
			notificationBadgeCount = 0;
			updateNotificationBadge();
		}
	} );

	ipc.on( 'preferences-changed-notification-badge', function ( _, enabled ) {
		if ( ! enabled ) {
			notificationBadgeCount = 0;
			updateNotificationBadge();
		}
	} );

	// Calypso's renderer websocket connection does not work w/ Electron. Manually refresh
	// the notifications panel when a new message is received so it's as up-to-date as possible.
	// Invoke debounce directly, and not as nested fn.
	ViewModel.on(
		'notification',
		debounce(
			() => {
				view.webContents.send( 'notifications-panel-refresh' );
			},
			100,
			{ leading: true, trailing: false }
		)
	);

	ViewModel.on( 'notification', function ( notification ) {
		log.info( 'Received notification: ', notification );

		if ( ! Settings.getSetting( 'notifications' ) ) {
			log.info( 'Notifications disabled!' );

			return;
		}

		notificationBadgeCount++;
		updateNotificationBadge();

		const { id, type, title, subtitle, body, navigate } = notification;

		log.info( `Received ${ type } notification for site ${ title }` );

		if ( Notification.isSupported() ) {
			const desktopNotification = new Notification( {
				title: title,
				subtitle: subtitle,
				body: body,
				silent: true,
				hasReply: false,
			} );

			desktopNotification.on( 'click', async function () {
				ViewModel.didClickNotification( id, () =>
					// Manually refresh notifications panel when a message is clicked
					// to reflect read/unread highlighting.
					window.webContents.send( 'notifications-panel-refresh' )
				);

				if ( ! window.isVisible() ) {
					window.show();
					await delay( 300 );
				}

				window.focus();

				if ( navigate ) {
					// if we have a specific URL, then navigate Calypso there
					log.info( `Navigating user to URL: ${ navigate }` );

					if ( navigate.startsWith( 'http' ) ) {
						view.webContents.loadURL( navigate );
					} else if ( isCalypso( view ) ) {
						log.info( `Navigating to '${ navigate }'` );
						view.webContents.send( 'navigate', navigate );
					} else {
						const path = stripLeadingSlashFromPath( navigate );
						log.info( `Navigating to '${ webBase + path }'` );
						view.webContents.loadURL( webBase + path );
					}
				} else {
					// else just display the notifications panel
					if ( isCalypso( view ) ) {
						view.webContents.send( 'navigate', '/' );
					} else {
						view.webContents.loadURL( webBase );
					}

					await delay( 300 );

					view.webContents.send( 'notifications-panel-show', true );
				}

				// Tracks API call
				view.webContents.send( 'notification-clicked', notification );

				notificationBadgeCount = Math.max( notificationBadgeCount - 1, 0 );
				updateNotificationBadge();
			} );

			desktopNotification.show();
		}
	} );
};

function stripLeadingSlashFromPath( path ) {
	return path.replace( /^\/+/g, '' );
}
