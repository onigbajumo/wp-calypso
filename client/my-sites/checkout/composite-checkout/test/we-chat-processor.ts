/**
 * @jest-environment jsdom
 */

import { getEmptyResponseCart, getEmptyResponseCartProduct } from '@automattic/shopping-cart';
import wp from 'calypso/lib/wp';
import weChatProcessor from '../lib/we-chat-processor';

jest.mock( 'calypso/lib/wp' );

describe( 'weChatProcessor', () => {
	const stripeConfiguration = {
		processor_id: 'IE',
		js_url: 'https://stripe-js-url',
		public_key: 'stripe-public-key',
		setup_intent_id: null,
	};
	const product = getEmptyResponseCartProduct();
	const domainProduct = {
		...getEmptyResponseCartProduct(),
		meta: 'example.com',
		is_domain_registration: true,
	};
	const cart = { ...getEmptyResponseCart(), products: [ product ] };
	const options = {
		includeDomainDetails: false,
		includeGSuiteDetails: false,
		createUserAndSiteBeforeTransaction: false,
		stripeConfiguration,
		recordEvent: () => null,
		reduxDispatch: () => null,
		responseCart: cart,
		getThankYouUrl: () => '',
		siteSlug: undefined,
		siteId: undefined,
		contactDetails: undefined,
	};

	const countryCode = { isTouched: true, value: 'US', errors: [], isRequired: true };
	const postalCode = { isTouched: true, value: '10001', errors: [], isRequired: true };

	const basicExpectedStripeRequest = {
		cart: {
			blog_id: '0',
			cart_key: 'no-site',
			coupon: '',
			create_new_blog: true,
			currency: 'USD',
			extra: [],
			is_jetpack_checkout: false,
			products: [ product ],
			tax: {
				location: {},
			},
			temporary: false,
		},
		domainDetails: undefined,
		payment: {
			address: undefined,
			cancelUrl: 'https://example.com/',
			city: undefined,
			country: 'US',
			countryCode: 'US',
			deviceId: undefined,
			document: undefined,
			email: undefined,
			gstin: undefined,
			idealBank: undefined,
			name: 'test name',
			nik: undefined,
			pan: undefined,
			paymentKey: undefined,
			paymentMethod: 'WPCOM_Billing_Stripe_Source_Wechat',
			paymentPartner: 'IE',
			phoneNumber: undefined,
			postalCode: '10001',
			state: undefined,
			storedDetailsId: undefined,
			streetNumber: undefined,
			successUrl:
				'https://example.com/checkout/thank-you/no-site/pending?redirectTo=https%3A%2F%2Fexample.com',
			tefBank: undefined,
			zip: '10001',
		},
	};

	const basicExpectedDomainDetails = {
		address1: undefined,
		address2: undefined,
		alternateEmail: undefined,
		city: undefined,
		countryCode: 'US',
		email: undefined,
		extra: {
			ca: null,
			fr: null,
			uk: null,
		},
		fax: undefined,
		firstName: undefined,
		lastName: undefined,
		organization: undefined,
		phone: undefined,
		postalCode: '10001',
		state: undefined,
	};

	const transactionsEndpoint = jest.fn();
	const undocumentedFunctions = {
		transactions: transactionsEndpoint,
	};
	wp.undocumented = jest.fn().mockReturnValue( undocumentedFunctions );
	const redirect_url = 'https://test-redirect-url';

	beforeEach( () => {
		transactionsEndpoint.mockClear();
		transactionsEndpoint.mockReturnValue( Promise.resolve( { redirect_url } ) );
	} );

	it( 'sends the correct data to the endpoint with no site and one product', async () => {
		const submitData = {
			name: 'test name',
		};
		const expected = { payload: { redirect_url }, type: 'MANUAL' };
		await expect(
			weChatProcessor( submitData, {
				...options,
				contactDetails: {
					countryCode,
					postalCode,
				},
			} )
		).resolves.toStrictEqual( expected );
		expect( transactionsEndpoint ).toHaveBeenCalledWith( basicExpectedStripeRequest );
	} );

	it( 'returns an explicit error response if the transaction fails', async () => {
		const submitData = {
			name: 'test name',
		};
		transactionsEndpoint.mockReturnValue( Promise.reject( new Error( 'test error' ) ) );
		const expected = { payload: 'test error', type: 'ERROR' };
		await expect(
			weChatProcessor( submitData, {
				...options,
				contactDetails: {
					countryCode,
					postalCode,
				},
			} )
		).resolves.toStrictEqual( expected );
	} );

	it( 'sends the correct data to the endpoint with a site and one product', async () => {
		const submitData = {
			name: 'test name',
		};
		const expected = { payload: { redirect_url }, type: 'MANUAL' };
		await expect(
			weChatProcessor( submitData, {
				...options,
				siteSlug: 'example.wordpress.com',
				siteId: 1234567,
				contactDetails: {
					countryCode,
					postalCode,
				},
			} )
		).resolves.toStrictEqual( expected );
		expect( transactionsEndpoint ).toHaveBeenCalledWith( {
			...basicExpectedStripeRequest,
			cart: {
				...basicExpectedStripeRequest.cart,
				blog_id: '1234567',
				cart_key: '1234567',
				coupon: '',
				create_new_blog: false,
			},
			payment: {
				...basicExpectedStripeRequest.payment,
				successUrl:
					'https://example.com/checkout/thank-you/example.wordpress.com/pending?redirectTo=https%3A%2F%2Fexample.com',
			},
		} );
	} );

	it( 'sends the correct data to the endpoint with tax information', async () => {
		const submitData = {
			name: 'test name',
		};
		const expected = { payload: { redirect_url }, type: 'MANUAL' };
		await expect(
			weChatProcessor( submitData, {
				...options,
				siteSlug: 'example.wordpress.com',
				siteId: 1234567,
				contactDetails: {
					countryCode,
					postalCode,
				},
				responseCart: {
					...options.responseCart,
					tax: {
						display_taxes: true,
						location: {
							postal_code: 'pr267ry',
							country_code: 'GB',
						},
					},
				},
			} )
		).resolves.toStrictEqual( expected );
		expect( transactionsEndpoint ).toHaveBeenCalledWith( {
			...basicExpectedStripeRequest,
			cart: {
				...basicExpectedStripeRequest.cart,
				blog_id: '1234567',
				cart_key: '1234567',
				coupon: '',
				create_new_blog: false,
				tax: { location: { postal_code: 'PR26 7RY', country_code: 'GB' } },
			},
			payment: {
				...basicExpectedStripeRequest.payment,
				successUrl:
					'https://example.com/checkout/thank-you/example.wordpress.com/pending?redirectTo=https%3A%2F%2Fexample.com',
			},
		} );
	} );

	it( 'sends the correct data to the endpoint with a site and one domain product', async () => {
		const submitData = {
			name: 'test name',
		};
		const expected = { payload: { redirect_url }, type: 'MANUAL' };
		await expect(
			weChatProcessor( submitData, {
				...options,
				siteSlug: 'example.wordpress.com',
				siteId: 1234567,
				contactDetails: {
					countryCode,
					postalCode,
				},
				responseCart: { ...cart, products: [ domainProduct ] },
				includeDomainDetails: true,
			} )
		).resolves.toStrictEqual( expected );
		expect( transactionsEndpoint ).toHaveBeenCalledWith( {
			...basicExpectedStripeRequest,
			cart: {
				...basicExpectedStripeRequest.cart,
				blog_id: '1234567',
				cart_key: '1234567',
				coupon: '',
				create_new_blog: false,
				products: [ domainProduct ],
			},
			domainDetails: basicExpectedDomainDetails,
			payment: {
				...basicExpectedStripeRequest.payment,
				successUrl:
					'https://example.com/checkout/thank-you/example.wordpress.com/pending?redirectTo=https%3A%2F%2Fexample.com',
			},
		} );
	} );
} );
