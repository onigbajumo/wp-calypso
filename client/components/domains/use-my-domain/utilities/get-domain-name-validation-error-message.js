import { createElement, createInterpolateElement } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

export function getDomainNameValidationErrorMessage( domainName ) {
	if ( ! domainName ) {
		return __( 'Please enter your domain before continuing.' );
	}

	if (
		! /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9])*(?:\.[a-zA-Z]{2,})+$/.test(
			domainName
		)
	) {
		return createInterpolateElement(
			sprintf(
				/* translators: %s - the string the user entered in the domain name field */
				__( 'Are you sure you mean <strong>%s</strong>? This is not a valid domain.' ),
				domainName
			),
			{
				strong: createElement( 'strong' ),
			}
		);
	}

	return null;
}
