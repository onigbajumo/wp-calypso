import { confirmStripePaymentIntent, createStripePaymentMethod } from '@automattic/calypso-stripe';
import {
	makeSuccessResponse,
	makeRedirectResponse,
	makeErrorResponse,
} from '@automattic/composite-checkout';
import debugFactory from 'debug';
import { createEbanxToken } from 'calypso/lib/store-transactions';
import getDomainDetails from './get-domain-details';
import getPostalCode from './get-postal-code';
import submitWpcomTransaction from './submit-wpcom-transaction';
import {
	createTransactionEndpointRequestPayload,
	createTransactionEndpointCartFromResponseCart,
} from './translate-cart';
import type { PaymentProcessorOptions } from '../types/payment-processors';
import type { StripeConfiguration } from '@automattic/calypso-stripe';
import type { PaymentProcessorResponse } from '@automattic/composite-checkout';
import type { Stripe, StripeCardNumberElement } from '@stripe/stripe-js';

const debug = debugFactory( 'calypso:composite-checkout:multi-partner-card-processor' );

type CardTransactionRequest = {
	paymentPartner: string;
};

type StripeCardTransactionRequest = {
	stripe: Stripe;
	stripeConfiguration: StripeConfiguration;
	name: string;
	countryCode: string | undefined;
	postalCode: string | undefined;
	cardNumberElement: StripeCardNumberElement;
};

type EbanxCardTransactionRequest = {
	name: string;
	countryCode: string;
	number: string;
	cvv: string;
	'expiration-date': string;
	state: string;
	city: string;
	postalCode: string;
	address: string;
	streetNumber: string;
	phoneNumber: string;
	document: string;
};

type EbanxToken = {
	deviceId: string;
	token: string;
};

async function stripeCardProcessor(
	submitData: unknown,
	transactionOptions: PaymentProcessorOptions
): Promise< PaymentProcessorResponse > {
	if ( ! isValidStripeCardTransactionData( submitData ) ) {
		throw new Error( 'Required purchase data is missing' );
	}

	const {
		includeDomainDetails,
		includeGSuiteDetails,
		recordEvent: onEvent,
		responseCart,
		siteId,
		contactDetails,
	} = transactionOptions;

	let paymentMethodToken;
	try {
		const tokenResponse = await createStripePaymentMethodToken( {
			...submitData,
			country: contactDetails?.countryCode?.value,
			postalCode: getPostalCode( contactDetails ),
		} );
		paymentMethodToken = tokenResponse.id;
	} catch ( error ) {
		debug( 'transaction failed' );
		// Errors here are "expected" errors, meaning that they (hopefully) come
		// from stripe and not from some bug in the frontend code.
		return makeErrorResponse( ( error as Error ).message );
	}

	const formattedTransactionData = createTransactionEndpointRequestPayload( {
		...submitData,
		country: contactDetails?.countryCode?.value ?? '',
		postalCode: getPostalCode( contactDetails ),
		subdivisionCode: contactDetails?.state?.value,
		siteId: transactionOptions.siteId ? String( transactionOptions.siteId ) : undefined,
		domainDetails: getDomainDetails( contactDetails, {
			includeDomainDetails,
			includeGSuiteDetails,
		} ),
		paymentMethodToken,
		cart: createTransactionEndpointCartFromResponseCart( {
			siteId: siteId ? String( siteId ) : undefined,
			contactDetails:
				getDomainDetails( contactDetails, { includeDomainDetails, includeGSuiteDetails } ) ?? null,
			responseCart: responseCart,
		} ),
		paymentMethodType: 'WPCOM_Billing_Stripe_Payment_Method',
		paymentPartnerProcessorId: transactionOptions.stripeConfiguration?.processor_id,
	} );
	debug( 'sending stripe transaction', formattedTransactionData );
	return submitWpcomTransaction( formattedTransactionData, transactionOptions )
		.then( ( stripeResponse ) => {
			if ( stripeResponse?.message?.payment_intent_client_secret ) {
				// 3DS authentication required
				onEvent( { type: 'SHOW_MODAL_AUTHORIZATION' } );
				return confirmStripePaymentIntent(
					submitData.stripe,
					stripeResponse?.message?.payment_intent_client_secret
				);
			}
			return stripeResponse;
		} )
		.then( ( stripeResponse ) => {
			if ( stripeResponse?.redirect_url ) {
				return makeRedirectResponse( stripeResponse.redirect_url );
			}
			return makeSuccessResponse( stripeResponse );
		} )
		.catch( ( error ) => {
			debug( 'transaction failed' );
			// Errors here are "expected" errors, meaning that they (hopefully) come
			// from the endpoint and not from some bug in the frontend code.
			return makeErrorResponse( error.message );
		} );
}

async function ebanxCardProcessor(
	submitData: unknown,
	transactionOptions: PaymentProcessorOptions
): Promise< PaymentProcessorResponse > {
	if ( ! isValidEbanxCardTransactionData( submitData ) ) {
		throw new Error( 'Required purchase data is missing' );
	}
	const {
		includeDomainDetails,
		includeGSuiteDetails,
		responseCart,
		siteId,
		contactDetails,
	} = transactionOptions;

	let paymentMethodToken;
	try {
		const ebanxTokenResponse: EbanxToken = await createEbanxToken( 'new_purchase', {
			country: submitData.countryCode,
			name: submitData.name,
			number: submitData.number,
			cvv: submitData.cvv,
			'expiration-date': submitData[ 'expiration-date' ],
		} );
		paymentMethodToken = ebanxTokenResponse;
	} catch ( error ) {
		debug( 'transaction failed' );
		// Errors here are "expected" errors, meaning that they (hopefully) come
		// from Ebanx and not from some bug in the frontend code.
		return makeErrorResponse( ( error as Error ).message );
	}

	const formattedTransactionData = createTransactionEndpointRequestPayload( {
		...submitData,
		couponId: responseCart.coupon,
		country: submitData.countryCode,
		siteId: siteId ? String( siteId ) : undefined,
		deviceId: paymentMethodToken?.deviceId,
		domainDetails: getDomainDetails( contactDetails, {
			includeDomainDetails,
			includeGSuiteDetails,
		} ),
		paymentMethodToken: paymentMethodToken.token,
		cart: createTransactionEndpointCartFromResponseCart( {
			siteId: transactionOptions.siteId ? String( transactionOptions.siteId ) : undefined,
			contactDetails:
				getDomainDetails( contactDetails, { includeDomainDetails, includeGSuiteDetails } ) ?? null,
			responseCart: transactionOptions.responseCart,
		} ),
		paymentMethodType: 'WPCOM_Billing_Ebanx',
	} );
	debug( 'sending ebanx transaction', formattedTransactionData );
	return submitWpcomTransaction( formattedTransactionData, transactionOptions )
		.then( makeSuccessResponse )
		.catch( ( error ) => {
			debug( 'transaction failed' );
			// Errors here are "expected" errors, meaning that they (hopefully) come
			// from the endpoint and not from some bug in the frontend code.
			return makeErrorResponse( error.message );
		} );
}

export default async function multiPartnerCardProcessor(
	submitData: unknown,
	dataForProcessor: PaymentProcessorOptions
): Promise< PaymentProcessorResponse > {
	if ( ! isValidMultiPartnerTransactionData( submitData ) ) {
		throw new Error( 'Required purchase data is missing' );
	}
	const paymentPartner = submitData.paymentPartner;
	if ( paymentPartner === 'stripe' ) {
		return stripeCardProcessor( submitData, dataForProcessor );
	}
	if ( paymentPartner === 'ebanx' ) {
		return ebanxCardProcessor( submitData, dataForProcessor );
	}
	throw new RangeError( 'Unrecognized card payment partner: "' + paymentPartner + '"' );
}

function isValidMultiPartnerTransactionData(
	submitData: unknown
): submitData is CardTransactionRequest {
	const data = submitData as CardTransactionRequest;
	if ( ! data?.paymentPartner ) {
		throw new Error( 'Transaction requires paymentPartner and none was provided' );
	}
	return true;
}

function isValidStripeCardTransactionData(
	submitData: unknown
): submitData is StripeCardTransactionRequest {
	const data = submitData as StripeCardTransactionRequest;
	if ( ! data?.stripe ) {
		throw new Error( 'Transaction requires stripe and none was provided' );
	}
	if ( ! data?.stripeConfiguration ) {
		throw new Error( 'Transaction requires stripeConfiguration and none was provided' );
	}
	if ( ! data.cardNumberElement ) {
		throw new Error( 'Transaction requires credit card field and none was provided' );
	}
	return true;
}

function isValidEbanxCardTransactionData(
	submitData: unknown
): submitData is EbanxCardTransactionRequest {
	const data = submitData as EbanxCardTransactionRequest;
	if ( ! data ) {
		throw new Error( 'Transaction requires data and none was provided' );
	}
	return true;
}

function createStripePaymentMethodToken( {
	stripe,
	cardNumberElement,
	name,
	country,
	postalCode,
}: {
	stripe: Stripe;
	cardNumberElement: StripeCardNumberElement;
	name: string | undefined;
	country: string | undefined;
	postalCode: string | undefined;
} ) {
	return createStripePaymentMethod( stripe, cardNumberElement, {
		name,
		address: {
			country,
			postal_code: postalCode,
		},
	} );
}
