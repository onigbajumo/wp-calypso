import 'calypso/state/login/init';

/**
 * Retrieve the user ID for the two factor authentication process.
 * Returns null if there is no such information yet, or user does not have 2FA enabled.
 *
 * @param  {object}   state  Global state tree
 * @returns {?number}         The user ID.
 */
export const getTwoFactorUserId = ( state ) => state.login.twoFactorAuth?.user_id ?? null;

/**
 * Retrieve the actual nonce for the two factor authentication process.
 * Returns null if there is no such information yet, or user does not have 2FA enabled.
 *
 * @param	{object}	state  Global state tree
 * @param	{string}	nonceType nonce's type
 * @returns {?string}         The nonce.
 */
export const getTwoFactorAuthNonce = ( state, nonceType ) =>
	state.login.twoFactorAuth?.[ `two_step_nonce_${ nonceType }` ] ?? null;

/**
 * Retrieve the type of notification sent for the two factor authentication process.
 * Returns null if there is no such information yet, or user does not have 2FA enabled.
 *
 * @param  {object}   state  Global state tree
 * @returns {?string}         The type of 2FA notification. enum: 'sms', 'push', 'none'.
 */
export const getTwoFactorNotificationSent = ( state ) =>
	state.login.twoFactorAuth?.two_step_notification_sent ?? null;

/**
 * Retrieve a token to be used for push notification auth polling
 *
 * @param  {object}   state  Global state tree
 * @returns {?string}         Push notification token to be used for polling auth state
 */
export const getTwoFactorPushToken = ( state ) => state.login.twoFactorAuth?.push_web_token ?? null;

/**
 * Retrieve the progress status of polling for push authentication
 *
 * @param  {object}   state  Global state tree
 * @returns {boolean}         Whether the polling for push authentication is in progress
 */
export const getTwoFactorPushPollInProgress = ( state ) =>
	state.login.twoFactorAuthPushPoll.inProgress;

/**
 * Get whether user logged in successfully via push auth
 *
 * @param  {object}   state  Global state tree
 * @returns {boolean}         Whether the polling for push authentication completed successfully
 */
export const getTwoFactorPushPollSuccess = ( state ) => state.login.twoFactorAuthPushPoll.success;

/**
 * Determines whether two factor authentication is enabled for the logging in user.
 *
 * @param  {object}   state  Global state tree
 * @returns {boolean}        Whether 2FA is enabled
 */
export const isTwoFactorEnabled = ( state ) => state.login.twoFactorAuth != null;

/**
 * Determines whether a request to authenticate 2FA is being made.
 *
 * @param  {object}   state  Global state tree
 * @returns {boolean}         Whether a request to authenticate 2FA is being made.
 */
export const isRequestingTwoFactorAuth = ( state ) => state.login.isRequestingTwoFactorAuth;

/**
 * Returns the error for a request to authenticate 2FA.
 *
 * @param  {object}   state  Global state tree
 * @returns {?string}         Error for the request.
 */
export const getTwoFactorAuthRequestError = ( state ) => state.login.twoFactorAuthRequestError;

/**
 * Retrieves the supported auth types for the current login.
 * Returns null if there is no such information yet.
 *
 * @param  {object}   state  Global state tree
 * @returns {?Array}          The supported auth types (of `authenticator`, `sms`, `push` ).
 */
export const getTwoFactorSupportedAuthTypes = ( state ) =>
	state.login.twoFactorAuth?.two_step_supported_auth_types ?? null;

/**
 * Determines whether an auth type is supported for the current login.
 * Returns null if there is no such information yet.
 *
 * @param  {object}   state  Global state tree
 * @param  {string}   type   A 2FA auth type (of `authenticator`, `sms`, `push` ).
 * @returns {?boolean}        Whether the auth type `type` is supported
 */
export const isTwoFactorAuthTypeSupported = ( state, type ) => {
	const supportedAuthTypes = getTwoFactorSupportedAuthTypes( state );
	return supportedAuthTypes && supportedAuthTypes.indexOf( type ) >= 0;
};

/**
 * Determines whether a login request is in-progress.
 *
 * @param  {object}   state  Global state tree
 * @returns {boolean}         Whether a login request is in-progress.
 */
export const isRequesting = ( state ) => state.login.isRequesting;

/**
 * Returns the error for a login request.
 *
 * @param  {object}   state  Global state tree
 * @returns {?object}         Error for the request.
 */
export const getRequestError = ( state ) => state.login.requestError;

/**
 * Returns the notice for a login request.
 *
 * @param  {object}   state  Global state tree
 * @returns {?object}         Notice for the request.
 */
export const getRequestNotice = ( state ) => state.login.requestNotice;

/**
 * Retrieves the last redirect url provided in the query parameters of any login page. This url must be sanitized by the
 * API before being used to avoid open redirection attacks.
 *
 * @param  {object}   state  Global state tree
 * @returns {?string}         Url to redirect the user to upon successful login
 * @see getRedirectToSanitized for the sanitized version
 */
export const getRedirectToOriginal = ( state ) => state.login.redirectTo.original ?? null;

/**
 * Retrieves the last redirect url provided in the query parameters of any login page that was sanitized by the API
 * during the authentication process.
 *
 * @param  {object}   state  Global state tree
 * @returns {?string}         Url to redirect the user to upon successful login
 */
export const getRedirectToSanitized = ( state ) => state.login.redirectTo.sanitized ?? null;

/**
 * Retrieves whether the login form should be disabled due to actions.
 *
 * @param  {object}   state  Global state tree
 * @returns {boolean}         Login form disabled flag
 */
export const isFormDisabled = ( state ) => state.login.isFormDisabled;

/**
 * Retrieves the authentication account type.
 *
 * @param  {object}   state  Global state tree
 * @returns {?string}        Authentication account type (e.g. 'regular', 'passwordless' ...)
 */
export const getAuthAccountType = ( state ) => state.login.authAccountType;

/**
 * Tells us if we're in a process of creating a social account
 *
 * @param  {object}   state  Global state tree
 * @returns {?boolean}         Error for the request.
 */
export const isSocialAccountCreating = ( state ) => state.login.socialAccount.isCreating;

/**
 * Gets Username of the created social account
 *
 * @param  {object}   state  Global state tree
 * @returns {?string}         Username of the created social account
 */
export const getCreatedSocialAccountUsername = ( state ) =>
	state.login.socialAccount.username ?? null;

/**
 * Gets Bearer token of the created social account
 *
 * @param  {object}   state  Global state tree
 * @returns {?string}         Bearer token of the created social account
 */
export const getCreatedSocialAccountBearerToken = ( state ) =>
	state.login.socialAccount.bearerToken ?? null;

/**
 * Gets error for the create social account request.
 *
 * @param  {object}   state  Global state tree
 * @returns {?object}         Error for the create social account request.
 */
export const getCreateSocialAccountError = ( state ) =>
	state.login.socialAccount.createError ?? null;

/**
 * Gets error for the get social account request.
 *
 * @param  {object}   state  Global state tree
 * @returns {?object}         Error for the get social account request.
 */
export const getRequestSocialAccountError = ( state ) =>
	state.login.socialAccount.requestError ?? null;

/**
 * Gets social account linking status
 *
 * @param  {object}   state  Global state tree
 * @returns {?boolean}         Boolean describing social account linking status
 */
export const getSocialAccountIsLinking = ( state ) => state.login.socialAccountLink.isLinking;

/**
 * Gets social account linking email
 *
 * @param  {object}   state  Global state tree
 * @returns {?string}         wpcom email that is being linked
 */
export const getSocialAccountLinkEmail = ( state ) => state.login.socialAccountLink.email ?? null;

/**
 * Gets social account linking service
 *
 * @param  {object}   state  Global state tree
 * @returns {?string}         service name that is being linked
 */
export const getSocialAccountLinkService = ( state ) =>
	state.login.socialAccountLink.authInfo?.service ?? null;

/**
 * Gets the auth information of the social account to be linked.
 *
 * @param  {object}   state  Global state tree
 * @returns {?string}         Email address of the social account.
 */
export const getSocialAccountLinkAuthInfo = ( state ) =>
	state.login.socialAccountLink.authInfo ?? null;

/**
 * Gets the last username/email that was checked.
 *
 * @param  {object}   state  Global state tree
 * @returns {?string}         Email address or username.
 */
export const getLastCheckedUsernameOrEmail = ( state ) => state.login.lastCheckedUsernameOrEmail;
